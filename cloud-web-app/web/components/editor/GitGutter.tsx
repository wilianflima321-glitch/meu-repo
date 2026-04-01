'use client';

/**
 * Aethel Engine - Git Gutter Decorations
 *
 * Monaco editor decorations showing git diff status:
 * - Green: Added lines
 * - Blue: Modified lines
 * - Red: Deleted lines indicator
 * - Hover preview with diff
 * - Click to view full diff
 */

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type RefObject,
} from 'react';
import type { editor as MonacoEditor, IDisposable } from 'monaco-editor';

// ============================================================================
// Types
// ============================================================================

export interface LineChange {
  type: 'added' | 'modified' | 'deleted';
  startLine: number;
  endLine: number;
  originalStartLine?: number;
  originalEndLine?: number;
  originalContent?: string[];
  modifiedContent?: string[];
}

export interface GitGutterOptions {
  /** Monaco editor instance */
  editor: MonacoEditor.IStandaloneCodeEditor;
  /** Current file path */
  filePath: string;
  /** Line changes from git diff */
  changes: LineChange[];
  /** Callback when clicking a gutter decoration */
  onClickChange?: (change: LineChange) => void;
  /** Callback when hovering a gutter decoration */
  onHoverChange?: (change: LineChange | null, event?: MouseEvent) => void;
}

export interface DiffHunkPreviewProps {
  change: LineChange;
  position: { x: number; y: number };
  onClose: () => void;
  onViewFullDiff?: () => void;
  onRevertChange?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const GUTTER_WIDTH = 4;

const DECORATION_CLASSES = {
  added: 'git-gutter-added',
  modified: 'git-gutter-modified',
  deleted: 'git-gutter-deleted',
};

const COLORS = {
  added: 'var(--aethel-success)',
  modified: 'var(--aethel-primary)',
  deleted: 'var(--aethel-error)',
  addedBg: 'color-mix(in_srgb,var(--aethel-success)_15%,transparent)',
  modifiedBg: 'color-mix(in_srgb,var(--aethel-primary)_15%,transparent)',
  deletedBg: 'color-mix(in_srgb,var(--aethel-error)_15%,transparent)',
};

// ============================================================================
// Inject CSS for Gutter Decorations
// ============================================================================

let cssInjected = false;

function injectGutterCSS() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;

  const style = document.createElement('style');
  style.id = 'git-gutter-styles';
  style.textContent = `
    .git-gutter-added {
      background-color: ${COLORS.added};
      width: ${GUTTER_WIDTH}px !important;
      margin-left: 3px;
      border-radius: 1px;
    }

    .git-gutter-modified {
      background-color: ${COLORS.modified};
      width: ${GUTTER_WIDTH}px !important;
      margin-left: 3px;
      border-radius: 1px;
    }

    .git-gutter-deleted {
      border-left: ${GUTTER_WIDTH}px solid ${COLORS.deleted};
      margin-left: 3px;
    }

    .git-gutter-deleted::before {
      content: '';
      position: absolute;
      left: 0;
      width: 0;
      height: 0;
      border-left: 6px solid ${COLORS.deleted};
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
    }

    .git-line-added {
      background-color: ${COLORS.addedBg};
    }

    .git-line-modified {
      background-color: ${COLORS.modifiedBg};
    }

    .git-line-deleted-indicator {
      background-color: ${COLORS.deletedBg};
    }

    /* Gutter hover effect */
    .git-gutter-added:hover,
    .git-gutter-modified:hover {
      filter: brightness(1.2);
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// Git Gutter Hook
// ============================================================================

export function useGitGutter({
  editor,
  filePath,
  changes,
  onClickChange,
  onHoverChange,
}: GitGutterOptions) {
  const decorationsRef = useRef<string[]>([]);
  const disposablesRef = useRef<IDisposable[]>([]);

  // Update decorations when changes update
  useEffect(() => {
    if (!editor) return;

    injectGutterCSS();

    // Clear old decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    // Create new decorations
    const decorations: MonacoEditor.IModelDeltaDecoration[] = [];

    changes.forEach(change => {
      const className = DECORATION_CLASSES[change.type];
      const lineClassName = change.type === 'added'
        ? 'git-line-added'
        : change.type === 'modified'
          ? 'git-line-modified'
          : 'git-line-deleted-indicator';

      if (change.type === 'deleted') {
        // Deleted lines show indicator on the line AFTER the deletion
        decorations.push({
          range: {
            startLineNumber: change.startLine,
            startColumn: 1,
            endLineNumber: change.startLine,
            endColumn: 1,
          },
          options: {
            isWholeLine: false,
            linesDecorationsClassName: className,
            glyphMarginClassName: 'git-deleted-glyph',
            glyphMarginHoverMessage: {
              value: `**${change.originalContent?.length || 0} linha(s) removida(s)**\n\n\`\`\`\n${change.originalContent?.join('\n') || ''}\n\`\`\``,
            },
          },
        });
      } else {
        // Added/Modified lines
        for (let line = change.startLine; line <= change.endLine; line++) {
          decorations.push({
            range: {
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: 1,
            },
            options: {
              isWholeLine: true,
              linesDecorationsClassName: className,
              className: lineClassName,
              glyphMarginHoverMessage: {
                value: change.type === 'added'
                  ? '**Line added**'
                  : '**Line modified**\n\nClick to see original',
              },
            },
          });
        }
      }
    });

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations([], decorations);

    // Cleanup
    return () => {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    };
  }, [editor, changes]);

  // Handle click on gutter
  useEffect(() => {
    if (!editor || !onClickChange) return;

    const disposable = editor.onMouseDown(e => {
      if (e.target.type === 4) { // Glyph margin or line decorations
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          const change = changes.find(
            c => lineNumber >= c.startLine && lineNumber <= c.endLine
          );
          if (change) {
            onClickChange(change);
          }
        }
      }
    });

    disposablesRef.current.push(disposable);

    return () => {
      disposable.dispose();
    };
  }, [editor, changes, onClickChange]);

  // Handle hover on gutter
  useEffect(() => {
    if (!editor || !onHoverChange) return;

    let currentHoveredChange: LineChange | null = null;

    const disposable = editor.onMouseMove(e => {
      if (e.target.type === 4) { // Glyph margin or line decorations
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          const change = changes.find(
            c => lineNumber >= c.startLine && lineNumber <= c.endLine
          );
          if (change && change !== currentHoveredChange) {
            currentHoveredChange = change;
            onHoverChange(change, e.event.browserEvent);
          }
        }
      } else if (currentHoveredChange) {
        currentHoveredChange = null;
        onHoverChange(null);
      }
    });

    disposablesRef.current.push(disposable);

    return () => {
      disposable.dispose();
    };
  }, [editor, changes, onHoverChange]);

  // Cleanup all disposables on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
    };
  }, []);
}

// ============================================================================
// Diff Hunk Preview Component
// ============================================================================

export function DiffHunkPreview({
  change,
  position,
  onClose,
  onViewFullDiff,
  onRevertChange,
}: DiffHunkPreviewProps) {
  const [isVisible, setIsVisible] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (previewRef.current && !previewRef.current.contains(e.target as Node)) {
        setIsVisible(false);
        setTimeout(onClose, 150);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        setTimeout(onClose, 150);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getTitle = () => {
    switch (change.type) {
      case 'added':
        return `${change.endLine - change.startLine + 1} linha(s) adicionada(s)`;
      case 'modified':
        return `${change.endLine - change.startLine + 1} linha(s) modificada(s)`;
      case 'deleted':
        return `${change.originalContent?.length || 0} linha(s) removida(s)`;
    }
  };

  const getColor = () => {
    switch (change.type) {
      case 'added': return 'border-[var(--aethel-success)]';
      case 'modified': return 'border-[var(--aethel-info)]';
      case 'deleted': return 'border-[var(--aethel-error)]';
    }
  };

  return (
    <div
      ref={previewRef}
      className={`fixed z-50 w-96 bg-[var(--aethel-surface-primary)] border-l-4 ${getColor()} rounded-r-lg shadow-2xl overflow-hidden transition-all duration-150 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 400),
        top: Math.min(position.y, window.innerHeight - 300),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
        <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{getTitle()}</span>
        <div className="flex items-center gap-1">
          {onViewFullDiff && (
            <button
              onClick={onViewFullDiff}
              className="px-2 py-1 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
            >
              Ver diff
            </button>
          )}
          {onRevertChange && change.type !== 'added' && (
            <button
              onClick={onRevertChange}
              className="px-2 py-1 text-xs text-[var(--aethel-error)] hover:text-[color-mix(in_srgb,var(--aethel-error)_80%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] rounded"
            >
              Reverter
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-60 overflow-y-auto">
        {change.type === 'deleted' && change.originalContent && (
          <div className="p-2 font-mono text-xs">
            <div className="text-[var(--aethel-text-tertiary)] mb-1">Conteudo removido:</div>
            {change.originalContent.map((line, i) => (
              <div
                key={i}
                className="px-2 py-0.5 bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)] text-[var(--aethel-error)] border-l-2 border-[var(--aethel-error)]"
              >
                <span className="text-[var(--aethel-error)] mr-2">-</span>
                {line || ' '}
              </div>
            ))}
          </div>
        )}

        {change.type === 'modified' && (
          <div className="p-2 font-mono text-xs">
            {change.originalContent && (
              <>
                <div className="text-[var(--aethel-text-tertiary)] mb-1">Original:</div>
                {change.originalContent.map((line, i) => (
                  <div
                    key={`orig-${i}`}
                    className="px-2 py-0.5 bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)] text-[var(--aethel-error)] border-l-2 border-[var(--aethel-error)]"
                  >
                    <span className="text-[var(--aethel-error)] mr-2">-</span>
                    {line || ' '}
                  </div>
                ))}
              </>
            )}
            {change.modifiedContent && (
              <>
                <div className="text-[var(--aethel-text-tertiary)] mt-2 mb-1">Modificado:</div>
                {change.modifiedContent.map((line, i) => (
                  <div
                    key={`mod-${i}`}
                    className="px-2 py-0.5 bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] text-[var(--aethel-success)] border-l-2 border-[var(--aethel-success)]"
                  >
                    <span className="text-[var(--aethel-success)] mr-2">+</span>
                    {line || ' '}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {change.type === 'added' && change.modifiedContent && (
          <div className="p-2 font-mono text-xs">
            <div className="text-[var(--aethel-text-tertiary)] mb-1">Conteudo adicionado:</div>
            {change.modifiedContent.map((line, i) => (
              <div
                key={i}
                className="px-2 py-0.5 bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] text-[var(--aethel-success)] border-l-2 border-[var(--aethel-success)]"
              >
                <span className="text-[var(--aethel-success)] mr-2">+</span>
                {line || ' '}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-[var(--aethel-surface-secondary)] border-t border-[var(--aethel-border-primary)] text-xs text-[var(--aethel-text-tertiary)]">
        Linhas {change.startLine}
        {change.endLine !== change.startLine && `-${change.endLine}`}
      </div>
    </div>
  );
}

// ============================================================================
// Git Status Indicator Component
// ============================================================================

export function GitStatusIndicator({
  changes,
  onClick,
}: {
  changes: LineChange[];
  onClick?: () => void;
}) {
  const added = changes.filter(c => c.type === 'added').reduce(
    (sum, c) => sum + (c.endLine - c.startLine + 1), 0
  );
  const modified = changes.filter(c => c.type === 'modified').reduce(
    (sum, c) => sum + (c.endLine - c.startLine + 1), 0
  );
  const deleted = changes.filter(c => c.type === 'deleted').reduce(
    (sum, c) => sum + (c.originalContent?.length || 0), 0
  );

  if (added === 0 && modified === 0 && deleted === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-[var(--aethel-surface-secondary)] rounded transition-colors"
      title="Git changes - Click to view diff"
    >
      {added > 0 && (
        <span className="text-[var(--aethel-success)]">+{added}</span>
      )}
      {modified > 0 && (
        <span className="text-[var(--aethel-info)]">~{modified}</span>
      )}
      {deleted > 0 && (
        <span className="text-[var(--aethel-error)]">-{deleted}</span>
      )}
    </button>
  );
}

// ============================================================================
// Parse Git Diff Utility
// ============================================================================

export function parseGitDiff(diff: string): LineChange[] {
  const changes: LineChange[] = [];
  const lines = diff.split('\n');

  let currentHunk: {
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    oldLines: string[];
    newLines: string[];
  } | null = null;

  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (hunkMatch) {
      // Process previous hunk
      if (currentHunk) {
        processHunk(currentHunk, changes);
      }

      currentHunk = {
        oldStart: parseInt(hunkMatch[1], 10),
        oldCount: parseInt(hunkMatch[2] || '1', 10),
        newStart: parseInt(hunkMatch[3], 10),
        newCount: parseInt(hunkMatch[4] || '1', 10),
        oldLines: [],
        newLines: [],
      };
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith('-') && !line.startsWith('---')) {
      currentHunk.oldLines.push(line.slice(1));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      currentHunk.newLines.push(line.slice(1));
    }
  }

  // Process last hunk
  if (currentHunk) {
    processHunk(currentHunk, changes);
  }

  return changes;
}

function processHunk(
  hunk: {
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    oldLines: string[];
    newLines: string[];
  },
  changes: LineChange[]
) {
  if (hunk.oldLines.length === 0 && hunk.newLines.length > 0) {
    // Pure addition
    changes.push({
      type: 'added',
      startLine: hunk.newStart,
      endLine: hunk.newStart + hunk.newLines.length - 1,
      modifiedContent: hunk.newLines,
    });
  } else if (hunk.oldLines.length > 0 && hunk.newLines.length === 0) {
    // Pure deletion
    changes.push({
      type: 'deleted',
      startLine: hunk.newStart,
      endLine: hunk.newStart,
      originalStartLine: hunk.oldStart,
      originalEndLine: hunk.oldStart + hunk.oldLines.length - 1,
      originalContent: hunk.oldLines,
    });
  } else {
    // Modification
    changes.push({
      type: 'modified',
      startLine: hunk.newStart,
      endLine: hunk.newStart + hunk.newLines.length - 1,
      originalStartLine: hunk.oldStart,
      originalEndLine: hunk.oldStart + hunk.oldLines.length - 1,
      originalContent: hunk.oldLines,
      modifiedContent: hunk.newLines,
    });
  }
}

// ============================================================================
// Export Default Hook
// ============================================================================

export default useGitGutter;

