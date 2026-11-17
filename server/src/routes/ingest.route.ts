import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { scraperService } from '../services/scraper.service.js';
import { chunkerService } from '../services/chunker.service.js';
import { itemsRepository } from '../repositories/items.repository.js';
import { ItemEntity, ChunkEntity, ItemListItem, ApiResponseSuccess, AppError, ErrorCode } from '../types/api.js';

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
    };

    const chunkEntities: ChunkEntity[] = chunkTexts.map((text, index) => ({
      id: `chk_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      item_id: itemId,
      chunk_index: index,
      content: text,
      embedding: null, // Embedding generation handled in Phase 4
      created_at: now,
    }));

    // Atomically persist item and chunks
    itemsRepository.insertItemWithChunks(itemEntity, chunkEntities);

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
      indexingStatus: 'pending',
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
