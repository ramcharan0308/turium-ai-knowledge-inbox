import React from 'react';
import { CheckCircle2, AlertCircle, FileText, Globe } from 'lucide-react';
import { ItemType, IndexingStatus } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'eucalyptus' | 'cocoa' | 'emerald' | 'amber' | 'rose' | 'surface' | 'teal' | 'terracotta' | 'slate';
  size?: 'xs' | 'sm';
  className?: string;
  title?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '', title }: BadgeProps) {
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  const variantClasses = {
    default: 'bg-[#202420] text-[#B8C0B6] border-[#485148]',
    outline: 'bg-transparent text-[#B8C0B6] border-[#485148]',
    surface: 'bg-[#292D29] text-[#F1F0EA] border-[#485148]',
    eucalyptus: 'bg-[#252E27] text-[#A8C8B5] border-[#3E4D42]',
    cocoa: 'bg-[#2D2319] text-[#D4A373] border-[#4D3C2C]',
    emerald: 'bg-[#1C2E22] text-[#4ADE80] border-[#2A4B35]',
    amber: 'bg-[#332814] text-[#FBBF24] border-[#54411C]',
    rose: 'bg-[#33181D] text-[#FB7185] border-[#54222B]',
    // Aliases for compatibility
    teal: 'bg-[#252E27] text-[#A8C8B5] border-[#3E4D42]',
    terracotta: 'bg-[#2D2319] text-[#D4A373] border-[#4D3C2C]',
    slate: 'bg-[#202420] text-[#B8C0B6] border-[#485148]',
  }[variant];

  return (
    <span
      title={title}
      className={`inline-flex items-center font-mono font-medium rounded-md border ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}

export function SourceTypeBadge({ type, size = 'sm' }: { type: ItemType; size?: 'xs' | 'sm' }) {
  if (type === 'note') {
    return (
      <Badge variant="cocoa" size={size} className="gap-1">
        <FileText className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>NOTE</span>
      </Badge>
    );
  }

  return (
    <Badge variant="eucalyptus" size={size} className="gap-1">
      <Globe className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      <span>URL</span>
    </Badge>
  );
}

export function StatusBadge({
  status,
  size = 'sm',
  title,
}: {
  status: IndexingStatus;
  size?: 'xs' | 'sm';
  title?: string;
}) {
  const iconClass = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  if (status === 'ready') {
    return (
      <Badge variant="emerald" size={size} className="gap-1" title={title || 'Indexed and searchable'}>
        <CheckCircle2 className={`${iconClass} text-[#4ADE80]`} />
        <span>Ready</span>
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge variant="amber" size={size} className="gap-1" title={title || 'Generating vector embeddings...'}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse" />
        <span>Indexing...</span>
      </Badge>
    );
  }

  return (
    <Badge variant="rose" size={size} className="gap-1" title={title || 'Indexing failed'}>
      <AlertCircle className={`${iconClass} text-[#FB7185]`} />
      <span>Failed</span>
    </Badge>
  );
}
