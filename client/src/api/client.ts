import { HealthStatus, SavedItem, QueryResult } from '../types';

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
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

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
    return (json.data !== undefined ? json.data : json) as T;
  }

  return (await response.text()) as unknown as T;
}

export const api = {
  checkHealth(): Promise<HealthStatus> {
    return request<HealthStatus>('/health');
  },

  getItems(): Promise<SavedItem[]> {
    return request<SavedItem[]>('/items');
  },

  ingest(payload: { type: 'note' | 'url'; content: string; title?: string }): Promise<SavedItem> {
    return request<SavedItem>('/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  query(question: string, topK = 4): Promise<QueryResult> {
    return request<QueryResult>('/query', {
      method: 'POST',
      body: JSON.stringify({ question, topK }),
    });
  },
};
