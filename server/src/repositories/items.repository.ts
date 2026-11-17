import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/database.js';
import { ItemEntity, ChunkEntity, ItemListItem, AppError, ErrorCode } from '../types/api.js';
import { logger } from '../middleware/logger.middleware.js';

export class ItemsRepository {
  private getDb(db?: DatabaseSync): DatabaseSync {
    return db || getDatabase();
  }

  /**
   * Atomically insert an item and all its chunks within a transaction.
   * If any step fails, the entire transaction is rolled back.
   */
  public insertItemWithChunks(
    item: ItemEntity,
    chunks: ChunkEntity[],
    dbParam?: DatabaseSync
  ): void {
    const db = this.getDb(dbParam);

    try {
      db.exec('BEGIN IMMEDIATE;');

      const insertItemStmt = db.prepare(`
        INSERT INTO items (id, type, title, source_url, raw_content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `);

      insertItemStmt.run(
        item.id,
        item.type,
        item.title,
        item.source_url,
        item.raw_content,
        item.created_at,
        item.updated_at
      );

      if (chunks.length > 0) {
        const insertChunkStmt = db.prepare(`
          INSERT INTO chunks (id, item_id, chunk_index, content, embedding, created_at)
          VALUES (?, ?, ?, ?, ?, ?);
        `);

        for (const chunk of chunks) {
          insertChunkStmt.run(
            chunk.id,
            chunk.item_id,
            chunk.chunk_index,
            chunk.content,
            chunk.embedding,
            chunk.created_at
          );
        }
      }

      db.exec('COMMIT;');
      logger.debug({ itemId: item.id, chunkCount: chunks.length }, 'Persisted item and chunks atomically');
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch (rollbackErr) {
        logger.error({ rollbackErr }, 'Failed to rollback transaction');
      }
      logger.error({ err, itemId: item.id }, 'Transaction failed while inserting item with chunks');
      throw new AppError(
        500,
        ErrorCode.DATABASE_ERROR,
        'Failed to persist item and chunks in database',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  /**
   * Retrieve item by ID
   */
  public getItemById(id: string, dbParam?: DatabaseSync): ItemEntity | null {
    const db = this.getDb(dbParam);
    const stmt = db.prepare(`
      SELECT id, type, title, source_url as source_url, raw_content, created_at, updated_at
      FROM items
      WHERE id = ?;
    `);

    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) {
      return null;
    }

    return {
      id: String(row.id),
      type: row.type as ItemEntity['type'],
      title: String(row.title),
      source_url: row.source_url ? String(row.source_url) : null,
      raw_content: String(row.raw_content),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  /**
   * Retrieve chunks by item ID ordered by chunk_index
   */
  public getChunksByItemId(itemId: string, dbParam?: DatabaseSync): ChunkEntity[] {
    const db = this.getDb(dbParam);
    const stmt = db.prepare(`
      SELECT id, item_id, chunk_index, content, embedding, created_at
      FROM chunks
      WHERE item_id = ?
      ORDER BY chunk_index ASC;
    `);

    const rows = stmt.all(itemId) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      item_id: String(row.item_id),
      chunk_index: Number(row.chunk_index),
      content: String(row.content),
      embedding: row.embedding ? String(row.embedding) : null,
      created_at: String(row.created_at),
    }));
  }

  /**
   * List paginated items in descending creation order
   */
  public listItems(
    options: { limit: number; offset: number },
    dbParam?: DatabaseSync
  ): { items: ItemListItem[]; total: number } {
    const db = this.getDb(dbParam);
    const limit = Math.max(1, Math.min(100, options.limit));
    const offset = Math.max(0, options.offset);

    // Total items count
    const countRow = db.prepare('SELECT COUNT(*) as count FROM items;').get() as { count: number };
    const total = Number(countRow?.count || 0);

    const stmt = db.prepare(`
      SELECT 
        i.id,
        i.type,
        i.title,
        i.source_url as sourceUrl,
        substr(i.raw_content, 1, 180) as snippet,
        COUNT(c.id) as chunkCount,
        i.created_at as createdAt,
        i.updated_at as updatedAt
      FROM items i
      LEFT JOIN chunks c ON c.item_id = i.id
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?;
    `);

    const rows = stmt.all(limit, offset) as Record<string, unknown>[];

    const items: ItemListItem[] = rows.map((row) => {
      let snippet = String(row.snippet || '').trim().replace(/\s+/g, ' ');
      if (snippet.length >= 180) {
        snippet += '...';
      }

      return {
        id: String(row.id),
        type: row.type as ItemListItem['type'],
        title: String(row.title),
        sourceUrl: row.sourceUrl ? String(row.sourceUrl) : null,
        snippet,
        chunkCount: Number(row.chunkCount || 0),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
        indexingStatus: 'pending',
      };
    });

    return { items, total };
  }
}

export const itemsRepository = new ItemsRepository();
