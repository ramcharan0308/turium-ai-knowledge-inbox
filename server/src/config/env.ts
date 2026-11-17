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
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  databasePath: process.env.DATABASE_PATH || './data/inbox.db',
  aiMode: (process.env.AI_MODE?.toLowerCase() === 'demo' ? 'demo' : 'live') as AiMode,
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  groqApiKey: process.env.GROQ_API_KEY?.trim() || undefined,
  embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-001',
  embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10),
  chatModel: process.env.CHAT_MODEL || 'llama-3.3-70b-versatile',
};
