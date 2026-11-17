import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { httpLogger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { healthRouter } from './routes/health.route.js';

export function createApp(): Express {
  const app = express();

  // Basic CORS for development (allowing Vite frontend)
  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Structured HTTP request logger
  app.use(httpLogger);

  // Health and development endpoints
  app.use(healthRouter);

  // Placeholder route handlers for required assignment routes (to be implemented in subsequent phases)
  app.post('/ingest', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Endpoint POST /ingest will be implemented in Phase 3.',
      },
    });
  });

  app.get('/items', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Endpoint GET /items will be implemented in Phase 3.',
      },
    });
  });

  app.post('/query', (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Endpoint POST /query will be implemented in Phase 4.',
      },
    });
  });

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
}
