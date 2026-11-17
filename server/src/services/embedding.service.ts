import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { AppError, ErrorCode } from '../types/api.js';
import { logger } from '../middleware/logger.middleware.js';

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  model: string;
  provider: 'gemini' | 'demo';
}

export type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export interface EmbeddingProviderOptions {
  apiKey?: string;
  model?: string;
  dimensions?: number;
  mode?: 'live' | 'demo';
  client?: {
    models: {
      embedContent: (params: {
        model: string;
        contents: string;
        config?: { outputDimensionality?: number; taskType?: string };
      }) => Promise<{ embedding?: { values?: number[] } }>;
    };
  };
}

export class EmbeddingService {
  private client: GoogleGenAI | null = null;
  private mockClient: EmbeddingProviderOptions['client'] | null = null;
  private modeOverride?: 'live' | 'demo';
  private apiKeyOverride?: string;
  public readonly model: string;
  public readonly dimensions: number;

  constructor(options?: EmbeddingProviderOptions) {
    this.modeOverride = options?.mode;
    this.apiKeyOverride = options?.apiKey;
    this.model = options?.model || config.embeddingModel;
    this.dimensions = options?.dimensions || config.embeddingDimensions;

    if (options?.client) {
      this.mockClient = options.client;
    }
  }

  public get mode(): 'live' | 'demo' {
    return this.modeOverride ?? (process.env.AI_MODE as 'live' | 'demo') ?? config.aiMode ?? 'live';
  }

  private getClient(): GoogleGenAI | EmbeddingProviderOptions['client'] | null {
    if (this.mockClient) return this.mockClient;
    if (this.client) return this.client;
    const key = this.apiKeyOverride || process.env.GEMINI_API_KEY || config.geminiApiKey;
    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
      return this.client;
    }
    return null;
  }

  /**
   * Normalizes vector to unit length (L2 norm) for fast dot-product cosine similarity
   */
  public normalizeVector(vector: number[]): number[] {
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) {
      const val = vector[i];
      if (!Number.isFinite(val)) {
        throw new AppError(500, ErrorCode.PROVIDER_UNAVAILABLE, 'Embedding vector contains non-finite values');
      }
      sumSq += val * val;
    }

    const magnitude = Math.sqrt(sumSq);
    if (magnitude === 0 || !Number.isFinite(magnitude)) {
      throw new AppError(500, ErrorCode.PROVIDER_UNAVAILABLE, 'Embedding vector has zero or non-finite magnitude');
    }

    const normalized = new Array<number>(vector.length);
    for (let i = 0; i < vector.length; i++) {
      normalized[i] = vector[i] / magnitude;
    }
    return normalized;
  }

  /**
   * Validates embedding vector integrity and dimension conformity
   */
  public validateVector(vector: unknown): number[] {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new AppError(500, ErrorCode.PROVIDER_UNAVAILABLE, 'Received empty or non-array embedding vector');
    }

    if (vector.length !== this.dimensions) {
      throw new AppError(
        500,
        ErrorCode.PROVIDER_UNAVAILABLE,
        `Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`
      );
    }

    for (let i = 0; i < vector.length; i++) {
      if (typeof vector[i] !== 'number' || !Number.isFinite(vector[i])) {
        throw new AppError(500, ErrorCode.PROVIDER_UNAVAILABLE, 'Vector contains invalid or non-finite number values');
      }
    }

    return this.normalizeVector(vector as number[]);
  }

  /**
   * Generates deterministic local vector for demo mode (768 dimensions)
   * Uses word and character n-gram term hashing to provide meaningful semantic-like similarity.
   */
  public generateDemoVector(text: string): number[] {
    const raw = new Array<number>(this.dimensions).fill(0);
    const cleaned = text.toLowerCase();

    // 1. Bag of words hashing
    const words = cleaned.match(/\b\w+\b/g) || [cleaned];
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 31 + word.charCodeAt(i)) & 0x7fffffff;
      }
      const slot = hash % this.dimensions;
      raw[slot] += Math.min(word.length, 10);
    }

    // 2. Character trigrams hashing
    for (let i = 0; i <= cleaned.length - 3; i++) {
      const code =
        (cleaned.charCodeAt(i) * 31 * 31 +
          cleaned.charCodeAt(i + 1) * 31 +
          cleaned.charCodeAt(i + 2)) &
        0x7fffffff;
      const slot = code % this.dimensions;
      raw[slot] += 1;
    }

    // 3. Baseline spread to prevent zero magnitude on short strings
    for (let i = 0; i < this.dimensions; i++) {
      raw[i] += 0.01;
    }

    return this.normalizeVector(raw);
  }

  /**
   * Embed a single document or query text
   */
  public async embed(text: string, taskType: TaskType = 'RETRIEVAL_DOCUMENT'): Promise<EmbeddingResult> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'Cannot generate embedding for empty text');
    }

    if (this.mode === 'demo') {
      return {
        vector: this.generateDemoVector(trimmed),
        dimensions: this.dimensions,
        model: 'demo-hash-768',
        provider: 'demo',
      };
    }

    // Live mode
    const client = this.getClient();
    if (!client) {
      throw new AppError(
        401,
        ErrorCode.PROVIDER_AUTH_ERROR,
        'GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in server/.env or configure AI_MODE=demo for offline evaluation.'
      );
    }

    try {
      const response = await client.models.embedContent({
        model: this.model,
        contents: trimmed,
        config: {
          outputDimensionality: this.dimensions,
          taskType,
        },
      });

      const res = response as {
        embedding?: { values?: number[] };
        embeddings?: Array<{ values?: number[] }>;
      };
      const values = res.embedding?.values || res.embeddings?.[0]?.values;
      const validated = this.validateVector(values);

      return {
        vector: validated,
        dimensions: this.dimensions,
        model: this.model,
        provider: 'gemini',
      };
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      const msg = err instanceof Error ? err.message : String(err);

      // Check specific API error patterns
      if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
        throw new AppError(401, ErrorCode.PROVIDER_AUTH_ERROR, 'Gemini authentication failed: Invalid API key');
      }
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        throw new AppError(429, ErrorCode.PROVIDER_RATE_LIMIT, 'Gemini embedding rate limit or quota exceeded');
      }

      logger.error({ err }, 'Gemini embedding generation failed');
      throw new AppError(
        502,
        ErrorCode.PROVIDER_UNAVAILABLE,
        `Gemini embedding service unavailable: ${msg.replace(/key=[^&\s]+/gi, 'key=REDACTED')}`
      );
    }
  }

  /**
   * Batch embed document chunks with sequential or bounded parallel processing
   */
  public async embedBatch(texts: string[], taskType: TaskType = 'RETRIEVAL_DOCUMENT'): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    // In demo mode, execute synchronously
    if (this.mode === 'demo') {
      return texts.map((t) => ({
        vector: this.generateDemoVector(t.trim()),
        dimensions: this.dimensions,
        model: 'demo-hash-768',
        provider: 'demo',
      }));
    }

    // In live mode, execute in bounded chunks (concurrency 5) to respect rate limits
    const results: EmbeddingResult[] = [];
    const concurrency = 5;

    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((text) => this.embed(text, taskType)));
      results.push(...batchResults);
    }

    return results;
  }
}

export const embeddingService = new EmbeddingService();
