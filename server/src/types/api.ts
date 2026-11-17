/**
 * Standard API Response envelope and error types
 */

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
  SSRF_RESTRICTED = 'SSRF_RESTRICTED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
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
