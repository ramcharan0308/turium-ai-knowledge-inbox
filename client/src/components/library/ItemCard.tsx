import React from 'react';
import { ExternalLink, Layers, Eye } from 'lucide-react';
import { SavedItem } from '../../types';
import { SourceTypeBadge, StatusBadge } from '../common/Badge';

interface ItemCardProps {
  item: SavedItem;
  onInspect: (item: SavedItem) => void;
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

export const ItemCard = React.memo(function ItemCard({ item, onInspect }: ItemCardProps) {
  let hostname = '';
  if (item.sourceUrl) {
    try {
      hostname = new URL(item.sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      hostname = item.sourceUrl;
    }
  }

  return (
    <article className="group bg-[#292D29] border border-[#485148] hover:border-[#5C665C] hover:bg-[#2E332E] rounded-xl p-4 transition-all duration-150 shadow-2xs hover:shadow-xs flex flex-col justify-between space-y-3">
      {/* Card Header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SourceTypeBadge type={item.type} size="xs" />
            <StatusBadge status={item.indexingStatus} size="xs" title={item.indexingError || undefined} />
          </div>

          <span
            className="text-[11px] font-mono text-[#849082]"
            title={new Date(item.createdAt).toISOString()}
          >
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[#F1F0EA] group-hover:text-white tracking-tight leading-snug line-clamp-2">
          {item.title}
        </h3>

        {/* External URL if applicable */}
        {item.sourceUrl && (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#A8C8B5] hover:text-[#C0DACB] hover:underline max-w-full truncate"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{hostname || item.sourceUrl}</span>
          </a>
        )}
      </div>

      {/* Snippet Preview */}
      <p className="text-xs text-[#B8C0B6] leading-relaxed line-clamp-3 font-normal">
        {item.snippet}
      </p>

      {/* Card Footer */}
      <div className="pt-2 border-t border-[#384038] flex items-center justify-between text-xs font-mono text-[#849082]">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-[#849082]" />
          <span>
            {item.chunkCount} {item.chunkCount === 1 ? 'chunk' : 'chunks'}
          </span>
        </span>

        <button
          type="button"
          onClick={() => onInspect(item)}
          className="inline-flex items-center gap-1 text-[11px] text-[#B8C0B6] hover:text-[#F1F0EA] hover:bg-[#343A34] px-2 py-1 rounded-md transition-colors cursor-pointer"
          aria-label={`Inspect full content of "${item.title}"`}
        >
          <Eye className="w-3 h-3 text-[#849082]" />
          <span>Inspect</span>
        </button>
      </div>
    </article>
  );
});
