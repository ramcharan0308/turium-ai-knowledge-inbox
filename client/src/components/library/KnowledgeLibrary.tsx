import { useState, useMemo } from 'react';
import { Search, RotateCw, BookOpen, Filter, X } from 'lucide-react';
import { SavedItem, ItemType, IndexingStatus } from '../../types';
import { ItemCard } from './ItemCard';
import { ItemDetailModal } from './ItemDetailModal';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';

interface KnowledgeLibraryProps {
  items: SavedItem[];
  total: number;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}

export function KnowledgeLibrary({
  items,
  total,
  loading,
  error,
  onRefresh,
  onLoadMore,
  hasMore,
  loadingMore,
}: KnowledgeLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<IndexingStatus | 'all'>('all');
  const [inspectedItem, setInspectedItem] = useState<SavedItem | null>(null);

  // Filter items in real time
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search matching title, snippet, or sourceUrl
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSnippet = item.snippet.toLowerCase().includes(q);
        const matchesUrl = item.sourceUrl ? item.sourceUrl.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesSnippet && !matchesUrl) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.indexingStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, typeFilter, statusFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  return (
    <section className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Library Top Header */}
      <div className="px-5 py-4 border-b border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/40">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-700" />
            Knowledge Library
          </h2>
          <p className="text-xs text-stone-500 font-mono">
            {total} {total === 1 ? 'item' : 'items'} stored in SQLite vector store
          </p>
        </div>

        {/* Refresh Action */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
          title="Refresh saved items list"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-700' : 'text-stone-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 border-b border-stone-200/60 bg-white space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search saved titles, notes, or URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50/60 border border-stone-300 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-mono">
          {/* Source Type Pills */}
          <div className="flex items-center gap-1">
            <span className="text-stone-400 mr-1 text-[11px] uppercase">Type:</span>
            {(['all', 'note', 'url'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                  typeFilter === t
                    ? 'bg-stone-800 text-white font-medium shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {t === 'all' ? 'All' : t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Indexing Status Pills */}
          <div className="flex items-center gap-1">
            <span className="text-stone-400 mr-1 text-[11px] uppercase">Status:</span>
            {(['all', 'ready', 'pending', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                  statusFilter === s
                    ? 'bg-stone-800 text-white font-medium shadow-2xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Library Cards Grid / States */}
      <div className="p-4 flex-1">
        {loading && items.length === 0 ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 animate-pulse"
              >
                <div className="flex justify-between">
                  <div className="h-4 w-12 bg-stone-200 rounded-md" />
                  <div className="h-4 w-16 bg-stone-200 rounded-md" />
                </div>
                <div className="h-4 w-3/4 bg-stone-200 rounded-md" />
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-stone-200 rounded-md" />
                  <div className="h-3 w-5/6 bg-stone-200 rounded-md" />
                </div>
                <div className="pt-2 border-t border-stone-100 flex justify-between">
                  <div className="h-3 w-16 bg-stone-200 rounded-md" />
                  <div className="h-3 w-12 bg-stone-200 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-6 text-center space-y-3">
            <div className="text-xs text-rose-700 font-mono bg-rose-50 border border-rose-200 rounded-lg p-3">
              {error}
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Try Again
            </Button>
          </div>
        ) : items.length === 0 ? (
          /* Empty Inbox */
          <EmptyState
            icon={BookOpen}
            title="Your Knowledge Inbox is empty"
            description="Use the capture desk above to add a plain-text note or submit an article URL to begin building your grounded knowledge base."
          />
        ) : filteredItems.length === 0 ? (
          /* Zero Search Results */
          <EmptyState
            icon={Filter}
            title="No matching knowledge items"
            description="No saved notes or URLs match your current search query or status filters."
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          /* Items List */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} onInspect={setInspectedItem} />
              ))}
            </div>

            {/* Load More Pagination */}
            {hasMore && !hasActiveFilters && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMore}
                  loading={loadingMore}
                  loadingText="Loading more items..."
                >
                  Load More ({items.length} of {total})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Content Inspector Modal */}
      <ItemDetailModal item={inspectedItem} onClose={() => setInspectedItem(null)} />
    </section>
  );
}
