'use client';

import React, { useEffect, useRef, useState } from 'react';

export function GoToLineDialog({
  isOpen,
  onClose,
  onGoTo,
  maxLine,
  currentLine,
}: {
  isOpen: boolean;
  onClose: () => void;
  onGoTo: (line: number, column?: number) => void;
  maxLine?: number;
  currentLine?: number;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(currentLine?.toString() || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [isOpen, currentLine]);

  const handleSubmit = () => {
    const match = value.match(/^(\d+)(?::(\d+))?$/);
    if (match) {
      const line = parseInt(match[1], 10);
      const column = match[2] ? parseInt(match[2], 10) : 1;
      
      if (line > 0 && (!maxLine || line <= maxLine)) {
        onGoTo(line, column);
        onClose();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)]"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-96 z-50">
        <div className="bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-2xl overflow-hidden">
          <div className="p-4">
            <label className="block text-sm text-[var(--aethel-text-tertiary)] mb-2">
              Go to Line{maxLine ? ` (1-${maxLine})` : ''}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Line:Column (e.g., 42 or 42:10)"
              className="w-full px-3 py-2 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded-lg outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)]"
            />
            <div className="mt-2 text-xs text-[var(--aethel-text-quaternary)]">
              Press <kbd className="px-1 bg-[var(--aethel-surface-tertiary)] rounded">Enter</kbd> to go,{' '}
              <kbd className="px-1 bg-[var(--aethel-surface-tertiary)] rounded">Esc</kbd> to cancel
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
