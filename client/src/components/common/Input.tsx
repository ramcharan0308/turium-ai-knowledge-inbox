import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#B8C0B6]">
            {label}
            {props.required && <span className="text-[#D4A373] ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#849082]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={`w-full px-3 py-2 text-sm bg-[#202420] border rounded-lg transition-colors placeholder:text-[#849082] text-[#F1F0EA] focus:outline-hidden focus:ring-2 focus:ring-[#A8C8B5]/25 focus:border-[#A8C8B5] focus:bg-[#252A25] ${
              error
                ? 'border-[#FB7185] focus:border-[#FB7185] focus:ring-[#FB7185]/25'
                : 'border-[#485148] hover:border-[#5C665C]'
            } ${leftIcon ? 'pl-9' : ''} ${rightElement ? 'pr-10' : ''} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#849082]">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} className="flex items-center text-xs text-[#FB7185] font-medium mt-1">
            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-[#849082]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  charCount?: number;
  maxChars?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, charCount, maxChars, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;

    return (
      <div className="w-full space-y-1.5">
        <div className="flex justify-between items-center">
          {label && (
            <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#B8C0B6]">
              {label}
              {props.required && <span className="text-[#D4A373] ml-1">*</span>}
            </label>
          )}
          {typeof charCount === 'number' && typeof maxChars === 'number' && (
            <span
              className={`text-[11px] font-mono ${
                charCount > maxChars ? 'text-[#FB7185] font-semibold' : 'text-[#849082]'
              }`}
            >
              {charCount.toLocaleString()} / {maxChars.toLocaleString()}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-3 py-2 text-sm bg-[#202420] border rounded-lg transition-colors placeholder:text-[#849082] text-[#F1F0EA] focus:outline-hidden focus:ring-2 focus:ring-[#A8C8B5]/25 focus:border-[#A8C8B5] focus:bg-[#252A25] min-h-[110px] resize-y ${
            error
              ? 'border-[#FB7185] focus:border-[#FB7185] focus:ring-[#FB7185]/25'
              : 'border-[#485148] hover:border-[#5C665C]'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} className="flex items-center text-xs text-[#FB7185] font-medium mt-1">
            <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-[#849082]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
