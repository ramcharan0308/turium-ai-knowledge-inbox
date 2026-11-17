/**
 * Standard API Response envelope, Domain entities, and Error types
 */

export type ItemType = 'note' | 'url';

export interface ItemEntity {
  id: string;
  type: ItemType;
  title: string;
  source_url: string | null;
  raw_content: string;
  created_at: string;
  updated_at: string;
}

export interface ChunkEntity {
  id: string;
  item_id: string;
  chunk_index: number;
  content: string;
  embedding: string | null;
  created_at: string;
}

export interface ItemListItem {
  id: string;
  type: ItemType;
  title: string;
  sourceUrl: string | null;
  snippet: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  indexingStatus: 'pending' | 'indexed';
}

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
}

export interface ApiResponseError {
  success: false;
  error: ApiErrorDetail;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  SSRF_RESTRICTED = 'SSRF_RESTRICTED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  UPSTREAM_TIMEOUT = 'UPSTREAM_TIMEOUT',
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
  PROVIDER_AUTH_ERROR = 'PROVIDER_AUTH_ERROR',
  PROVIDER_RATE_LIMIT = 'PROVIDER_RATE_LIMIT',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
