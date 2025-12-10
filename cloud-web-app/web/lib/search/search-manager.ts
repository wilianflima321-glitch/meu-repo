/**
 * Search Manager
 * Orchestrates search and replace operations across workspace
 */

export interface SearchOptions {
  query: string;
  isRegex?: boolean;
  isCaseSensitive?: boolean;
  isWholeWord?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxResults?: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  lineText: string;
  matchText: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchQuery {
  query: string;
  options: SearchOptions;
  timestamp: number;
  resultCount: number;
}

export interface ReplaceOptions {
  replacement: string;
  preserveCase?: boolean;
}

export class SearchManager {
  private searchHistory: SearchQuery[] = [];
  private readonly MAX_HISTORY = 10;
  private readonly STORAGE_KEY = 'search-history';
  private currentSearch: AbortController | null = null;

  constructor() {
    this.loadHistory();
  }

  /**
   * Search across workspace
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    // Cancel previous search
    if (this.currentSearch) {
      this.currentSearch.abort();
    }

    this.currentSearch = new AbortController();
    const signal = this.currentSearch.signal;

    try {
      const results = await this.performSearch(options, signal);
      
      // Add to history
      this.addToHistory({
        query: options.query,
        options,
        timestamp: Date.now(),
        resultCount: results.length,
      });

      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Search Manager] Search cancelled');
        return [];
      }
      throw error;
    } finally {
      this.currentSearch = null;
    }
  }

  /**
   * Replace single occurrence
   */
  async replace(result: SearchResult, options: ReplaceOptions): Promise<void> {
    const { file, line, matchStart, matchEnd } = result;
    const { replacement, preserveCase } = options;

    // Read file content
    const content = await this.readFile(file);
    const lines = content.split('\n');
    
    if (line >= lines.length) {
      throw new Error(`Line ${line} out of bounds`);
    }

    // Replace in line
    const lineText = lines[line];
    const before = lineText.substring(0, matchStart);
    const after = lineText.substring(matchEnd);
    
    let finalReplacement = replacement;
    if (preserveCase) {
      finalReplacement = this.preserveCase(result.matchText, replacement);
    }

    lines[line] = before + finalReplacement + after;

    // Write back
    await this.writeFile(file, lines.join('\n'));

    console.log(`[Search Manager] Replaced in ${file}:${line}`);
  }

  /**
   * Replace all occurrences
   */
  async replaceAll(results: SearchResult[], options: ReplaceOptions): Promise<number> {
    // Group by file
    const byFile = new Map<string, SearchResult[]>();
    for (const result of results) {
      if (!byFile.has(result.file)) {
        byFile.set(result.file, []);
      }
      byFile.get(result.file)!.push(result);
    }

    let totalReplaced = 0;

    // Process each file
    for (const [file, fileResults] of byFile) {
      // Sort by line and column (descending) to replace from end to start
      fileResults.sort((a, b) => {
        if (a.line !== b.line) return b.line - a.line;
        return b.column - a.column;
      });

      const content = await this.readFile(file);
      const lines = content.split('\n');

      for (const result of fileResults) {
        const { line, matchStart, matchEnd } = result;
        
        if (line >= lines.length) continue;

        const lineText = lines[line];
        const before = lineText.substring(0, matchStart);
        const after = lineText.substring(matchEnd);
        
        let replacement = options.replacement;
        if (options.preserveCase) {
          replacement = this.preserveCase(result.matchText, replacement);
        }

        lines[line] = before + replacement + after;
        totalReplaced++;
      }

      await this.writeFile(file, lines.join('\n'));
    }

    console.log(`[Search Manager] Replaced ${totalReplaced} occurrences in ${byFile.size} files`);
    return totalReplaced;
  }

  /**
   * Get search history
   */
  getHistory(): SearchQuery[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
    this.saveHistory();
  }

  /**
   * Cancel current search
   */
  cancelSearch(): void {
    if (this.currentSearch) {
      this.currentSearch.abort();
      this.currentSearch = null;
    }
  }

  /**
   * Perform search operation
   */
  private async performSearch(
    options: SearchOptions,
    signal: AbortSignal
  ): Promise<SearchResult[]> {
    const {
      query,
      isRegex = false,
      isCaseSensitive = false,
      isWholeWord = false,
      includePatterns = ['**/*'],
      excludePatterns = ['**/node_modules/**', '**/.git/**'],
      maxResults = 10000,
    } = options;

    // Get files to search
    const files = await this.getFiles(includePatterns, excludePatterns);
    
    if (signal.aborted) return [];

    // Build search regex
    let searchRegex: RegExp;
    try {
      if (isRegex) {
        searchRegex = new RegExp(query, isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = isWholeWord ? `\\b${escaped}\\b` : escaped;
        searchRegex = new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
      }
    } catch (error) {
      throw new Error(`Invalid regex: ${query}`);
    }

    const results: SearchResult[] = [];

    // Search in each file
    for (const file of files) {
      if (signal.aborted) break;
      if (results.length >= maxResults) break;

      try {
        const content = await this.readFile(file);
        const lines = content.split('\n');

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          if (results.length >= maxResults) break;

          const lineText = lines[lineNum];
          searchRegex.lastIndex = 0; // Reset regex

          let match: RegExpExecArray | null;
          while ((match = searchRegex.exec(lineText)) !== null) {
            if (results.length >= maxResults) break;

            results.push({
              file,
              line: lineNum,
              column: match.index,
              lineText,
              matchText: match[0],
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
            });

            // Prevent infinite loop on zero-width matches
            if (match.index === searchRegex.lastIndex) {
              searchRegex.lastIndex++;
            }
          }
        }
      } catch (error) {
        console.warn(`[Search Manager] Failed to search ${file}:`, error);
      }
    }

    return results;
  }

  /**
   * Get files matching patterns
   */
  private async getFiles(
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<string[]> {
    // This would call backend API to get file list
    // For now, return mock data
    const response = await fetch('/api/files/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includePatterns, excludePatterns }),
    });

    if (!response.ok) {
      throw new Error('Failed to get file list');
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Read file content
   */
  private async readFile(path: string): Promise<string> {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to read file: ${path}`);
    }

    return response.text();
  }

  /**
   * Write file content
   */
  private async writeFile(path: string, content: string): Promise<void> {
    const response = await fetch('/api/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Preserve case when replacing
   */
  private preserveCase(original: string, replacement: string): string {
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase();
    }
    if (original === original.toLowerCase()) {
      return replacement.toLowerCase();
    }
    if (original[0] === original[0].toUpperCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
    }
    return replacement;
  }

  /**
   * Add query to history
   */
  private addToHistory(query: SearchQuery): void {
    // Remove duplicates
    this.searchHistory = this.searchHistory.filter(
      q => q.query !== query.query || JSON.stringify(q.options) !== JSON.stringify(query.options)
    );

    // Add to front
    this.searchHistory.unshift(query);

    // Limit size
    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }

    this.saveHistory();
  }

  /**
   * Load history from storage
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Search Manager] Failed to load history:', error);
    }
  }

  /**
   * Save history to storage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('[Search Manager] Failed to save history:', error);
    }
  }
}

// Singleton instance
let searchManagerInstance: SearchManager | null = null;

export function getSearchManager(): SearchManager {
  if (!searchManagerInstance) {
    searchManagerInstance = new SearchManager();
  }
  return searchManagerInstance;
}
