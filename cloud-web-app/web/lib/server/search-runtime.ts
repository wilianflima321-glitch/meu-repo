/**
 * Aethel Search Runtime - Backend Real
 * 
 * Sistema de busca real usando ripgrep ou fallback para Node.js fs
 * para busca de texto em arquivos do workspace.
 * 
 * Features:
 * - Ripgrep para performance máxima (quando disponível)
 * - Fallback Node.js para compatibilidade universal
 * - Suporte a regex, case sensitivity, whole word
 * - Respeita .gitignore e padrões de exclusão
 * - Streaming de resultados para arquivos grandes
 * - Context lines (before/after match)
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { resolveWorkspaceRoot } from './workspace-path';

const execAsync = promisify(exec);

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
   * Detecta se ripgrep está disponível no sistema
   */
  private async checkRipgrep(): Promise<boolean> {
    if (this.ripgrepChecked) {
      return this.ripgrepPath !== null;
    }
    
    this.ripgrepChecked = true;
    
    // Tenta encontrar ripgrep
    const candidates = [
      'rg',
      'ripgrep',
      // Windows paths comuns
      'C:\\Program Files\\ripgrep\\rg.exe',
      'C:\\Users\\%USERNAME%\\scoop\\apps\\ripgrep\\current\\rg.exe',
      // VS Code bundled ripgrep
      path.join(process.env.VSCODE_CWD || '', 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg'),
    ];
    
    for (const candidate of candidates) {
      try {
        await execAsync(`"${candidate}" --version`);
        this.ripgrepPath = candidate;
        console.log(`[SearchRuntime] Found ripgrep at: ${candidate}`);
        return true;
      } catch {
        // Continue trying
      }
    }
    
    console.log('[SearchRuntime] Ripgrep not found, using Node.js fallback');
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
    
    // Tenta usar ripgrep primeiro
    const hasRipgrep = await this.checkRipgrep();
    
    let matches: SearchMatch[];
    let truncated = false;
    
    if (hasRipgrep && this.ripgrepPath) {
      const result = await this.searchWithRipgrep({
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
    
    // Calcula estatísticas
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
   * Busca usando ripgrep (alta performance)
   */
  private async searchWithRipgrep(options: SearchOptions): Promise<{ matches: SearchMatch[]; truncated: boolean }> {
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
    
    const args: string[] = [
      '--json',  // JSON output for easy parsing
      '--line-number',
      '--column',
      '--max-count', String(maxResults),
    ];
    
    // Context lines
    if (contextLines > 0) {
      args.push('--context', String(contextLines));
    }
    
    // Case sensitivity
    if (!isCaseSensitive) {
      args.push('--ignore-case');
    }
    
    // Whole word
    if (isWholeWord) {
      args.push('--word-regexp');
    }
    
    // Regex mode
    if (isRegex) {
      args.push('--pcre2');  // Use PCRE2 for full regex support
    } else {
      args.push('--fixed-strings');
    }
    
    // Gitignore
    if (!useGitignore) {
      args.push('--no-ignore');
    }
    
    // Include pattern
    if (includePattern) {
      const patterns = includePattern.split(',').map(p => p.trim());
      for (const pattern of patterns) {
        args.push('--glob', pattern);
      }
    }
    
    // Exclude pattern
    if (excludePattern) {
      const patterns = excludePattern.split(',').map(p => p.trim());
      for (const pattern of patterns) {
        args.push('--glob', `!${pattern}`);
      }
    }
    
    // Default exclusions
    args.push('--glob', '!node_modules/**');
    args.push('--glob', '!.git/**');
    args.push('--glob', '!dist/**');
    args.push('--glob', '!build/**');
    args.push('--glob', '!*.min.js');
    args.push('--glob', '!*.min.css');
    
    // Query and path
    args.push('--', query, workspaceRoot);
    
    return new Promise((resolve, reject) => {
      const matches: SearchMatch[] = [];
      let truncated = false;
      const contextBuffer: Map<string, { before: string[]; after: string[] }> = new Map();
      
      const rg = spawn(this.ripgrepPath!, args, {
        cwd: workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let buffer = '';
      
      rg.stdout.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const json = JSON.parse(line);
            
            if (json.type === 'match') {
              const data = json.data;
              const relativePath = path.relative(workspaceRoot, data.path.text);
              
              for (const submatch of data.submatches) {
                matches.push({
                  file: relativePath,
                  line: data.line_number,
                  column: submatch.start + 1,
                  length: submatch.end - submatch.start,
                  preview: data.lines.text.trim(),
                  previewStart: submatch.start,
                  contextBefore: [],
                  contextAfter: [],
                });
              }
            } else if (json.type === 'context') {
              // Context lines (before/after match)
              // Handled by ripgrep's --context flag
            } else if (json.type === 'summary') {
              // Search summary
              if (json.data.stats.matches >= maxResults!) {
                truncated = true;
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      });
      
      rg.stderr.on('data', (data: Buffer) => {
        const error = data.toString();
        if (!error.includes('No files were searched')) {
          console.warn('[SearchRuntime] ripgrep warning:', error);
        }
      });
      
      rg.on('close', (code) => {
        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const json = JSON.parse(buffer);
            if (json.type === 'match') {
              const data = json.data;
              const relativePath = path.relative(workspaceRoot, data.path.text);
              
              for (const submatch of data.submatches) {
                matches.push({
                  file: relativePath,
                  line: data.line_number,
                  column: submatch.start + 1,
                  length: submatch.end - submatch.start,
                  preview: data.lines.text.trim(),
                  previewStart: submatch.start,
                  contextBefore: [],
                  contextAfter: [],
                });
              }
            }
          } catch {
            // Ignore
          }
        }
        
        resolve({ matches, truncated });
      });
      
      rg.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Busca usando Node.js (fallback universal)
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
    
    // Cria regex de busca
    let searchPattern: RegExp;
    try {
      let pattern = isRegex ? query : this.escapeRegex(query);
      
      if (isWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      
      searchPattern = new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
    } catch (error) {
      throw new Error(`Invalid search pattern: ${error}`);
    }
    
    // Padrões de exclusão padrão
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
    
    // Carrega .gitignore se habilitado
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
          if (this.shouldExclude(relativePath, entry.name, excludeGlobs, gitignorePatterns)) {
            continue;
          }
          
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            // Check inclusion
            if (includeGlobs.length > 0 && !this.matchesGlob(relativePath, includeGlobs)) {
              continue;
            }
            
            // Skip binary files
            if (this.isBinaryFile(entry.name)) {
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
   * Busca em um único arquivo
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
        let pattern = isRegex ? query : this.escapeRegex(query);
        if (isWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        const searchPattern = new RegExp(pattern, isCaseSensitive ? 'g' : 'gi');
        
        // Replace
        const originalContent = content;
        
        if (preserveCase) {
          content = content.replace(searchPattern, (match) => {
            return this.preserveCaseReplace(match, replacement);
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
            const score = this.fuzzyMatch(queryLower, relativePath.toLowerCase());
            
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
  
  async searchSymbols(options: { query: string; workspaceRoot: string; language?: string }): Promise<any[]> {
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
      kind: this.inferSymbolKind(m.preview),
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
  
  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  private shouldExclude(
    relativePath: string,
    name: string,
    excludeGlobs: string[],
    gitignorePatterns: string[]
  ): boolean {
    // Check direct matches
    for (const pattern of [...excludeGlobs, ...gitignorePatterns]) {
      if (this.matchesGlob(relativePath, [pattern]) || this.matchesGlob(name, [pattern])) {
        return true;
      }
    }
    
    // Check path segments
    const segments = relativePath.split(path.sep);
    for (const segment of segments) {
      if (excludeGlobs.includes(segment)) {
        return true;
      }
    }
    
    return false;
  }
  
  private matchesGlob(filePath: string, patterns: string[]): boolean {
    // Simple glob matching (supports * and **)
    for (const pattern of patterns) {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{GLOBSTAR}}/g, '.*');
      
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      
      if (regex.test(filePath)) {
        return true;
      }
    }
    
    return false;
  }
  
  private isBinaryFile(filename: string): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
      '.mp3', '.wav', '.ogg', '.mp4', '.webm', '.avi',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.zip', '.tar', '.gz', '.rar', '.7z',
      '.exe', '.dll', '.so', '.dylib',
      '.woff', '.woff2', '.ttf', '.eot',
      '.bin', '.dat', '.db', '.sqlite',
    ];
    
    const ext = path.extname(filename).toLowerCase();
    return binaryExtensions.includes(ext);
  }
  
  private fuzzyMatch(query: string, text: string): number {
    if (!query) return 0;
    
    let score = 0;
    let queryIndex = 0;
    let consecutiveBonus = 0;
    let lastMatchIndex = -1;
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score += 1;
        
        // Consecutive match bonus
        if (lastMatchIndex === i - 1) {
          consecutiveBonus += 2;
        }
        
        // Start of word bonus
        if (i === 0 || text[i - 1] === '/' || text[i - 1] === '\\' || text[i - 1] === '.') {
          score += 5;
        }
        
        lastMatchIndex = i;
        queryIndex++;
      }
    }
    
    // All characters matched?
    if (queryIndex === query.length) {
      score += consecutiveBonus;
      // Prefer shorter matches
      score += Math.max(0, 20 - text.length);
      return score;
    }
    
    return 0;
  }
  
  private preserveCaseReplace(match: string, replacement: string): string {
    if (match === match.toUpperCase()) {
      return replacement.toUpperCase();
    }
    if (match === match.toLowerCase()) {
      return replacement.toLowerCase();
    }
    if (match[0] === match[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase();
    }
    return replacement;
  }
  
  private inferSymbolKind(preview: string): number {
    // LSP SymbolKind
    if (preview.includes('class ')) return 5;   // Class
    if (preview.includes('interface ')) return 11; // Interface
    if (preview.includes('function ') || preview.includes('def ')) return 12; // Function
    if (preview.includes('type ')) return 15;   // TypeParameter
    if (preview.includes('const ') || preview.includes('let ') || preview.includes('var ')) return 13; // Variable
    return 0; // Unknown
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
