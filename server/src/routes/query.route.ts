import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { vectorService } from '../services/vector.service.js';
import { ragService } from '../services/rag.service.js';
import { QueryResult, ApiResponseSuccess } from '../types/api.js';

export const queryRouter = Router();

const QueryRequestSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .trim()
    .min(1, 'Question cannot be empty')
    .max(2000, 'Question exceeds maximum length of 2,000 characters'),
  topK: z.coerce.number().int().min(1).max(10).default(4),
});

queryRouter.post('/query', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { question, topK } = QueryRequestSchema.parse(req.body);
    const now = new Date().toISOString();

    // 1. Semantic retrieval across SQLite chunks
    const searchResult = await vectorService.search(question, topK);

    // 2. Grounded LLM answer generation with citation enforcement
    const ragResult: QueryResult = await ragService.answerQuestion(question, searchResult.results);

    const response: ApiResponseSuccess<QueryResult> = {
      success: true,
      data: ragResult,
      meta: {
        requestId: (req.id as string) || 'query-request',
        timestamp: now,
        chunksRetrieved: searchResult.results.length,
      },
    };

    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});
