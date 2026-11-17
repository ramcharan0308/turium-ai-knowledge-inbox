import dns from 'node:dns/promises';
import net from 'node:net';
import * as cheerio from 'cheerio';
import { AppError, ErrorCode } from '../types/api.js';
import { logger } from '../middleware/logger.middleware.js';

export interface ScrapedContent {
  title: string;
  canonicalUrl: string | null;
  textContent: string;
  sourceUrl: string;
  contentLength: number;
}

export interface ScraperOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  fetchFn?: typeof fetch;
  dnsLookupFn?: (hostname: string) => Promise<{ address: string; family: number }[]>;
}

export class ScraperService {
  private timeoutMs: number;
  private maxBytes: number;
  private maxRedirects: number;
  private fetchFn: typeof fetch;
  private dnsLookupFn: (hostname: string) => Promise<{ address: string; family: number }[]>;

  constructor(options?: ScraperOptions) {
    this.timeoutMs = options?.timeoutMs ?? 8000;
    this.maxBytes = options?.maxBytes ?? 2 * 1024 * 1024; // 2 MB
    this.maxRedirects = options?.maxRedirects ?? 3;
    this.fetchFn = options?.fetchFn ?? fetch;
    this.dnsLookupFn =
      options?.dnsLookupFn ??
      (async (hostname: string) => {
        return dns.lookup(hostname, { all: true });
      });
  }

  /**
   * Validates whether an IP address is a private, loopback, link-local, or restricted destination
   */
  public isRestrictedIp(rawIp: string): boolean {
    let ip = rawIp.trim();

    // Handle IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (ip.toLowerCase().startsWith('::ffff:')) {
      ip = ip.slice(7);
    }

    if (net.isIPv4(ip)) {
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        return true;
      }
      const [a, b] = parts;

      // 0.0.0.0/8 (Current network)
      if (a === 0) return true;
      // 127.0.0.0/8 (Loopback)
      if (a === 127) return true;
      // 10.0.0.0/8 (Private Class A)
      if (a === 10) return true;
      // 172.16.0.0/12 (Private Class B)
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16 (Private Class C)
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 (Link-local & AWS/Cloud metadata 169.254.169.254)
      if (a === 169 && b === 254) return true;
      // 100.64.0.0/10 (Carrier-Grade NAT)
      if (a === 100 && b >= 64 && b <= 127) return true;
      // 192.0.0.0/24, 192.0.2.0/24 (Test & documentation)
      if (a === 192 && b === 0) return true;
      // 198.51.100.0/24, 203.0.113.0/24 (Test networks)
      if (a === 198 && b === 51) return true;
      if (a === 203 && b === 0) return true;
      // 224.0.0.0/4 (Multicast)
      if (a >= 224 && a <= 239) return true;
      // 240.0.0.0/4 (Reserved)
      if (a >= 240) return true;

      return false;
    }

    if (net.isIPv6(ip)) {
      const normalized = ip.toLowerCase();

      // Loopback (::1) or Unspecified (::)
      if (normalized === '::1' || normalized === '::') return true;
      // Unique Local Addresses (fc00::/7 - fc00... to fdff...)
      if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
      // Link-Local (fe80::/10 - fe8, fe9, fea, feb)
      if (
        normalized.startsWith('fe8') ||
        normalized.startsWith('fe9') ||
        normalized.startsWith('fea') ||
        normalized.startsWith('feb')
      ) {
        return true;
      }
      // Multicast (ff00::/8)
      if (normalized.startsWith('ff')) return true;
      // Documentation (2001:db8::/32)
      if (normalized.startsWith('2001:db8')) return true;

      return false;
    }

    // Unrecognized IP format -> treat as restricted for safety
    return true;
  }

  /**
   * Validate URL protocol, credentials, and hostnames
   */
  public validateUrlSyntax(urlString: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(urlString);
    } catch {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Invalid URL format');
    }

    // Protocol whitelist
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new AppError(
        422,
        ErrorCode.SSRF_RESTRICTED,
        `Forbidden protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`
      );
    }

    // Disallow embedded credentials (http://user:pass@host)
    if (parsed.username || parsed.password) {
      throw new AppError(
        422,
        ErrorCode.SSRF_RESTRICTED,
        'URLs with embedded credentials are not permitted.'
      );
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check forbidden hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.corp') ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data'
    ) {
      throw new AppError(
        422,
        ErrorCode.SSRF_RESTRICTED,
        `Access to private/internal host '${hostname}' is restricted.`
      );
    }

    return parsed;
  }

  /**
   * Validates that all resolved DNS addresses for a hostname are safe public IPs
   */
  public async validateDns(hostname: string): Promise<string> {
    // If hostname is directly an IP address
    if (net.isIP(hostname)) {
      if (this.isRestrictedIp(hostname)) {
        throw new AppError(
          422,
          ErrorCode.SSRF_RESTRICTED,
          `Direct connection to restricted IP '${hostname}' is prohibited.`
        );
      }
      return hostname;
    }

    let addresses: { address: string; family: number }[];
    try {
      addresses = await this.dnsLookupFn(hostname);
    } catch (err) {
      logger.warn({ hostname, err }, 'DNS resolution failed');
      throw new AppError(
        502,
        ErrorCode.UPSTREAM_ERROR,
        `Failed to resolve domain name '${hostname}'. The host may not exist.`
      );
    }

    if (!addresses || addresses.length === 0) {
      throw new AppError(
        502,
        ErrorCode.UPSTREAM_ERROR,
        `No DNS records resolved for '${hostname}'.`
      );
    }

    for (const record of addresses) {
      if (this.isRestrictedIp(record.address)) {
        throw new AppError(
          422,
          ErrorCode.SSRF_RESTRICTED,
          `Domain '${hostname}' resolved to restricted IP address '${record.address}'. Connection blocked.`
        );
      }
    }

    return addresses[0].address;
  }

  /**
   * Safely fetches a URL with redirect validation, size limits, and timeout protection
   */
  public async scrapeUrl(initialUrl: string): Promise<ScrapedContent> {
    let currentUrl = initialUrl;
    let redirectCount = 0;

    while (redirectCount <= this.maxRedirects) {
      const parsedUrl = this.validateUrlSyntax(currentUrl);
      await this.validateDns(parsedUrl.hostname);

      const sanitizedLogUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
      logger.info({ url: sanitizedLogUrl, redirectCount }, 'Fetching web content');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      let response: Response;
      try {
        response = await this.fetchFn(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (TuriumAI-KnowledgeInbox/1.0)',
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new AppError(
            504,
            ErrorCode.UPSTREAM_TIMEOUT,
            `Request timed out after ${this.timeoutMs}ms while fetching '${sanitizedLogUrl}'`
          );
        }
        throw new AppError(
          502,
          ErrorCode.UPSTREAM_ERROR,
          `Failed to connect to upstream server: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        clearTimeout(timeoutId);
      }

      // Handle redirects manually to re-verify SSRF on every destination hop
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new AppError(502, ErrorCode.UPSTREAM_ERROR, 'Upstream redirect provided no Location header');
        }

        redirectCount++;
        if (redirectCount > this.maxRedirects) {
          throw new AppError(
            422,
            ErrorCode.UPSTREAM_ERROR,
            `Exceeded maximum redirect limit of ${this.maxRedirects}`
          );
        }

        // Resolve relative redirects against current URL
        try {
          currentUrl = new URL(location, currentUrl).toString();
        } catch {
          throw new AppError(422, ErrorCode.VALIDATION_ERROR, 'Invalid redirect location URL');
        }
        continue;
      }

      if (!response.ok) {
        throw new AppError(
          502,
          ErrorCode.UPSTREAM_ERROR,
          `Upstream server returned HTTP status ${response.status} (${response.statusText})`
        );
      }

      // Content-Type validation
      const contentType = response.headers.get('content-type') || '';
      const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
      const isPlain = contentType.includes('text/plain');

      if (!isHtml && !isPlain) {
        throw new AppError(
          415,
          ErrorCode.UNSUPPORTED_MEDIA_TYPE,
          `Unsupported Content-Type '${contentType}'. Only HTML and text documents are supported.`
        );
      }

      // Read response body with streaming size enforcement
      let bodyText: string;
      if (response.body) {
        const reader = response.body.getReader();
        let totalBytes = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (totalBytes > this.maxBytes) {
              await reader.cancel();
              throw new AppError(
                413,
                ErrorCode.PAYLOAD_TOO_LARGE,
                `Content exceeds maximum permitted size of ${this.maxBytes / (1024 * 1024)} MB`
              );
            }
            chunks.push(value);
          }
        }

        // Concatenate buffers and decode
        const totalBuffer = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of chunks) {
          totalBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        bodyText = new TextDecoder('utf-8').decode(totalBuffer);
      } else {
        bodyText = await response.text();
      }

      // If text/plain, return directly without DOM parsing
      if (isPlain) {
        const trimmed = bodyText.trim();
        if (trimmed.length < 20) {
          throw new AppError(
            422,
            ErrorCode.EXTRACTION_FAILED,
            'The retrieved text file is empty or does not contain meaningful content.'
          );
        }
        return {
          title: parsedUrl.pathname.split('/').pop() || parsedUrl.hostname,
          canonicalUrl: currentUrl,
          textContent: trimmed,
          sourceUrl: currentUrl,
          contentLength: trimmed.length,
        };
      }

      // Extract HTML content with Cheerio
      return this.extractHtml(bodyText, currentUrl, parsedUrl);
    }

    throw new AppError(422, ErrorCode.UPSTREAM_ERROR, 'Exceeded redirect limit');
  }

  /**
   * Extracts clean article text, title, and metadata from raw HTML
   */
  public extractHtml(html: string, currentUrl: string, parsedUrl: URL): ScrapedContent {
    const $ = cheerio.load(html);

    // Remove scripts, styles, navigation, footer, forms, and boilerplate elements
    $(
      'script, style, noscript, iframe, svg, nav, footer, aside, header, form, ' +
        '[role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], ' +
        '.ad, .ads, .advertisement, .cookie-banner, .popup, #comments'
    ).remove();

    // Extract Title
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim();
    const docTitle = $('title').text().trim();
    const h1Title = $('h1').first().text().trim();

    const title = ogTitle || twitterTitle || docTitle || h1Title || parsedUrl.hostname || 'Untitled Web Page';

    // Extract Canonical URL
    const canonicalHref = $('link[rel="canonical"]').attr('href');
    let canonicalUrl: string | null = null;
    if (canonicalHref) {
      try {
        canonicalUrl = new URL(canonicalHref, currentUrl).toString();
      } catch {
        canonicalUrl = null;
      }
    }

    // Prefer high-value semantic containers: article, main, or body
    let container = $('article');
    if (container.length === 0 || container.text().trim().length < 100) {
      container = $('main, [role="main"]');
    }
    if (container.length === 0 || container.text().trim().length < 100) {
      container = $('body');
    }

    // Insert newlines between block elements to preserve paragraph structure
    container.find('p, div, li, h1, h2, h3, h4, h5, h6, tr, section').each((_, el) => {
      $(el).append('\n\n');
    });
    container.find('br').replaceWith('\n');

    let rawText = container.text();

    // Normalize spacing without removing paragraph breaks
    rawText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+\n/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (rawText.length < 20) {
      throw new AppError(
        422,
        ErrorCode.EXTRACTION_FAILED,
        'Unable to extract readable text content from this URL. The page may require JavaScript execution or user authentication.'
      );
    }

    return {
      title: title.slice(0, 200),
      canonicalUrl,
      textContent: rawText,
      sourceUrl: currentUrl,
      contentLength: rawText.length,
    };
  }
}

export const scraperService = new ScraperService();
