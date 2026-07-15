/**
 * Shared contracts for the Aethel search runtime.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SearchOptions {
  query: string;
  workspaceRoot: string;
  isRegex?: boolean;
  isCaseSensitive?: boolean;
  isWholeWord?: boolean;
  includePattern?: string;
  excludePattern?: string;
  maxResults?: number;
  useGitignore?: boolean;
  contextLines?: number;
}

export interface SearchMatch {
  file: string;
  line: number;
  column: number;
  length: number;
  preview: string;
  previewStart: number;
  contextBefore: string[];
  contextAfter: string[];
}

export interface SearchResult {
  matches: SearchMatch[];
  fileCount: number;
  matchCount: number;
  duration: number;
  truncated: boolean;
}

export interface ReplaceOptions extends SearchOptions {
  replacement: string;
  preserveCase?: boolean;
}

export interface ReplaceResult {
  filesModified: number;
  replacementsCount: number;
  errors: Array<{ file: string; error: string }>;
}

export interface FileSearchOptions {
  query: string;
  workspaceRoot: string;
  maxResults?: number;
  includeHidden?: boolean;
}

export interface FileMatch {
  path: string;
  name: string;
  score: number;
}

export interface WorkspaceSymbolSearchResult {
  name: string
  kind: number
  location: {
    uri: string
    range: {
      start: { line: number; character: number }
      end: { line: number; character: number }
    }
  }
  containerName: string
}
