import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EmbeddingService } from './embedding.service.js';
import { AppError } from '../types/api.js';

describe('EmbeddingService', () => {
  test('validates and unit-normalizes valid vectors', () => {
    const service = new EmbeddingService({ dimensions: 4, mode: 'demo' });
    const rawVector = [3, 4, 0, 0];
    const normalized = service.validateVector(rawVector);

    assert.equal(normalized.length, 4);
    // Magnitude of [3, 4, 0, 0] is 5; normalized should be [0.6, 0.8, 0, 0]
    assert.ok(Math.abs(normalized[0] - 0.6) < 1e-6);
    assert.ok(Math.abs(normalized[1] - 0.8) < 1e-6);

    // Sum of squares of unit vector must be 1.0
    const magnitude = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0));
    assert.ok(Math.abs(magnitude - 1.0) < 1e-6);
  });

  test('rejects vectors with incorrect dimensions', () => {
    const service = new EmbeddingService({ dimensions: 768, mode: 'demo' });
    assert.throws(
      () => service.validateVector([0.1, 0.2, 0.3]),
      (err: unknown) => {
        return err instanceof AppError && err.message.includes('dimension mismatch');
      }
    );
  });

  test('rejects all-zero vectors (zero magnitude)', () => {
    const service = new EmbeddingService({ dimensions: 3, mode: 'demo' });
    assert.throws(
      () => service.validateVector([0, 0, 0]),
      (err: unknown) => {
        return err instanceof AppError && err.message.includes('zero or non-finite magnitude');
      }
    );
  });

  test('rejects vectors with non-finite values (NaN / Infinity)', () => {
    const service = new EmbeddingService({ dimensions: 3, mode: 'demo' });
    assert.throws(
      () => service.validateVector([0.5, NaN, 0.5]),
      (err: unknown) => {
        return err instanceof AppError && err.message.includes('non-finite');
      }
    );

    assert.throws(
      () => service.validateVector([0.5, Infinity, 0.5]),
      (err: unknown) => {
        return err instanceof AppError && err.message.includes('non-finite');
      }
    );
  });

  test('generates deterministic 768-dimension vectors in demo mode', async () => {
    const service = new EmbeddingService({ dimensions: 768, mode: 'demo' });
    const res1 = await service.embed('Artificial Intelligence in Knowledge Management');
    const res2 = await service.embed('Artificial Intelligence in Knowledge Management');

    assert.equal(res1.provider, 'demo');
    assert.equal(res1.dimensions, 768);
    assert.equal(res1.vector.length, 768);
    // Identical text must produce identical vectors
    assert.deepEqual(res1.vector, res2.vector);

    // Unit length check
    const mag = Math.sqrt(res1.vector.reduce((s, v) => s + v * v, 0));
    assert.ok(Math.abs(mag - 1.0) < 1e-6);
  });

  test('live mode throws 401 when GEMINI_API_KEY is missing', async () => {
    const service = new EmbeddingService({ apiKey: undefined, mode: 'live' });
    await assert.rejects(
      async () => service.embed('Test note'),
      (err: unknown) => {
        return err instanceof AppError && err.statusCode === 401 && err.code === 'PROVIDER_AUTH_ERROR';
      }
    );
  });

  test('maps API_KEY_INVALID error from Gemini to 401 PROVIDER_AUTH_ERROR without leaking key', async () => {
    const mockClient = {
      models: {
        embedContent: async () => {
          throw new Error('API_KEY_INVALID: The provided API key is expired or invalid.');
        },
      },
    };

    const service = new EmbeddingService({
      apiKey: 'test_key',
      mode: 'live',
      client: mockClient,
    });

    await assert.rejects(
      async () => service.embed('Sample content'),
      (err: unknown) => {
        return err instanceof AppError && err.statusCode === 401 && err.code === 'PROVIDER_AUTH_ERROR';
      }
    );
  });

  test('maps RESOURCE_EXHAUSTED error from Gemini to 429 PROVIDER_RATE_LIMIT', async () => {
    const mockClient = {
      models: {
        embedContent: async () => {
          throw new Error('RESOURCE_EXHAUSTED: Rate limit exceeded for embedding quota.');
        },
      },
    };

    const service = new EmbeddingService({
      apiKey: 'test_key',
      mode: 'live',
      client: mockClient,
    });

    await assert.rejects(
      async () => service.embed('Sample content'),
      (err: unknown) => {
        return err instanceof AppError && err.statusCode === 429 && err.code === 'PROVIDER_RATE_LIMIT';
      }
    );
  });

  test('maps transient 500 error from Gemini to 502 PROVIDER_UNAVAILABLE', async () => {
    const mockClient = {
      models: {
        embedContent: async () => {
          throw new Error('Internal error encountered while processing embedding.');
        },
      },
    };

    const service = new EmbeddingService({
      apiKey: 'test_key',
      mode: 'live',
      client: mockClient,
    });

    await assert.rejects(
      async () => service.embed('Sample content'),
      (err: unknown) => {
        return err instanceof AppError && err.statusCode === 502 && err.code === 'PROVIDER_UNAVAILABLE';
      }
    );
  });
});
