import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { logger } from '../middleware/logger.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath = path.isAbsolute(config.databasePath)
    ? config.databasePath
    : path.resolve(__dirname, '../../', config.databasePath);

  const dbDir = path.dirname(resolvedPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info({ path: resolvedPath }, 'Initializing SQLite database via node:sqlite');
  dbInstance = new DatabaseSync(resolvedPath);

  // Enable WAL mode and foreign keys
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Initialize schema
  initSchema(dbInstance);

  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  const schema = `
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('note', 'url')),
      title TEXT NOT NULL,
      source_url TEXT,
      raw_content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      embedding TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_item_id ON chunks(item_id);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
  `;

  db.exec(schema);
  logger.info('Database schema verified');
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}
