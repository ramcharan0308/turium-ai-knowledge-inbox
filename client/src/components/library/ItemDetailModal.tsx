import { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, Calendar, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavedItem } from '../../types';
import { SourceTypeBadge, StatusBadge } from '../common/Badge';

interface ItemDetailModalProps {
  item: SavedItem | null;
  onClose: () => void;
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.rawContent || item.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

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
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs"
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
            className="relative bg-white border border-stone-200 rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <SourceTypeBadge type={item.type} size="xs" />
                  <StatusBadge status={item.indexingStatus} size="xs" />
                  <span className="text-[11px] font-mono text-stone-400">ID: {item.id}</span>
                </div>
                <h2 id="item-detail-title" className="text-base font-semibold text-stone-900 leading-snug break-words">
                  {item.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors shrink-0"
                aria-label="Close document inspection dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata Bar */}
            <div className="px-6 py-2.5 bg-stone-50 border-b border-stone-200/80 flex flex-wrap items-center gap-4 text-xs font-mono text-stone-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Saved: {new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-stone-400" />
                <span>{item.chunkCount} vector {item.chunkCount === 1 ? 'chunk' : 'chunks'}</span>
              </div>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-teal-700 hover:text-teal-800 hover:underline truncate max-w-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.sourceUrl}</span>
                </a>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-400">
                  Document Content
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded-md border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-xs font-mono text-stone-800 leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {item.rawContent || item.snippet}
              </div>

              {item.indexingError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <div className="font-semibold mb-0.5">Indexing Failure Details:</div>
                  <div className="font-mono text-[11px]">{item.indexingError}</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-stone-200 bg-stone-50/40 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
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
