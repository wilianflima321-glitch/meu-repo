'use client';

import React, { useEffect, useRef } from 'react';
import {
  Braces,
  Box,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileCode,
  Hash,
  LayoutList,
  Package,
  Type,
  Variable,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { DocumentSymbol, SortMode, SymbolKind } from './OutlinePanel.types';

export const getSymbolIcon = (kind: SymbolKind) => {
  const iconProps = { size: 16, className: 'flex-shrink-0' };

  switch (kind) {
    case 'file':
      return <FileCode {...iconProps} className="text-[var(--aethel-info-light)]" />;
    case 'module':
    case 'namespace':
    case 'package':
      return <Package {...iconProps} className="text-[var(--aethel-info-light)]" />;
    case 'class':
      return <Box {...iconProps} className="text-[var(--aethel-warning-light)]" />;
    case 'method':
    case 'function':
    case 'constructor':
      return <Braces {...iconProps} className="text-[var(--aethel-info-light)]" />;
    case 'property':
    case 'field':
      return <Variable {...iconProps} className="text-[var(--aethel-info-light)]" />;
    case 'enum':
    case 'enumMember':
      return <LayoutList {...iconProps} className="text-[var(--aethel-warning-light)]" />;
    case 'interface':
      return <Type {...iconProps} className="text-[var(--aethel-success-light)]" />;
    case 'variable':
      return <Variable {...iconProps} className="text-[var(--aethel-info-light)]" />;
    case 'constant':
      return <Hash {...iconProps} className="text-[var(--aethel-info-light)]" />;
    case 'struct':
      return <Box {...iconProps} className="text-[var(--aethel-success-light)]" />;
    case 'event':
      return <Zap {...iconProps} className="text-[var(--aethel-warning-light)]" />;
    case 'typeParameter':
      return <Type {...iconProps} className="text-[var(--aethel-success-light)]" />;
    default:
      return <CircleDot {...iconProps} className="text-[var(--aethel-text-secondary)]" />;
  }
};

const getSymbolKindOrder = (kind: SymbolKind): number => {
  const order: Record<SymbolKind, number> = {
    file: 0,
    module: 1,
    namespace: 2,
    package: 3,
    class: 4,
    interface: 5,
    struct: 6,
    enum: 7,
    typeParameter: 8,
    constructor: 9,
    method: 10,
    function: 11,
    property: 12,
    field: 13,
    variable: 14,
    constant: 15,
    enumMember: 16,
    event: 17,
    operator: 18,
    string: 19,
    number: 20,
    boolean: 21,
    array: 22,
    object: 23,
    key: 24,
    null: 25,
  };
  return order[kind] ?? 99;
};

export const sortSymbols = (symbols: DocumentSymbol[], mode: SortMode): DocumentSymbol[] => {
  const sorted = [...symbols];

  switch (mode) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'kind':
      sorted.sort((a, b) => {
        const kindDiff = getSymbolKindOrder(a.kind) - getSymbolKindOrder(b.kind);
        if (kindDiff !== 0) return kindDiff;
        return a.name.localeCompare(b.name);
      });
      break;
    case 'position':
    default:
      sorted.sort((a, b) => a.range.startLine - b.range.startLine);
      break;
  }

  return sorted.map(s => ({
    ...s,
    children: s.children ? sortSymbols(s.children, mode) : undefined,
  }));
};

export const filterSymbols = (
  symbols: DocumentSymbol[],
  query: string,
  visibleKinds: Set<SymbolKind>
): DocumentSymbol[] => {
  const q = query.toLowerCase();

  return symbols.reduce<DocumentSymbol[]>((acc, symbol) => {
    // Filter by kind visibility
    if (!visibleKinds.has(symbol.kind)) {
      return acc;
    }

    // Recursive filter children
    const filteredChildren = symbol.children
      ? filterSymbols(symbol.children, query, visibleKinds)
      : undefined;

    // Check if matches query
    const matches = !query ||
      symbol.name.toLowerCase().includes(q) ||
      symbol.detail?.toLowerCase().includes(q);

    // Include if matches or has matching children
    if (matches || (filteredChildren && filteredChildren.length > 0)) {
      acc.push({
        ...symbol,
        children: filteredChildren,
      });
    }

    return acc;
  }, []);
};

// ============================================================================
// SYMBOL ITEM COMPONENT
// ============================================================================

interface SymbolItemProps {
  symbol: DocumentSymbol;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  onClick: () => void;
  isActive: boolean;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
}

const SymbolItem: React.FC<SymbolItemProps> = ({
  symbol,
  depth,
  expanded,
  onToggle,
  onClick,
  isActive,
  isHovered,
  onHover,
}) => {
  const hasChildren = symbol.children && symbol.children.length > 0;

  return (
    <div
      className={`
        flex items-center gap-1 px-2 py-1 cursor-pointer select-none
        transition-colors duration-100
        ${isActive ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]' : isHovered ? 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]' : ''}
        ${symbol.deprecated ? 'opacity-50 line-through' : ''}
      `}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={onClick}
      onDoubleClick={() => hasChildren && onToggle()}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={isActive}
    >
      {/* Expand/Collapse Toggle */}
      <Button type="button"
        className={`
          p-0.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] transition-colors
          ${!hasChildren ? 'invisible' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--aethel-text-secondary)]" />
        ) : (
          <ChevronRight size={14} className="text-[var(--aethel-text-secondary)]" />
        )}
      </Button>

      {/* Symbol Icon */}
      {getSymbolIcon(symbol.kind)}

      {/* Symbol Name */}
      <span className="truncate text-sm text-[var(--aethel-text-secondary)]">
        {symbol.name}
      </span>

      {/* Detail (type info) */}
      {symbol.detail && (
        <span className="truncate text-xs text-[var(--aethel-text-secondary)] ml-1">
          {symbol.detail}
        </span>
      )}

      {/* Line number */}
      <span className="ml-auto text-xs text-[var(--aethel-text-secondary)]">
        {symbol.range.startLine + 1}
      </span>
    </div>
  );
};

// ============================================================================
// SYMBOL TREE COMPONENT
// ============================================================================

interface SymbolTreeProps {
  symbols: DocumentSymbol[];
  depth?: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSymbolClick: (symbol: DocumentSymbol) => void;
  activeSymbolId: string | null;
  hoveredSymbolId: string | null;
  onHover: (id: string | null) => void;
}

export const SymbolTree: React.FC<SymbolTreeProps> = ({
  symbols,
  depth = 0,
  expandedIds,
  onToggle,
  onSymbolClick,
  activeSymbolId,
  hoveredSymbolId,
  onHover,
}) => {
  const getSymbolId = (symbol: DocumentSymbol): string => {
    return `${symbol.name}-${symbol.kind}-${symbol.range.startLine}`;
  };

  return (
    <>
      {symbols.map((symbol) => {
        const id = getSymbolId(symbol);
        const isExpanded = expandedIds.has(id);
        const hasChildren = symbol.children && symbol.children.length > 0;

        return (
          <React.Fragment key={id}>
            <SymbolItem
              symbol={symbol}
              depth={depth}
              expanded={isExpanded}
              onToggle={() => onToggle(id)}
              onClick={() => onSymbolClick(symbol)}
              isActive={activeSymbolId === id}
              isHovered={hoveredSymbolId === id}
              onHover={(hovered) => onHover(hovered ? id : null)}
            />

            {hasChildren && isExpanded && (
              <SymbolTree
                symbols={symbol.children!}
                depth={depth + 1}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onSymbolClick={onSymbolClick}
                activeSymbolId={activeSymbolId}
                hoveredSymbolId={hoveredSymbolId}
                onHover={onHover}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ============================================================================
// FILTER MENU COMPONENT
// ============================================================================

interface FilterMenuProps {
  visibleKinds: Set<SymbolKind>;
  onToggleKind: (kind: SymbolKind) => void;
  onClose: () => void;
}

export const allKinds: SymbolKind[] = [
  'class', 'interface', 'struct', 'enum',
  'function', 'method', 'constructor',
  'property', 'field', 'variable', 'constant',
  'module', 'namespace', 'package',
  'typeParameter', 'enumMember', 'event'
];

export const FilterMenu: React.FC<FilterMenuProps> = ({
  visibleKinds,
  onToggleKind,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-1 w-48 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)]
                 rounded-md shadow-lg z-50 py-1"
    >
      <div className="px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] border-b border-[var(--aethel-border-primary)]">
        Symbol Types
      </div>
      {allKinds.map((kind) => (
        <button type="button"
          key={kind}
          aria-label={`${visibleKinds.has(kind) ? 'Ocultar' : 'Exibir'} itens do tipo ${kind}`}
          aria-pressed={visibleKinds.has(kind)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--aethel-text-secondary)]
                     hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] transition-colors"
          onClick={() => onToggleKind(kind)}
        >
          <div className={`w-4 h-4 rounded border ${visibleKinds.has(kind)
            ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]'
            : 'border-[var(--aethel-border-primary)]'}`}
          >
            {visibleKinds.has(kind) && (
              <svg viewBox="0 0 16 16" fill="white" className="w-4 h-4">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
            )}
          </div>
          {getSymbolIcon(kind)}
          <span className="capitalize">{kind}</span>
        </button>
      ))}
    </div>
  );
};
