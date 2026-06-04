'use client';

import { logger } from '@/lib/observability/logger';
/**
 * Aethel Engine - Breadcrumbs Navigation
 *
 * VS Code-style breadcrumbs with:
 * - File path navigation
 * - Symbol outline dropdown
 * - Click to navigate
 * - Keyboard accessible
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { ChevronRight, Code, File, Folder } from 'lucide-react';
import type { BreadcrumbSegment, BreadcrumbsProps, DocumentSymbol } from './Breadcrumbs.types';
import { getFileIcon, SYMBOL_COLORS, SYMBOL_ICONS } from './Breadcrumbs.icons';
import { BreadcrumbDropdown } from './BreadcrumbsDropdown';
export type { BreadcrumbSegment, BreadcrumbsProps, DocumentSymbol, SymbolKind } from './Breadcrumbs.types';

// ============================================================================
// Breadcrumbs Component
// ============================================================================

export default function Breadcrumbs({
  filePath,
  workspaceRoot = '',
  symbols = [],
  currentLine = 1,
  onNavigatePath,
  onNavigateSymbol,
  onListFolder,
}: BreadcrumbsProps) {
  const [pathSegments, setPathSegments] = useState<BreadcrumbSegment[]>([]);
  const [folderContents, setFolderContents] = useState<Map<string, BreadcrumbSegment[]>>(new Map());

  // Parse file path into segments
  useEffect(() => {
    const relativePath = workspaceRoot && filePath.startsWith(workspaceRoot)
      ? filePath.slice(workspaceRoot.length).replace(/^[/\\]/, '')
      : filePath;

    const parts = relativePath.split(/[/\\]/).filter(Boolean);
    const segments: BreadcrumbSegment[] = [];
    let currentPath = workspaceRoot;

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = index === parts.length - 1;

      segments.push({
        id: currentPath,
        label: part,
        path: currentPath,
        type: isLast ? 'file' : 'folder',
        icon: isLast ? getFileIcon(part) : Folder,
      });
    });

    setPathSegments(segments);
  }, [filePath, workspaceRoot]);

  // Get symbol chain (parent > child > grandchild)
  const symbolChain = useMemo(() => {
    if (!symbols.length || !currentLine) return [];

    const chain: DocumentSymbol[] = [];

    const findChain = (syms: DocumentSymbol[]): boolean => {
      for (const sym of syms) {
        if (currentLine >= sym.range.startLine && currentLine <= sym.range.endLine) {
          chain.push(sym);
          if (sym.children?.length) {
            findChain(sym.children);
          }
          return true;
        }
      }
      return false;
    };

    findChain(symbols);
    return chain;
  }, [symbols, currentLine]);

  // Load folder contents on hover
  const handleFolderHover = useCallback(async (path: string) => {
    if (folderContents.has(path) || !onListFolder) return;

    try {
      const contents = await onListFolder(path);
      setFolderContents(prev => new Map(prev).set(path, contents));
    } catch (error) {
      logger.error('Failed to list folder:', error);
    }
  }, [folderContents, onListFolder]);

  // Handle path segment click
  const handlePathClick = (segment: BreadcrumbSegment) => {
    if (segment.type === 'file') {
      onNavigatePath?.(segment.path);
    }
  };

  // Handle symbol click
  const handleSymbolClick = (symbol: DocumentSymbol) => {
    onNavigateSymbol?.(symbol);
  };

  // Handle dropdown selection
  const handleDropdownSelect = (item: BreadcrumbSegment | DocumentSymbol) => {
    if ('kind' in item) {
      onNavigateSymbol?.(item);
    } else {
      onNavigatePath?.(item.path);
    }
  };

  // Flatten symbols for dropdown
  const flatSymbols = useMemo(() => {
    const flat: DocumentSymbol[] = [];

    const flatten = (syms: DocumentSymbol[], depth = 0) => {
      syms.forEach(sym => {
        flat.push({ ...sym, containerName: depth > 0 ? '  '.repeat(depth) : undefined });
        if (sym.children?.length) {
          flatten(sym.children, depth + 1);
        }
      });
    };

    flatten(symbols);
    return flat;
  }, [symbols]);

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-[var(--aethel-surface-primary)]/50 border-b border-[var(--aethel-border-primary)] text-sm overflow-x-auto">
      {/* Path Segments */}
      {pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const Icon = segment.icon || (segment.type === 'folder' ? Folder : File);
        const contents = folderContents.get(segment.path) || [];

        return (
          <div key={segment.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-[var(--aethel-text-quaternary)] mx-0.5" />
            )}

            {segment.type === 'folder' && onListFolder ? (
              <div onMouseEnter={() => handleFolderHover(segment.path)}>
                <BreadcrumbDropdown
                  trigger={
                    <span className="flex items-center gap-1.5 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
                      <Icon className="w-4 h-4 text-[var(--aethel-warning-light)]" />
                      {segment.label}
                    </span>
                  }
                  items={contents}
                  onSelect={handleDropdownSelect}
                />
              </div>
            ) : (
              <button type="button" aria-label={`Abrir ${segment.label}`}
                onClick={() => handlePathClick(segment)}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors ${
                  isLast
                    ? 'text-[var(--aethel-text-primary)] font-medium'
                    : 'text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-secondary)]'
                }`}
              >
                <Icon className={`w-4 h-4 ${
                  segment.type === 'folder' ? 'text-[var(--aethel-warning-light)]' : 'text-[var(--aethel-info)]'
                }`} />
                {segment.label}
              </button>
            )}
          </div>
        );
      })}

      {/* Symbol Breadcrumbs */}
      {symbolChain.length > 0 && (
        <>
          <ChevronRight className="w-4 h-4 text-[var(--aethel-text-quaternary)] mx-1" />

          {symbolChain.map((symbol, index) => {
            const Icon = SYMBOL_ICONS[symbol.kind] || Code;
            const colorClass = SYMBOL_COLORS[symbol.kind] || 'text-[var(--aethel-text-tertiary)]';
            const isLast = index === symbolChain.length - 1;

            // Get siblings for dropdown
            const siblings = index === 0
              ? symbols
              : symbolChain[index - 1]?.children || [];

            return (
              <div key={`${symbol.name}-${symbol.range.startLine}`} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-[var(--aethel-text-quaternary)] mx-0.5" />
                )}

                <BreadcrumbDropdown
                  trigger={
                    <span className={`flex items-center gap-1.5 ${
                      isLast ? 'text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)]'
                    }`}>
                      <Icon className={`w-4 h-4 ${colorClass}`} />
                      {symbol.name}
                    </span>
                  }
                  items={siblings}
                  isSymbol
                  onSelect={handleDropdownSelect}
                />
              </div>
            );
          })}
        </>
      )}

      {/* Symbol Outline Button (when no symbol selected) */}
      {symbolChain.length === 0 && flatSymbols.length > 0 && (
        <>
          <ChevronRight className="w-4 h-4 text-[var(--aethel-text-quaternary)] mx-1" />
          <BreadcrumbDropdown
            trigger={
              <span className="flex items-center gap-1.5 text-[var(--aethel-text-tertiary)]">
                <Code className="w-4 h-4" />
                Go to Symbol
              </span>
            }
            items={flatSymbols}
            isSymbol
            onSelect={handleDropdownSelect}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Outline Panel Component
// ============================================================================

export function SymbolOutlinePanel({
  symbols,
  currentLine,
  onNavigate,
}: {
  symbols: DocumentSymbol[];
  currentLine?: number;
  onNavigate?: (symbol: DocumentSymbol) => void;
}) {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const toggleExpanded = (id: string) => {
    setExpandedSymbols(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderSymbol = (symbol: DocumentSymbol, depth = 0): ReactNode => {
    const id = `${symbol.name}-${symbol.range.startLine}`;
    const Icon = SYMBOL_ICONS[symbol.kind] || Code;
    const colorClass = SYMBOL_COLORS[symbol.kind] || 'text-[var(--aethel-text-tertiary)]';
    const hasChildren = symbol.children && symbol.children.length > 0;
    const isExpanded = expandedSymbols.has(id);
    const isActive = currentLine !== undefined &&
      currentLine >= symbol.range.startLine &&
      currentLine <= symbol.range.endLine;

    // Filter check
    if (filter && !symbol.name.toLowerCase().includes(filter.toLowerCase())) {
      // Check if any children match
      const hasMatchingChild = symbol.children?.some(
        child => child.name.toLowerCase().includes(filter.toLowerCase())
      );
      if (!hasMatchingChild) return null;
    }

    return (
      <div key={id}>
        <button type="button" aria-label={hasChildren ? `Toggle symbol ${symbol.name}` : `Navigate to symbol ${symbol.name}`}
          onClick={() => {
            if (hasChildren) toggleExpanded(id);
            onNavigate?.(symbol);
          }}
          className={`w-full flex items-center gap-1 px-2 py-1 text-sm text-left transition-colors ${
            isActive
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-text-primary)]'
              : 'hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {hasChildren ? (
            <ChevronRight className={`w-3 h-3 text-[var(--aethel-text-tertiary)] transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`} />
          ) : (
            <span className="w-3" />
          )}
          <Icon className={`w-4 h-4 flex-shrink-0 ${colorClass}`} />
          <span className="truncate">{symbol.name}</span>
          <span className="ml-auto text-xs text-[var(--aethel-text-tertiary)]">
            {symbol.range.startLine}
          </span>
        </button>

        {hasChildren && isExpanded && (
          <div>
            {symbol.children!.map(child => renderSymbol(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <Code className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
        <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Outline</span>
        <span className="ml-auto text-xs text-[var(--aethel-text-tertiary)]">
          {symbols.length} symbols
        </span>
      </div>

      {/* Filter */}
      <div className="p-2 border-b border-[var(--aethel-border-primary)]">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter simbolos..."
          className="w-full px-2 py-1 text-sm bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] rounded outline-none focus:ring-1 focus:ring-[var(--aethel-info)]"
        />
      </div>

      {/* Symbols Tree */}
      <div className="flex-1 overflow-y-auto">
        {symbols.length === 0 ? (
          <div className="px-3 py-8 text-sm text-[var(--aethel-text-tertiary)] text-center">
            No symbols found
          </div>
        ) : (
          symbols.map(symbol => renderSymbol(symbol))
        )}
      </div>
    </div>
  );
}

