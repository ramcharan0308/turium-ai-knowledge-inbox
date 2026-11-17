import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  databasePath: string;
  openaiApiKey: string | undefined;
  embeddingModel: string;
  chatModel: string;
  useExplicitMockMode: boolean;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  databasePath: process.env.DATABASE_PATH || './data/inbox.db',
  openaiApiKey: process.env.OPENAI_API_KEY,
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  chatModel: process.env.CHAT_MODEL || 'gpt-4o-mini',
  useExplicitMockMode: process.env.USE_EXPLICIT_MOCK_MODE === 'true',
};
