import React from 'react';
import { CheckCircle2, AlertCircle, FileText, Globe } from 'lucide-react';
import { ItemType, IndexingStatus } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'teal' | 'terracotta' | 'emerald' | 'amber' | 'rose' | 'slate';
  size?: 'xs' | 'sm';
  className?: string;
  title?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '', title }: BadgeProps) {
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  const variantClasses = {
    default: 'bg-stone-100 text-stone-700 border-stone-200',
    outline: 'bg-transparent text-stone-600 border-stone-300',
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
    terracotta: 'bg-orange-50 text-orange-800 border-orange-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
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
      <Badge variant="terracotta" size={size} className="gap-1">
        <FileText className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        <span>NOTE</span>
      </Badge>
    );
  }

  return (
    <Badge variant="slate" size={size} className="gap-1">
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
        <CheckCircle2 className={`${iconClass} text-emerald-600`} />
        <span>Ready</span>
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge variant="amber" size={size} className="gap-1" title={title || 'Generating vector embeddings...'}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>Indexing...</span>
      </Badge>
    );
  }

  return (
    <Badge variant="rose" size={size} className="gap-1" title={title || 'Indexing failed'}>
      <AlertCircle className={`${iconClass} text-rose-600`} />
      <span>Failed</span>
    </Badge>
  );
}
