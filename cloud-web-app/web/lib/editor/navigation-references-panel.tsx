'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, FileCode, Search, X } from 'lucide-react';
import type { Location, Reference } from './navigation';

export function ReferencesPanel({
  references,
  currentUri,
  onNavigate,
  onClose,
}: {
  references: Reference[];
  currentUri?: string;
  onNavigate: (location: Location) => void;
  onClose: () => void;
}) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  // Group references by file
  const groupedRefs = references.reduce((acc, ref) => {
    if (!acc[ref.uri]) {
      acc[ref.uri] = [];
    }
    acc[ref.uri].push(ref);
    return acc;
  }, {} as Record<string, Reference[]>);

  // Auto-expand all files initially
  useEffect(() => {
    setExpandedFiles(new Set(Object.keys(groupedRefs)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [references]);

  const toggleFile = (uri: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  };

  const getFileName = (uri: string) => {
    const parts = uri.split('/');
    return parts[parts.length - 1];
  };

  const getRelativePath = (uri: string) => {
    return uri.replace(/^.*?\/src\//, 'src/');
  };

  const filteredGroupedRefs = filter
    ? Object.entries(groupedRefs).reduce((acc, [uri, refs]) => {
        const filteredRefs = refs.filter(ref =>
          ref.preview?.toLowerCase().includes(filter.toLowerCase()) ||
          uri.toLowerCase().includes(filter.toLowerCase())
        );
        if (filteredRefs.length > 0) {
          acc[uri] = filteredRefs;
        }
        return acc;
      }, {} as Record<string, Reference[]>)
    : groupedRefs;

  const totalRefs = Object.values(filteredGroupedRefs).reduce(
    (sum, refs) => sum + refs.length, 0
  );

  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--aethel-primary-light)]" />
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
            {totalRefs} reference{totalRefs !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-[var(--aethel-text-quaternary)]">
            in {Object.keys(filteredGroupedRefs).length} file{Object.keys(filteredGroupedRefs).length !== 1 ? 's' : ''}
          </span>
        </div>
        <button type="button"
          onClick={onClose}
          className="p-1 hover:bg-[var(--aethel-surface-secondary)] rounded"
        >
          <X className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
        </button>
      </div>

      {/* Filter */}
      <div className="px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter references..."
          className="w-full px-2 py-1 text-sm bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)]"
        />
      </div>

      {/* References List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(filteredGroupedRefs).map(([uri, refs]) => {
          const isExpanded = expandedFiles.has(uri);
          const isCurrentFile = uri === currentUri;

          return (
            <div key={uri} className="border-b border-[var(--aethel-border-primary)]/50">
              {/* File header */}
              <button type="button"
                onClick={() => toggleFile(uri)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--aethel-surface-secondary)]/50 transition-colors ${
                  isCurrentFile ? 'bg-[color-mix(in_srgb,var(--aethel-primary-dark)_10%,transparent)]' : ''
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
                )}
                <FileCode className="w-4 h-4 text-[var(--aethel-info-light)]" />
                <span className="text-sm text-[var(--aethel-text-primary)] font-medium">
                  {getFileName(uri)}
                </span>
                <span className="text-xs text-[var(--aethel-text-quaternary)] truncate">
                  {getRelativePath(uri)}
                </span>
                <span className="ml-auto text-xs text-[var(--aethel-text-quaternary)] bg-[var(--aethel-surface-secondary)] px-1.5 py-0.5 rounded">
                  {refs.length}
                </span>
              </button>

              {/* References */}
              {isExpanded && (
                <div className="pb-1">
                  {refs.map((ref, index) => (
                    <button type="button"
                      key={`${ref.range.startLine}-${ref.range.startColumn}-${index}`}
                      onClick={() => onNavigate(ref)}
                      className="w-full flex items-start gap-2 px-6 py-1.5 text-left hover:bg-[var(--aethel-surface-secondary)]/50 group"
                    >
                      <span className="text-xs text-[var(--aethel-text-quaternary)] w-8 text-right flex-shrink-0">
                        {ref.range.startLine}
                      </span>
                      <span className="text-xs text-[var(--aethel-text-secondary)] font-mono truncate">
                        {ref.preview || '...'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[var(--aethel-text-quaternary)] opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {totalRefs === 0 && (
          <div className="px-4 py-8 text-center text-[var(--aethel-text-quaternary)] text-sm">
            No references found
          </div>
        )}
      </div>
    </div>
  );
}
