'use client';

/**
 * InlineComposerWidget — Frente 1 (Padrão Cursor 3.x)
 *
 * A Monaco ContentWidget that appears inline at the cursor position
 * when the user presses Ctrl+K. It provides a mini-prompt input
 * for AI-powered inline code generation/editing.
 *
 * Architecture:
 * 1. MonacoEditorPro.actions.ts triggers this widget via the 'aethel.inline-composer' action
 * 2. The widget renders at the cursor line as a Monaco ContentWidget
 * 3. User types a prompt and presses Enter
 * 4. Widget calls the AI completion API and applies the diff
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, X, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineComposerWidgetProps {
  /** The currently selected code (may be empty if no selection) */
  selectedCode: string;
  /** Language of the current file */
  language: string;
  /** File path for context */
  filePath?: string;
  /** Current cursor line */
  line?: number;
  /** Called when user submits a prompt */
  onSubmit: (prompt: string, selectedCode: string) => Promise<string | void>;
  /** Called when user cancels (Escape or X button) */
  onCancel: () => void;
  /** Whether the widget is currently visible */
  isOpen: boolean;
}

type WidgetState = 'idle' | 'loading' | 'error';

export function InlineComposerWidget({
  selectedCode,
  language,
  filePath,
  line,
  onSubmit,
  onCancel,
  isOpen,
}: InlineComposerWidgetProps) {
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<WidgetState>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure Monaco doesn't steal focus
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setState('idle');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || state === 'loading') return;

    setState('loading');
    setError(null);

    try {
      await onSubmit(prompt.trim(), selectedCode);
      setState('idle');
      setPrompt('');
      onCancel(); // Close after successful submission
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    }
  }, [prompt, state, onSubmit, selectedCode, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    },
    [handleSubmit, onCancel]
  );

  if (!isOpen) return null;

  const hasSelection = selectedCode.length > 0;
  const placeholder = hasSelection
    ? `Edit selection (${language})...`
    : `Generate code at line ${line ?? '?'} (${language})...`;

  return (
    <div
      className={cn(
        'relative z-[100] w-[460px]',
        'rounded-lg overflow-hidden',
        'border border-[var(--aethel-border-primary)]',
        'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_95%,transparent)]',
        'backdrop-blur-xl',
        'shadow-2xl shadow-black/40',
        'animate-in fade-in slide-in-from-top-1 duration-150',
      )}
      // Prevent Monaco from capturing our keyboard events
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--aethel-border-primary)]/30">
        <Sparkles
          className="h-3.5 w-3.5 text-[var(--aethel-info-light)]"
          strokeWidth={1.5}
        />
        <span className="text-[11px] font-medium text-[var(--aethel-text-tertiary)] uppercase tracking-wider">
          Inline Composer
        </span>
        {hasSelection && (
          <span className="ml-auto text-[10px] text-[var(--aethel-text-tertiary)] bg-[var(--aethel-surface-quaternary)] px-1.5 py-0.5 rounded">
            {selectedCode.split('\n').length} lines selected
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={state === 'loading'}
          autoComplete="off"
          className={cn(
            'flex-1 bg-transparent text-sm',
            'text-[var(--aethel-text-primary)]',
            'placeholder:text-[var(--aethel-text-tertiary)]',
            'outline-none border-none',
            'disabled:opacity-50',
          )}
        />

        {state === 'loading' ? (
          <Loader2
            className="h-4 w-4 text-[var(--aethel-info-light)] animate-spin"
            strokeWidth={1.5}
          />
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              aria-label="Submit inline composer prompt"
              className={cn(
                'p-1 rounded-md transition-colors duration-100',
                prompt.trim()
                  ? 'text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]'
                  : 'text-[var(--aethel-text-tertiary)] opacity-30',
              )}
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close inline composer"
              className="p-1 rounded-md text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)] transition-colors duration-100"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--aethel-surface-primary)]/50 border-t border-[var(--aethel-border-primary)]/20">
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
          <kbd className="px-1 py-0.5 rounded bg-[var(--aethel-surface-quaternary)] text-[9px] font-mono">Enter</kbd>
          {' '}submit
          <span className="mx-2">·</span>
          <kbd className="px-1 py-0.5 rounded bg-[var(--aethel-surface-quaternary)] text-[9px] font-mono">Esc</kbd>
          {' '}cancel
        </span>
        {filePath && (
          <span className="text-[10px] text-[var(--aethel-text-tertiary)] truncate max-w-[160px]">
            {filePath.split('/').pop()}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="px-3 py-2 bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border-t border-[color-mix(in_srgb,var(--aethel-error)_25%,transparent)]">
          <p className="text-[11px] text-[var(--aethel-error-light)]">{error}</p>
        </div>
      )}
    </div>
  );
}

export default InlineComposerWidget;
