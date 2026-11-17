import { createApp } from './dist/app.js';
import { getDatabase, closeDatabase } from './dist/db/database.js';
import fs from 'node:fs';
import path from 'node:path';

const SMOKE_DB_PATH = path.resolve('./data/smoke_test.db');
const PORT = 3099;

async function runSmokeTest() {
  console.log('--- Starting Smoke Test ---');

  if (fs.existsSync(SMOKE_DB_PATH)) {
    fs.unlinkSync(SMOKE_DB_PATH);
  }

  // 1. Initialize DB & Start Server
  console.log('1. Starting initial backend server on port', PORT);
  getDatabase(SMOKE_DB_PATH);
  const app1 = createApp();
  const server1 = await new Promise((resolve) => {
    const s = app1.listen(PORT, () => resolve(s));
  });

  // 2. POST sample note to /ingest
  console.log('2. POST sample note to /ingest');
  const postRes = await fetch(`http://localhost:${PORT}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'note',
      title: 'Smoke Test Architecture Note',
      content: 'This note verifies end-to-end atomic persistence, chunking, and SQLite storage.',
    }),
  });

  const postJson = await postRes.json();
  console.log('   POST status:', postRes.status);
  console.log('   POST response item ID:', postJson.data?.id);
  console.log('   POST response chunk count:', postJson.data?.chunkCount);

  if (postRes.status !== 201 || !postJson.data?.id) {
    throw new Error('Failed to ingest note: ' + JSON.stringify(postJson));
  }

  // 3. GET /items
  console.log('3. GET /items');
  const getRes1 = await fetch(`http://localhost:${PORT}/items`);
  const getJson1 = await getRes1.json();
  console.log('   GET status:', getRes1.status);
  console.log('   GET total count:', getJson1.meta?.total);
  console.log('   GET first item title:', getJson1.data?.[0]?.title);

  if (getJson1.meta?.total !== 1 || getJson1.data?.[0]?.id !== postJson.data.id) {
    throw new Error('GET /items did not return the ingested item');
  }

  // 4. Shutdown backend server
  console.log('4. Shutting down initial backend server');
  await new Promise((resolve) => server1.close(resolve));
  closeDatabase();
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 5. Restart backend server with same database file
  console.log('5. Restarting backend server with existing database file');
  getDatabase(SMOKE_DB_PATH);
  const app2 = createApp();
  const server2 = await new Promise((resolve) => {
    const s = app2.listen(PORT, () => resolve(s));
  });

  // 6. GET /items after restart
  console.log('6. GET /items after server restart to verify persistence');
  const getRes2 = await fetch(`http://localhost:${PORT}/items`);
  const getJson2 = await getRes2.json();
  console.log('   GET status after restart:', getRes2.status);
  console.log('   GET total count after restart:', getJson2.meta?.total);
  console.log('   GET persisted item ID:', getJson2.data?.[0]?.id);
  console.log('   GET persisted item title:', getJson2.data?.[0]?.title);

  if (getJson2.meta?.total !== 1 || getJson2.data?.[0]?.id !== postJson.data.id) {
    throw new Error('Item failed to persist across server restart!');
  }

  // Clean shutdown
  console.log('7. Cleaning up smoke test resources');
  await new Promise((resolve) => server2.close(resolve));
  closeDatabase();
  if (fs.existsSync(SMOKE_DB_PATH)) {
    fs.unlinkSync(SMOKE_DB_PATH);
  }

  console.log('--- Smoke Test Succeeded: VERDICT: PASS ---');
}

runSmokeTest().catch((err) => {
  console.error('Smoke Test Failed:', err);
  process.exit(1);
});
