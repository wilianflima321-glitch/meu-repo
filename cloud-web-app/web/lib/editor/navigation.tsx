'use client';

/**
 * Aethel Engine - Code Navigation System
 * 
 * VS Code-style navigation with:
 * - Go to Definition (F12)
 * - Find All References (Shift+F12)
 * - Peek Definition (Alt+F12)
 * - Go to Symbol
 * - Go to Line
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  FileCode,
  Search,
  ArrowRight,
  Copy,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface Location {
  uri: string;
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface Definition extends Location {
  name?: string;
  kind?: string;
  containerName?: string;
  preview?: string[];
}

export interface Reference extends Location {
  preview?: string;
  context?: string;
}

export interface NavigationProvider {
  /** Get definition at position */
  getDefinition?: (
    uri: string,
    line: number,
    column: number
  ) => Promise<Definition | Definition[] | null>;
  
  /** Get all references at position */
  getReferences?: (
    uri: string,
    line: number,
    column: number,
    includeDeclaration?: boolean
  ) => Promise<Reference[]>;
  
  /** Get type definition */
  getTypeDefinition?: (
    uri: string,
    line: number,
    column: number
  ) => Promise<Definition | Definition[] | null>;
  
  /** Get implementations */
  getImplementations?: (
    uri: string,
    line: number,
    column: number
  ) => Promise<Definition[]>;
}

export interface NavigationContextType {
  /** Navigate to a location */
  goTo: (location: Location) => void;
  /** Go to definition at current position */
  goToDefinition: () => Promise<void>;
  /** Find all references at current position */
  findReferences: () => Promise<void>;
  /** Peek definition at current position */
  peekDefinition: () => Promise<void>;
  /** Go to specific line */
  goToLine: (line: number, column?: number) => void;
  /** Show peek widget with content */
  showPeek: (config: PeekConfig) => void;
  /** Hide peek widget */
  hidePeek: () => void;
  /** Show references panel */
  showReferences: (refs: Reference[]) => void;
  /** Register navigation provider */
  registerProvider: (provider: NavigationProvider) => void;
  /** Current peek state */
  peekState: PeekConfig | null;
  /** Current references */
  references: Reference[];
  /** Set current position */
  setCurrentPosition: (uri: string, line: number, column: number) => void;
}

export interface PeekConfig {
  title: string;
  definitions: Definition[];
  position: { x: number; y: number };
  currentUri: string;
}

// ============================================================================
// Context
// ============================================================================

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

// ============================================================================
// Provider Component
// ============================================================================

export function NavigationProvider({
  children,
  onNavigate,
  getFileContent,
}: {
  children: ReactNode;
  onNavigate?: (location: Location) => void;
  getFileContent?: (uri: string, startLine: number, endLine: number) => Promise<string[]>;
}) {
  const [provider, setProvider] = useState<NavigationProvider | null>(null);
  const [peekState, setPeekState] = useState<PeekConfig | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const currentPositionRef = useRef<{ uri: string; line: number; column: number } | null>(null);

  const setCurrentPosition = useCallback((uri: string, line: number, column: number) => {
    currentPositionRef.current = { uri, line, column };
  }, []);

  const registerProvider = useCallback((newProvider: NavigationProvider) => {
    setProvider(newProvider);
  }, []);

  const goTo = useCallback((location: Location) => {
    onNavigate?.(location);
  }, [onNavigate]);

  const goToLine = useCallback((line: number, column: number = 1) => {
    if (currentPositionRef.current) {
      goTo({
        uri: currentPositionRef.current.uri,
        range: {
          startLine: line,
          startColumn: column,
          endLine: line,
          endColumn: column,
        },
      });
    }
  }, [goTo]);

  const goToDefinition = useCallback(async () => {
    if (!provider?.getDefinition || !currentPositionRef.current) return;
    
    const { uri, line, column } = currentPositionRef.current;
    const result = await provider.getDefinition(uri, line, column);
    
    if (!result) return;
    
    const definitions = Array.isArray(result) ? result : [result];
    if (definitions.length === 1) {
      goTo(definitions[0]);
    } else if (definitions.length > 1) {
      // Show peek with multiple definitions
      showPeek({
        title: 'Definitions',
        definitions,
        position: { x: 0, y: 0 }, // Will be positioned by UI
        currentUri: uri,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, goTo]);

  const findReferences = useCallback(async () => {
    if (!provider?.getReferences || !currentPositionRef.current) return;
    
    const { uri, line, column } = currentPositionRef.current;
    const refs = await provider.getReferences(uri, line, column, true);
    setReferences(refs);
  }, [provider]);

  const peekDefinition = useCallback(async () => {
    if (!provider?.getDefinition || !currentPositionRef.current) return;
    
    const { uri, line, column } = currentPositionRef.current;
    const result = await provider.getDefinition(uri, line, column);
    
    if (!result) return;
    
    const definitions = Array.isArray(result) ? result : [result];
    
    // Get preview content for each definition
    if (getFileContent) {
      for (const def of definitions) {
        const startLine = Math.max(1, def.range.startLine - 5);
        const endLine = def.range.endLine + 10;
        def.preview = await getFileContent(def.uri, startLine, endLine);
      }
    }
    
    showPeek({
      title: definitions.length > 1 ? `${definitions.length} definitions` : 'Definition',
      definitions,
      position: { x: 0, y: 0 },
      currentUri: uri,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, getFileContent]);

  const showPeek = useCallback((config: PeekConfig) => {
    setPeekState(config);
  }, []);

  const hidePeek = useCallback(() => {
    setPeekState(null);
  }, []);

  const showReferences = useCallback((refs: Reference[]) => {
    setReferences(refs);
  }, []);

  const value: NavigationContextType = {
    goTo,
    goToDefinition,
    findReferences,
    peekDefinition,
    goToLine,
    showPeek,
    hidePeek,
    showReferences,
    registerProvider,
    peekState,
    references,
    setCurrentPosition,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// ============================================================================
// Peek Definition Widget
// ============================================================================

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

// ============================================================================
// References Panel
// ============================================================================

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

// ============================================================================
// Go to Line Dialog
// ============================================================================

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

// ============================================================================
// Keyboard Shortcuts Hook
// ============================================================================

export function useNavigationShortcuts() {
  const navigation = useNavigation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12: Go to Definition
      if (e.key === 'F12' && !e.shiftKey && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        navigation.goToDefinition();
      }
      // Shift+F12: Find All References
      else if (e.key === 'F12' && e.shiftKey && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        navigation.findReferences();
      }
      // Alt+F12: Peek Definition
      else if (e.key === 'F12' && e.altKey && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        navigation.peekDefinition();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation]);
}

export default NavigationProvider;

