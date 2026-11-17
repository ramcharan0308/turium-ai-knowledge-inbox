import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { getDatabase, closeDatabase } from '../db/database.js';
import { ScraperService } from '../services/scraper.service.js';
import { AppError, ErrorCode } from '../types/api.js';

describe('Ingestion and Items API', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    process.env.AI_MODE = 'demo';
    // In-memory test database
    getDatabase(':memory:');
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    closeDatabase();
  });

  test('POST /ingest with valid note returns 201 and stores chunks', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'API Test Note',
        content: 'This is the note content to be ingested and indexed for future semantic retrieval.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.type, 'note');
    assert.equal(json.data.title, 'API Test Note');
    assert.ok(json.data.id.startsWith('itm_'));
    assert.equal(json.data.chunkCount, 1);
    assert.equal(json.data.indexingStatus, 'ready');
  });

  test('POST /ingest automatically derives title if omitted', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        content: 'Automated Title Line\nSecond line explaining details.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.title, 'Automated Title Line');
  });

  test('POST /ingest rejects empty note content with 400 validation error', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'Empty Note',
        content: '   ',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('POST /ingest rejects unsupported type with 400', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pdf',
        content: 'some text',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('POST /ingest rejects note exceeding max length (100k chars) with 400', async () => {
    const oversizedContent = 'a'.repeat(100001);
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        content: oversizedContent,
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('POST /ingest rejects SSRF loopback address (127.0.0.1) with 422', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'url',
        content: 'http://127.0.0.1:8080/admin',
      }),
    });

    assert.equal(res.status, 422);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'SSRF_RESTRICTED');
  });

  test('POST /ingest rejects SSRF cloud metadata endpoint (169.254.169.254) with 422', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'url',
        content: 'http://169.254.169.254/latest/meta-data/',
      }),
    });

    assert.equal(res.status, 422);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'SSRF_RESTRICTED');
  });

  test('POST /ingest rejects SSRF localhost domain with 422', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'url',
        content: 'http://localhost:3000/api',
      }),
    });

    assert.equal(res.status, 422);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'SSRF_RESTRICTED');
  });

  test('POST /ingest rejects SSRF private IPv4 subnets (10.0.0.1, 192.168.1.1) with 422', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'url',
        content: 'http://192.168.1.1/router',
      }),
    });

    assert.equal(res.status, 422);
    const json = await res.json();
    assert.equal(json.error.code, 'SSRF_RESTRICTED');
  });

  test('POST /ingest rejects non-http protocols (file://, ftp://) with 422', async () => {
    const res = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'url',
        content: 'file:///etc/passwd',
      }),
    });

    assert.equal(res.status, 422);
    const json = await res.json();
    assert.equal(json.error.code, 'SSRF_RESTRICTED');
  });

  test('GET /items lists ingested items in descending order with total count', async () => {
    const res = await fetch(`${baseUrl}/items?limit=10&offset=0`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.meta.total >= 2);
    assert.equal(json.meta.limit, 10);
    assert.equal(json.meta.offset, 0);

    const firstItem = json.data[0];
    assert.ok(firstItem.id);
    assert.ok(firstItem.title);
    assert.ok(firstItem.snippet);
    assert.ok(firstItem.chunkCount >= 1);
    assert.equal(firstItem.indexingStatus, 'ready');
  });
});

describe('ScraperService Unit and SSRF Edge Cases', () => {
  test('correctly identifies restricted IP ranges', () => {
    const scraper = new ScraperService();

    // Loopback
    assert.equal(scraper.isRestrictedIp('127.0.0.1'), true);
    assert.equal(scraper.isRestrictedIp('127.255.255.254'), true);
    assert.equal(scraper.isRestrictedIp('::1'), true);
    assert.equal(scraper.isRestrictedIp('::ffff:127.0.0.1'), true);

    // RFC 1918 Private
    assert.equal(scraper.isRestrictedIp('10.0.0.1'), true);
    assert.equal(scraper.isRestrictedIp('172.16.0.1'), true);
    assert.equal(scraper.isRestrictedIp('172.31.255.255'), true);
    assert.equal(scraper.isRestrictedIp('192.168.1.100'), true);

    // Link-local & Metadata
    assert.equal(scraper.isRestrictedIp('169.254.169.254'), true);
    assert.equal(scraper.isRestrictedIp('169.254.1.1'), true);
    assert.equal(scraper.isRestrictedIp('fe80::1'), true);

    // Carrier Grade NAT
    assert.equal(scraper.isRestrictedIp('100.64.0.1'), true);
    assert.equal(scraper.isRestrictedIp('100.127.255.255'), true);

    // Unique Local IPv6
    assert.equal(scraper.isRestrictedIp('fc00::1'), true);
    assert.equal(scraper.isRestrictedIp('fd12:3456:789a::1'), true);

    // Public Valid IPs
    assert.equal(scraper.isRestrictedIp('93.184.216.34'), false); // example.com
    assert.equal(scraper.isRestrictedIp('8.8.8.8'), false); // Google DNS
    assert.equal(scraper.isRestrictedIp('1.1.1.1'), false); // Cloudflare DNS
  });

  test('parses and extracts main article content, title, and canonical URL from HTML', () => {
    const scraper = new ScraperService();
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Blog Post Title</title>
          <meta property="og:title" content="OpenGraph Article Title" />
          <link rel="canonical" href="https://example.com/canonical-post" />
        </head>
        <body>
          <nav><a href="/">Home</a><a href="/about">About</a></nav>
          <header><h1>Site Banner</h1></header>
          <article>
            <h1>OpenGraph Article Title</h1>
            <p>This is the first paragraph of meaningful article content discussing vector databases.</p>
            <p>Here is a second paragraph comparing dense embeddings with sparse lexical search.</p>
          </article>
          <footer><p>Copyright 2026</p></footer>
          <script>console.log("malicious code")</script>
        </body>
      </html>
    `;

    const scraped = scraper.extractHtml(html, 'https://example.com/post', new URL('https://example.com/post'));
    assert.equal(scraped.title, 'OpenGraph Article Title');
    assert.equal(scraped.canonicalUrl, 'https://example.com/canonical-post');
    assert.ok(scraped.textContent.includes('This is the first paragraph'));
    assert.ok(scraped.textContent.includes('second paragraph comparing'));
    // Should NOT contain scripts, footer, or navigation
    assert.ok(!scraped.textContent.includes('malicious code'));
    assert.ok(!scraped.textContent.includes('Copyright 2026'));
  });

  test('rejects pages where meaningful content cannot be extracted (e.g. JS empty shell)', () => {
    const scraper = new ScraperService();
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>React App</title></head>
        <body>
          <div id="root"></div>
          <script src="/bundle.js"></script>
        </body>
      </html>
    `;

    assert.throws(
      () => scraper.extractHtml(html, 'https://example.com/spa', new URL('https://example.com/spa')),
      (err: unknown) => {
        return err instanceof Error && err.message.includes('Unable to extract readable text content');
      }
    );
  });

  test('rejects redirects that hop to restricted private IP destinations', async () => {
    // Mock fetch where initial URL redirects to 127.0.0.1
    const mockFetch: typeof fetch = async (url) => {
      if (String(url).includes('public-site.com')) {
        return new Response(null, {
          status: 302,
          headers: { Location: 'http://127.0.0.1:8080/secret' },
        });
      }
      return new Response('should not reach here', { status: 200 });
    };

    const mockDns = async (hostname: string) => {
      if (hostname === 'public-site.com') {
        return [{ address: '93.184.216.34', family: 4 }];
      }
      return [{ address: '127.0.0.1', family: 4 }];
    };

    const scraper = new ScraperService({
      fetchFn: mockFetch,
      dnsLookupFn: mockDns,
    });

    await assert.rejects(
      async () => scraper.scrapeUrl('http://public-site.com/redirect-attack'),
      (err: unknown) => {
        return err instanceof Error && err.message.includes('restricted');
      }
    );
  });

  test('successfully scrapes when URL is valid and response is within limits', async () => {
    const sampleHtml = `
      <html>
        <head><title>Scraped Document</title></head>
        <body>
          <article>
            <p>This is a completely valid scraped document retrieved from a mock server for test purposes.</p>
          </article>
        </body>
      </html>
    `;

    const mockFetch: typeof fetch = async () => {
      return new Response(sampleHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    };

    const mockDns = async () => [{ address: '93.184.216.34', family: 4 }];

    const scraper = new ScraperService({
      fetchFn: mockFetch,
      dnsLookupFn: mockDns,
    });

    const result = await scraper.scrapeUrl('https://example.com/doc');
    assert.equal(result.title, 'Scraped Document');
    assert.ok(result.textContent.includes('completely valid scraped document'));
  });

  test('rejects unsupported binary content types (e.g. application/pdf) with 415', async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      });
    };
    const mockDns = async () => [{ address: '93.184.216.34', family: 4 }];

    const scraper = new ScraperService({
      fetchFn: mockFetch,
      dnsLookupFn: mockDns,
    });

    await assert.rejects(
      async () => scraper.scrapeUrl('https://example.com/document.pdf'),
      (err: unknown) => {
        return err instanceof Error && err.message.includes('Unsupported Content-Type');
      }
    );
  });

  test('blocks connection-level DNS rebinding when socket lookup resolves to restricted destination', async () => {
    const mockPreflightDns = async () => [{ address: '93.184.216.34', family: 4 }];

    // Simulates connection-time interception where undici socket aborts on restricted IP
    const mockFetch: typeof fetch = async () => {
      const err = new TypeError('fetch failed');
      (err as { cause?: unknown }).cause = new AppError(
        422,
        ErrorCode.SSRF_RESTRICTED,
        'Connection to restricted IP address 127.0.0.1 blocked by SSRF firewall.'
      );
      throw err;
    };

    const scraper = new ScraperService({
      fetchFn: mockFetch,
      dnsLookupFn: mockPreflightDns,
    });

    await assert.rejects(
      async () => scraper.scrapeUrl('https://malicious-rebind.com/attack'),
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 422);
        assert.equal(err.code, 'SSRF_RESTRICTED');
        return true;
      }
    );
  });
});
