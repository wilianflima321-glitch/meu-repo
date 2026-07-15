/**
 * Aethel Search Runtime - backend search spine.
 *
 * Uses ripgrep when available and a Node.js fallback when needed.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { resolveWorkspaceRoot } from './workspace-path';
import type {
  SearchOptions,
  SearchMatch,
  SearchResult,
  ReplaceOptions,
  ReplaceResult,
  FileSearchOptions,
  FileMatch,
  WorkspaceSymbolSearchResult,
} from './search-runtime.types';
import {
  escapeRegex,
  fuzzyMatch,
  getRipgrepCandidates,
  inferSymbolKind,
  isBinaryFile,
  matchesGlob,
  preserveCaseReplace,
  shouldExclude,
} from './search-runtime.helpers';
import { searchWithRipgrep } from './search-runtime-ripgrep';
export type {
  SearchOptions,
  SearchMatch,
  SearchResult,
  ReplaceOptions,
  ReplaceResult,
  FileSearchOptions,
  FileMatch,
  WorkspaceSymbolSearchResult,
} from './search-runtime.types';
import {createComponentLogger} from '@/lib/observability/logger'
const log = createComponentLogger('server/search-runtime')
const execAsync = promisify(exec);
// ============================================================================
// SEARCH RUNTIME CLASS
// ============================================================================
export class SearchRuntime extends EventEmitter {
  private ripgrepPath: string | null = null;
  private ripgrepChecked = false;
  constructor() {
    super();
  }
  /**
   * Detects whether ripgrep is available on the system
   */
  private async checkRipgrep(): Promise<boolean> {
    if (this.ripgrepChecked) {
      return this.ripgrepPath !== null;
    }
    this.ripgrepChecked = true;
    for (const candidate of getRipgrepCandidates()) {
      try {
        await execAsync(`"${candidate}" --version`);
        this.ripgrepPath = candidate;
        log.info(`[SearchRuntime] Found ripgrep at: ${candidate}`);
        return true;
      } catch {
        // Continue trying
      }
    }
    log.info('[SearchRuntime] Ripgrep not found, using Node.js fallback');
    return false;
  }
  // ==========================================================================
  // TEXT SEARCH
  // ==========================================================================
  async search(options: SearchOptions): Promise<SearchResult> {
    const startTime = performance.now();
    const {
      query,
      workspaceRoot,
      isRegex = false,
      isCaseSensitive = false,
      isWholeWord = false,
      includePattern = '',
      excludePattern = '',
      maxResults = 10000,
      useGitignore = true,
      contextLines = 2,
    } = options;
    const resolvedRoot = resolveWorkspaceRoot(workspaceRoot);
    // Prefer ripgrep when available.
    const hasRipgrep = await this.checkRipgrep();
    let matches: SearchMatch[];
    let truncated = false;
    if (hasRipgrep && this.ripgrepPath) {
      const result = await searchWithRipgrep(this.ripgrepPath, {
        query,
        workspaceRoot: resolvedRoot,
        isRegex,
        isCaseSensitive,
        isWholeWord,
        includePattern,
        excludePattern,
        maxResults,
        useGitignore,
        contextLines,
      });
      matches = result.matches;
      truncated = result.truncated;
    } else {
      const result = await this.searchWithNodeJS({
        query,
        workspaceRoot: resolvedRoot,
        isRegex,
        isCaseSensitive,
        isWholeWord,
        includePattern,
        excludePattern,
        maxResults,
        useGitignore,
        contextLines,
      });
      matches = result.matches;
      truncated = result.truncated;
    }
    // Calculate statistics
    const fileSet = new Set(matches.map(m => m.file));
    const result: SearchResult = {
      matches,
      fileCount: fileSet.size,
      matchCount: matches.length,
      duration: performance.now() - startTime,
      truncated,
    };
    this.emit('searchComplete', result);
    return result;
  }
  /**
   * Search using Node.js as the universal fallback.
   */
  private async searchWithNodeJS(options: SearchOptions): Promise<{ matches: SearchMatch[]; truncated: boolean }> {
    const {
      query,
      workspaceRoot,
      isRegex,
      isCaseSensitive,
      isWholeWord,
      includePattern,
      excludePattern,
      maxResults = 10000,
      useGitignore,
      contextLines = 2,
    } = options;
    const matches: SearchMatch[] = [];
    let truncated = false;
    // Create search regex.
    let searchPattern: RegExp;
    try {
      let pattern = isRegex ? query : escapeRegex(query);
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      searchPattern = new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
    } catch (error) {
      throw new Error(`Invalid search pattern: ${error}`);
    }
    // Default exclusion patterns
    const defaultExcludes = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '__pycache__',
      '*.min.js',
      '*.min.css',
      '*.map',
    ];
    // Parse include/exclude patterns
    const includeGlobs = includePattern ? includePattern.split(',').map(p => p.trim()) : [];
    const excludeGlobs = excludePattern
      ? [...excludePattern.split(',').map(p => p.trim()), ...defaultExcludes]
      : defaultExcludes;
    // Load .gitignore when enabled.
    let gitignorePatterns: string[] = [];
    if (useGitignore) {
      try {
        const gitignorePath = path.join(workspaceRoot, '.gitignore');
        const content = await fs.readFile(gitignorePath, 'utf-8');
        gitignorePatterns = content
          .split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#'));
      } catch {
        // .gitignore doesn't exist
      }
    }
    // Walk directory
    const walkDir = async (dir: string): Promise<void> => {
      if (matches.length >= maxResults!) {
        truncated = true;
        return;
      }
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (matches.length >= maxResults!) {
            truncated = true;
            return;
          }
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(workspaceRoot, fullPath);
          // Check exclusions
          if (shouldExclude(relativePath, entry.name, excludeGlobs, gitignorePatterns)) {
            continue;
          }
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            // Check inclusion
            if (includeGlobs.length > 0 && !matchesGlob(relativePath, includeGlobs)) {
              continue;
            }
            // Skip binary files
            if (isBinaryFile(entry.name)) {
              continue;
            }
            // Search in file
            await this.searchInFile(fullPath, relativePath, searchPattern, contextLines, matches, maxResults!);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    await walkDir(workspaceRoot);
    return { matches, truncated };
  }
  /**
   * Searches a single file
   */
  private async searchInFile(
    fullPath: string,
    relativePath: string,
    pattern: RegExp,
    contextLines: number,
    matches: SearchMatch[],
    maxResults: number
  ): Promise<void> {
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
        const line = lines[i];
        let match: RegExpExecArray | null;
        // Reset regex lastIndex
        pattern.lastIndex = 0;
        while ((match = pattern.exec(line)) !== null && matches.length < maxResults) {
          const contextBefore: string[] = [];
          const contextAfter: string[] = [];
          // Get context lines
          for (let j = Math.max(0, i - contextLines); j < i; j++) {
            contextBefore.push(lines[j]);
          }
          for (let j = i + 1; j <= Math.min(lines.length - 1, i + contextLines); j++) {
            contextAfter.push(lines[j]);
          }
          matches.push({
            file: relativePath,
            line: i + 1,
            column: match.index + 1,
            length: match[0].length,
            preview: line.trim(),
            previewStart: match.index,
            contextBefore,
            contextAfter,
          });
          // Prevent infinite loop for zero-length matches
          if (match[0].length === 0) {
            pattern.lastIndex++;
          }
        }
      }
    } catch {
      // Skip files we can't read
    }
  }
  // ==========================================================================
  // REPLACE
  // ==========================================================================
  async replace(options: ReplaceOptions): Promise<ReplaceResult> {
    const {
      query,
      replacement,
      workspaceRoot,
      isRegex = false,
      isCaseSensitive = false,
      isWholeWord = false,
      includePattern,
      excludePattern,
      preserveCase = false,
    } = options;
    // First, find all matches
    const searchResult = await this.search({
      query,
      workspaceRoot,
      isRegex,
      isCaseSensitive,
      isWholeWord,
      includePattern,
      excludePattern,
      maxResults: 100000, // Higher limit for replace
      useGitignore: true,
    });
    // Group matches by file
    const matchesByFile = new Map<string, SearchMatch[]>();
    for (const match of searchResult.matches) {
      const existing = matchesByFile.get(match.file) || [];
      existing.push(match);
      matchesByFile.set(match.file, existing);
    }
    const resolvedRoot = resolveWorkspaceRoot(workspaceRoot);
    const errors: Array<{ file: string; error: string }> = [];
    let filesModified = 0;
    let replacementsCount = 0;
    // Process each file
    for (const [file, fileMatches] of matchesByFile) {
      try {
        const fullPath = path.join(resolvedRoot, file);
        let content = await fs.readFile(fullPath, 'utf-8');
        // Create search pattern
        let pattern = isRegex ? query : escapeRegex(query);
        if (isWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        const searchPattern = new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
        // Replace
        const originalContent = content;
        if (preserveCase) {
          content = content.replace(searchPattern, (match) => {
            return preserveCaseReplace(match, replacement);
          });
        } else {
          content = content.replace(searchPattern, replacement);
        }
        // Count replacements
        const matchCount = fileMatches.length;
        // Write if changed
        if (content !== originalContent) {
          await fs.writeFile(fullPath, content, 'utf-8');
          filesModified++;
          replacementsCount += matchCount;
          this.emit('fileModified', { file, replacements: matchCount });
        }
      } catch (error) {
        errors.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    const result: ReplaceResult = {
      filesModified,
      replacementsCount,
      errors,
    };
    this.emit('replaceComplete', result);
    return result;
  }
  // ==========================================================================
  // FILE SEARCH (Quick Open)
  // ==========================================================================
  async searchFiles(options: FileSearchOptions): Promise<FileMatch[]> {
    const {
      query,
      workspaceRoot,
      maxResults = 100,
      includeHidden = false,
    } = options;
    const resolvedRoot = resolveWorkspaceRoot(workspaceRoot);
    const matches: FileMatch[] = [];
    const queryLower = query.toLowerCase();
    // Default exclusions
    const excludes = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '__pycache__',
    ];
    const walkDir = async (dir: string): Promise<void> => {
      if (matches.length >= maxResults) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (matches.length >= maxResults) return;
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(resolvedRoot, fullPath);
          // Skip hidden unless requested
          if (!includeHidden && entry.name.startsWith('.')) {
            continue;
          }
          // Skip exclusions
          if (excludes.some(e => relativePath.includes(e))) {
            continue;
          }
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            // Fuzzy match
            const score = fuzzyMatch(queryLower, relativePath.toLowerCase());
            if (score > 0) {
              matches.push({
                path: relativePath,
                name: entry.name,
                score,
              });
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    };
    await walkDir(resolvedRoot);
    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, maxResults);
  }
  // ==========================================================================
  // SYMBOL SEARCH (Workspace Symbols)
  // ==========================================================================
  async searchSymbols(options: { query: string; workspaceRoot: string; language?: string }): Promise<WorkspaceSymbolSearchResult[]> {
    // This would typically delegate to LSP workspace/symbol
    // For now, we do a simple grep for common patterns
    const { query, workspaceRoot, language } = options;
    // Pattern for common symbol definitions
    const patterns = [
      `function\\s+${query}`,
      `class\\s+${query}`,
      `interface\\s+${query}`,
      `type\\s+${query}`,
      `const\\s+${query}`,
      `let\\s+${query}`,
      `var\\s+${query}`,
      `def\\s+${query}`,  // Python
      `async\\s+function\\s+${query}`,
    ];
    const combinedPattern = patterns.join('|');
    const result = await this.search({
      query: combinedPattern,
      workspaceRoot,
      isRegex: true,
      isCaseSensitive: false,
      maxResults: 100,
    });
    // Transform to symbol format
    return result.matches.map(m => ({
      name: query,
      kind: inferSymbolKind(m.preview),
      location: {
        uri: m.file,
        range: {
          start: { line: m.line - 1, character: m.column - 1 },
          end: { line: m.line - 1, character: m.column - 1 + m.length },
        },
      },
      containerName: path.dirname(m.file),
    }));
  }
}
// ============================================================================
// SINGLETON
// ============================================================================
let searchRuntime: SearchRuntime | null = null;
export function getSearchRuntime(): SearchRuntime {
  if (!searchRuntime) {
    searchRuntime = new SearchRuntime();
  }
  return searchRuntime;
}
export { SearchRuntime as default };
