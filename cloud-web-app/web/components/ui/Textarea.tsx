'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--aethel-text-secondary)] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border bg-[var(--aethel-surface-secondary)]/50 px-3 py-2',
            'text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)]',
            'border-[var(--aethel-border-primary)] focus:border-[var(--aethel-info)] focus:ring-1 focus:ring-[var(--aethel-info)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none transition-colors duration-200',
            error && 'border-[var(--aethel-error)] focus:border-[var(--aethel-error)] focus:ring-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-[var(--aethel-error)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-[var(--aethel-text-tertiary)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
