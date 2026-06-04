'use client'

import { useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileCode,
  History,
  Replace,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { FileSearchResult, SearchMatch } from './GlobalSearch'

// ============================================================================
// Search Input Component
// ============================================================================

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  icon: Icon = Search,
  showHistory,
  history,
  onHistorySelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  icon?: LucideIcon;
  showHistory?: boolean;
  history?: string[];
  onHistorySelect?: (value: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--aethel-text-quaternary)]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => showHistory && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          className="w-full pl-10 pr-8 py-1.5 text-sm bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-primary)]"
        />
        {value && (
          <button type="button"
            onClick={() => onChange('')}
            aria-label="Clear field"
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]" />
          </button>
        )}
      </div>

      {/* History dropdown */}
      {showDropdown && history && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] rounded shadow-lg z-50 max-h-48 overflow-y-auto">
          {history.map((item, index) => (
            <button type="button"
              key={index}
              aria-label={`Use recent search ${item}`}
              onClick={() => {
                onChange(item);
                onHistorySelect?.(item);
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)] text-left"
            >
              <History className="w-3.5 h-3.5 text-[var(--aethel-text-quaternary)]" />
              <span className="truncate">{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Search Option Button
// ============================================================================

export function OptionButton({
  icon: Icon,
  active,
  onClick,
  title,
}: {
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button type="button"
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors ${
        active
          ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
          : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-secondary)]'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ============================================================================
// Search Result Item
// ============================================================================

export function SearchResultFile({
  result,
  onNavigate,
  onReplace,
  onReplaceAll,
  onToggle,
  showReplace,
}: {
  result: FileSearchResult;
  onNavigate: (match: SearchMatch) => void;
  onReplace?: (match: SearchMatch) => void;
  onReplaceAll?: () => void;
  onToggle: () => void;
  showReplace?: boolean;
}) {
  const fileName = result.path.split('/').pop() || result.path;
  const dirPath = result.path.replace(/\/[^/]+$/, '');

  return (
    <div className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_60%,transparent)]">
      {/* File header */}
      <button type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] group"
      >
        {result.collapsed ? (
          <ChevronRight className="w-4 h-4 text-[var(--aethel-text-quaternary)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--aethel-text-quaternary)]" />
        )}
        <FileCode className="w-4 h-4 text-[var(--aethel-info-light)]" />
        <span className="text-sm text-[var(--aethel-text-primary)]">{fileName}</span>
        <span className="text-xs text-[var(--aethel-text-quaternary)] truncate">{dirPath}</span>
        <span className="ml-auto text-xs text-[var(--aethel-text-quaternary)] bg-[var(--aethel-surface-secondary)] px-1.5 py-0.5 rounded">
          {result.matches.length}
        </span>
        {showReplace && onReplaceAll && (
          <button type="button"
            onClick={e => {
              e.stopPropagation();
              onReplaceAll();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded text-xs text-[var(--aethel-warning-light)]"
            title="Replace all in file"
          >
            <Replace className="w-3.5 h-3.5" />
          </button>
        )}
      </button>

      {/* Matches */}
      {!result.collapsed && (
        <div className="pl-6">
          {result.matches.map((match, index) => (
            <button type="button"
              key={`${match.line}-${match.column}-${index}`}
              onClick={() => onNavigate(match)}
              aria-label={`Go to line ${match.line}, column ${match.column}`}
              className="w-full flex items-center gap-3 px-3 py-1 hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-left group"
            >
              <span className="text-xs text-[var(--aethel-text-quaternary)] w-8 text-right flex-shrink-0">
                {match.line}
              </span>
              <span className="text-sm text-[var(--aethel-text-tertiary)] truncate flex-1">
                {/* Preview with highlight */}
                {match.preview.slice(0, match.previewHighlight.start)}
                <span className="bg-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] text-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]">
                  {match.preview.slice(
                    match.previewHighlight.start,
                    match.previewHighlight.end
                  )}
                </span>
                {match.preview.slice(match.previewHighlight.end)}
              </span>
              {showReplace && onReplace && (
                <button type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onReplace(match);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded"
                  title="Replace"
                >
                  <Check className="w-3 h-3 text-[var(--aethel-success)]" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
