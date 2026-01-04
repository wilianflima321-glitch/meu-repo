'use client';

/**
 * Ghost Text Decorations Component
 * 
 * Renderiza as sugestões inline (ghost text) no Monaco Editor.
 * Integra com o GhostTextProvider para mostrar completions em tempo real.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { editor, Position, Range } from 'monaco-editor';
import { ghostTextProvider, CompletionRequest, CompletionResult } from '@/lib/ai/ghost-text';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface GhostTextDecorationsProps {
  editor: editor.IStandaloneCodeEditor;
  language: string;
  filePath?: string;
  enabled?: boolean;
  onAccept?: (completion: CompletionResult) => void;
  onPartialAccept?: (text: string) => void;
  onDismiss?: () => void;
}

interface GhostTextState {
  completion: CompletionResult | null;
  position: Position | null;
  visible: boolean;
  loading: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GHOST_TEXT_DECORATION_OPTIONS: editor.IModelDecorationOptions = {
  after: {
    content: '',
    inlineClassName: 'ghost-text-decoration',
    // Note: fontStyle is applied via CSS class ghost-text-decoration
  },
  className: 'ghost-text-line',
};

// ============================================================================
// STYLES (injected)
// ============================================================================

const GHOST_TEXT_STYLES = `
  .ghost-text-decoration {
    color: rgba(156, 163, 175, 0.7) !important;
    font-style: italic !important;
    pointer-events: none;
  }
  
  .ghost-text-line {
    background-color: transparent;
  }
  
  .ghost-text-tooltip {
    position: absolute;
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
    color: #a6adc8;
    z-index: 1000;
    pointer-events: none;
    white-space: nowrap;
  }
  
  .ghost-text-shortcut {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  
  .ghost-text-shortcut kbd {
    background: #313244;
    border: 1px solid #45475a;
    border-radius: 3px;
    padding: 1px 4px;
    font-family: inherit;
    font-size: 10px;
  }
  
  @keyframes ghost-text-fade-in {
    from { opacity: 0; }
    to { opacity: 0.7; }
  }
  
  .ghost-text-decoration {
    animation: ghost-text-fade-in 0.15s ease-out;
  }
`;

// ============================================================================
// COMPONENT
// ============================================================================

export function GhostTextDecorations({
  editor: monacoEditor,
  language,
  filePath,
  enabled = true,
  onAccept,
  onPartialAccept,
  onDismiss,
}: GhostTextDecorationsProps) {
  const [state, setState] = useState<GhostTextState>({
    completion: null,
    position: null,
    visible: false,
    loading: false,
  });
  
  const decorationIds = useRef<string[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastContent = useRef<string>('');
  const stylesInjected = useRef(false);
  
  // Inject styles once
  useEffect(() => {
    if (!stylesInjected.current && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = GHOST_TEXT_STYLES;
      document.head.appendChild(style);
      stylesInjected.current = true;
    }
  }, []);
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  const clearDecorations = useCallback(() => {
    if (decorationIds.current.length > 0) {
      monacoEditor.deltaDecorations(decorationIds.current, []);
      decorationIds.current = [];
    }
    setState(prev => ({ ...prev, completion: null, visible: false }));
  }, [monacoEditor]);
  
  const showGhostText = useCallback((completion: CompletionResult, position: Position) => {
    const model = monacoEditor.getModel();
    if (!model) return;
    
    // Clear existing decorations
    clearDecorations();
    
    // Split completion into lines
    const lines = completion.text.split('\n');
    const firstLine = lines[0];
    
    // Create decoration for inline text
    const decorations: editor.IModelDeltaDecoration[] = [
      {
        range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
        options: {
          after: {
            content: firstLine,
            inlineClassName: 'ghost-text-decoration',
          },
        },
      },
    ];
    
    // Add decorations for additional lines if multi-line
    if (lines.length > 1) {
      for (let i = 1; i < lines.length && i < 5; i++) { // Limit to 5 lines
        const lineNumber = position.lineNumber + i;
        const lineCount = model.getLineCount();
        
        if (lineNumber <= lineCount) {
          decorations.push({
            range: new Range(lineNumber, 1, lineNumber, 1),
            options: {
              before: {
                content: lines[i],
                inlineClassName: 'ghost-text-decoration',
              },
            },
          });
        }
      }
    }
    
    decorationIds.current = monacoEditor.deltaDecorations([], decorations);
    
    setState({
      completion,
      position,
      visible: true,
      loading: false,
    });
  }, [monacoEditor, clearDecorations]);
  
  const fetchCompletions = useCallback(async () => {
    if (!enabled) return;
    
    const model = monacoEditor.getModel();
    const position = monacoEditor.getPosition();
    if (!model || !position) return;
    
    // Get code context
    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    
    const textAfterPosition = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: model.getLineCount(),
      endColumn: model.getLineMaxColumn(model.getLineCount()),
    });
    
    // Skip if cursor is at start of line with no content
    const currentLine = model.getLineContent(position.lineNumber);
    const trimmedPrefix = currentLine.slice(0, position.column - 1).trim();
    if (!trimmedPrefix && position.column <= 1) return;
    
    // Create request
    const request: CompletionRequest = {
      prefix: textUntilPosition,
      suffix: textAfterPosition,
      language,
      filePath,
      cursorLine: position.lineNumber,
      cursorColumn: position.column,
    };
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const completions = await ghostTextProvider.getCompletions(request);
      
      if (completions.length > 0) {
        showGhostText(completions[0], position);
      } else {
        clearDecorations();
      }
    } catch (error) {
      console.error('Error fetching ghost text:', error);
      clearDecorations();
    }
  }, [enabled, monacoEditor, language, filePath, showGhostText, clearDecorations]);
  
  // ============================================================================
  // ACCEPT HANDLERS
  // ============================================================================
  
  const acceptCompletion = useCallback(() => {
    const { completion, position } = state;
    if (!completion || !position) return false;
    
    const model = monacoEditor.getModel();
    if (!model) return false;
    
    // Insert the completion text
    monacoEditor.executeEdits('ghost-text', [
      {
        range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: completion.text,
        forceMoveMarkers: true,
      },
    ]);
    
    // Move cursor to end of inserted text
    const lines = completion.text.split('\n');
    const newLine = position.lineNumber + lines.length - 1;
    const newColumn = lines.length > 1 
      ? lines[lines.length - 1].length + 1 
      : position.column + lines[0].length;
    
    monacoEditor.setPosition({ lineNumber: newLine, column: newColumn });
    
    clearDecorations();
    onAccept?.(completion);
    
    return true;
  }, [state, monacoEditor, clearDecorations, onAccept]);
  
  const acceptPartialCompletion = useCallback((wordCount: number = 1) => {
    const { completion, position } = state;
    if (!completion || !position) return false;
    
    const model = monacoEditor.getModel();
    if (!model) return false;
    
    // Get first N words
    const words = completion.text.split(/(\s+)/);
    const partialText = words.slice(0, wordCount * 2 - 1).join('');
    
    if (!partialText) return false;
    
    // Insert partial text
    monacoEditor.executeEdits('ghost-text-partial', [
      {
        range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: partialText,
        forceMoveMarkers: true,
      },
    ]);
    
    // Update position
    const newColumn = position.column + partialText.length;
    monacoEditor.setPosition({ lineNumber: position.lineNumber, column: newColumn });
    
    clearDecorations();
    onPartialAccept?.(partialText);
    
    // Trigger new completion fetch
    setTimeout(fetchCompletions, 100);
    
    return true;
  }, [state, monacoEditor, clearDecorations, onPartialAccept, fetchCompletions]);
  
  const dismissCompletion = useCallback(() => {
    clearDecorations();
    onDismiss?.();
    ghostTextProvider.cancel();
  }, [clearDecorations, onDismiss]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  useEffect(() => {
    if (!enabled) {
      clearDecorations();
      return;
    }
    
    // Content change handler
    const contentDisposable = monacoEditor.onDidChangeModelContent((e) => {
      const newContent = monacoEditor.getValue();
      
      // Skip if content didn't actually change (e.g., from our own edits)
      if (newContent === lastContent.current) return;
      lastContent.current = newContent;
      
      // Clear existing ghost text
      clearDecorations();
      
      // Debounce fetch
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      
      debounceTimer.current = setTimeout(fetchCompletions, 300);
    });
    
    // Cursor change handler
    const cursorDisposable = monacoEditor.onDidChangeCursorPosition((e) => {
      // Clear ghost text when cursor moves (unless from our edits)
      if (e.source !== 'ghost-text') {
        clearDecorations();
      }
    });
    
    // Key handler for accept/dismiss
    const keyDisposable = monacoEditor.onKeyDown((e) => {
      if (!state.visible) return;
      
      // Tab to accept
      if (e.keyCode === 2 /* Tab */) {
        if (acceptCompletion()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      // Ctrl+Right to accept word
      if (e.keyCode === 17 /* RightArrow */ && e.ctrlKey) {
        if (acceptPartialCompletion(1)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      // Escape to dismiss
      if (e.keyCode === 9 /* Escape */) {
        dismissCompletion();
        e.preventDefault();
        e.stopPropagation();
      }
    });
    
    return () => {
      contentDisposable.dispose();
      cursorDisposable.dispose();
      keyDisposable.dispose();
      
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [
    enabled,
    monacoEditor,
    state.visible,
    clearDecorations,
    fetchCompletions,
    acceptCompletion,
    acceptPartialCompletion,
    dismissCompletion,
  ]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Tooltip for keyboard shortcuts
  const tooltipContent = state.visible && state.position && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="ghost-text-tooltip"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <span className="ghost-text-shortcut">
          <kbd>Tab</kbd> accept
          <span style={{ margin: '0 4px' }}>•</span>
          <kbd>Ctrl</kbd>+<kbd>→</kbd> word
          <span style={{ margin: '0 4px' }}>•</span>
          <kbd>Esc</kbd> dismiss
        </span>
      </motion.div>
    </AnimatePresence>
  );
  
  return (
    <>
      {/* Loading indicator */}
      <AnimatePresence>
        {state.loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#1e1e2e',
              border: '1px solid #45475a',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 11,
              color: '#a6adc8',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#89b4fa',
                animation: 'pulse 1s infinite',
              }}
            />
            Thinking...
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Keyboard shortcuts tooltip */}
      {tooltipContent}
      
      {/* Pulse animation style */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}

export default GhostTextDecorations;
