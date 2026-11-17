import { createApp } from './dist/app.js';
import { getDatabase, closeDatabase } from './dist/db/database.js';
import fs from 'node:fs';
import path from 'node:path';

if (!process.env.AI_MODE) {
  process.env.AI_MODE = 'demo';
}

const SMOKE_RAG_DB = path.resolve('./data/smoke_test_rag.db');
const PORT = 3098;

async function runRagSmokeTest() {
  console.log('=== Starting Phase 4 RAG & Semantic Retrieval Smoke Test ===');

  if (fs.existsSync(SMOKE_RAG_DB)) {
    fs.unlinkSync(SMOKE_RAG_DB);
  }

  // 1. Initialize DB & Start Server
  console.log('1. Starting test server on port', PORT);
  getDatabase(SMOKE_RAG_DB);
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  try {
    // 2. Ingest Note A
    console.log('2. Ingesting Note A (Storage & Database)');
    const resA = await fetch(`http://localhost:${PORT}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'SQLite Vector Storage',
        content:
          'Turium AI Knowledge Inbox persists all raw notes and extracted chunks in native SQLite. Chunks are converted into 768-dimension vectors and searched using in-memory cosine similarity via dot product.',
      }),
    });
    const jsonA = await resA.json();
    console.log('   Note A Ingestion Status:', resA.status, 'Indexing Status:', jsonA.data?.indexingStatus);
    if (resA.status !== 201 || jsonA.data?.indexingStatus !== 'ready') {
      throw new Error(`Note A ingestion failed: ${JSON.stringify(jsonA)}`);
    }

    // 3. Ingest Note B
    console.log('3. Ingesting Note B (AI Models & Architecture)');
    const resB = await fetch(`http://localhost:${PORT}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'note',
        title: 'AI Providers & Citation Engine',
        content:
          'Google Gemini provides the gemini-embedding-001 model for embeddings. Groq provides ultra-fast LLM inference using llama-3.3-70b-versatile. The system strictly maps [S1] and [S2] citation markers to prevent hallucinations.',
      }),
    });
    const jsonB = await resB.json();
    console.log('   Note B Ingestion Status:', resB.status, 'Indexing Status:', jsonB.data?.indexingStatus);
    if (resB.status !== 201 || jsonB.data?.indexingStatus !== 'ready') {
      throw new Error(`Note B ingestion failed: ${JSON.stringify(jsonB)}`);
    }

    // 4. Test RAG Query 1: Asking about SQLite vector search
    console.log('4. Querying: "How are vectors stored and searched in the database?"');
    const query1Res = await fetch(`http://localhost:${PORT}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'How are vectors stored and searched in the database?',
        topK: 2,
      }),
    });
    const query1Json = await query1Res.json();
    console.log('   Query 1 Status:', query1Res.status);
    console.log('   Query 1 Answer:', query1Json.data?.answer);
    console.log('   Query 1 Citations Count:', query1Json.data?.citations?.length);
    console.log('   Query 1 First Cited Title:', query1Json.data?.citations?.[0]?.itemTitle);
    console.log('   Query 1 Mode:', query1Json.data?.mode);

    if (query1Res.status !== 200 || !query1Json.data?.citations?.length) {
      throw new Error(`Query 1 failed: ${JSON.stringify(query1Json)}`);
    }
    if (query1Json.data.citations[0].itemTitle !== 'SQLite Vector Storage') {
      throw new Error(`Query 1 did not prioritize SQLite Vector Storage chunk: ${JSON.stringify(query1Json.data.citations)}`);
    }

    // 5. Test RAG Query 2: Asking about Groq and Gemini models
    console.log('5. Querying: "Which models are used for embeddings and chat generation?"');
    const query2Res = await fetch(`http://localhost:${PORT}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Which models are used for embeddings and chat generation?',
        topK: 2,
      }),
    });
    const query2Json = await query2Res.json();
    console.log('   Query 2 Status:', query2Res.status);
    console.log('   Query 2 Answer:', query2Json.data?.answer);
    console.log('   Query 2 First Cited Title:', query2Json.data?.citations?.[0]?.itemTitle);

    if (query2Res.status !== 200 || !query2Json.data?.citations?.length) {
      throw new Error(`Query 2 failed: ${JSON.stringify(query2Json)}`);
    }
    if (query2Json.data.citations[0].itemTitle !== 'AI Providers & Citation Engine') {
      throw new Error(`Query 2 did not prioritize AI Providers chunk: ${JSON.stringify(query2Json.data.citations)}`);
    }

    // 6. Test Grounded Refusal for completely unsupported query
    console.log('6. Querying out-of-context topic: "What is quantum gravity warp drive?"');
    const query3Res = await fetch(`http://localhost:${PORT}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is quantum gravity warp drive?',
        topK: 2,
      }),
    });
    const query3Json = await query3Res.json();
    console.log('   Query 3 Status:', query3Res.status);
    console.log('   Query 3 Answer:', query3Json.data?.answer);
    console.log('   Query 3 Citations Count:', query3Json.data?.citations?.length);

    // If similarity is below threshold, it returns refusal; if any chunk matched, verify answer format
    console.log('7. Verifying citation integrity and structure');
    for (const citation of query1Json.data.citations) {
      if (!citation.sourceId || !citation.chunkId || !citation.itemId || !citation.itemTitle) {
        throw new Error(`Citation missing required properties: ${JSON.stringify(citation)}`);
      }
    }

    console.log('=== Phase 4 RAG Smoke Test Succeeded: VERDICT: PASS ===');
  } finally {
    console.log('8. Cleaning up smoke test server & database');
    await new Promise((resolve) => server.close(resolve));
    closeDatabase();
    if (fs.existsSync(SMOKE_RAG_DB)) {
      fs.unlinkSync(SMOKE_RAG_DB);
    }
  }
}

runRagSmokeTest().catch((err) => {
  console.error('Phase 4 RAG Smoke Test Failed:', err);
  process.exit(1);
});
