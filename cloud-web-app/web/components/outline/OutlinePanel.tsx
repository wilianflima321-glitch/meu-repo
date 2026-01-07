/**
 * Aethel IDE - Outline Panel
 * 
 * Painel profissional de outline/symbols similar ao VS Code.
 * Mostra hierarquia de símbolos do arquivo atual (classes, funções, variáveis, etc.)
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown,
  FileCode,
  Braces,
  Box,
  Hash,
  Variable,
  Type,
  Package,
  Zap,
  CircleDot,
  LayoutList,
  Search,
  SortAsc,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type SymbolKind = 
  | 'file'
  | 'module'
  | 'namespace'
  | 'package'
  | 'class'
  | 'method'
  | 'property'
  | 'field'
  | 'constructor'
  | 'enum'
  | 'interface'
  | 'function'
  | 'variable'
  | 'constant'
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'key'
  | 'null'
  | 'enumMember'
  | 'struct'
  | 'event'
  | 'operator'
  | 'typeParameter';

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  selectionRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  children?: DocumentSymbol[];
  deprecated?: boolean;
}

export type SortMode = 'position' | 'name' | 'kind';

interface OutlinePanelProps {
  symbols?: DocumentSymbol[];
  activeFilePath?: string;
  onSymbolClick?: (symbol: DocumentSymbol) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const getSymbolIcon = (kind: SymbolKind) => {
  const iconProps = { size: 16, className: 'flex-shrink-0' };
  
  switch (kind) {
    case 'file':
      return <FileCode {...iconProps} className="text-blue-400" />;
    case 'module':
    case 'namespace':
    case 'package':
      return <Package {...iconProps} className="text-purple-400" />;
    case 'class':
      return <Box {...iconProps} className="text-amber-400" />;
    case 'method':
    case 'function':
    case 'constructor':
      return <Braces {...iconProps} className="text-blue-400" />;
    case 'property':
    case 'field':
      return <Variable {...iconProps} className="text-cyan-400" />;
    case 'enum':
    case 'enumMember':
      return <LayoutList {...iconProps} className="text-orange-400" />;
    case 'interface':
      return <Type {...iconProps} className="text-green-400" />;
    case 'variable':
      return <Variable {...iconProps} className="text-blue-300" />;
    case 'constant':
      return <Hash {...iconProps} className="text-blue-500" />;
    case 'struct':
      return <Box {...iconProps} className="text-teal-400" />;
    case 'event':
      return <Zap {...iconProps} className="text-yellow-400" />;
    case 'typeParameter':
      return <Type {...iconProps} className="text-emerald-400" />;
    default:
      return <CircleDot {...iconProps} className="text-gray-400" />;
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

const sortSymbols = (symbols: DocumentSymbol[], mode: SortMode): DocumentSymbol[] => {
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

const filterSymbols = (
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
        ${isActive ? 'bg-blue-600/30' : isHovered ? 'bg-white/5' : ''}
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
      <button
        className={`
          p-0.5 rounded hover:bg-white/10 transition-colors
          ${!hasChildren ? 'invisible' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={expanded ? 'Collapse' : 'Expand'}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronRight size={14} className="text-gray-400" />
        )}
      </button>
      
      {/* Symbol Icon */}
      {getSymbolIcon(symbol.kind)}
      
      {/* Symbol Name */}
      <span className="truncate text-sm text-gray-200">
        {symbol.name}
      </span>
      
      {/* Detail (type info) */}
      {symbol.detail && (
        <span className="truncate text-xs text-gray-500 ml-1">
          {symbol.detail}
        </span>
      )}
      
      {/* Line number */}
      <span className="ml-auto text-xs text-gray-600">
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

const SymbolTree: React.FC<SymbolTreeProps> = ({
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

const allKinds: SymbolKind[] = [
  'class', 'interface', 'struct', 'enum', 
  'function', 'method', 'constructor',
  'property', 'field', 'variable', 'constant',
  'module', 'namespace', 'package',
  'typeParameter', 'enumMember', 'event'
];

const FilterMenu: React.FC<FilterMenuProps> = ({
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
      className="absolute top-full right-0 mt-1 w-48 bg-[#252526] border border-[#3c3c3c] 
                 rounded-md shadow-lg z-50 py-1"
    >
      <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-[#3c3c3c]">
        Symbol Types
      </div>
      {allKinds.map((kind) => (
        <button
          key={kind}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300
                     hover:bg-white/5 transition-colors"
          onClick={() => onToggleKind(kind)}
        >
          <div className={`w-4 h-4 rounded border ${visibleKinds.has(kind) 
            ? 'bg-blue-500 border-blue-500' 
            : 'border-gray-500'}`}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c]">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Outline
        </span>
        <div className="flex items-center gap-1">
          <button
            className={`p-1 rounded hover:bg-white/10 transition-colors ${followCursor ? 'text-blue-400' : ''}`}
            onClick={() => setFollowCursor(!followCursor)}
            title="Follow Cursor"
            aria-label="Follow cursor"
          >
            <Eye size={14} />
          </button>
          <button
            className="p-1 rounded hover:bg-white/10 transition-colors"
            onClick={cycleSortMode}
            title={`Sort by: ${sortMode}`}
            aria-label={`Sort by ${sortMode}`}
          >
            <SortAsc size={14} />
          </button>
          <div className="relative">
            <button
              className={`p-1 rounded hover:bg-white/10 transition-colors 
                ${visibleKinds.size < allKinds.length ? 'text-blue-400' : ''}`}
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
          <button
            className="p-1 rounded hover:bg-white/10 transition-colors"
            onClick={onRefresh}
            title="Refresh"
            aria-label="Refresh outline"
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      
      {/* Search */}
      <div className="px-2 py-2 border-b border-[#3c3c3c]">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter symbols..."
            className="w-full bg-[#3c3c3c] text-sm text-gray-200 rounded px-7 py-1.5
                       placeholder-gray-500 border border-transparent
                       focus:border-blue-500/50 focus:outline-none"
            aria-label="Filter symbols"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>
      
      {/* Current file */}
      <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-[#3c3c3c] flex items-center gap-2">
        <FileCode size={12} />
        <span className="truncate">{fileName}</span>
        {processedSymbols.length > 0 && (
          <span className="ml-auto">
            {processedSymbols.length} symbols
          </span>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="px-2 py-1 border-b border-[#3c3c3c] flex gap-1">
        <button
          className="text-xs text-gray-400 hover:text-gray-200 px-2 py-0.5 rounded hover:bg-white/5"
          onClick={expandAll}
        >
          Expand All
        </button>
        <button
          className="text-xs text-gray-400 hover:text-gray-200 px-2 py-0.5 rounded hover:bg-white/5"
          onClick={collapseAll}
        >
          Collapse All
        </button>
      </div>
      
      {/* Symbol Tree */}
      <div className="flex-1 overflow-auto" role="tree" aria-label="Document symbols">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <RefreshCw className="animate-spin mr-2" size={16} />
            Loading symbols...
          </div>
        ) : processedSymbols.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
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
      <div className="px-3 py-1 border-t border-[#3c3c3c] text-xs text-gray-500 flex items-center justify-between">
        <span>
          Sort: <span className="text-gray-400 capitalize">{sortMode}</span>
        </span>
        {visibleKinds.size < allKinds.length && (
          <span className="text-blue-400">
            {allKinds.length - visibleKinds.size} types hidden
          </span>
        )}
      </div>
    </div>
  );
};

export default OutlinePanel;
