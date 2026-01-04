'use client';

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
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Hash,
  Box,
  Braces,
  Variable,
  Parentheses,
  Type,
  Package,
  Shapes,
  Code,
  FileCode,
  FileJson,
  FileText,
  Palette,
  Image,
  Database,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbSegment {
  id: string;
  label: string;
  path: string;
  type: 'folder' | 'file' | 'symbol';
  icon?: LucideIcon;
  children?: BreadcrumbSegment[];
}

export interface DocumentSymbol {
  name: string;
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
  containerName?: string;
}

export type SymbolKind = 
  | 'file' | 'module' | 'namespace' | 'package'
  | 'class' | 'method' | 'property' | 'field'
  | 'constructor' | 'enum' | 'interface' | 'function'
  | 'variable' | 'constant' | 'string' | 'number'
  | 'boolean' | 'array' | 'object' | 'key'
  | 'null' | 'enumMember' | 'struct' | 'event'
  | 'operator' | 'typeParameter';

export interface BreadcrumbsProps {
  /** Current file path */
  filePath: string;
  /** Workspace root path */
  workspaceRoot?: string;
  /** Document symbols from Monaco/LSP */
  symbols?: DocumentSymbol[];
  /** Current cursor line (1-based) */
  currentLine?: number;
  /** Callback when navigating to a path */
  onNavigatePath?: (path: string) => void;
  /** Callback when navigating to a symbol */
  onNavigateSymbol?: (symbol: DocumentSymbol) => void;
  /** Callback to list folder contents */
  onListFolder?: (path: string) => Promise<BreadcrumbSegment[]>;
}

// ============================================================================
// Symbol Icons
// ============================================================================

const SYMBOL_ICONS: Record<SymbolKind, LucideIcon> = {
  file: FileCode,
  module: Package,
  namespace: Braces,
  package: Package,
  class: Box,
  method: Parentheses,
  property: Variable,
  field: Variable,
  constructor: Parentheses,
  enum: Shapes,
  interface: Type,
  function: Parentheses,
  variable: Variable,
  constant: Hash,
  string: Code,
  number: Hash,
  boolean: Code,
  array: Braces,
  object: Braces,
  key: Variable,
  null: Code,
  enumMember: Shapes,
  struct: Box,
  event: Shapes,
  operator: Code,
  typeParameter: Type,
};

const SYMBOL_COLORS: Record<SymbolKind, string> = {
  file: 'text-slate-400',
  module: 'text-amber-400',
  namespace: 'text-amber-400',
  package: 'text-amber-400',
  class: 'text-amber-500',
  method: 'text-purple-400',
  property: 'text-sky-400',
  field: 'text-sky-400',
  constructor: 'text-purple-400',
  enum: 'text-amber-400',
  interface: 'text-sky-400',
  function: 'text-purple-400',
  variable: 'text-sky-300',
  constant: 'text-blue-400',
  string: 'text-emerald-400',
  number: 'text-emerald-400',
  boolean: 'text-blue-400',
  array: 'text-amber-400',
  object: 'text-amber-400',
  key: 'text-sky-400',
  null: 'text-slate-500',
  enumMember: 'text-blue-400',
  struct: 'text-amber-500',
  event: 'text-amber-400',
  operator: 'text-slate-400',
  typeParameter: 'text-emerald-400',
};

// ============================================================================
// File Icons by Extension
// ============================================================================

const FILE_ICONS: Record<string, LucideIcon> = {
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  json: FileJson,
  md: FileText,
  css: Palette,
  scss: Palette,
  html: Code,
  svg: Image,
  png: Image,
  jpg: Image,
  sql: Database,
};

function getFileIcon(filename: string): LucideIcon {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || File;
}

// ============================================================================
// Dropdown Component
// ============================================================================

interface DropdownProps {
  trigger: ReactNode;
  items: BreadcrumbSegment[] | DocumentSymbol[];
  isSymbol?: boolean;
  onSelect: (item: BreadcrumbSegment | DocumentSymbol) => void;
  className?: string;
}

function Dropdown({ trigger, items, isSymbol, onSelect, className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      const name = 'label' in item ? item.label : item.name;
      return name.toLowerCase().includes(query);
    });
  }, [items, searchQuery]);

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onSelect(filteredItems[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleItemClick = (item: BreadcrumbSegment | DocumentSymbol) => {
    onSelect(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
      >
        {trigger}
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 max-h-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50"
          onKeyDown={handleKeyDown}
        >
          {/* Search */}
          <div className="p-2 border-b border-slate-700">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 text-sm bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Items */}
          <div className="max-h-60 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">
                No results
              </div>
            ) : (
              filteredItems.map((item, index) => {
                if (isSymbol && 'kind' in item) {
                  const symbol = item as DocumentSymbol;
                  const Icon = SYMBOL_ICONS[symbol.kind] || Code;
                  const colorClass = SYMBOL_COLORS[symbol.kind] || 'text-slate-400';

                  return (
                    <button
                      key={`${symbol.name}-${symbol.range.startLine}`}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-indigo-600/30'
                          : 'hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${colorClass}`} />
                      <span className="text-white truncate">{symbol.name}</span>
                      <span className="ml-auto text-xs text-slate-500">
                        :{symbol.range.startLine}
                      </span>
                    </button>
                  );
                } else if ('label' in item) {
                  const segment = item as BreadcrumbSegment;
                  const Icon = segment.type === 'folder' 
                    ? (index === selectedIndex ? FolderOpen : Folder)
                    : getFileIcon(segment.label);

                  return (
                    <button
                      key={segment.id}
                      onClick={() => handleItemClick(item)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-indigo-600/30'
                          : 'hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${
                        segment.type === 'folder' ? 'text-amber-400' : 'text-sky-400'
                      }`} />
                      <span className="text-white truncate">{segment.label}</span>
                    </button>
                  );
                }
                return null;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  // Find current symbol based on cursor line
  const currentSymbol = useMemo(() => {
    if (!symbols.length || !currentLine) return null;

    const findSymbol = (syms: DocumentSymbol[]): DocumentSymbol | null => {
      for (const sym of syms) {
        if (currentLine >= sym.range.startLine && currentLine <= sym.range.endLine) {
          // Check children first for more specific match
          if (sym.children?.length) {
            const child = findSymbol(sym.children);
            if (child) return child;
          }
          return sym;
        }
      }
      return null;
    };

    return findSymbol(symbols);
  }, [symbols, currentLine]);

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
      console.error('Failed to list folder:', error);
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
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-slate-900/50 border-b border-slate-800 text-sm overflow-x-auto">
      {/* Path Segments */}
      {pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const Icon = segment.icon || (segment.type === 'folder' ? Folder : File);
        const contents = folderContents.get(segment.path) || [];

        return (
          <div key={segment.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-600 mx-0.5" />
            )}

            {segment.type === 'folder' && onListFolder ? (
              <div onMouseEnter={() => handleFolderHover(segment.path)}>
                <Dropdown
                  trigger={
                    <span className="flex items-center gap-1.5 text-slate-300 hover:text-white">
                      <Icon className="w-4 h-4 text-amber-400" />
                      {segment.label}
                    </span>
                  }
                  items={contents}
                  onSelect={handleDropdownSelect}
                />
              </div>
            ) : (
              <button
                onClick={() => handlePathClick(segment)}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors ${
                  isLast
                    ? 'text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${
                  segment.type === 'folder' ? 'text-amber-400' : 'text-sky-400'
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
          <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />
          
          {symbolChain.map((symbol, index) => {
            const Icon = SYMBOL_ICONS[symbol.kind] || Code;
            const colorClass = SYMBOL_COLORS[symbol.kind] || 'text-slate-400';
            const isLast = index === symbolChain.length - 1;

            // Get siblings for dropdown
            const siblings = index === 0 
              ? symbols 
              : symbolChain[index - 1]?.children || [];

            return (
              <div key={`${symbol.name}-${symbol.range.startLine}`} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-slate-600 mx-0.5" />
                )}

                <Dropdown
                  trigger={
                    <span className={`flex items-center gap-1.5 ${
                      isLast ? 'text-white' : 'text-slate-300'
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
          <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />
          <Dropdown
            trigger={
              <span className="flex items-center gap-1.5 text-slate-400">
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
    const colorClass = SYMBOL_COLORS[symbol.kind] || 'text-slate-400';
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
        <button
          onClick={() => {
            if (hasChildren) toggleExpanded(id);
            onNavigate?.(symbol);
          }}
          className={`w-full flex items-center gap-1 px-2 py-1 text-sm text-left transition-colors ${
            isActive
              ? 'bg-indigo-600/20 text-white'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {hasChildren ? (
            <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`} />
          ) : (
            <span className="w-3" />
          )}
          <Icon className={`w-4 h-4 flex-shrink-0 ${colorClass}`} />
          <span className="truncate">{symbol.name}</span>
          <span className="ml-auto text-xs text-slate-500">
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
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <Code className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-white">Outline</span>
        <span className="ml-auto text-xs text-slate-500">
          {symbols.length} symbols
        </span>
      </div>

      {/* Filter */}
      <div className="p-2 border-b border-slate-800">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter symbols..."
          className="w-full px-2 py-1 text-sm bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Symbols Tree */}
      <div className="flex-1 overflow-y-auto">
        {symbols.length === 0 ? (
          <div className="px-3 py-8 text-sm text-slate-500 text-center">
            No symbols found
          </div>
        ) : (
          symbols.map(symbol => renderSymbol(symbol))
        )}
      </div>
    </div>
  );
}
