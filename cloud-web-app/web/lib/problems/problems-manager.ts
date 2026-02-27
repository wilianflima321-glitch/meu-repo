/**
 * Problems Manager
 * Aggregates and manages diagnostics from LSP and other sources
 */
import { readFileViaFs, writeFileViaFs } from '@/lib/client/files-fs'

export interface Diagnostic {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source?: string;
  code?: string | number;
  relatedInformation?: DiagnosticRelatedInformation[];
}

export interface DiagnosticRelatedInformation {
  location: {
    uri: string;
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  };
  message: string;
}

export interface QuickFix {
  title: string;
  kind: string;
  edit?: WorkspaceEdit;
  command?: Command;
}

export interface WorkspaceEdit {
  changes: Record<string, TextEdit[]>;
}

export interface TextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

export interface Command {
  title: string;
  command: string;
  arguments?: any[];
}

export interface ProblemFilter {
  severity?: 'error' | 'warning' | 'info' | 'hint';
  source?: string;
  uri?: string;
}

export interface ProblemStats {
  errors: number;
  warnings: number;
  infos: number;
  hints: number;
  total: number;
}

export class ProblemsManager {
  private diagnostics: Map<string, Diagnostic[]> = new Map();
  private quickFixes: Map<string, QuickFix[]> = new Map();
  private listeners: Set<(stats: ProblemStats) => void> = new Set();

  /**
   * Add diagnostics for a file
   */
  addProblems(uri: string, diagnostics: Diagnostic[]): void {
    this.diagnostics.set(uri, diagnostics);
    this.notifyListeners();
    console.log(`[Problems] Added ${diagnostics.length} problems for ${uri}`);
  }

  /**
   * Clear problems for a file
   */
  clearProblems(uri?: string): void {
    if (uri) {
      this.diagnostics.delete(uri);
      console.log(`[Problems] Cleared problems for ${uri}`);
    } else {
      this.diagnostics.clear();
      console.log('[Problems] Cleared all problems');
    }
    this.notifyListeners();
  }

  /**
   * Get all problems
   */
  getProblems(filter?: ProblemFilter): Diagnostic[] {
    let problems: Diagnostic[] = [];

    // Collect all diagnostics
    for (const [uri, diagnostics] of this.diagnostics) {
      if (filter?.uri && uri !== filter.uri) continue;
      problems.push(...diagnostics);
    }

    // Apply filters
    if (filter?.severity) {
      problems = problems.filter(p => p.severity === filter.severity);
    }

    if (filter?.source) {
      problems = problems.filter(p => p.source === filter.source);
    }

    // Sort by severity, then by file, then by line
    problems.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2, hint: 3 };
      
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }

      if (a.uri !== b.uri) {
        return a.uri.localeCompare(b.uri);
      }

      return a.range.start.line - b.range.start.line;
    });

    return problems;
  }

  /**
   * Get problems for a file
   */
  getProblemsForFile(uri: string): Diagnostic[] {
    return this.diagnostics.get(uri) || [];
  }

  /**
   * Get problem statistics
   */
  getStats(): ProblemStats {
    let errors = 0;
    let warnings = 0;
    let infos = 0;
    let hints = 0;

    for (const diagnostics of this.diagnostics.values()) {
      for (const diagnostic of diagnostics) {
        switch (diagnostic.severity) {
          case 'error':
            errors++;
            break;
          case 'warning':
            warnings++;
            break;
          case 'info':
            infos++;
            break;
          case 'hint':
            hints++;
            break;
        }
      }
    }

    return {
      errors,
      warnings,
      infos,
      hints,
      total: errors + warnings + infos + hints,
    };
  }

  /**
   * Get quick fixes for a problem
   */
  async getQuickFixes(diagnostic: Diagnostic): Promise<QuickFix[]> {
    const key = this.getDiagnosticKey(diagnostic);
    
    // Check cache
    if (this.quickFixes.has(key)) {
      return this.quickFixes.get(key)!;
    }

    // Request quick fixes from LSP
    try {
      const response = await fetch('/api/lsp/code-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uri: diagnostic.uri,
          range: diagnostic.range,
          context: {
            diagnostics: [diagnostic],
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get quick fixes');
      }

      const fixes: QuickFix[] = await response.json();
      this.quickFixes.set(key, fixes);
      return fixes;
    } catch (error) {
      console.error('[Problems] Failed to get quick fixes:', error);
      return [];
    }
  }

  /**
   * Apply quick fix
   */
  async applyQuickFix(fix: QuickFix): Promise<void> {
    if (fix.edit) {
      await this.applyWorkspaceEdit(fix.edit);
    }

    if (fix.command) {
      await this.executeCommand(fix.command);
    }

    console.log(`[Problems] Applied quick fix: ${fix.title}`);
  }

  /**
   * Apply workspace edit
   */
  private async applyWorkspaceEdit(edit: WorkspaceEdit): Promise<void> {
    for (const [uri, edits] of Object.entries(edit.changes)) {
      // Read file
      let content = await readFileViaFs(uri).catch(() => '')
      if (!content) continue
      const lines = content.split('\n');

      // Apply edits in reverse order to maintain positions
      const sortedEdits = [...edits].sort((a, b) => {
        if (a.range.start.line !== b.range.start.line) {
          return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
      });

      for (const edit of sortedEdits) {
        const { range, newText } = edit;
        const { start, end } = range;

        if (start.line === end.line) {
          // Single line edit
          const line = lines[start.line];
          const before = line.substring(0, start.character);
          const after = line.substring(end.character);
          lines[start.line] = before + newText + after;
        } else {
          // Multi-line edit
          const firstLine = lines[start.line].substring(0, start.character);
          const lastLine = lines[end.line].substring(end.character);
          const newLines = newText.split('\n');
          
          lines[start.line] = firstLine + newLines[0];
          lines.splice(start.line + 1, end.line - start.line, ...newLines.slice(1));
          lines[start.line + newLines.length - 1] += lastLine;
        }
      }

      // Write file
      content = lines.join('\n');
      await writeFileViaFs(uri, content, {
        writeOptions: { createDirectories: true, atomic: true },
      })
    }
  }

  /**
   * Execute command
   */
  private async executeCommand(command: Command): Promise<void> {
    await fetch('/api/commands/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
  }

  /**
   * Get diagnostic key for caching
   */
  private getDiagnosticKey(diagnostic: Diagnostic): string {
    return `${diagnostic.uri}:${diagnostic.range.start.line}:${diagnostic.range.start.character}:${diagnostic.message}`;
  }

  /**
   * Listen to problem changes
   */
  onDidChangeProblems(listener: (stats: ProblemStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }

  /**
   * Group problems by file
   */
  groupByFile(): Map<string, Diagnostic[]> {
    return new Map(this.diagnostics);
  }

  /**
   * Group problems by severity
   */
  groupBySeverity(): Map<string, Diagnostic[]> {
    const groups = new Map<string, Diagnostic[]>();
    
    for (const diagnostics of this.diagnostics.values()) {
      for (const diagnostic of diagnostics) {
        if (!groups.has(diagnostic.severity)) {
          groups.set(diagnostic.severity, []);
        }
        groups.get(diagnostic.severity)!.push(diagnostic);
      }
    }

    return groups;
  }

  /**
   * Group problems by source
   */
  groupBySource(): Map<string, Diagnostic[]> {
    const groups = new Map<string, Diagnostic[]>();
    
    for (const diagnostics of this.diagnostics.values()) {
      for (const diagnostic of diagnostics) {
        const source = diagnostic.source || 'unknown';
        if (!groups.has(source)) {
          groups.set(source, []);
        }
        groups.get(source)!.push(diagnostic);
      }
    }

    return groups;
  }
}

// Singleton instance
let problemsManagerInstance: ProblemsManager | null = null;

export function getProblemsManager(): ProblemsManager {
  if (!problemsManagerInstance) {
    problemsManagerInstance = new ProblemsManager();
  }
  return problemsManagerInstance;
}
