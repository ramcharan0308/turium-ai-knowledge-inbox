import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getDatabase, closeDatabase } from '../db/database.js';
import { itemsRepository } from '../repositories/items.repository.js';
import { indexItemChunks, recoverPendingItems } from '../routes/ingest.route.js';
import { ItemEntity, ChunkEntity } from '../types/api.js';

describe('Indexing Lifecycle and Recovery', () => {
  let db: DatabaseSync;
  let tempDbFile: string;

  beforeEach(() => {
    process.env.AI_MODE = 'demo';
    tempDbFile = path.join(os.tmpdir(), `test_lifecycle_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    db = getDatabase(tempDbFile);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(tempDbFile)) {
      try {
        fs.unlinkSync(tempDbFile);
      } catch {
        // ignore
      }
    }
  });

  test('item transitions from pending to ready when chunk embeddings are generated', async () => {
    const now = new Date().toISOString();
    const itemId = 'itm_lifecycle_success';

    const item: ItemEntity = {
      id: itemId,
      type: 'note',
      title: 'Lifecycle Test Note',
      source_url: null,
      raw_content: 'Some raw content to test status progression.',
      created_at: now,
      updated_at: now,
      indexing_status: 'pending',
    };

    const chunks: ChunkEntity[] = [
      {
        id: 'chk_life_1',
        item_id: itemId,
        chunk_index: 0,
        content: 'Some raw content to test status progression.',
        embedding: null,
        created_at: now,
      },
    ];

    itemsRepository.insertItemWithChunks(item, chunks, db);

    // Initial state check
    const initialItem = itemsRepository.getItemById(itemId, db);
    assert.equal(initialItem?.indexing_status, 'pending');

    // Execute indexing
    const result = await indexItemChunks(itemId, chunks);
    assert.equal(result.status, 'ready');

    // Post-indexing verification
    const updatedItem = itemsRepository.getItemById(itemId, db);
    assert.equal(updatedItem?.indexing_status, 'ready');
    assert.equal(updatedItem?.indexing_error, null);

    const updatedChunks = itemsRepository.getChunksByItemId(itemId, db);
    assert.equal(updatedChunks.length, 1);
    assert.ok(updatedChunks[0].embedding !== null);
    assert.equal(updatedChunks[0].embedding_model, 'demo-hash-768');
    assert.equal(updatedChunks[0].embedding_dimensions, 768);
  });

  test('item transitions from pending to failed when embedding generation fails', async () => {
    // Switch to live mode with no key to force provider auth error
    delete process.env.GEMINI_API_KEY;
    process.env.AI_MODE = 'live';

    const now = new Date().toISOString();
    const itemId = 'itm_lifecycle_failure';

    const item: ItemEntity = {
      id: itemId,
      type: 'note',
      title: 'Failing Ingestion Note',
      source_url: null,
      raw_content: 'This ingestion will fail because GEMINI_API_KEY is missing.',
      created_at: now,
      updated_at: now,
      indexing_status: 'pending',
    };

    const chunks: ChunkEntity[] = [
      {
        id: 'chk_fail_1',
        item_id: itemId,
        chunk_index: 0,
        content: 'This ingestion will fail because GEMINI_API_KEY is missing.',
        embedding: null,
        created_at: now,
      },
    ];

    itemsRepository.insertItemWithChunks(item, chunks, db);

    const result = await indexItemChunks(itemId, chunks);
    assert.equal(result.status, 'failed');
    assert.ok(result.error?.includes('GEMINI_API_KEY is not configured'));

    const failedItem = itemsRepository.getItemById(itemId, db);
    assert.equal(failedItem?.indexing_status, 'failed');
    assert.ok(failedItem?.indexing_error?.includes('GEMINI_API_KEY is not configured'));

    // Chunks embedding remains null
    const chunkAfterFailure = itemsRepository.getChunksByItemId(itemId, db);
    assert.equal(chunkAfterFailure[0].embedding, null);
  });

  test('recoverPendingItems successfully indexes items left in pending or failed status', async () => {
    process.env.AI_MODE = 'demo';
    const now = new Date().toISOString();

    const pendingItem1: ItemEntity = {
      id: 'itm_rec_1',
      type: 'note',
      title: 'Unfinished Ingestion 1',
      source_url: null,
      raw_content: 'Unfinished item 1 content.',
      created_at: now,
      updated_at: now,
      indexing_status: 'pending',
    };
    const chunks1: ChunkEntity[] = [
      {
        id: 'chk_rec_1',
        item_id: 'itm_rec_1',
        chunk_index: 0,
        content: 'Unfinished item 1 content.',
        embedding: null,
        created_at: now,
      },
    ];

    const failedItem2: ItemEntity = {
      id: 'itm_rec_2',
      type: 'note',
      title: 'Unfinished Ingestion 2',
      source_url: null,
      raw_content: 'Unfinished item 2 content.',
      created_at: now,
      updated_at: now,
      indexing_status: 'failed',
      indexing_error: 'Simulated prior failure',
    };
    const chunks2: ChunkEntity[] = [
      {
        id: 'chk_rec_2',
        item_id: 'itm_rec_2',
        chunk_index: 0,
        content: 'Unfinished item 2 content.',
        embedding: null,
        created_at: now,
      },
    ];

    itemsRepository.insertItemWithChunks(pendingItem1, chunks1, db);
    itemsRepository.insertItemWithChunks(failedItem2, chunks2, db);

    // Run recovery
    const recoveredCount = await recoverPendingItems();
    assert.equal(recoveredCount, 2);

    // Verify both items are now 'ready'
    const item1 = itemsRepository.getItemById('itm_rec_1', db);
    const item2 = itemsRepository.getItemById('itm_rec_2', db);
    assert.equal(item1?.indexing_status, 'ready');
    assert.equal(item2?.indexing_status, 'ready');

    // Verify both chunks have embeddings
    const c1 = itemsRepository.getChunksByItemId('itm_rec_1', db);
    const c2 = itemsRepository.getChunksByItemId('itm_rec_2', db);
    assert.ok(c1[0].embedding !== null);
    assert.ok(c2[0].embedding !== null);
  });

  test('re-indexing is idempotent and does not create duplicate chunks', async () => {
    process.env.AI_MODE = 'demo';
    const now = new Date().toISOString();
    const itemId = 'itm_idempotent';

    const item: ItemEntity = {
      id: itemId,
      type: 'note',
      title: 'Idempotency Note',
      source_url: null,
      raw_content: 'Testing idempotency of indexing.',
      created_at: now,
      updated_at: now,
      indexing_status: 'pending',
    };
    const chunks: ChunkEntity[] = [
      {
        id: 'chk_idem_1',
        item_id: itemId,
        chunk_index: 0,
        content: 'Testing idempotency of indexing.',
        embedding: null,
        created_at: now,
      },
    ];

    itemsRepository.insertItemWithChunks(item, chunks, db);

    // Index once
    await indexItemChunks(itemId, chunks);
    const chunksFirstPass = itemsRepository.getChunksByItemId(itemId, db);
    assert.equal(chunksFirstPass.length, 1);

    // Index a second time (e.g. recovery retry)
    await indexItemChunks(itemId, chunks);
    const chunksSecondPass = itemsRepository.getChunksByItemId(itemId, db);
    assert.equal(chunksSecondPass.length, 1);
    assert.equal(chunksSecondPass[0].id, 'chk_idem_1');
  });
});
