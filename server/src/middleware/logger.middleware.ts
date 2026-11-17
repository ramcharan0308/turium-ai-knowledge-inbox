import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config/env.js';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    config.nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: Request) => {
    const existing = req.headers['x-request-id'];
    if (existing && typeof existing === 'string') {
      return existing;
    }
    return crypto.randomUUID();
  },
  customSuccessMessage: (req: Request, res: Response) => {
    return `${req.method} ${req.url} completed with status ${res.statusCode}`;
  },
  customErrorMessage: (req: Request, res: Response, error: Error) => {
    return `${req.method} ${req.url} failed with status ${res.statusCode}: ${error.message}`;
  },
});
