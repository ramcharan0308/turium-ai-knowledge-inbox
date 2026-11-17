import express, { Express } from 'express';
import cors from 'cors';
import { httpLogger } from './middleware/logger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { healthRouter } from './routes/health.route.js';
import { ingestRouter } from './routes/ingest.route.js';
import { itemsRouter } from './routes/items.route.js';
import { queryRouter } from './routes/query.route.js';

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

  // Active Core APIs
  app.use(ingestRouter);
  app.use(itemsRouter);
  app.use(queryRouter);

  // Centralized error handling middleware
  app.use(errorHandler);

  return app;
}
