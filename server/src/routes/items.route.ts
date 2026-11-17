import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { itemsRepository } from '../repositories/items.repository.js';
import { ItemListItem, ItemDetail, ApiResponseSuccess, AppError, ErrorCode } from '../types/api.js';

export const itemsRouter = Router();

const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const ItemIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'Item ID cannot be empty').max(100, 'Item ID too long'),
});

itemsRouter.get('/items', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { limit, offset } = PaginationQuerySchema.parse(req.query);
    const { items, total } = itemsRepository.listItems({ limit, offset });

    const now = new Date().toISOString();
    const response: ApiResponseSuccess<ItemListItem[]> = {
      success: true,
      data: items,
      meta: {
        total,
        limit,
        offset,
        requestId: (req.id as string) || 'list-items-request',
        timestamp: now,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

itemsRouter.get('/items/:id', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { id } = ItemIdParamsSchema.parse(req.params);
    const item = itemsRepository.getItemById(id);

    if (!item) {
      throw new AppError(404, ErrorCode.NOT_FOUND, `Item not found with id: ${id}`);
    }

    const chunks = itemsRepository.getChunksByItemId(id);
    const now = new Date().toISOString();

    const itemDetail: ItemDetail = {
      id: item.id,
      type: item.type,
      title: item.title,
      sourceUrl: item.source_url,
      rawContent: item.raw_content,
      chunkCount: chunks.length,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      indexingStatus: item.indexing_status,
      indexingError: item.indexing_error,
    };

    const response: ApiResponseSuccess<ItemDetail> = {
      success: true,
      data: itemDetail,
      meta: {
        requestId: (req.id as string) || 'get-item-request',
        timestamp: now,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});
