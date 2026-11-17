export type ItemType = 'note' | 'url';

export interface SavedItem {
  id: string;
  type: ItemType;
  title: string;
  sourceUrl?: string | null;
  snippet: string;
  chunkCount: number;
  createdAt: string;
}

export interface Citation {
  chunkId: string;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  sourceUrl?: string | null;
  chunkIndex: number;
  snippet: string;
  similarityScore: number;
}

export interface QueryResult {
  question: string;
  answer: string;
  citations: Citation[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  environment: string;
  database: string;
  nodeVersion: string;
  mockMode: boolean;
  hasOpenAiKey: boolean;
  timestamp: string;
}
