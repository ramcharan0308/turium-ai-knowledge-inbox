import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`border border-dashed border-stone-300 rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center bg-stone-50/50 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 mb-3 shadow-2xs">
        <Icon className="w-5 h-5 text-stone-600" />
      </div>
      <h3 className="text-sm font-semibold text-stone-900 tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-stone-500 max-w-sm leading-relaxed mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
