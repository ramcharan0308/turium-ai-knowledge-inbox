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
      className={`border border-dashed border-[#485148] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center bg-[#202420]/60 ${className}`}
    >
      <div className="w-11 h-11 rounded-xl bg-[#292D29] border border-[#485148] flex items-center justify-center text-[#A8C8B5] mb-3 shadow-2xs">
        <Icon className="w-5 h-5 text-[#A8C8B5]" />
      </div>
      <h3 className="text-sm font-semibold text-[#F1F0EA] tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-[#B8C0B6] max-w-sm leading-relaxed mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
