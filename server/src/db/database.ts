import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { logger } from '../middleware/logger.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string | null = null;

export function initSchema(db: DatabaseSync): void {
  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // In-memory or temporary DB might not support WAL
  }

  const schema = `
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('note', 'url')),
      title TEXT NOT NULL,
      source_url TEXT,
      raw_content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_item_id ON chunks(item_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_item_chunk ON chunks(item_id, chunk_index);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
  `;

  db.exec(schema);

  // Schema migrations for pre-existing tables created during initial scaffolding
  try {
    const itemCols = db.prepare('PRAGMA table_info(items);').all() as { name: string }[];
    if (itemCols.length > 0 && !itemCols.some((col) => col.name === 'updated_at')) {
      db.exec('ALTER TABLE items ADD COLUMN updated_at TEXT;');
      db.exec('UPDATE items SET updated_at = created_at WHERE updated_at IS NULL;');
    }

    const chunkCols = db.prepare('PRAGMA table_info(chunks);').all() as { name: string }[];
    if (chunkCols.length > 0) {
      if (!chunkCols.some((col) => col.name === 'content') && chunkCols.some((col) => col.name === 'text')) {
        db.exec('ALTER TABLE chunks RENAME COLUMN text TO content;');
      }
    }
  } catch (migErr) {
    logger.warn({ migErr }, 'Schema migration check completed');
  }
}

export function getDatabase(customPath?: string): DatabaseSync {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const targetPath =
    customPath ||
    (path.isAbsolute(config.databasePath)
      ? config.databasePath
      : path.resolve(__dirname, '../../', config.databasePath));

  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  // If switching DBs (e.g. during testing), close existing
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  if (targetPath !== ':memory:') {
    const dbDir = path.dirname(targetPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  logger.info({ path: targetPath }, 'Connecting to SQLite database');
  dbInstance = new DatabaseSync(targetPath);
  currentDbPath = targetPath;

  initSchema(dbInstance);
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    currentDbPath = null;
    logger.info('Database connection closed');
  }
}
