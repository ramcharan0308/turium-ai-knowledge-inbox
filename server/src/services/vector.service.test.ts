import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initSchema } from '../db/database.js';
import { ItemsRepository } from '../repositories/items.repository.js';
import { VectorService } from './vector.service.js';
import { EmbeddingService } from './embedding.service.js';
import { ItemEntity, ChunkEntity } from '../types/api.js';

describe('VectorService Semantic Search', () => {
  let db: DatabaseSync;
  let repo: ItemsRepository;
  let tempDbFile: string;
  let embeddingSvc: EmbeddingService;
  let vectorSvc: VectorService;

  beforeEach(() => {
    tempDbFile = path.join(os.tmpdir(), `test_vector_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    db = new DatabaseSync(tempDbFile);
    initSchema(db);
    repo = new ItemsRepository(db);

    // Use a lightweight 4-dimension embedding service for deterministic geometric testing
    embeddingSvc = new EmbeddingService({
      dimensions: 4,
      model: 'test-dim-4',
      mode: 'demo',
    });

    vectorSvc = new VectorService(embeddingSvc, repo);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // ignore
    }
    if (fs.existsSync(tempDbFile)) {
      try {
        fs.unlinkSync(tempDbFile);
      } catch {
        // ignore
      }
    }
  });

  test('calculates exact cosine similarity between unit vectors via dot product', () => {
    const a = [1, 0, 0, 0];
    const b = [1, 0, 0, 0];
    assert.equal(vectorSvc.cosineSimilarity(a, b), 1);

    const orthogonal = [0, 1, 0, 0];
    assert.equal(vectorSvc.cosineSimilarity(a, orthogonal), 0);

    const opposite = [-1, 0, 0, 0];
    assert.equal(vectorSvc.cosineSimilarity(a, opposite), -1);

    const partial = [0.6, 0.8, 0, 0];
    // a dot partial = 0.6 * 1 = 0.6
    assert.ok(Math.abs(vectorSvc.cosineSimilarity(a, partial) - 0.6) < 1e-6);
  });

  test('correctly ranks chunks by descending cosine similarity', async () => {
    const now = new Date().toISOString();
    const item: ItemEntity = {
      id: 'itm_rank_1',
      type: 'note',
      title: 'Vector Math Note',
      source_url: null,
      raw_content: 'Content about vectors and geometry.',
      created_at: now,
      updated_at: now,
      indexing_status: 'ready',
    };

    // Vector A is identical to query [1, 0, 0, 0] (sim = 1.0)
    // Vector B is partial match [0.7071, 0.7071, 0, 0] (sim = ~0.707)
    // Vector C is low match [0.2, 0.9798, 0, 0] (sim = 0.2)
    const chunks: ChunkEntity[] = [
      {
        id: 'chk_low',
        item_id: 'itm_rank_1',
        chunk_index: 0,
        content: 'Low similarity chunk',
        embedding: JSON.stringify([0.2, 0.9798, 0, 0]),
        embedding_provider: 'demo',
        embedding_model: 'test-dim-4',
        embedding_dimensions: 4,
        created_at: now,
      },
      {
        id: 'chk_high',
        item_id: 'itm_rank_1',
        chunk_index: 1,
        content: 'High similarity chunk',
        embedding: JSON.stringify([1, 0, 0, 0]),
        embedding_provider: 'demo',
        embedding_model: 'test-dim-4',
        embedding_dimensions: 4,
        created_at: now,
      },
      {
        id: 'chk_medium',
        item_id: 'itm_rank_1',
        chunk_index: 2,
        content: 'Medium similarity chunk',
        embedding: JSON.stringify([0.7071, 0.7071, 0, 0]),
        embedding_provider: 'demo',
        embedding_model: 'test-dim-4',
        embedding_dimensions: 4,
        created_at: now,
      },
    ];

    repo.insertItemWithChunks(item, chunks, db);

    // Mock embed method to return query vector [1, 0, 0, 0]
    const customEmbeddingSvc = new EmbeddingService({
      dimensions: 4,
      model: 'test-dim-4',
      mode: 'live',
      client: {
        models: {
          embedContent: async () => ({
            embedding: { values: [1, 0, 0, 0] },
          }),
        },
      },
    });

    const customVectorSvc = new VectorService(customEmbeddingSvc, repo);

    const { results } = await customVectorSvc.search('vector query', 3, 0.1);
    assert.equal(results.length, 3);
    assert.equal(results[0].chunkId, 'chk_high');
    assert.equal(results[0].similarityScore, 1);
    assert.equal(results[1].chunkId, 'chk_medium');
    assert.equal(results[2].chunkId, 'chk_low');
  });

  test('returns empty array when inbox is empty or has no indexed chunks', async () => {
    const { results } = await vectorSvc.search('anything', 4);
    assert.deepEqual(results, []);
  });

  test('ignores chunks from different embedding models or dimensions', () => {
    const now = new Date().toISOString();
    const item: ItemEntity = {
      id: 'itm_model_mismatch',
      type: 'note',
      title: 'Incompatible Model Note',
      source_url: null,
      raw_content: 'Content',
      created_at: now,
      updated_at: now,
      indexing_status: 'ready',
    };

    // Stored with 'old-model' instead of 'test-dim-4'
    const chunks: ChunkEntity[] = [
      {
        id: 'chk_mismatch',
        item_id: 'itm_model_mismatch',
        chunk_index: 0,
        content: 'Chunk with different model',
        embedding: JSON.stringify([1, 0, 0, 0]),
        embedding_provider: 'gemini',
        embedding_model: 'old-model',
        embedding_dimensions: 4,
        created_at: now,
      },
    ];

    repo.insertItemWithChunks(item, chunks, db);

    const candidates = repo.getCompatibleChunks('test-dim-4', 4, db);
    assert.equal(candidates.length, 0, 'Should not match chunks from different models');
  });

  test('ignores unready items (pending or failed)', () => {
    const now = new Date().toISOString();
    const pendingItem: ItemEntity = {
      id: 'itm_pending_only',
      type: 'note',
      title: 'Pending Note',
      source_url: null,
      raw_content: 'Content',
      created_at: now,
      updated_at: now,
      indexing_status: 'pending',
    };

    const chunks: ChunkEntity[] = [
      {
        id: 'chk_pending_1',
        item_id: 'itm_pending_only',
        chunk_index: 0,
        content: 'Chunk of pending item',
        embedding: JSON.stringify([1, 0, 0, 0]),
        embedding_provider: 'demo',
        embedding_model: 'test-dim-4',
        embedding_dimensions: 4,
        created_at: now,
      },
    ];

    repo.insertItemWithChunks(pendingItem, chunks, db);

    const candidates = repo.getCompatibleChunks('test-dim-4', 4, db);
    assert.equal(candidates.length, 0, 'Should not return chunks from pending items');
  });
});
