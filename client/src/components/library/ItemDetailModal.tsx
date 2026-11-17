import { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, Calendar, Layers, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedItem, ItemDetail } from '../../types';
import { api } from '../../api/client';
import { SourceTypeBadge, StatusBadge } from '../common/Badge';

interface ItemDetailModalProps {
  item: SavedItem | null;
  onClose: () => void;
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [fullItem, setFullItem] = useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (item) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [item, onClose]);

  // Fetch complete raw content on item selection
  useEffect(() => {
    if (!item) {
      setFullItem(null);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    api
      .getItem(item.id, controller.signal)
      .then((detail) => {
        setFullItem(detail);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLoadError(err instanceof Error ? err.message : 'Failed to fetch complete document content');
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [item]);

  const displayContent = fullItem?.rawContent || item?.rawContent || item?.snippet || '';

  const handleCopy = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard write failure
    }
  };

  const chunkCount = fullItem?.chunkCount ?? item?.chunkCount ?? 0;
  const sourceUrl = fullItem?.sourceUrl ?? item?.sourceUrl;

  return (
    <AnimatePresence>
      {item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-detail-title"
            className="relative bg-[#292D29] border border-[#485148] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#485148] bg-[#202420] flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <SourceTypeBadge type={item.type} size="xs" />
                  <StatusBadge status={item.indexingStatus} size="xs" />
                  <span className="text-[11px] font-mono text-[#849082]">ID: {item.id}</span>
                </div>
                <h2 id="item-detail-title" className="text-base font-semibold text-[#F1F0EA] leading-snug break-words">
                  {item.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#849082] hover:text-[#F1F0EA] rounded-lg hover:bg-[#343A34] transition-colors shrink-0"
                aria-label="Close document inspection dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="px-6 py-2.5 bg-[#202420] border-b border-[#384038] flex flex-wrap items-center gap-4 text-xs font-mono text-[#B8C0B6]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#849082]" />
                <span>Saved: {new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#849082]" />
                <span>{chunkCount} vector {chunkCount === 1 ? 'chunk' : 'chunks'}</span>
              </div>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#A8C8B5] hover:text-[#C0DACB] hover:underline truncate max-w-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{sourceUrl}</span>
                </a>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#849082]">
                    Document Content
                  </span>
                  {isLoading && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#A8C8B5]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading raw content...
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs text-[#B8C0B6] hover:text-[#F1F0EA] px-2.5 py-1 rounded-lg border border-[#485148] bg-[#202420] hover:bg-[#343A34] transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#4ADE80]" />
                      <span className="text-[#4ADE80] font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#849082]" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              {loadError && (
                <div className="p-2.5 rounded-lg bg-[#2D1D20] border border-[#54222B] text-xs text-[#FB7185]">
                  Showing preview snippet. Could not fetch complete document text ({loadError}).
                </div>
              )}

              <div className="p-4 rounded-xl border border-[#485148] bg-[#202420] text-xs font-mono text-[#F1F0EA] leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {displayContent}
              </div>

              {item.indexingError && (
                <div className="p-3 rounded-xl bg-[#2D1D20] border border-[#54222B] text-xs text-[#FB7185]">
                  <div className="font-semibold mb-0.5">Indexing Failure Details:</div>
                  <div className="font-mono text-[11px]">{item.indexingError}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#485148] bg-[#202420] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-[#F1F0EA] bg-[#292D29] border border-[#485148] rounded-lg hover:bg-[#343A34] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
