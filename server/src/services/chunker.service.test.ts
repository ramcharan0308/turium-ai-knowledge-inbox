import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ChunkerService } from './chunker.service.js';

describe('ChunkerService', () => {
  const chunker = new ChunkerService();

  test('returns empty array for empty or whitespace-only text', () => {
    assert.deepEqual(chunker.chunkText(''), []);
    assert.deepEqual(chunker.chunkText('   \n\t  '), []);
  });

  test('returns single chunk when text is shorter than target size', () => {
    const shortText = 'This is a brief note discussing vector indexing.';
    const chunks = chunker.chunkText(shortText, { targetSize: 600 });
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0], shortText);
  });

  test('splits multiple paragraphs at paragraph boundaries', () => {
    const p1 = 'First paragraph discussing database indexing strategies and how B-trees differ from vector HNSW.';
    const p2 = 'Second paragraph explaining why cosine similarity on normalized vectors reduces to standard dot product.';
    const p3 = 'Third paragraph analyzing why small chunks retain higher factual precision during RAG generation.';
    const fullText = `${p1}\n\n${p2}\n\n${p3}`;

    // Target size small enough to trigger split between paragraphs
    const chunks = chunker.chunkText(fullText, { targetSize: 150, overlap: 30 });
    assert.ok(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);
    assert.ok(chunks[0].includes('First paragraph'));
    assert.ok(chunks.some((c) => c.includes('Second paragraph')));
  });

  test('prefers sentence boundaries when splitting a long paragraph', () => {
    const s1 = 'Sentence one describes the problem of retrieval precision in modern systems.';
    const s2 = 'Sentence two discusses how token chunking affects dense vector clustering.';
    const s3 = 'Sentence three highlights empirical benchmarks on standard question answering datasets.';
    const longParagraph = `${s1} ${s2} ${s3}`;

    const chunks = chunker.chunkText(longParagraph, { targetSize: 100, overlap: 20 });
    assert.ok(chunks.length >= 2);
    // Chunks should not terminate mid-word
    for (const chunk of chunks) {
      assert.ok(chunk.endsWith('.') || chunk.endsWith('systems') || chunk.endsWith('datasets') || chunk.endsWith('clustering.'));
    }
  });

  test('maintains boundary overlap between successive chunks', () => {
    const paragraph =
      'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega. ' +
      'Repeat alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega. ' +
      'Third cycle alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega.';

    const chunks = chunker.chunkText(paragraph, { targetSize: 120, overlap: 40 });
    assert.ok(chunks.length >= 2);

    // Verify overlap: some tail of chunk N must appear in chunk N+1
    for (let i = 0; i < chunks.length - 1; i++) {
      const current = chunks[i];
      const next = chunks[i + 1];
      const currentWords = current.split(/\s+/);
      const lastTwoWords = currentWords.slice(-2).join(' ');
      const hasOverlap = next.includes(lastTwoWords) || currentWords.some((w) => w.length > 4 && next.includes(w));
      assert.ok(hasOverlap, `Expected overlap between chunk ${i} and ${i + 1}`);
    }
  });

  test('handles long continuous text with zero spaces without infinite loop', () => {
    const unbroken = 'X'.repeat(1500);
    const chunks = chunker.chunkText(unbroken, { targetSize: 400, overlap: 50 });
    assert.ok(chunks.length >= 3);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 400);
      assert.ok(chunk.startsWith('X'));
    }
  });

  test('handles multilingual and unicode characters correctly', () => {
    const unicodeText =
      '自然言語処理とベクトル検索の研究。 ' +
      'Machine learning model with accent: crème brûlée and café. ' +
      'Emoji icons: 🚀 📚 🔍 highlighting knowledge retrieval and context windows. ' +
      'Mathematical expressions: f(x) = x · y / (||x|| * ||y||).';

    const chunks = chunker.chunkText(unicodeText, { targetSize: 100, overlap: 25 });
    assert.ok(chunks.length >= 2);
    assert.ok(chunks.some((c) => c.includes('自然言語処理')));
    assert.ok(chunks.some((c) => c.includes('crème brûlée')));
    assert.ok(chunks.some((c) => c.includes('🚀')));
  });

  test('is completely deterministic for identical input', () => {
    const text = 'Deterministic test string. '.repeat(50);
    const run1 = chunker.chunkText(text, { targetSize: 300, overlap: 50 });
    const run2 = chunker.chunkText(text, { targetSize: 300, overlap: 50 });
    assert.deepEqual(run1, run2);
  });
});
