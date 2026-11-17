import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export type AiMode = 'live' | 'demo';

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  databasePath: string;
  aiMode: AiMode;
  geminiApiKey: string | undefined;
  groqApiKey: string | undefined;
  embeddingModel: string;
  embeddingDimensions: number;
  chatModel: string;
}

export const config: AppConfig = {
  get port(): number {
    return parseInt(process.env.PORT || '3001', 10);
  },
  get nodeEnv(): AppConfig['nodeEnv'] {
    return (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development';
  },
  get databasePath(): string {
    return process.env.DATABASE_PATH || './data/inbox.db';
  },
  get aiMode(): AiMode {
    return (process.env.AI_MODE?.toLowerCase() === 'demo' ? 'demo' : 'live') as AiMode;
  },
  get geminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY?.trim() || undefined;
  },
  get groqApiKey(): string | undefined {
    return process.env.GROQ_API_KEY?.trim() || undefined;
  },
  get embeddingModel(): string {
    return process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
  },
  get embeddingDimensions(): number {
    return parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10);
  },
  get chatModel(): string {
    return process.env.CHAT_MODEL || 'openai/gpt-oss-120b';
  },
};
