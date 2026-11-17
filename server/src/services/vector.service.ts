import { itemsRepository, ItemsRepository, HydratedChunk } from '../repositories/items.repository.js';
import { embeddingService, EmbeddingService } from './embedding.service.js';
import { ItemType } from '../types/api.js';
import { logger } from '../middleware/logger.middleware.js';

export interface ScoredChunk {
  chunkId: string;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  sourceUrl: string | null;
  chunkIndex: number;
  snippet: string;
  similarityScore: number;
}

export class VectorService {
  private embeddingSvc: EmbeddingService;
  private repo: ItemsRepository;

  constructor(embeddingSvc?: EmbeddingService, repo?: ItemsRepository) {
    this.embeddingSvc = embeddingSvc || embeddingService;
    this.repo = repo || itemsRepository;
  }

  /**
   * Calculates cosine similarity between two unit-normalized vectors via dot product
   */
  public cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return -1;
    }

    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  /**
   * Search for top-K semantically relevant chunks for a user question
   */
  public async search(
    question: string,
    topK = 4,
    minSimilarity = 0.1
  ): Promise<{ results: ScoredChunk[]; queryVector: number[]; mode: 'live' | 'demo' }> {
    const clampedTopK = Math.max(1, Math.min(10, topK));

    // 1. Generate Query Vector
    const queryEmbed = await this.embeddingSvc.embed(question, 'RETRIEVAL_QUERY');
    const qVec = queryEmbed.vector;

    // 2. Load all indexed chunks matching the active embedding model and dimensions
    const candidates: HydratedChunk[] = this.repo.getCompatibleChunks(
      queryEmbed.model,
      queryEmbed.dimensions
    );

    if (candidates.length === 0) {
      logger.debug({ count: 0, model: queryEmbed.model }, 'No compatible indexed chunks found in database');
      return { results: [], queryVector: qVec, mode: queryEmbed.provider === 'demo' ? 'demo' : 'live' };
    }

    const scored: ScoredChunk[] = [];

    // 3. Score every candidate chunk
    for (const chunk of candidates) {
      if (!chunk.embedding) continue;

      let chunkVec: number[];
      try {
        chunkVec = JSON.parse(chunk.embedding);
      } catch {
        continue;
      }

      if (!Array.isArray(chunkVec) || chunkVec.length !== queryEmbed.dimensions) {
        continue;
      }

      const score = this.cosineSimilarity(qVec, chunkVec);
      if (score < minSimilarity) {
        continue;
      }

      scored.push({
        chunkId: chunk.id,
        itemId: chunk.item_id,
        itemTitle: chunk.item_title,
        itemType: chunk.item_type,
        sourceUrl: chunk.source_url,
        chunkIndex: chunk.chunk_index,
        snippet: chunk.content,
        similarityScore: Math.round(score * 1000) / 1000,
      });
    }

    // 4. Stable rank ordering: score DESC -> item_id ASC -> chunk_index ASC
    scored.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }
      if (a.itemId !== b.itemId) {
        return a.itemId.localeCompare(b.itemId);
      }
      return a.chunkIndex - b.chunkIndex;
    });

    const results = scored.slice(0, clampedTopK);
    return {
      results,
      queryVector: qVec,
      mode: queryEmbed.provider === 'demo' ? 'demo' : 'live',
    };
  }
}

export const vectorService = new VectorService();
