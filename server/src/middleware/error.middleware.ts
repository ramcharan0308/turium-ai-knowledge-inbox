import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode, ApiResponseError } from '../types/api.js';
import { logger } from './logger.middleware.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req.id as string) || (req.headers['x-request-id'] as string) || 'unknown';
  const timestamp = new Date().toISOString();

  // Zod validation error
  if (err instanceof ZodError) {
    const response: ApiResponseError = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid request payload',
        details: err.flatten().fieldErrors,
      },
      meta: {
        requestId,
        timestamp,
      },
    };
    logger.warn({ err, requestId }, 'Validation error');
    res.status(400).json(response);
    return;
  }

  // Known AppError
  if (err instanceof AppError) {
    const response: ApiResponseError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      meta: {
        requestId,
        timestamp,
      },
    };
    logger.warn({ code: err.code, message: err.message, requestId }, 'Application error');
    res.status(err.statusCode).json(response);
    return;
  }

  // JSON parse error
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    const response: ApiResponseError = {
      success: false,
      error: {
        code: ErrorCode.BAD_REQUEST,
        message: 'Malformed JSON payload in request body',
      },
      meta: {
        requestId,
        timestamp,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Unhandled / Unexpected error
  logger.error({ err, requestId }, 'Unhandled internal server error');
  const response: ApiResponseError = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected internal server error occurred',
    },
    meta: {
      requestId,
      timestamp,
    },
  };
  res.status(500).json(response);
}
