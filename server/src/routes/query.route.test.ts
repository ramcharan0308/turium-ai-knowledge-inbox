import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { createApp } from '../app.js';
import { getDatabase, closeDatabase } from '../db/database.js';

describe('Query Route API (POST /query)', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    process.env.AI_MODE = 'demo';
    getDatabase(':memory:');
    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    closeDatabase();
  });

  test('POST /query returns refusal when inbox is empty', async () => {
    const res = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is the deployment procedure?',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(
      json.data.answer,
      'Based on your saved notes and articles, there is insufficient information to answer this question.'
    );
    assert.deepEqual(json.data.citations, []);
    assert.equal(json.data.mode, 'demo');
    assert.equal(json.meta.chunksRetrieved, 0);
  });

  test('POST /query successfully retrieves relevant chunks and cites sources after ingestion', async () => {
    // 1. Ingest a knowledge note
    const ingestRes = await fetch(`${baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'Project Architecture Note',
        content:
          'Turium AI Knowledge Inbox leverages Google Gemini for embeddings and Groq LLM for fast answer generation.',
      }),
    });
    assert.equal(ingestRes.status, 201);
    const ingestJson = await ingestRes.json();
    assert.equal(ingestJson.data.indexingStatus, 'ready');

    // 2. Query against ingested knowledge
    const queryRes = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Which AI providers are used in Turium AI Knowledge Inbox?',
        topK: 3,
      }),
    });

    assert.equal(queryRes.status, 200);
    const queryJson = await queryRes.json();
    assert.equal(queryJson.success, true);
    assert.ok(queryJson.data.answer.length > 0);
    assert.ok(queryJson.data.citations.length >= 1);
    assert.equal(queryJson.data.citations[0].sourceId, 'S1');
    assert.equal(queryJson.data.citations[0].itemId, ingestJson.data.id);
    assert.equal(queryJson.data.citations[0].itemTitle, 'Project Architecture Note');
    assert.equal(queryJson.meta.chunksRetrieved, 1);
  });

  test('POST /query rejects empty question with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: '   ',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('POST /query rejects oversized question exceeding 2000 characters', async () => {
    const res = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'a'.repeat(2001),
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('POST /query rejects invalid topK exceeding 10', async () => {
    const res = await fetch(`${baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Valid question',
        topK: 25,
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('POST /query rejects non-POST HTTP methods with 404 or 405', async () => {
    const res = await fetch(`${baseUrl}/query`, {
      method: 'GET',
    });

    assert.equal(res.status, 404);
  });
});
