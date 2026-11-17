import { HealthStatus, SavedItem, QueryResult, IngestResponse, ListItemsResult } from '../types';

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /**
   * Translates error code into actionable, user-friendly guidance
   */
  public getUserMessage(): string {
    switch (this.code) {
      case 'SSRF_RESTRICTED':
        return 'Security restriction: Private, localhost, and cloud metadata network destinations cannot be fetched.';
      case 'EXTRACTION_FAILED':
        return 'Unable to extract meaningful readable text from this webpage. It may require client-side JavaScript or be behind a login.';
      case 'UPSTREAM_TIMEOUT':
        return 'The remote server took too long to respond. Please verify the URL is accessible.';
      case 'PAYLOAD_TOO_LARGE':
        return 'Content is too large. Maximum supported document size is 100,000 characters.';
      case 'UNSUPPORTED_MEDIA_TYPE':
        return 'Unsupported content format. Only HTML web pages and plain-text articles are supported.';
      case 'PROVIDER_AUTH_ERROR':
        return 'AI provider authentication failed. Please verify API keys in the server environment.';
      case 'PROVIDER_RATE_LIMIT':
        return 'AI provider rate limit reached. Please wait a moment and try again.';
      case 'PROVIDER_UNAVAILABLE':
        return 'AI service is temporarily unavailable or returned invalid output. Please retry.';
      case 'VALIDATION_ERROR':
        return this.message || 'Please check your inputs and try again.';
      default:
        return this.message || 'An unexpected error occurred. Please try again.';
    }
  }
}

interface RawApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    requestId?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

async function requestRaw<T>(endpoint: string, options: RequestInit = {}): Promise<RawApiResponse<T>> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorJson = await response.json();
        throw new ApiError(
          response.status,
          errorJson.error?.code || 'UNKNOWN_ERROR',
          errorJson.error?.message || response.statusText,
          errorJson.error?.details
        );
      }
      throw new ApiError(response.status, 'HTTP_ERROR', await response.text());
    }

    if (isJson) {
      const json = await response.json();
      return json as RawApiResponse<T>;
    }

    return {
      success: true,
      data: (await response.text()) as unknown as T,
    };
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'REQUEST_ABORTED', 'Request was cancelled.');
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(0, 'NETWORK_ERROR', message);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const raw = await requestRaw<T>(endpoint, options);
  return raw.data;
}

export const api = {
  checkHealth(signal?: AbortSignal): Promise<HealthStatus> {
    return request<HealthStatus>('/health', { signal });
  },

  async getItems(options?: {
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  }): Promise<ListItemsResult> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const url = `/items?limit=${limit}&offset=${offset}`;
    const raw = await requestRaw<SavedItem[]>(url, { signal: options?.signal });
    return {
      items: raw.data || [],
      total: (raw.meta?.total as number) ?? (raw.data?.length || 0),
      limit: (raw.meta?.limit as number) ?? limit,
      offset: (raw.meta?.offset as number) ?? offset,
    };
  },

  ingest(
    payload: { type: 'note' | 'url'; content: string; title?: string },
    signal?: AbortSignal
  ): Promise<IngestResponse> {
    return request<IngestResponse>('/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    });
  },

  query(question: string, topK = 4, signal?: AbortSignal): Promise<QueryResult> {
    return request<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ question, topK }),
      signal,
    });
  },
};
