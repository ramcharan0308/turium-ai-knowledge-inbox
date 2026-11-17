import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { itemsRepository } from '../repositories/items.repository.js';
import { ItemListItem, ApiResponseSuccess } from '../types/api.js';

export const itemsRouter = Router();

const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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
