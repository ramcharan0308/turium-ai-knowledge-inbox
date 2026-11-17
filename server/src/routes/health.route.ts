import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { config } from '../config/env.js';
import { ApiResponseSuccess } from '../types/api.js';

export const healthRouter = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  let dbStatus = 'ok';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch {
    dbStatus = 'degraded';
  }

  const response: ApiResponseSuccess<{
    status: string;
    environment: string;
    database: string;
    nodeVersion: string;
    mockMode: boolean;
    hasOpenAiKey: boolean;
    timestamp: string;
  }> = {
    success: true,
    data: {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      environment: config.nodeEnv,
      database: dbStatus,
      nodeVersion: process.version,
      mockMode: config.useExplicitMockMode,
      hasOpenAiKey: Boolean(config.openaiApiKey && config.openaiApiKey.trim().length > 0),
      timestamp: new Date().toISOString(),
    },
    meta: {
      requestId: (req.id as string) || 'health-check',
      timestamp: new Date().toISOString(),
    },
  };

  res.status(dbStatus === 'ok' ? 200 : 503).json(response);
});
