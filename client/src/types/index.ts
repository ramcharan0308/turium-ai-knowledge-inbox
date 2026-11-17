export type ItemType = 'note' | 'url';
export type IndexingStatus = 'pending' | 'ready' | 'failed';

export interface SavedItem {
  id: string;
  type: ItemType;
  title: string;
  sourceUrl?: string | null;
  snippet: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  indexingStatus: IndexingStatus;
  indexingError?: string | null;
  rawContent?: string | null;
}

export interface ItemDetail {
  id: string;
  type: ItemType;
  title: string;
  sourceUrl?: string | null;
  rawContent: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  indexingStatus: IndexingStatus;
  indexingError?: string | null;
}

export interface IngestResponse {
  id: string;
  type: ItemType;
  title: string;
  sourceUrl: string | null;
  chunkCount: number;
  indexingStatus: IndexingStatus;
  indexingError: string | null;
  createdAt: string;
}

export interface Citation {
  sourceId: string;
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
  mode: 'live' | 'demo';
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  environment: string;
  database: string;
  nodeVersion: string;
  aiMode: string;
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  embeddingModel: string;
  chatModel: string;
  timestamp: string;
}

export interface ListItemsResult {
  items: SavedItem[];
  total: number;
  limit: number;
  offset: number;
}
