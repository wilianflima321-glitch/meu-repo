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

// ============================================================================
// References Panel
// ============================================================================

// ============================================================================
// Go to Line Dialog
// ============================================================================

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

export { GoToLineDialog } from './navigation-go-to-line-dialog';
export { PeekWidget } from './navigation-peek-widget';
export { ReferencesPanel } from './navigation-references-panel';

export default NavigationProvider;

