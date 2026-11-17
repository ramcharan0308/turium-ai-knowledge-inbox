import { createApp } from './app.js';
import { config } from './config/env.js';
import { getDatabase, closeDatabase } from './db/database.js';
import { recoverPendingItems } from './routes/ingest.route.js';
import { logger } from './middleware/logger.middleware.js';

const app = createApp();

// Initialize database
try {
  getDatabase();
} catch (err) {
  logger.error({ err }, 'Failed to initialize database on startup');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv, mode: config.aiMode },
    `Turium AI Knowledge Inbox Server listening on port ${config.port}`
  );

  // Background recovery of any pending or unindexed items from previous runs
  recoverPendingItems()
    .then((count) => {
      if (count > 0) {
        logger.info({ recoveredCount: count }, 'Pending item recovery completed on startup');
      }
    })
    .catch((err) => {
      logger.warn({ err }, 'Background item recovery encountered an error');
    });
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    closeDatabase();
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
