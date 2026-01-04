'use client';

/**
 * Aethel Engine - Global Search & Replace
 * 
 * VS Code-style search with:
 * - Search across all files
 * - Regex support
 * - Include/exclude patterns
 * - Replace all
 * - Case sensitivity toggle
 * - Whole word match
 * - Preserve case
 * - Search result tree view
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {
  Search,
  Replace,
  X,
  ChevronRight,
  ChevronDown,
  CaseSensitive,
  WholeWord,
  Regex,
  RefreshCw,
  FolderOpen,
  FolderClosed,
  FileCode,
  FileText,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  History,
  Check,
  AlertTriangle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface SearchMatch {
  line: number;
  column: number;
  endColumn: number;
  preview: string;
  previewHighlight: { start: number; end: number };
}

export interface FileSearchResult {
  path: string;
  matches: SearchMatch[];
  collapsed?: boolean;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includePattern: string;
  excludePattern: string;
  preserveCase: boolean;
}

export interface SearchState {
  query: string;
  replaceText: string;
  options: SearchOptions;
  results: FileSearchResult[];
  totalMatches: number;
  searching: boolean;
  error?: string;
}

// ============================================================================
// Search Context
// ============================================================================

interface SearchContextValue {
  state: SearchState;
  setQuery: (query: string) => void;
  setReplaceText: (text: string) => void;
  setOptions: (options: Partial<SearchOptions>) => void;
  search: () => Promise<void>;
  replaceInFile: (path: string, match: SearchMatch) => Promise<void>;
  replaceAllInFile: (path: string) => Promise<void>;
  replaceAll: () => Promise<void>;
  navigateToMatch: (path: string, match: SearchMatch) => void;
  toggleFileCollapse: (path: string) => void;
  clearResults: () => void;
  history: string[];
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useGlobalSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useGlobalSearch must be used within SearchProvider');
  }
  return context;
}

// ============================================================================
// Search Provider
// ============================================================================

export function SearchProvider({
  children,
  onSearch,
  onReplace,
  onNavigate,
}: {
  children: ReactNode;
  onSearch?: (query: string, options: SearchOptions) => Promise<FileSearchResult[]>;
  onReplace?: (path: string, match: SearchMatch, replaceText: string) => Promise<void>;
  onNavigate?: (path: string, line: number, column: number) => void;
}) {
  const [state, setState] = useState<SearchState>({
    query: '',
    replaceText: '',
    options: {
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      includePattern: '',
      excludePattern: '**/node_modules/**',
      preserveCase: false,
    },
    results: [],
    totalMatches: 0,
    searching: false,
  });

  const [history, setHistory] = useState<string[]>([]);

  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));
  }, []);

  const setReplaceText = useCallback((text: string) => {
    setState(prev => ({ ...prev, replaceText: text }));
  }, []);

  const setOptions = useCallback((options: Partial<SearchOptions>) => {
    setState(prev => ({
      ...prev,
      options: { ...prev.options, ...options },
    }));
  }, []);

  const search = useCallback(async () => {
    const { query, options } = state;
    if (!query.trim()) {
      setState(prev => ({ ...prev, results: [], totalMatches: 0 }));
      return;
    }

    setState(prev => ({ ...prev, searching: true, error: undefined }));

    try {
      // Add to history
      setHistory(prev => {
        const filtered = prev.filter(h => h !== query);
        return [query, ...filtered].slice(0, 20);
      });

      if (onSearch) {
        const results = await onSearch(query, options);
        const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
        setState(prev => ({ ...prev, results, totalMatches, searching: false }));
      } else {
        // Mock search for demo
        const mockResults = generateMockResults(query, options);
        const totalMatches = mockResults.reduce((sum, r) => sum + r.matches.length, 0);
        await new Promise(resolve => setTimeout(resolve, 500));
        setState(prev => ({ ...prev, results: mockResults, totalMatches, searching: false }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        searching: false,
        error: error instanceof Error ? error.message : 'Search failed',
      }));
    }
  }, [state.query, state.options, onSearch]);

  const replaceInFile = useCallback(async (path: string, match: SearchMatch) => {
    if (onReplace) {
      await onReplace(path, match, state.replaceText);
    }

    // Update results to remove the replaced match
    setState(prev => ({
      ...prev,
      results: prev.results.map(file => {
        if (file.path !== path) return file;
        return {
          ...file,
          matches: file.matches.filter(m =>
            m.line !== match.line || m.column !== match.column
          ),
        };
      }).filter(file => file.matches.length > 0),
      totalMatches: prev.totalMatches - 1,
    }));
  }, [state.replaceText, onReplace]);

  const replaceAllInFile = useCallback(async (path: string) => {
    const file = state.results.find(f => f.path === path);
    if (!file) return;

    for (const match of file.matches) {
      if (onReplace) {
        await onReplace(path, match, state.replaceText);
      }
    }

    setState(prev => ({
      ...prev,
      results: prev.results.filter(f => f.path !== path),
      totalMatches: prev.totalMatches - file.matches.length,
    }));
  }, [state.results, state.replaceText, onReplace]);

  const replaceAll = useCallback(async () => {
    for (const file of state.results) {
      for (const match of file.matches) {
        if (onReplace) {
          await onReplace(file.path, match, state.replaceText);
        }
      }
    }

    setState(prev => ({
      ...prev,
      results: [],
      totalMatches: 0,
    }));
  }, [state.results, state.replaceText, onReplace]);

  const navigateToMatch = useCallback((path: string, match: SearchMatch) => {
    onNavigate?.(path, match.line, match.column);
  }, [onNavigate]);

  const toggleFileCollapse = useCallback((path: string) => {
    setState(prev => ({
      ...prev,
      results: prev.results.map(file =>
        file.path === path
          ? { ...file, collapsed: !file.collapsed }
          : file
      ),
    }));
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      totalMatches: 0,
      error: undefined,
    }));
  }, []);

  return (
    <SearchContext.Provider
      value={{
        state,
        setQuery,
        setReplaceText,
        setOptions,
        search,
        replaceInFile,
        replaceAllInFile,
        replaceAll,
        navigateToMatch,
        toggleFileCollapse,
        clearResults,
        history,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

// ============================================================================
// Mock Search (for demo)
// ============================================================================

function generateMockResults(query: string, options: SearchOptions): FileSearchResult[] {
  if (!query) return [];

  const mockFiles = [
    { path: 'src/App.tsx', content: 'function App() { return <div>Hello World</div> }' },
    { path: 'src/index.tsx', content: 'ReactDOM.render(<App />, document.getElementById("root"))' },
    { path: 'src/components/Button.tsx', content: 'export function Button({ onClick }) { return <button onClick={onClick}>Click</button> }' },
    { path: 'src/hooks/useAuth.ts', content: 'export function useAuth() { const [user, setUser] = useState(null) }' },
    { path: 'src/utils/helpers.ts', content: 'export function formatDate(date: Date) { return date.toISOString() }' },
  ];

  const results: FileSearchResult[] = [];

  for (const file of mockFiles) {
    let searchPattern: RegExp;
    try {
      if (options.useRegex) {
        searchPattern = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
        searchPattern = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
      }
    } catch {
      continue;
    }

    const matches: SearchMatch[] = [];
    let match: RegExpExecArray | null;
    const lines = file.content.split('\n');

    lines.forEach((line, lineIndex) => {
      searchPattern.lastIndex = 0;
      while ((match = searchPattern.exec(line)) !== null) {
        matches.push({
          line: lineIndex + 1,
          column: match.index + 1,
          endColumn: match.index + match[0].length + 1,
          preview: line,
          previewHighlight: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    });

    if (matches.length > 0) {
      results.push({ path: file.path, matches });
    }
  }

  return results;
}

// ============================================================================
// Search Input Component
// ============================================================================

function SearchInput({
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
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => showHistory && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          className="w-full pl-10 pr-8 py-1.5 text-sm bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-slate-500 hover:text-white" />
          </button>
        )}
      </div>

      {/* History dropdown */}
      {showDropdown && history && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
          {history.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(item);
                onHistorySelect?.(item);
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 text-left"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
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

function OptionButton({
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
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded transition-colors ${
        active
          ? 'bg-indigo-600/20 text-indigo-400'
          : 'text-slate-500 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ============================================================================
// Search Result Item
// ============================================================================

function SearchResultFile({
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
    <div className="border-b border-slate-800/50">
      {/* File header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 group"
      >
        {result.collapsed ? (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
        <FileCode className="w-4 h-4 text-indigo-400" />
        <span className="text-sm text-white">{fileName}</span>
        <span className="text-xs text-slate-500 truncate">{dirPath}</span>
        <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {result.matches.length}
        </span>
        {showReplace && onReplaceAll && (
          <button
            onClick={e => {
              e.stopPropagation();
              onReplaceAll();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-xs text-amber-400"
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
            <button
              key={`${match.line}-${match.column}-${index}`}
              onClick={() => onNavigate(match)}
              className="w-full flex items-center gap-3 px-3 py-1 hover:bg-slate-800/50 text-left group"
            >
              <span className="text-xs text-slate-500 w-8 text-right flex-shrink-0">
                {match.line}
              </span>
              <span className="text-sm text-slate-400 truncate flex-1">
                {/* Preview with highlight */}
                {match.preview.slice(0, match.previewHighlight.start)}
                <span className="bg-amber-500/30 text-amber-200">
                  {match.preview.slice(
                    match.previewHighlight.start,
                    match.previewHighlight.end
                  )}
                </span>
                {match.preview.slice(match.previewHighlight.end)}
              </span>
              {showReplace && onReplace && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onReplace(match);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded"
                  title="Replace"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Global Search Panel
// ============================================================================

export function GlobalSearchPanel({
  className,
}: {
  className?: string;
}) {
  const {
    state,
    setQuery,
    setReplaceText,
    setOptions,
    search,
    replaceInFile,
    replaceAllInFile,
    replaceAll,
    navigateToMatch,
    toggleFileCollapse,
    clearResults,
    history,
  } = useGlobalSearch();

  const [showReplace, setShowReplace] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-search on query change with debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (state.query.length >= 2) {
        search();
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [state.query, state.options]);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+F: Focus search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Ctrl+Shift+H: Toggle replace
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'h') {
        e.preventDefault();
        setShowReplace(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`h-full flex flex-col bg-slate-900 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">Search</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1 rounded transition-colors ${
              showReplace
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Replace (Ctrl+Shift+H)"
          >
            <Replace className="w-4 h-4" />
          </button>
          <button
            onClick={() => search()}
            disabled={state.searching}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-50"
            title="Refresh Search"
          >
            <RefreshCw className={`w-4 h-4 ${state.searching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={clearResults}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            title="Clear Results"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search inputs */}
      <div className="p-3 space-y-2 border-b border-slate-800">
        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput
              value={state.query}
              onChange={setQuery}
              onSubmit={search}
              placeholder="Search"
              showHistory
              history={history}
            />
          </div>
          <div className="flex items-center gap-0.5">
            <OptionButton
              icon={CaseSensitive}
              active={state.options.caseSensitive}
              onClick={() => setOptions({ caseSensitive: !state.options.caseSensitive })}
              title="Match Case"
            />
            <OptionButton
              icon={WholeWord}
              active={state.options.wholeWord}
              onClick={() => setOptions({ wholeWord: !state.options.wholeWord })}
              title="Match Whole Word"
            />
            <OptionButton
              icon={Regex}
              active={state.options.useRegex}
              onClick={() => setOptions({ useRegex: !state.options.useRegex })}
              title="Use Regular Expression"
            />
          </div>
        </div>

        {/* Replace input */}
        {showReplace && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput
                value={state.replaceText}
                onChange={setReplaceText}
                placeholder="Replace"
                icon={Replace}
              />
            </div>
            <div className="flex items-center gap-0.5">
              <OptionButton
                icon={CaseSensitive}
                active={state.options.preserveCase}
                onClick={() => setOptions({ preserveCase: !state.options.preserveCase })}
                title="Preserve Case"
              />
              <button
                onClick={replaceAll}
                disabled={state.totalMatches === 0}
                className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
                title="Replace All"
              >
                Replace All
              </button>
            </div>
          </div>
        )}

        {/* File filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <MoreVertical className="w-3 h-3" />
          files to include/exclude
          {showFilters ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {showFilters && (
          <div className="space-y-2 pl-4">
            <input
              type="text"
              value={state.options.includePattern}
              onChange={e => setOptions({ includePattern: e.target.value })}
              placeholder="files to include (e.g., *.ts, src/**)"
              className="w-full px-2 py-1 text-xs bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={state.options.excludePattern}
              onChange={e => setOptions({ excludePattern: e.target.value })}
              placeholder="files to exclude"
              className="w-full px-2 py-1 text-xs bg-slate-800 text-white placeholder-slate-500 rounded outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Results summary */}
      {state.totalMatches > 0 && (
        <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800">
          {state.totalMatches} result{state.totalMatches > 1 ? 's' : ''} in{' '}
          {state.results.length} file{state.results.length > 1 ? 's' : ''}
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="px-3 py-2 text-sm text-red-400 bg-red-900/20 border-b border-red-900/50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {state.error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {state.searching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : state.results.length === 0 && state.query ? (
          <div className="px-4 py-12 text-center text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No results found</p>
            <p className="text-xs mt-1">
              Try different search terms or adjust filters
            </p>
          </div>
        ) : state.results.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Search across all files</p>
            <p className="text-xs mt-1">
              Type at least 2 characters to search
            </p>
          </div>
        ) : (
          state.results.map(result => (
            <SearchResultFile
              key={result.path}
              result={result}
              onNavigate={match => navigateToMatch(result.path, match)}
              onReplace={showReplace ? match => replaceInFile(result.path, match) : undefined}
              onReplaceAll={showReplace ? () => replaceAllInFile(result.path) : undefined}
              onToggle={() => toggleFileCollapse(result.path)}
              showReplace={showReplace}
            />
          ))
        )}
      </div>

      {/* Navigation footer */}
      {state.totalMatches > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800">
          <button
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            title="Previous Match (F3)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500">
            Navigate with F3 / Shift+F3
          </span>
          <button
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            title="Next Match (Shift+F3)"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default GlobalSearchPanel;
