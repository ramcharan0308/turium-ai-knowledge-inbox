import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { scraperService } from '../services/scraper.service.js';
import { chunkerService } from '../services/chunker.service.js';
import { embeddingService } from '../services/embedding.service.js';
import { itemsRepository } from '../repositories/items.repository.js';
import { ItemEntity, ChunkEntity, ItemListItem, ApiResponseSuccess, AppError, ErrorCode } from '../types/api.js';
import { logger } from '../middleware/logger.middleware.js';

export const ingestRouter = Router();

const IngestNoteSchema = z.object({
  type: z.literal('note'),
  title: z.string().trim().max(200, 'Title exceeds maximum length of 200 characters').optional(),
  content: z
    .string({ required_error: 'Note content is required' })
    .trim()
    .min(1, 'Note content cannot be empty')
    .max(100000, 'Note content exceeds maximum permitted length of 100,000 characters'),
});

const IngestUrlSchema = z.object({
  type: z.literal('url'),
  title: z.string().trim().max(200, 'Title exceeds maximum length of 200 characters').optional(),
  content: z
    .string({ required_error: 'URL is required' })
    .trim()
    .min(1, 'URL cannot be empty')
    .max(2048, 'URL exceeds maximum length of 2,048 characters'),
});

const IngestRequestSchema = z.discriminatedUnion('type', [IngestNoteSchema, IngestUrlSchema]);

function deriveTitleFromContent(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0) {
    return firstLine.slice(0, 60);
  }
  return 'Untitled Note';
}

/**
 * Indexes an item's chunks with embeddings and transitions status to 'ready' or 'failed'
 */
export async function indexItemChunks(
  itemId: string,
  chunks: ChunkEntity[]
): Promise<{ status: 'ready' | 'failed'; error?: string }> {
  try {
    const chunkTexts = chunks.map((c) => c.content);
    const embeddingResults = await embeddingService.embedBatch(chunkTexts, 'RETRIEVAL_DOCUMENT');

    const updates = chunks.map((chunk, idx) => ({
      id: chunk.id,
      embedding: JSON.stringify(embeddingResults[idx].vector),
      provider: embeddingResults[idx].provider,
      model: embeddingResults[idx].model,
      dimensions: embeddingResults[idx].dimensions,
    }));

    itemsRepository.updateChunkEmbeddings(updates);
    itemsRepository.updateItemIndexingStatus(itemId, 'ready', null);
    logger.info({ itemId, chunkCount: chunks.length }, 'Successfully generated embeddings and marked item ready');
    return { status: 'ready' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn({ itemId, err }, 'Failed to generate embeddings for item chunks; marking as failed');
    itemsRepository.updateItemIndexingStatus(itemId, 'failed', errorMsg);
    return { status: 'failed', error: errorMsg };
  }
}

/**
 * Recovers all pending or failed items in the database
 */
export async function recoverPendingItems(): Promise<number> {
  const pendingItems = itemsRepository.getPendingOrFailedItems();
  if (pendingItems.length === 0) {
    return 0;
  }

  logger.info({ count: pendingItems.length }, 'Recovering unindexed/pending items');
  let recoveredCount = 0;

  for (const item of pendingItems) {
    const chunks = itemsRepository.getChunksByItemId(item.id);
    if (chunks.length > 0) {
      const res = await indexItemChunks(item.id, chunks);
      if (res.status === 'ready') {
        recoveredCount++;
      }
    }
  }

  return recoveredCount;
}

ingestRouter.post('/ingest', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = IngestRequestSchema.parse(req.body);
    const now = new Date().toISOString();
    const itemId = `itm_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    let rawContent: string;
    let title: string;
    let sourceUrl: string | null = null;

    if (validated.type === 'note') {
      rawContent = validated.content;
      title = validated.title?.trim() || deriveTitleFromContent(validated.content);
    } else {
      // type === 'url'
      const scraped = await scraperService.scrapeUrl(validated.content);
      rawContent = scraped.textContent;
      title = validated.title?.trim() || scraped.title || 'Untitled Web Page';
      sourceUrl = scraped.canonicalUrl || validated.content;
    }

    if (!rawContent || rawContent.trim().length === 0) {
      throw new AppError(422, ErrorCode.VALIDATION_ERROR, 'Ingested content cannot be empty');
    }

    // Split raw content into chunks
    const chunkTexts = chunkerService.chunkText(rawContent);
    if (chunkTexts.length === 0) {
      chunkTexts.push(rawContent.trim());
    }

    const itemEntity: ItemEntity = {
      id: itemId,
      type: validated.type,
      title,
      source_url: sourceUrl,
      raw_content: rawContent,
      created_at: now,
      updated_at: now,
      indexing_status: 'pending',
      indexing_error: null,
    };

    const chunkEntities: ChunkEntity[] = chunkTexts.map((text, index) => ({
      id: `chk_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      item_id: itemId,
      chunk_index: index,
      content: text,
      embedding: null,
      created_at: now,
    }));

    // 1. Atomically persist item and chunks with 'pending' status
    itemsRepository.insertItemWithChunks(itemEntity, chunkEntities);

    // 2. Synchronous embedding indexing lifecycle
    const indexResult = await indexItemChunks(itemId, chunkEntities);

    let snippet = rawContent.slice(0, 180).trim().replace(/\s+/g, ' ');
    if (rawContent.length > 180) {
      snippet += '...';
    }

    const responseData: ItemListItem = {
      id: itemId,
      type: validated.type,
      title,
      sourceUrl,
      snippet,
      chunkCount: chunkEntities.length,
      createdAt: now,
      updatedAt: now,
      indexingStatus: indexResult.status,
      indexingError: indexResult.error || null,
    };

    const response: ApiResponseSuccess<ItemListItem> = {
      success: true,
      data: responseData,
      meta: {
        requestId: (req.id as string) || 'ingest-request',
        timestamp: now,
      },
    };

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});
