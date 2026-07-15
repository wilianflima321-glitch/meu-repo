'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileCode, X } from 'lucide-react';
import type { Location, PeekConfig } from './navigation';

export function PeekWidget({
  config,
  onClose,
  onNavigate,
}: {
  config: PeekConfig;
  onClose: () => void;
  onNavigate: (location: Location) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const widgetRef = useRef<HTMLDivElement>(null);

  const selectedDefinition = config.definitions[selectedIndex];

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getFileName = (uri: string) => {
    const parts = uri.split('/');
    return parts[parts.length - 1];
  };

  const getRelativePath = (uri: string) => {
    // Remove workspace prefix if present
    return uri.replace(/^.*?\/src\//, 'src/');
  };

  return (
    <div
      ref={widgetRef}
      className="bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-2xl overflow-hidden max-w-3xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[var(--aethel-primary-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{config.title}</span>
          {config.definitions.length > 1 && (
            <span className="text-xs text-[var(--aethel-text-tertiary)]">
              ({selectedIndex + 1} of {config.definitions.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button type="button"
            onClick={() => onNavigate(selectedDefinition)}
            className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
            title="Go to definition"
          >
            <ExternalLink className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          </button>
          <button type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
          >
            <X className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Definitions List (if multiple) */}
        {config.definitions.length > 1 && (
          <div className="w-48 border-r border-[var(--aethel-border-primary)] max-h-80 overflow-y-auto">
            {config.definitions.map((def, index) => (
              <button type="button"
                key={`${def.uri}-${def.range.startLine}`}
                onClick={() => setSelectedIndex(index)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-[color-mix(in_srgb,var(--aethel-primary-dark)_20%,transparent)] text-[var(--aethel-text-primary)]'
                    : 'hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)]'
                }`}
              >
                <div className="font-medium truncate">
                  {def.name || getFileName(def.uri)}
                </div>
                <div className="text-xs text-[var(--aethel-text-quaternary)] truncate">
                  {getRelativePath(def.uri)}:{def.range.startLine}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Preview */}
        <div className="flex-1 max-h-80 overflow-auto">
          {/* File path */}
          <div className="sticky top-0 flex items-center gap-2 px-3 py-1.5 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] border-b border-[var(--aethel-border-primary)] text-xs">
            <span className="text-[var(--aethel-text-tertiary)]">{getRelativePath(selectedDefinition.uri)}</span>
            <span className="text-[var(--aethel-text-quaternary)]">:</span>
            <span className="text-[var(--aethel-primary-light)]">{selectedDefinition.range.startLine}</span>
          </div>

          {/* Code preview */}
          <div className="p-2 font-mono text-xs">
            {selectedDefinition.preview ? (
              selectedDefinition.preview.map((line, i) => {
                const lineNumber = selectedDefinition.range.startLine - 5 + i;
                const isTargetLine = lineNumber >= selectedDefinition.range.startLine &&
                  lineNumber <= selectedDefinition.range.endLine;

                return (
                  <div
                    key={i}
                    className={`flex ${isTargetLine ? 'bg-[color-mix(in_srgb,var(--aethel-primary-dark)_20%,transparent)]' : ''}`}
                  >
                    <span className={`w-10 pr-2 text-right select-none ${
                      isTargetLine ? 'text-[var(--aethel-primary-light)]' : 'text-[var(--aethel-text-quaternary)]'
                    }`}>
                      {lineNumber}
                    </span>
                    <span className="text-[var(--aethel-text-secondary)] whitespace-pre">
                      {line}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-[var(--aethel-text-quaternary)]">Loading preview...</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-[var(--aethel-surface-secondary)] border-t border-[var(--aethel-border-primary)] text-xs text-[var(--aethel-text-quaternary)] flex items-center gap-4">
        <span>
          <kbd className="px-1 bg-[var(--aethel-surface-tertiary)] rounded">Enter</kbd> to go
        </span>
        <span>
          <kbd className="px-1 bg-[var(--aethel-surface-tertiary)] rounded">↑↓</kbd> navigate
        </span>
        <span>
          <kbd className="px-1 bg-[var(--aethel-surface-tertiary)] rounded">Esc</kbd> close
        </span>
      </div>
    </div>
  );
}
