import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'terracotta' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
      md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
      lg: 'px-4 py-2.5 text-sm font-medium rounded-lg gap-2.5',
    }[size];

    const variantClasses = {
      primary:
        'bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900 border border-teal-800/20 shadow-xs focus-visible:ring-teal-600',
      secondary:
        'bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300 border border-stone-200 shadow-2xs focus-visible:ring-stone-400',
      outline:
        'bg-white text-stone-700 hover:bg-stone-50 active:bg-stone-100 border border-stone-300 shadow-2xs focus-visible:ring-stone-400',
      ghost:
        'bg-transparent text-stone-600 hover:bg-stone-100 active:bg-stone-200 border border-transparent focus-visible:ring-stone-400',
      terracotta:
        'bg-orange-700 text-white hover:bg-orange-800 active:bg-orange-900 border border-orange-800/20 shadow-xs focus-visible:ring-orange-600',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-rose-700/20 shadow-xs focus-visible:ring-rose-600',
    }[variant];

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1 select-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
