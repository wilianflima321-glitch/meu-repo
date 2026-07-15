'use client';

/**
 * Aethel IDE outline panel.
 * Keeps file symbols compact, searchable, and keyboard-friendly.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Eye,
  FileCode,
  Filter,
  LayoutList,
  RefreshCw,
  Search,
  SortAsc,
} from 'lucide-react';
import type { DocumentSymbol, OutlinePanelProps, SortMode, SymbolKind } from './OutlinePanel.types';
import { allKinds, filterSymbols, FilterMenu, sortSymbols, SymbolTree } from './OutlinePanel.model';

export type { DocumentSymbol, OutlinePanelProps, SortMode, SymbolKind } from './OutlinePanel.types';

export const OutlinePanel: React.FC<OutlinePanelProps> = ({
  symbols = [],
  activeFilePath,
  onSymbolClick,
  onRefresh,
  isLoading = false,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('position');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [hoveredSymbolId, setHoveredSymbolId] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [visibleKinds, setVisibleKinds] = useState<Set<SymbolKind>>(new Set(allKinds));
  const [followCursor, setFollowCursor] = useState(true);

  // Expand all on first load
  useEffect(() => {
    if (symbols.length > 0 && expandedIds.size === 0) {
      const allIds = new Set<string>();
      const collectIds = (items: DocumentSymbol[]) => {
        items.forEach((s) => {
          allIds.add(`${s.name}-${s.kind}-${s.range.startLine}`);
          if (s.children) collectIds(s.children);
        });
      };
      collectIds(symbols);
      setExpandedIds(allIds);
    }
  }, [symbols, expandedIds.size]);

  // Processed symbols
  const processedSymbols = useMemo(() => {
    let result = symbols;

    // Filter
    result = filterSymbols(result, searchQuery, visibleKinds);

    // Sort
    result = sortSymbols(result, sortMode);

    return result;
  }, [symbols, searchQuery, sortMode, visibleKinds]);

  // Toggle expansion
  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle symbol click
  const handleSymbolClick = useCallback((symbol: DocumentSymbol) => {
    const id = `${symbol.name}-${symbol.kind}-${symbol.range.startLine}`;
    setActiveSymbolId(id);
    onSymbolClick?.(symbol);
  }, [onSymbolClick]);

  // Toggle kind visibility
  const handleToggleKind = useCallback((kind: SymbolKind) => {
    setVisibleKinds(prev => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  }, []);

  // Cycle sort mode
  const cycleSortMode = useCallback(() => {
    setSortMode(prev => {
      switch (prev) {
        case 'position': return 'name';
        case 'name': return 'kind';
        case 'kind': return 'position';
      }
    });
  }, []);

  // Expand all
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (items: DocumentSymbol[]) => {
      items.forEach((s) => {
        allIds.add(`${s.name}-${s.kind}-${s.range.startLine}`);
        if (s.children) collectIds(s.children);
      });
    };
    collectIds(symbols);
    setExpandedIds(allIds);
  }, [symbols]);

  // Collapse all
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const fileName = activeFilePath?.split(/[/\\]/).pop() || 'No file';

  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--aethel-text-secondary)]">
          Outline
        </span>
        <div className="flex items-center gap-1">
          <button type="button"
            className={`p-1 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] transition-colors ${followCursor ? 'text-[var(--aethel-info-light)]' : ''}`}
            onClick={() => setFollowCursor(!followCursor)}
            title="Follow Cursor"
            aria-label="Follow cursor"
          >
            <Eye size={14} />
          </button>
          <button type="button"
            className="p-1 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] transition-colors"
            onClick={cycleSortMode}
            title={`Sort by: ${sortMode}`}
            aria-label={`Sort by ${sortMode}`}
          >
            <SortAsc size={14} />
          </button>
          <div className="relative">
            <button type="button"
              className={`p-1 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] transition-colors
                ${visibleKinds.size < allKinds.length ? 'text-[var(--aethel-info-light)]' : ''}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              title="Filter symbols"
              aria-label="Filter symbols"
            >
              <Filter size={14} />
            </button>
            {showFilterMenu && (
              <FilterMenu
                visibleKinds={visibleKinds}
                onToggleKind={handleToggleKind}
                onClose={() => setShowFilterMenu(false)}
              />
            )}
          </div>
          <button type="button"
            className="p-1 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] transition-colors"
            onClick={onRefresh}
              title="Refresh"
              aria-label="Refresh estrutura"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-[var(--aethel-border-primary)]">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--aethel-text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter symbols..."
            className="w-full bg-[var(--aethel-surface-tertiary)] text-sm text-[var(--aethel-text-secondary)] rounded px-7 py-1.5
                       placeholder:text-[var(--aethel-text-tertiary)] border border-transparent
                       focus:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] focus:outline-none"
            aria-label="Filter symbols"
          />
          {searchQuery && (
            <button type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-secondary)]"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Current file */}
      <div className="px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] border-b border-[var(--aethel-border-primary)] flex items-center gap-2">
        <FileCode size={12} />
        <span className="truncate">{fileName}</span>
        {processedSymbols.length > 0 && (
          <span className="ml-auto">
            {processedSymbols.length} symbols
          </span>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-2 py-1 border-b border-[var(--aethel-border-primary)] flex gap-1">
        <button type="button"
          className="text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-secondary)] px-2 py-0.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
          onClick={expandAll}
        >
          Expand All
        </button>
        <button type="button"
          className="text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-secondary)] px-2 py-0.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]"
          onClick={collapseAll}
        >
          Collapse All
        </button>
      </div>

      {/* Symbol Tree */}
      <div className="flex-1 overflow-auto" role="tree" aria-label="Document symbols">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-[var(--aethel-text-secondary)]">
            <RefreshCw className="animate-spin mr-2" size={16} />
            Loading symbols...
          </div>
        ) : processedSymbols.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--aethel-text-secondary)] text-sm">
            <LayoutList size={32} className="mb-2 opacity-50" />
            {searchQuery ? (
              <span>No symbols match {`"${searchQuery}"`}</span>
            ) : symbols.length === 0 ? (
              <span>No symbols found in this file</span>
            ) : (
              <span>All symbol types are hidden</span>
            )}
          </div>
        ) : (
          <SymbolTree
            symbols={processedSymbols}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSymbolClick={handleSymbolClick}
            activeSymbolId={activeSymbolId}
            hoveredSymbolId={hoveredSymbolId}
            onHover={setHoveredSymbolId}
          />
        )}
      </div>

      {/* Footer - Sort indicator */}
      <div className="px-3 py-1 border-t border-[var(--aethel-border-primary)] text-xs text-[var(--aethel-text-secondary)] flex items-center justify-between">
        <span>
          Sort: <span className="text-[var(--aethel-text-secondary)] capitalize">{sortMode}</span>
        </span>
        {visibleKinds.size < allKinds.length && (
          <span className="text-[var(--aethel-info-light)]">
            {allKinds.length - visibleKinds.size} types hidden
          </span>
        )}
      </div>
    </div>
  );
};

export default OutlinePanel;
