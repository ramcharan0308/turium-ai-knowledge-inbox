import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initSchema } from './database.js';
import { ItemsRepository } from '../repositories/items.repository.js';
import { ItemEntity, ChunkEntity } from '../types/api.js';

describe('Database and Repository', () => {
  let db: DatabaseSync;
  let repo: ItemsRepository;
  let tempDbFile: string;

  beforeEach(() => {
    tempDbFile = path.join(os.tmpdir(), `test_inbox_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    db = new DatabaseSync(tempDbFile);
    initSchema(db);
    repo = new ItemsRepository();
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

  test('initializes schema idempotently and enables foreign keys', () => {
    // Calling initSchema a second time should succeed without error
    assert.doesNotThrow(() => initSchema(db));

    const itemTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='items';")
      .get() as { name: string } | undefined;
    assert.equal(itemTable?.name, 'items');

    const chunkTable = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chunks';")
      .get() as { name: string } | undefined;
    assert.equal(chunkTable?.name, 'chunks');
  });

  test('atomically inserts an item and its chunks', () => {
    const item: ItemEntity = {
      id: 'itm_test_1',
      type: 'note',
      title: 'First Architecture Note',
      source_url: null,
      raw_content: 'This is the raw content of the first note.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const chunks: ChunkEntity[] = [
      {
        id: 'chk_test_1_0',
        item_id: 'itm_test_1',
        chunk_index: 0,
        content: 'Chunk 0 content',
        embedding: null,
        created_at: item.created_at,
      },
      {
        id: 'chk_test_1_1',
        item_id: 'itm_test_1',
        chunk_index: 1,
        content: 'Chunk 1 content',
        embedding: null,
        created_at: item.created_at,
      },
    ];

    repo.insertItemWithChunks(item, chunks, db);

    const savedItem = repo.getItemById('itm_test_1', db);
    assert.ok(savedItem);
    assert.equal(savedItem?.id, 'itm_test_1');
    assert.equal(savedItem?.title, 'First Architecture Note');

    const savedChunks = repo.getChunksByItemId('itm_test_1', db);
    assert.equal(savedChunks.length, 2);
    assert.equal(savedChunks[0].content, 'Chunk 0 content');
    assert.equal(savedChunks[1].chunk_index, 1);
  });

  test('rolls back entire transaction if a chunk insertion fails', () => {
    const item: ItemEntity = {
      id: 'itm_test_fail',
      type: 'note',
      title: 'Fail Note',
      source_url: null,
      raw_content: 'Should be rolled back.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Second chunk has duplicate ID with first chunk, violating PRIMARY KEY constraint
    const invalidChunks: ChunkEntity[] = [
      {
        id: 'chk_dup_id',
        item_id: 'itm_test_fail',
        chunk_index: 0,
        content: 'First chunk',
        embedding: null,
        created_at: item.created_at,
      },
      {
        id: 'chk_dup_id', // Duplicate PK -> triggers SQLITE_CONSTRAINT
        item_id: 'itm_test_fail',
        chunk_index: 1,
        content: 'Duplicate chunk',
        embedding: null,
        created_at: item.created_at,
      },
    ];

    assert.throws(() => repo.insertItemWithChunks(item, invalidChunks, db));

    // Confirm that the item was rolled back and does NOT exist
    const savedItem = repo.getItemById('itm_test_fail', db);
    assert.equal(savedItem, null, 'Item should not exist after transaction rollback');

    const savedChunks = repo.getChunksByItemId('itm_test_fail', db);
    assert.equal(savedChunks.length, 0);
  });

  test('cascades deletion of chunks when item is deleted (foreign key enforcement)', () => {
    const item: ItemEntity = {
      id: 'itm_cascade_test',
      type: 'note',
      title: 'Cascade Note',
      source_url: null,
      raw_content: 'Content',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const chunks: ChunkEntity[] = [
      {
        id: 'chk_cascade_1',
        item_id: 'itm_cascade_test',
        chunk_index: 0,
        content: 'Chunk',
        embedding: null,
        created_at: item.created_at,
      },
    ];

    repo.insertItemWithChunks(item, chunks, db);
    assert.equal(repo.getChunksByItemId('itm_cascade_test', db).length, 1);

    // Delete item
    db.prepare('DELETE FROM items WHERE id = ?;').run('itm_cascade_test');

    // Chunks should be automatically deleted by ON DELETE CASCADE
    assert.equal(repo.getChunksByItemId('itm_cascade_test', db).length, 0);
  });

  test('persists items after closing and reopening database connection', () => {
    const item: ItemEntity = {
      id: 'itm_persist_test',
      type: 'url',
      title: 'Persistent Article',
      source_url: 'https://example.com/persistent',
      raw_content: 'Long article text that survives reopening...',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    repo.insertItemWithChunks(item, [], db);
    db.close();

    // Reopen from disk
    const reopenedDb = new DatabaseSync(tempDbFile);
    initSchema(reopenedDb);

    const retrieved = repo.getItemById('itm_persist_test', reopenedDb);
    assert.ok(retrieved);
    assert.equal(retrieved?.title, 'Persistent Article');
    assert.equal(retrieved?.source_url, 'https://example.com/persistent');

    reopenedDb.close();
  });

  test('supports pagination with limit and offset', () => {
    for (let i = 1; i <= 5; i++) {
      const item: ItemEntity = {
        id: `itm_page_${i}`,
        type: 'note',
        title: `Note ${i}`,
        source_url: null,
        raw_content: `Content for note ${i}`,
        created_at: new Date(Date.now() + i * 1000).toISOString(),
        updated_at: new Date(Date.now() + i * 1000).toISOString(),
      };
      repo.insertItemWithChunks(item, [], db);
    }

    const page1 = repo.listItems({ limit: 2, offset: 0 }, db);
    assert.equal(page1.total, 5);
    assert.equal(page1.items.length, 2);
    // Descending order: note 5 then note 4
    assert.equal(page1.items[0].title, 'Note 5');
    assert.equal(page1.items[1].title, 'Note 4');

    const page2 = repo.listItems({ limit: 2, offset: 2 }, db);
    assert.equal(page2.items.length, 2);
    assert.equal(page2.items[0].title, 'Note 3');
    assert.equal(page2.items[1].title, 'Note 2');

    const page3 = repo.listItems({ limit: 2, offset: 4 }, db);
    assert.equal(page3.items.length, 1);
    assert.equal(page3.items[0].title, 'Note 1');
  });
});
