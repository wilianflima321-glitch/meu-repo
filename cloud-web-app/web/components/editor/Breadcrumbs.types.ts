import type { LucideIcon } from 'lucide-react';

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
