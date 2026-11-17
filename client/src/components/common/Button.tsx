import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'cocoa' | 'terracotta' | 'danger';
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
      sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'px-3.5 py-2 text-sm rounded-lg gap-2',
      lg: 'px-4 py-2.5 text-sm font-medium rounded-xl gap-2.5',
    }[size];

    const variantClasses = {
      primary:
        'bg-[#A8C8B5] text-[#191B19] hover:bg-[#C0DACB] active:bg-[#94B5A1] border border-[#A8C8B5] shadow-xs font-semibold focus-visible:ring-[#A8C8B5]',
      secondary:
        'bg-[#292D29] text-[#F1F0EA] hover:bg-[#343A34] active:bg-[#202420] border border-[#485148] shadow-2xs focus-visible:ring-[#A8C8B5]',
      outline:
        'bg-transparent text-[#B8C0B6] hover:text-[#F1F0EA] hover:bg-[#292D29] active:bg-[#202420] border border-[#485148] shadow-2xs focus-visible:ring-[#A8C8B5]',
      ghost:
        'bg-transparent text-[#B8C0B6] hover:text-[#F1F0EA] hover:bg-[#292D29] active:bg-[#202420] border border-transparent focus-visible:ring-[#A8C8B5]',
      cocoa:
        'bg-[#D4A373] text-[#191B19] hover:bg-[#E2B78D] active:bg-[#C49262] border border-[#D4A373] shadow-xs font-semibold focus-visible:ring-[#D4A373]',
      terracotta:
        'bg-[#D4A373] text-[#191B19] hover:bg-[#E2B78D] active:bg-[#C49262] border border-[#D4A373] shadow-xs font-semibold focus-visible:ring-[#D4A373]',
      danger:
        'bg-[#FB7185] text-[#191B19] hover:bg-[#FDA4AF] active:bg-[#F43F5E] border border-[#FB7185] shadow-xs font-semibold focus-visible:ring-[#FB7185]',
    }[variant];

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#191B19] select-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
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
