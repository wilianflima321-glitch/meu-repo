/**
 * Aethel Search Service
 * 
 * Sistema avançado de busca com regex, replace,
 * filtros e preview de resultados.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchOptions {
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  includePattern: string;
  excludePattern: string;
  maxResults: number;
  useGitignore: boolean;
  context: number;
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

export interface ReplaceResult {
  filesModified: number;
  replacementsCount: number;
  errors: Array<{ file: string; error: string }>;
}

export interface FileSearchMatch {
  path: string;
  name: string;
  icon?: string;
  score: number;
}

// ============================================================================
// SEARCH SERVICE
// ============================================================================

export class SearchService extends EventEmitter {
  private workspaceRoot: string;
  private fileCache: Map<string, string[]> = new Map();
  private gitignorePatterns: string[] = [];
  private isSearching: boolean = false;
  private abortController: AbortController | null = null;
  
  constructor(workspaceRoot: string) {
    super();
    this.workspaceRoot = workspaceRoot;
  }
  
  // ==========================================================================
  // TEXT SEARCH
  // ==========================================================================
  
  async search(options: Partial<SearchOptions>): Promise<SearchResult> {
    if (this.isSearching) {
      this.abort();
    }
    
    this.isSearching = true;
    this.abortController = new AbortController();
    
    const fullOptions: SearchOptions = {
      query: '',
      isRegex: false,
      isCaseSensitive: false,
      isWholeWord: false,
      includePattern: '',
      excludePattern: '',
      maxResults: 10000,
      useGitignore: true,
      context: 2,
      ...options,
    };
    
    const startTime = performance.now();
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fullOptions,
          workspaceRoot: this.workspaceRoot,
        }),
        signal: this.abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const result: SearchResult = await response.json();
      result.duration = performance.now() - startTime;
      
      this.emit('searchComplete', result);
      return result;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.emit('searchAborted');
        return {
          matches: [],
          fileCount: 0,
          matchCount: 0,
          duration: performance.now() - startTime,
          truncated: false,
        };
      }
      throw error;
    } finally {
      this.isSearching = false;
      this.abortController = null;
    }
  }
  
  // Client-side search (for smaller workspaces or cached files)
  searchLocal(content: string, options: Partial<SearchOptions>): SearchMatch[] {
    const fullOptions: SearchOptions = {
      query: '',
      isRegex: false,
      isCaseSensitive: false,
      isWholeWord: false,
      includePattern: '',
      excludePattern: '',
      maxResults: 10000,
      useGitignore: true,
      context: 2,
      ...options,
    };
    
    if (!fullOptions.query) return [];
    
    const matches: SearchMatch[] = [];
    const lines = content.split('\n');
    
    let pattern: RegExp;
    try {
      let queryPattern = fullOptions.isRegex
        ? fullOptions.query
        : this.escapeRegex(fullOptions.query);
      
      if (fullOptions.isWholeWord) {
        queryPattern = `\\b${queryPattern}\\b`;
      }
      
      pattern = new RegExp(
        queryPattern,
        fullOptions.isCaseSensitive ? 'g' : 'gi'
      );
    } catch {
      return matches;
    }
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match: RegExpExecArray | null;
      
      pattern.lastIndex = 0;
      while ((match = pattern.exec(line)) !== null) {
        matches.push({
          file: '',
          line: lineIndex + 1,
          column: match.index + 1,
          length: match[0].length,
          preview: line,
          previewStart: 0,
          contextBefore: lines.slice(Math.max(0, lineIndex - fullOptions.context), lineIndex),
          contextAfter: lines.slice(lineIndex + 1, lineIndex + 1 + fullOptions.context),
        });
        
        if (matches.length >= fullOptions.maxResults) {
          return matches;
        }
        
        // Prevent infinite loop for empty matches
        if (match[0].length === 0) break;
      }
    }
    
    return matches;
  }
  
  // ==========================================================================
  // REPLACE
  // ==========================================================================
  
  async replace(
    replaceText: string,
    matches: SearchMatch[],
    options: Partial<SearchOptions>
  ): Promise<ReplaceResult> {
    const response = await fetch('/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replaceText,
        matches,
        ...options,
        workspaceRoot: this.workspaceRoot,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Replace failed');
    }
    
    const result: ReplaceResult = await response.json();
    this.emit('replaceComplete', result);
    return result;
  }
  
  replaceInString(
    content: string,
    searchText: string,
    replaceText: string,
    options: Partial<SearchOptions>
  ): string {
    const fullOptions = {
      isRegex: false,
      isCaseSensitive: false,
      isWholeWord: false,
      ...options,
    };
    
    let pattern: RegExp;
    try {
      let queryPattern = fullOptions.isRegex
        ? searchText
        : this.escapeRegex(searchText);
      
      if (fullOptions.isWholeWord) {
        queryPattern = `\\b${queryPattern}\\b`;
      }
      
      pattern = new RegExp(
        queryPattern,
        fullOptions.isCaseSensitive ? 'g' : 'gi'
      );
    } catch {
      return content;
    }
    
    return content.replace(pattern, replaceText);
  }
  
  // ==========================================================================
  // FILE SEARCH
  // ==========================================================================
  
  async searchFiles(query: string, limit: number = 50): Promise<FileSearchMatch[]> {
    if (!query) return [];
    
    const response = await fetch('/api/search/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit,
        workspaceRoot: this.workspaceRoot,
      }),
    });
    
    if (!response.ok) {
      throw new Error('File search failed');
    }
    
    return response.json();
  }
  
  // Fuzzy match for client-side file search
  fuzzyMatchFiles(files: string[], query: string, limit: number = 50): FileSearchMatch[] {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase();
    const scored: FileSearchMatch[] = [];
    
    for (const filePath of files) {
      const name = filePath.split(/[/\\]/).pop() || '';
      const lowerPath = filePath.toLowerCase();
      const lowerName = name.toLowerCase();
      
      let score = 0;
      
      // Exact match
      if (lowerName === lowerQuery) {
        score = 1000;
      } else if (lowerName.startsWith(lowerQuery)) {
        score = 800;
      } else if (lowerName.includes(lowerQuery)) {
        score = 600;
      } else if (lowerPath.includes(lowerQuery)) {
        score = 400;
      } else {
        // Fuzzy match
        score = this.fuzzyScore(lowerPath, lowerQuery);
      }
      
      if (score > 0) {
        scored.push({
          path: filePath,
          name,
          score,
        });
      }
    }
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  private fuzzyScore(text: string, pattern: string): number {
    let patternIdx = 0;
    let score = 0;
    let consecutiveBonus = 0;
    
    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        score += 10 + consecutiveBonus;
        consecutiveBonus += 5;
        patternIdx++;
        
        // Bonus for matching at word boundaries
        if (i === 0 || text[i - 1] === '/' || text[i - 1] === '\\' || text[i - 1] === '.') {
          score += 20;
        }
      } else {
        consecutiveBonus = 0;
      }
    }
    
    // Only count as match if all pattern characters were found
    return patternIdx === pattern.length ? score : 0;
  }
  
  // ==========================================================================
  // SYMBOL SEARCH
  // ==========================================================================
  
  async searchSymbols(query: string, limit: number = 50): Promise<SymbolSearchResult[]> {
    const response = await fetch('/api/search/symbols', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit,
        workspaceRoot: this.workspaceRoot,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Symbol search failed');
    }
    
    return response.json();
  }
  
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
  
  isActive(): boolean {
    return this.isSearching;
  }
  
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // Create a highlighted preview
  highlightMatch(text: string, match: { column: number; length: number }): HighlightedText[] {
    const parts: HighlightedText[] = [];
    const start = match.column - 1;
    const end = start + match.length;
    
    if (start > 0) {
      parts.push({ text: text.slice(0, start), isMatch: false });
    }
    
    parts.push({ text: text.slice(start, end), isMatch: true });
    
    if (end < text.length) {
      parts.push({ text: text.slice(end), isMatch: false });
    }
    
    return parts;
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

export interface HighlightedText {
  text: string;
  isMatch: boolean;
}

export interface SymbolSearchResult {
  name: string;
  kind: 'class' | 'function' | 'method' | 'variable' | 'interface' | 'type' | 'enum' | 'module';
  file: string;
  line: number;
  column: number;
  containerName?: string;
}

// ============================================================================
// SINGLETON
// ============================================================================

let searchService: SearchService | null = null;

export function getSearchService(workspaceRoot: string): SearchService {
  if (!searchService || searchService['workspaceRoot'] !== workspaceRoot) {
    searchService = new SearchService(workspaceRoot);
  }
  return searchService;
}

export default SearchService;
