import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from '../db/database.js';
import { ItemEntity, ChunkEntity, ItemListItem, IndexingStatus, ItemType, AppError, ErrorCode } from '../types/api.js';
import { logger } from '../middleware/logger.middleware.js';

export interface HydratedChunk extends ChunkEntity {
  item_title: string;
  item_type: ItemType;
  source_url: string | null;
}

export class ItemsRepository {
  constructor(private defaultDb?: DatabaseSync) {}

  private getDb(db?: DatabaseSync): DatabaseSync {
    return db || this.defaultDb || getDatabase();
  }

  /**
   * Atomically insert an item and all its chunks within a transaction.
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
        INSERT INTO items (id, type, title, source_url, raw_content, created_at, updated_at, indexing_status, indexing_error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);

      insertItemStmt.run(
        item.id,
        item.type,
        item.title,
        item.source_url,
        item.raw_content,
        item.created_at,
        item.updated_at,
        item.indexing_status || 'pending',
        item.indexing_error || null
      );

      if (chunks.length > 0) {
        const insertChunkStmt = db.prepare(`
          INSERT INTO chunks (id, item_id, chunk_index, content, embedding, embedding_provider, embedding_model, embedding_dimensions, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `);

        for (const chunk of chunks) {
          insertChunkStmt.run(
            chunk.id,
            chunk.item_id,
            chunk.chunk_index,
            chunk.content,
            chunk.embedding,
            chunk.embedding_provider || null,
            chunk.embedding_model || null,
            chunk.embedding_dimensions || null,
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
   * Update chunk embeddings in an atomic batch
   */
  public updateChunkEmbeddings(
    chunkEmbeddings: Array<{
      id: string;
      embedding: string;
      provider: string;
      model: string;
      dimensions: number;
    }>,
    dbParam?: DatabaseSync
  ): void {
    const db = this.getDb(dbParam);

    try {
      db.exec('BEGIN IMMEDIATE;');
      const stmt = db.prepare(`
        UPDATE chunks
        SET embedding = ?,
            embedding_provider = ?,
            embedding_model = ?,
            embedding_dimensions = ?
        WHERE id = ?;
      `);

      for (const update of chunkEmbeddings) {
        stmt.run(update.embedding, update.provider, update.model, update.dimensions, update.id);
      }
      db.exec('COMMIT;');
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // ignore
      }
      logger.error({ err }, 'Failed to update chunk embeddings');
      throw new AppError(500, ErrorCode.DATABASE_ERROR, 'Failed to update chunk embeddings in database');
    }
  }

  /**
   * Update the indexing status and optional error message of an item
   */
  public updateItemIndexingStatus(
    itemId: string,
    status: IndexingStatus,
    error: string | null = null,
    dbParam?: DatabaseSync
  ): void {
    const db = this.getDb(dbParam);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE items
      SET indexing_status = ?,
          indexing_error = ?,
          updated_at = ?
      WHERE id = ?;
    `);

    stmt.run(status, error, now, itemId);
  }

  /**
   * Retrieve item by ID
   */
  public getItemById(id: string, dbParam?: DatabaseSync): ItemEntity | null {
    const db = this.getDb(dbParam);
    const stmt = db.prepare(`
      SELECT id, type, title, source_url, raw_content, created_at, updated_at, indexing_status, indexing_error
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
      indexing_status: (row.indexing_status as IndexingStatus) || 'pending',
      indexing_error: row.indexing_error ? String(row.indexing_error) : null,
    };
  }

  /**
   * Retrieve chunks by item ID ordered by chunk_index
   */
  public getChunksByItemId(itemId: string, dbParam?: DatabaseSync): ChunkEntity[] {
    const db = this.getDb(dbParam);
    const stmt = db.prepare(`
      SELECT id, item_id, chunk_index, content, embedding, embedding_provider, embedding_model, embedding_dimensions, created_at
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
      embedding_provider: row.embedding_provider ? String(row.embedding_provider) : null,
      embedding_model: row.embedding_model ? String(row.embedding_model) : null,
      embedding_dimensions: row.embedding_dimensions ? Number(row.embedding_dimensions) : null,
      created_at: String(row.created_at),
    }));
  }

  /**
   * Retrieve unindexed or failed items for background recovery
   */
  public getPendingOrFailedItems(dbParam?: DatabaseSync): ItemEntity[] {
    const db = this.getDb(dbParam);
    const stmt = db.prepare(`
      SELECT id, type, title, source_url, raw_content, created_at, updated_at, indexing_status, indexing_error
      FROM items
      WHERE indexing_status IN ('pending', 'failed')
      ORDER BY created_at ASC;
    `);

    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      type: row.type as ItemEntity['type'],
      title: String(row.title),
      source_url: row.source_url ? String(row.source_url) : null,
      raw_content: String(row.raw_content),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      indexing_status: row.indexing_status as IndexingStatus,
      indexing_error: row.indexing_error ? String(row.indexing_error) : null,
    }));
  }

  /**
   * Retrieve all indexed chunks for semantic vector retrieval.
   * Matches model and dimensions; excludes pending or partially indexed items.
   */
  public getCompatibleChunks(
    model: string,
    dimensions: number,
    dbParam?: DatabaseSync
  ): HydratedChunk[] {
    const db = this.getDb(dbParam);
    const stmt = db.prepare(`
      SELECT 
        c.id,
        c.item_id,
        c.chunk_index,
        c.content,
        c.embedding,
        c.embedding_provider,
        c.embedding_model,
        c.embedding_dimensions,
        c.created_at,
        i.title as item_title,
        i.type as item_type,
        i.source_url
      FROM chunks c
      JOIN items i ON c.item_id = i.id
      WHERE i.indexing_status = 'ready'
        AND c.embedding IS NOT NULL
        AND c.embedding_model = ?
        AND c.embedding_dimensions = ?
      ORDER BY c.item_id ASC, c.chunk_index ASC;
    `);

    const rows = stmt.all(model, dimensions) as Record<string, unknown>[];
    return rows.map((row) => ({
      id: String(row.id),
      item_id: String(row.item_id),
      chunk_index: Number(row.chunk_index),
      content: String(row.content),
      embedding: String(row.embedding),
      embedding_provider: row.embedding_provider ? String(row.embedding_provider) : null,
      embedding_model: row.embedding_model ? String(row.embedding_model) : null,
      embedding_dimensions: row.embedding_dimensions ? Number(row.embedding_dimensions) : null,
      created_at: String(row.created_at),
      item_title: String(row.item_title),
      item_type: row.item_type as ItemType,
      source_url: row.source_url ? String(row.source_url) : null,
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
        i.updated_at as updatedAt,
        i.indexing_status as indexingStatus,
        i.indexing_error as indexingError
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
        indexingStatus: (row.indexingStatus as IndexingStatus) || 'pending',
        indexingError: row.indexingError ? String(row.indexingError) : null,
      };
    });

    return { items, total };
  }
}

export const itemsRepository = new ItemsRepository();
