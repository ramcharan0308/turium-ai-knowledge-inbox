import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RagService } from './rag.service.js';
import { ScoredChunk } from './vector.service.js';
import { AppError } from '../types/api.js';

describe('RagService Grounding and Verification', () => {
  const sampleChunks: ScoredChunk[] = [
    {
      chunkId: 'chk_1',
      itemId: 'itm_1',
      itemTitle: 'Architecture Overview',
      itemType: 'note',
      sourceUrl: null,
      chunkIndex: 0,
      snippet: 'Turium AI Knowledge Inbox uses Express, React, and SQLite.',
      similarityScore: 0.88,
    },
    {
      chunkId: 'chk_2',
      itemId: 'itm_2',
      itemTitle: 'Provider Docs',
      itemType: 'url',
      sourceUrl: 'https://docs.turium.ai/providers',
      chunkIndex: 0,
      snippet: 'Embeddings are generated with gemini-embedding-001 and answers with llama-3.3-70b-versatile.',
      similarityScore: 0.82,
    },
  ];

  test('verifyCitations preserves valid [S1] and [S2] citations with chunk metadata', () => {
    const ragSvc = new RagService({ mode: 'demo' });
    const rawAnswer = 'The system uses SQLite for persistence [S1] and Groq for chat generation [S2].';

    const { cleanedAnswer, citations } = ragSvc.verifyCitations(rawAnswer, sampleChunks);

    assert.equal(cleanedAnswer, rawAnswer);
    assert.equal(citations.length, 2);
    assert.equal(citations[0].sourceId, 'S1');
    assert.equal(citations[0].chunkId, 'chk_1');
    assert.equal(citations[0].itemTitle, 'Architecture Overview');
    assert.equal(citations[1].sourceId, 'S2');
    assert.equal(citations[1].chunkId, 'chk_2');
    assert.equal(citations[1].sourceUrl, 'https://docs.turium.ai/providers');
  });

  test('verifyCitations removes claims backed solely by phantom citations like [S9]', () => {
    const ragSvc = new RagService({ mode: 'demo' });
    const rawAnswer = 'This fact is from source one [S1]. This phantom fact came out of nowhere [S9]!';

    const { cleanedAnswer, citations } = ragSvc.verifyCitations(rawAnswer, sampleChunks);

    assert.equal(cleanedAnswer, 'This fact is from source one [S1].');
    assert.equal(citations.length, 1);
    assert.equal(citations[0].sourceId, 'S1');
  });

  test('verifyCitations returns refusal when answer contains only hallucinated citations', () => {
    const ragSvc = new RagService({ mode: 'demo' });
    const rawAnswer = 'The secret formula is XYZ [S9] and was found in sector 7 [S8].';

    const { cleanedAnswer, citations } = ragSvc.verifyCitations(rawAnswer, sampleChunks);

    assert.equal(
      cleanedAnswer,
      'Based on your saved notes and articles, there is insufficient information to answer this question.'
    );
    assert.equal(citations.length, 0);
  });

  test('verifyCitations preserves mixed sentences while stripping unsupported tags', () => {
    const ragSvc = new RagService({ mode: 'demo' });
    const rawAnswer = 'This sentence mentions valid source [S1] and unsupported source [S9].';

    const { cleanedAnswer, citations } = ragSvc.verifyCitations(rawAnswer, sampleChunks);

    assert.equal(cleanedAnswer, 'This sentence mentions valid source [S1] and unsupported source.');
    assert.equal(citations.length, 1);
    assert.equal(citations[0].sourceId, 'S1');
  });

  test('answerQuestion returns strict refusal when retrieved chunks array is empty', async () => {
    const ragSvc = new RagService({ mode: 'demo' });
    const result = await ragSvc.answerQuestion('What is the secret formula?', []);

    assert.equal(
      result.answer,
      'Based on your saved notes and articles, there is insufficient information to answer this question.'
    );
    assert.deepEqual(result.citations, []);
    assert.equal(result.mode, 'demo');
  });

  test('demo mode generates structured extractive answer with citations', async () => {
    const ragSvc = new RagService({ mode: 'demo' });
    const result = await ragSvc.answerQuestion('What database and providers are used?', sampleChunks);

    assert.ok(result.answer.length > 0);
    assert.ok(result.answer.includes('[S1]') || result.answer.includes('[S2]'));
    assert.ok(result.citations.length > 0);
    assert.equal(result.mode, 'demo');
  });

  test('live mode calls Groq chat completion and verifies citations', async () => {
    let capturedPrompt = '';
    const mockGroqClient = {
      chat: {
        completions: {
          create: async (params: {
            model: string;
            messages: Array<{ role: string; content: string }>;
          }) => {
            capturedPrompt = params.messages[1].content;
            return {
              choices: [
                {
                  message: {
                    content:
                      'The application is built with SQLite [S1] and powered by Groq LLM [S2]. Hallucination [S5].',
                  },
                },
              ],
            };
          },
        },
      },
    };

    const ragSvc = new RagService({
      mode: 'live',
      apiKey: 'gsk_test_key',
      groqClient: mockGroqClient,
    });

    const result = await ragSvc.answerQuestion('How does the inbox work?', sampleChunks);

    // Verify system injection boundaries were escaped/included
    assert.ok(capturedPrompt.includes('<retrieved_knowledge>'));
    assert.ok(capturedPrompt.includes('[S1] Title: "Architecture Overview"'));
    assert.ok(capturedPrompt.includes('[S2] Title: "Provider Docs"'));

    // Verify phantom sentence [S5] was completely dropped rather than left ungrounded
    assert.equal(
      result.answer,
      'The application is built with SQLite [S1] and powered by Groq LLM [S2].'
    );
    assert.equal(result.citations.length, 2);
    assert.equal(result.citations[0].sourceId, 'S1');
    assert.equal(result.citations[1].sourceId, 'S2');
    assert.equal(result.mode, 'live');
  });

  test('live mode throws 401 when GROQ_API_KEY is missing', async () => {
    const prevKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    try {
      const ragSvc = new RagService({ mode: 'live' });
      await assert.rejects(
        async () => {
          await ragSvc.answerQuestion('Any question', sampleChunks);
        },
        (err: unknown) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.statusCode, 401);
          assert.equal(err.code, 'PROVIDER_AUTH_ERROR');
          return true;
        }
      );
    } finally {
      if (prevKey) process.env.GROQ_API_KEY = prevKey;
    }
  });

  test('maps Groq 429 rate limit error to 429 PROVIDER_RATE_LIMIT', async () => {
    const mockGroqClient = {
      chat: {
        completions: {
          create: async () => {
            const err = new Error('Rate limit reached');
            (err as unknown as { status: number }).status = 429;
            throw err;
          },
        },
      },
    };

    const ragSvc = new RagService({
      mode: 'live',
      apiKey: 'gsk_test_key',
      groqClient: mockGroqClient,
    });

    await assert.rejects(
      async () => {
        await ragSvc.answerQuestion('Question', sampleChunks);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 429);
        assert.equal(err.code, 'PROVIDER_RATE_LIMIT');
        return true;
      }
    );
  });
});
