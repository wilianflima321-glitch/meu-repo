/**
 * Folding Provider
 * Provides code folding ranges for different languages
 */

export interface FoldingRange {
  start: number;
  end: number;
  kind?: 'comment' | 'imports' | 'region';
}

export interface FoldingState {
  range: FoldingRange;
  collapsed: boolean;
}

export class FoldingProvider {
  private foldingStates: Map<string, FoldingState[]> = new Map();

  /**
   * Get folding ranges for document
   */
  async getFoldingRanges(uri: string, content: string, languageId: string): Promise<FoldingRange[]> {
    const ranges: FoldingRange[] = [];

    // Language-specific folding
    switch (languageId) {
      case 'typescript':
      case 'javascript':
        ranges.push(...this.getJavaScriptFolding(content));
        break;
      case 'python':
        ranges.push(...this.getPythonFolding(content));
        break;
      case 'go':
        ranges.push(...this.getGoFolding(content));
        break;
      case 'rust':
        ranges.push(...this.getRustFolding(content));
        break;
      case 'java':
      case 'csharp':
      case 'cpp':
        ranges.push(...this.getCStyleFolding(content));
        break;
      default:
        ranges.push(...this.getGenericFolding(content));
    }

    // Add region folding
    ranges.push(...this.getRegionFolding(content));

    // Sort by start line
    ranges.sort((a, b) => a.start - b.start);

    return ranges;
  }

  /**
   * Fold range
   */
  foldRange(uri: string, range: FoldingRange): void {
    if (!this.foldingStates.has(uri)) {
      this.foldingStates.set(uri, []);
    }

    const states = this.foldingStates.get(uri)!;
    const existing = states.find(s => s.range.start === range.start && s.range.end === range.end);

    if (existing) {
      existing.collapsed = true;
    } else {
      states.push({ range, collapsed: true });
    }

    console.log(`[Folding] Folded lines ${range.start}-${range.end} in ${uri}`);
  }

  /**
   * Unfold range
   */
  unfoldRange(uri: string, range: FoldingRange): void {
    const states = this.foldingStates.get(uri);
    if (!states) return;

    const existing = states.find(s => s.range.start === range.start && s.range.end === range.end);
    if (existing) {
      existing.collapsed = false;
    }

    console.log(`[Folding] Unfolded lines ${range.start}-${range.end} in ${uri}`);
  }

  /**
   * Toggle fold
   */
  toggleFold(uri: string, line: number): void {
    const states = this.foldingStates.get(uri);
    if (!states) return;

    // Find range containing line
    const state = states.find(s => s.range.start === line);
    if (state) {
      state.collapsed = !state.collapsed;
      console.log(`[Folding] Toggled fold at line ${line}`);
    }
  }

  /**
   * Fold all
   */
  foldAll(uri: string, ranges: FoldingRange[]): void {
    const states: FoldingState[] = ranges.map(range => ({
      range,
      collapsed: true,
    }));

    this.foldingStates.set(uri, states);
    console.log(`[Folding] Folded all ${ranges.length} ranges in ${uri}`);
  }

  /**
   * Unfold all
   */
  unfoldAll(uri: string): void {
    const states = this.foldingStates.get(uri);
    if (states) {
      states.forEach(state => state.collapsed = false);
    }

    console.log(`[Folding] Unfolded all in ${uri}`);
  }

  /**
   * Get folding states
   */
  getFoldingStates(uri: string): FoldingState[] {
    return this.foldingStates.get(uri) || [];
  }

  /**
   * Check if line is folded
   */
  isLineFolded(uri: string, line: number): boolean {
    const states = this.foldingStates.get(uri);
    if (!states) return false;

    return states.some(state => 
      state.collapsed && line > state.range.start && line <= state.range.end
    );
  }

  /**
   * JavaScript/TypeScript folding
   */
  private getJavaScriptFolding(content: string): FoldingRange[] {
    const ranges: FoldingRange[] = [];
    const lines = content.split('\n');

    const stack: { line: number; char: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track braces
      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '{') {
          stack.push({ line: i, char });
        } else if (char === '}' && stack.length > 0) {
          const start = stack.pop()!;
          if (i > start.line) {
            ranges.push({ start: start.line, end: i });
          }
        }
      }

      // Multi-line comments
      if (line.trim().startsWith('/*')) {
        const endLine = this.findCommentEnd(lines, i);
        if (endLine > i) {
          ranges.push({ start: i, end: endLine, kind: 'comment' });
        }
      }
    }

    return ranges;
  }

  /**
   * Python folding
   */
  private getPythonFolding(content: string): FoldingRange[] {
    const ranges: FoldingRange[] = [];
    const lines = content.split('\n');

    const stack: { line: number; indent: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.length - line.trimStart().length;

      // Check for block start (def, class, if, for, while, etc.)
      if (trimmed.match(/^(def|class|if|for|while|with|try|except|finally)\s/)) {
        stack.push({ line: i, indent });
      }

      // Pop stack when indent decreases
      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        const start = stack.pop()!;
        if (i > start.line + 1) {
          ranges.push({ start: start.line, end: i - 1 });
        }
      }
    }

    // Close remaining blocks
    while (stack.length > 0) {
      const start = stack.pop()!;
      if (lines.length - 1 > start.line) {
        ranges.push({ start: start.line, end: lines.length - 1 });
      }
    }

    return ranges;
  }

  /**
   * Go folding
   */
  private getGoFolding(content: string): FoldingRange[] {
    return this.getCStyleFolding(content);
  }

  /**
   * Rust folding
   */
  private getRustFolding(content: string): FoldingRange[] {
    return this.getCStyleFolding(content);
  }

  /**
   * C-style folding (Java, C#, C++, Go, Rust)
   */
  private getCStyleFolding(content: string): FoldingRange[] {
    const ranges: FoldingRange[] = [];
    const lines = content.split('\n');

    const stack: { line: number; char: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (char === '{') {
          stack.push({ line: i, char });
        } else if (char === '}' && stack.length > 0) {
          const start = stack.pop()!;
          if (i > start.line) {
            ranges.push({ start: start.line, end: i });
          }
        }
      }

      // Multi-line comments
      if (line.includes('/*')) {
        const endLine = this.findCommentEnd(lines, i);
        if (endLine > i) {
          ranges.push({ start: i, end: endLine, kind: 'comment' });
        }
      }
    }

    return ranges;
  }

  /**
   * Generic folding (indentation-based)
   */
  private getGenericFolding(content: string): FoldingRange[] {
    const ranges: FoldingRange[] = [];
    const lines = content.split('\n');

    const stack: { line: number; indent: number }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const indent = line.length - line.trimStart().length;

      // Pop stack when indent decreases
      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
        const start = stack.pop()!;
        if (i > start.line + 1) {
          ranges.push({ start: start.line, end: i - 1 });
        }
      }

      stack.push({ line: i, indent });
    }

    return ranges;
  }

  /**
   * Region folding (#region / #endregion)
   */
  private getRegionFolding(content: string): FoldingRange[] {
    const ranges: FoldingRange[] = [];
    const lines = content.split('\n');

    const stack: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.match(/^(\/\/|#)\s*region/i)) {
        stack.push(i);
      } else if (line.match(/^(\/\/|#)\s*endregion/i) && stack.length > 0) {
        const start = stack.pop()!;
        ranges.push({ start, end: i, kind: 'region' });
      }
    }

    return ranges;
  }

  /**
   * Find end of multi-line comment
   */
  private findCommentEnd(lines: string[], startLine: number): number {
    for (let i = startLine; i < lines.length; i++) {
      if (lines[i].includes('*/')) {
        return i;
      }
    }
    return startLine;
  }
}

// Singleton instance
let foldingProviderInstance: FoldingProvider | null = null;

export function getFoldingProvider(): FoldingProvider {
  if (!foldingProviderInstance) {
    foldingProviderInstance = new FoldingProvider();
  }
  return foldingProviderInstance;
}
