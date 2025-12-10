/**
 * Quick Open (Ctrl+P)
 * Fuzzy file search and navigation
 */

export interface QuickOpenItem {
  path: string;
  name: string;
  type: 'file' | 'directory' | 'symbol';
  score: number;
  highlights?: number[];
}

export interface QuickOpenOptions {
  maxResults?: number;
  includeSymbols?: boolean;
  includeDirectories?: boolean;
}

export class QuickOpen {
  private fileCache: Map<string, QuickOpenItem> = new Map();
  private symbolCache: Map<string, QuickOpenItem[]> = new Map();
  private recentFiles: string[] = [];
  private readonly MAX_RECENT = 20;

  /**
   * Search files and symbols
   */
  async search(query: string, options: QuickOpenOptions = {}): Promise<QuickOpenItem[]> {
    const {
      maxResults = 50,
      includeSymbols = false,
      includeDirectories = false,
    } = options;

    // Empty query shows recent files
    if (!query) {
      return this.getRecentFiles();
    }

    const results: QuickOpenItem[] = [];

    // Search files
    const fileResults = await this.searchFiles(query, includeDirectories);
    results.push(...fileResults);

    // Search symbols if enabled
    if (includeSymbols) {
      const symbolResults = await this.searchSymbols(query);
      results.push(...symbolResults);
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Limit results
    return results.slice(0, maxResults);
  }

  /**
   * Add file to recent list
   */
  addRecent(path: string): void {
    // Remove if already exists
    this.recentFiles = this.recentFiles.filter(p => p !== path);
    
    // Add to front
    this.recentFiles.unshift(path);
    
    // Limit size
    if (this.recentFiles.length > this.MAX_RECENT) {
      this.recentFiles = this.recentFiles.slice(0, this.MAX_RECENT);
    }

    this.saveRecent();
  }

  /**
   * Get recent files
   */
  getRecentFiles(): QuickOpenItem[] {
    return this.recentFiles.map(path => ({
      path,
      name: path.split('/').pop() || path,
      type: 'file' as const,
      score: 1000, // High score for recent files
    }));
  }

  /**
   * Clear recent files
   */
  clearRecent(): void {
    this.recentFiles = [];
    this.saveRecent();
  }

  /**
   * Refresh file cache
   */
  async refreshCache(): Promise<void> {
    const response = await fetch('/api/files/all');
    
    if (!response.ok) {
      throw new Error('Failed to refresh file cache');
    }

    const data = await response.json();
    this.fileCache.clear();

    for (const file of data.files || []) {
      this.fileCache.set(file.path, {
        path: file.path,
        name: file.name,
        type: file.type,
        score: 0,
      });
    }

    console.log(`[Quick Open] Cached ${this.fileCache.size} files`);
  }

  /**
   * Search files with fuzzy matching
   */
  private async searchFiles(query: string, includeDirectories: boolean): Promise<QuickOpenItem[]> {
    // Ensure cache is populated
    if (this.fileCache.size === 0) {
      await this.refreshCache();
    }

    const results: QuickOpenItem[] = [];
    const lowerQuery = query.toLowerCase();

    for (const item of this.fileCache.values()) {
      if (!includeDirectories && item.type === 'directory') {
        continue;
      }

      const match = this.fuzzyMatch(item.name, lowerQuery);
      if (match) {
        results.push({
          ...item,
          score: match.score,
          highlights: match.highlights,
        });
      }
    }

    return results;
  }

  /**
   * Search symbols in files
   */
  private async searchSymbols(query: string): Promise<QuickOpenItem[]> {
    // This would integrate with LSP to get symbols
    // For now, return empty array
    return [];
  }

  /**
   * Fuzzy match algorithm
   */
  private fuzzyMatch(text: string, query: string): { score: number; highlights: number[] } | null {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    let score = 0;
    let queryIndex = 0;
    const highlights: number[] = [];

    // Check if all query characters are in text
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        highlights.push(i);
        queryIndex++;
        
        // Bonus for consecutive matches
        if (highlights.length > 1 && highlights[highlights.length - 1] === highlights[highlights.length - 2] + 1) {
          score += 5;
        } else {
          score += 1;
        }

        // Bonus for match at start
        if (i === 0) {
          score += 10;
        }

        // Bonus for match after separator
        if (i > 0 && (lowerText[i - 1] === '/' || lowerText[i - 1] === '-' || lowerText[i - 1] === '_')) {
          score += 5;
        }
      }
    }

    // All query characters must be matched
    if (queryIndex !== lowerQuery.length) {
      return null;
    }

    // Bonus for shorter text (more specific match)
    score += Math.max(0, 50 - text.length);

    // Bonus for exact match
    if (lowerText === lowerQuery) {
      score += 100;
    }

    // Bonus for match at start
    if (lowerText.startsWith(lowerQuery)) {
      score += 50;
    }

    return { score, highlights };
  }

  /**
   * Load recent files from storage
   */
  private loadRecent(): void {
    try {
      const stored = localStorage.getItem('quick-open-recent');
      if (stored) {
        this.recentFiles = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Quick Open] Failed to load recent files:', error);
    }
  }

  /**
   * Save recent files to storage
   */
  private saveRecent(): void {
    try {
      localStorage.setItem('quick-open-recent', JSON.stringify(this.recentFiles));
    } catch (error) {
      console.error('[Quick Open] Failed to save recent files:', error);
    }
  }

  constructor() {
    this.loadRecent();
  }
}

// Singleton instance
let quickOpenInstance: QuickOpen | null = null;

export function getQuickOpen(): QuickOpen {
  if (!quickOpenInstance) {
    quickOpenInstance = new QuickOpen();
  }
  return quickOpenInstance;
}
