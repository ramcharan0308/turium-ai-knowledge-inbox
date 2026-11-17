import { useEffect, useState, useCallback } from 'react';
import { api } from './api/client';
import { SavedItem, HealthStatus, IngestResponse } from './types';
import { Header } from './components/layout/Header';
import { KnowledgeCapture } from './components/capture/KnowledgeCapture';
import { KnowledgeLibrary } from './components/library/KnowledgeLibrary';
import { QueryDesk } from './components/query/QueryDesk';
import { ToastProvider } from './components/common/Toast';

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [items, setItems] = useState<SavedItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  // Fetch system health
  useEffect(() => {
    api
      .checkHealth()
      .then((data) => {
        setHealth(data);
        setHealthError(null);
      })
      .catch((err) => {
        setHealthError(err.message || 'Could not connect to backend server');
      })
      .finally(() => {
        setLoadingHealth(false);
      });
  }, []);

  // Fetch initial items
  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const res = await api.getItems({ limit: PAGE_LIMIT, offset: 0 });
      setItems(res.items);
      setTotalItems(res.total);
      setOffset(res.items.length);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load saved items';
      setItemsError(msg);
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Load more items (pagination)
  const handleLoadMore = async () => {
    if (loadingMore || items.length >= totalItems) return;
    setLoadingMore(true);
    try {
      const res = await api.getItems({ limit: PAGE_LIMIT, offset });
      setItems((prev) => [...prev, ...res.items]);
      setOffset((prev) => prev + res.items.length);
      setTotalItems(res.total);
    } catch (err: unknown) {
      // ignore or show error
      console.error('Failed to load more items', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // On successful ingestion, prepend new item and update count
  const handleIngestSuccess = (ingested: IngestResponse) => {
    const newItem: SavedItem = {
      id: ingested.id,
      type: ingested.type,
      title: ingested.title,
      sourceUrl: ingested.sourceUrl,
      snippet: 'Indexing completed. Click inspect to view full document content.',
      chunkCount: ingested.chunkCount,
      createdAt: ingested.createdAt,
      updatedAt: ingested.createdAt,
      indexingStatus: ingested.indexingStatus,
      indexingError: ingested.indexingError,
    };

    setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
    setTotalItems((prev) => prev + 1);

    // After a brief moment, reload to get real snippet and updated chunk representations
    setTimeout(() => {
      api.getItems({ limit: PAGE_LIMIT, offset: 0 }).then((res) => {
        setItems(res.items);
        setTotalItems(res.total);
      });
    }, 1200);
  };

  const hasMore = items.length < totalItems;

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-[#FBFBFA] text-[#1C1917] antialiased selection:bg-teal-100 selection:text-teal-900">
        {/* Workspace Navigation Header */}
        <Header
          health={health}
          loadingHealth={loadingHealth}
          healthError={healthError}
          totalItems={totalItems}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Left Rail: Knowledge Capture & Saved Library (lg: 7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Knowledge Capture Desk */}
              <KnowledgeCapture onIngestSuccess={handleIngestSuccess} />

              {/* Saved Knowledge Library */}
              <KnowledgeLibrary
                items={items}
                total={totalItems}
                loading={itemsLoading}
                error={itemsError}
                onRefresh={loadItems}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
              />
            </div>

            {/* Right Rail: Grounded Knowledge Query Desk (lg: 5 cols, sticky on desktop) */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-6">
              <QueryDesk items={items} />
            </div>
          </div>
        </main>

        {/* Editorial Footer */}
        <footer className="border-t border-stone-200 bg-white py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-stone-500 gap-3">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-stone-800">Turium AI</span>
              <span>—</span>
              <span>Knowledge Inbox</span>
            </div>
            <div className="text-stone-400">
              Clarity over beauty · Zero-hallucination RAG · Gemini 768d + Groq 120B
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}

export default App;
