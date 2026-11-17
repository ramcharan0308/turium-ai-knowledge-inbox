import { useEffect } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Citation } from '../../types';
import { SourceTypeBadge } from '../common/Badge';

interface CitationInspectorProps {
  citations: Citation[];
  selectedCitation: Citation | null;
  onSelectCitation: (citation: Citation | null) => void;
}

export function CitationInspector({
  citations,
  selectedCitation,
  onSelectCitation,
}: CitationInspectorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelectCitation(null);
    };

    if (selectedCitation) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCitation, onSelectCitation]);

  if (!selectedCitation) return null;

  const currentIndex = citations.findIndex((c) => c.sourceId === selectedCitation.sourceId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < citations.length - 1;

  const similarityPercent = Math.round(selectedCitation.similarityScore * 100);

  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.16 }}
      aria-label="Citation source inspector"
      className="bg-[#202420] border border-[#3E4D42] rounded-xl p-4 shadow-xs space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#384038] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-[#A8C8B5] text-[#191B19] font-mono text-xs font-bold shadow-2xs">
            [{selectedCitation.sourceId}]
          </span>
          <SourceTypeBadge type={selectedCitation.itemType} size="xs" />
          <span className="text-[11px] font-mono text-[#849082]">
            Chunk #{selectedCitation.chunkIndex}
          </span>
        </div>

        {/* Navigation & Dismiss */}
        <div className="flex items-center gap-1">
          {citations.length > 1 && (
            <div className="flex items-center mr-2 border-r border-[#384038] pr-2 gap-0.5">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => onSelectCitation(citations[currentIndex - 1])}
                className="p-1 text-[#849082] hover:text-[#F1F0EA] disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-[#343A34] transition-colors cursor-pointer"
                title="Previous citation"
                aria-label="Previous citation"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-[#849082] px-1">
                {currentIndex + 1}/{citations.length}
              </span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => onSelectCitation(citations[currentIndex + 1])}
                className="p-1 text-[#849082] hover:text-[#F1F0EA] disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-[#343A34] transition-colors cursor-pointer"
                title="Next citation"
                aria-label="Next citation"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onSelectCitation(null)}
            className="p-1 text-[#849082] hover:text-[#F1F0EA] rounded-md hover:bg-[#343A34] transition-colors cursor-pointer"
            aria-label="Close citation inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Source Document Title */}
      <div>
        <h4 className="text-xs font-semibold text-[#F1F0EA] leading-snug">
          {selectedCitation.itemTitle}
        </h4>
        {selectedCitation.sourceUrl && (
          <a
            href={selectedCitation.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#A8C8B5] hover:text-[#C0DACB] hover:underline mt-0.5 truncate max-w-full"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{selectedCitation.sourceUrl}</span>
          </a>
        )}
      </div>

      {/* Similarity Score Meter */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-[#B8C0B6] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#4ADE80]" />
            Cosine Similarity Match
          </span>
          <span className="font-semibold text-[#F1F0EA]">
            {similarityPercent}% ({selectedCitation.similarityScore.toFixed(3)})
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#191B19] border border-[#485148] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#A8C8B5] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(10, similarityPercent))}%` }}
          />
        </div>
      </div>

      {/* Supporting Text Chunk */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#849082] font-semibold">
          Exact Supporting Chunk (Chunk ID: {selectedCitation.chunkId})
        </span>
        <blockquote className="p-3 bg-[#292D29] rounded-xl border border-[#485148] text-xs text-[#F1F0EA] leading-relaxed font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
          &ldquo;{selectedCitation.snippet}&rdquo;
        </blockquote>
      </div>
    </motion.aside>
  );
}
