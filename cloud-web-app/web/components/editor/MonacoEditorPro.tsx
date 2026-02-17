'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { OnMount, loader, Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';
import { useInlineEdit, InlineEditModal } from './InlineEditModal';

/**
 * Professional Monaco Editor Component
 * 
 * Editor de código de nível profissional com:
 * - IntelliSense completo (autocomplete, type hints, etc)
 * - Inline Edit (Cmd+K) integrado
 * - Multi-cursor editing
 * - Git diff decorations
 * - Error/Warning decorations
 * - Custom commands e keybindings
 * - Folding regions
 * - Bracket matching
 * - Code actions (Quick Fixes)
 * - Code Lens
 * - AI suggestions integration
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MonacoEditorProps {
  // Content
  value?: string;
  defaultValue?: string;
  language?: string;
  path?: string;
  projectId?: string;
  
  // Callbacks
  onChange?: (value: string | undefined, event: monacoEditor.editor.IModelContentChangedEvent) => void;
  onSave?: (value: string) => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
  onSelectionChange?: (selection: { text: string; range: monacoEditor.IRange }) => void;
  onMount?: (editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  
  // Options
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  fontSize?: number;
  tabSize?: number;
  theme?: string;
  height?: string | number;
  
  // Features
  enableInlineEdit?: boolean;
  enableAISuggestions?: boolean;
  enableGitDecorations?: boolean;
  enableErrorDecorations?: boolean;
  
  // Data
  diagnostics?: Diagnostic[];
  gitChanges?: GitChange[];
}

export interface Diagnostic {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source?: string;
  code?: string | number;
}

export interface GitChange {
  startLine: number;
  endLine: number;
  type: 'added' | 'modified' | 'deleted';
}

// ============================================================================
// MONACO CONFIGURATION
// ============================================================================

// Configure Monaco loader
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
});

// Custom Aethel Dark theme
const AETHEL_DARK_THEME: monacoEditor.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'cba6f7' },
    { token: 'string', foreground: 'a6e3a1' },
    { token: 'number', foreground: 'fab387' },
    { token: 'type', foreground: 'f9e2af' },
    { token: 'function', foreground: '89b4fa' },
    { token: 'variable', foreground: 'cdd6f4' },
    { token: 'class', foreground: 'f9e2af' },
    { token: 'interface', foreground: '94e2d5' },
    { token: 'namespace', foreground: 'f5c2e7' },
    { token: 'operator', foreground: '89dceb' },
    { token: 'delimiter', foreground: '9399b2' },
    { token: 'constant', foreground: 'fab387' },
    { token: 'regexp', foreground: 'f38ba8' },
  ],
  colors: {
    'editor.background': '#09090b',
    'editor.foreground': '#f4f4f5',
    'editor.lineHighlightBackground': '#18181b',
    'editor.selectionBackground': '#3f3f46',
    'editor.selectionHighlightBackground': '#3f3f4680',
    'editorCursor.foreground': '#e4e4e7',
    'editorWhitespace.foreground': '#3f3f46',
    'editorIndentGuide.background1': '#27272a',
    'editorIndentGuide.activeBackground1': '#3f3f46',
    'editorLineNumber.foreground': '#71717a',
    'editorLineNumber.activeForeground': '#d4d4d8',
    'editorBracketMatch.background': '#27272a',
    'editorBracketMatch.border': '#3b82f6',
    'editorGutter.addedBackground': '#22c55e',
    'editorGutter.modifiedBackground': '#f59e0b',
    'editorGutter.deletedBackground': '#ef4444',
    'minimap.background': '#09090b',
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': '#45475a80',
    'scrollbarSlider.hoverBackground': '#585b70',
    'scrollbarSlider.activeBackground': '#6c7086',
  },
};

// ============================================================================
// MONACO EDITOR COMPONENT
// ============================================================================

export function MonacoEditorPro({
  value,
  defaultValue,
  language = 'typescript',
  path,
  projectId,
  onChange,
  onSave,
  onCursorChange,
  onSelectionChange,
  onMount: onMountProp,
  readOnly = false,
  minimap = true,
  lineNumbers = 'on',
  wordWrap = 'off',
  fontSize = 12,
  tabSize = 2,
  theme = 'aethel-dark',
  height = '100%',
  enableInlineEdit = true,
  enableAISuggestions = true,
  enableGitDecorations = true,
  enableErrorDecorations = true,
  diagnostics = [],
  gitChanges = [],
}: MonacoEditorProps) {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const lspDisposablesRef = useRef<monacoEditor.IDisposable[]>([]);
  const inlineCompletionDisposableRef = useRef<monacoEditor.IDisposable | null>(null);
  const lastRollbackTokenRef = useRef<string | null>(null);
  const pathRef = useRef<string | undefined>(path);
  const projectIdRef = useRef<string | undefined>(projectId);
  const onChangeRef = useRef(onChange);
  
  // Inline edit integration
  const { isOpen, selection, openInlineEdit, closeInlineEdit } = useInlineEdit();
  const [editorSelection, setEditorSelection] = useState({
    code: '',
    range: null as monacoEditor.IRange | null,
  });

  const emitInlineEditToast = useCallback(
    (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string) => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(
        new CustomEvent('aethel:toast', {
          detail: { type, title, message },
        })
      );
    },
    []
  );

  useEffect(() => {
    pathRef.current = path;
    projectIdRef.current = projectId;
    onChangeRef.current = onChange;
  }, [onChange, path, projectId]);

  // Handle editor mount
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Register custom theme
    monaco.editor.defineTheme('aethel-dark', AETHEL_DARK_THEME);
    monaco.editor.setTheme('aethel-dark');
    
    // Register LSP providers for supported languages
    const lspLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    if (lspLanguages.includes(language)) {
      // Dynamically import to avoid SSR issues
      import('@/lib/monaco-lsp-http').then(({ registerLspProviders }) => {
        lspDisposablesRef.current = registerLspProviders(monaco as any, language);
      }).catch(err => {
        console.warn('[MonacoEditorPro] Failed to register LSP providers:', err);
      });
    }

    // Register AI inline completions (L1)
    if (enableAISuggestions) {
      import('@/lib/ai/inline-completion').then(({ registerInlineCompletionProvider }) => {
        inlineCompletionDisposableRef.current?.dispose();
        inlineCompletionDisposableRef.current = registerInlineCompletionProvider([
          'typescript',
          'javascript',
          'typescriptreact',
          'javascriptreact',
          'json',
          'markdown',
          'css',
          'html',
          'python',
        ]);
      }).catch(err => {
        console.warn('[MonacoEditorPro] Failed to register inline completions:', err);
      });
    }
    
    // Configure editor
    editor.updateOptions({
      fontSize,
      lineHeight: Math.round(fontSize * 1.5),
      tabSize,
      minimap: { enabled: minimap },
      lineNumbers,
      wordWrap,
      readOnly,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontLigatures: true,
      renderWhitespace: 'selection',
      guides: {
        bracketPairs: true,
        indentation: true,
      },
      bracketPairColorization: {
        enabled: true,
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showFunctions: true,
        showConstants: true,
        showOperators: true,
        showVariables: true,
        showClasses: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showColors: true,
        showFiles: true,
        showFolders: true,
        preview: true,
        previewMode: 'subwordSmart',
        filterGraceful: true,
        localityBonus: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      parameterHints: {
        enabled: true,
        cycle: true,
      },
      inlineSuggest: {
        enabled: enableAISuggestions,
        mode: 'subwordSmart',
      },
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'mouseover',
      linkedEditing: true,
      formatOnPaste: true,
      formatOnType: true,
      autoIndent: 'full',
      autoClosingBrackets: 'languageDefined',
      autoClosingQuotes: 'languageDefined',
      autoSurround: 'languageDefined',
      stickyScroll: {
        enabled: true,
      },
    });
    
    // Register keybindings
    registerKeybindings(editor, monaco);
    
    // Register commands
    registerCommands(editor, monaco);
    
    // Setup cursor change listener
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
    
    // Setup selection change listener
    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (model && !e.selection.isEmpty()) {
        const text = model.getValueInRange(e.selection);
        setEditorSelection({
          code: text,
          range: e.selection,
        });
        onSelectionChange?.({
          text,
          range: e.selection,
        });
      }
    });
    
    // Call user's onMount
    onMountProp?.(editor, monaco);
  // registerKeybindings/registerCommands are intentionally invoked during mount lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontSize, tabSize, minimap, lineNumbers, wordWrap, readOnly, enableAISuggestions, language, onCursorChange, onSelectionChange, onMountProp]);

  // Cleanup LSP disposables on unmount
  useEffect(() => {
    return () => {
      lspDisposablesRef.current.forEach((d) => d.dispose());
      lspDisposablesRef.current = [];
      inlineCompletionDisposableRef.current?.dispose();
      inlineCompletionDisposableRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleRevealLocation = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; line?: number; column?: number }>).detail;
      const targetPath = detail?.path?.trim();

      if (targetPath && path) {
        const normalize = (value: string) => value.replace(/\\/g, '/');
        if (normalize(targetPath) !== normalize(path)) return;
      }

      const editor = editorRef.current;
      if (!editor) return;

      const lineNumber = Math.max(1, Number(detail?.line || 1));
      const column = Math.max(1, Number(detail?.column || 1));

      editor.setPosition({ lineNumber, column });
      editor.revealPositionInCenter({ lineNumber, column });
      editor.focus();
    };

    window.addEventListener('aethel.editor.revealLocation', handleRevealLocation as EventListener);
    return () => {
      window.removeEventListener('aethel.editor.revealLocation', handleRevealLocation as EventListener);
    };
  }, [path]);

  // Register keybindings
  function registerKeybindings(
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) {
    // Cmd+S / Ctrl+S - Save
    editor.addAction({
      id: 'aethel.save',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        const value = editor.getValue();
        onSave?.(value);
      },
    });
    
    // Cmd+K - Inline Edit
    if (enableInlineEdit) {
      editor.addAction({
        id: 'aethel.inlineEdit',
        label: 'Inline Edit (AI)',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
        run: () => {
          const selection = editor.getSelection();
          const model = editor.getModel();
          
          if (selection && model) {
            const selectedText = model.getValueInRange(selection);
            openInlineEdit(
              selectedText,
              language,
              path,
              { line: selection.startLineNumber, column: selection.startColumn }
            );
          } else {
            openInlineEdit('', language, path);
          }
        },
      });
    }

    // Cmd+Alt+Z - Rollback last AI inline patch
    editor.addAction({
      id: 'aethel.rollbackLastAiPatch',
      label: 'Rollback Last AI Patch',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
      run: async () => {
        await handleRollbackLastInlineApply();
      },
    });
    
    // Cmd+Shift+K - Delete Line
    editor.addAction({
      id: 'aethel.deleteLine',
      label: 'Delete Line',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK],
      run: () => {
        editor.trigger('', 'editor.action.deleteLines', null);
      },
    });
    
    // Cmd+D - Add Selection to Next Find Match
    editor.addAction({
      id: 'aethel.addSelectionToNextFindMatch',
      label: 'Add Selection To Next Find Match',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
      run: () => {
        editor.trigger('', 'editor.action.addSelectionToNextFindMatch', null);
      },
    });
    
    // Alt+Up/Down - Move Line
    editor.addAction({
      id: 'aethel.moveLineUp',
      label: 'Move Line Up',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.UpArrow],
      run: () => {
        editor.trigger('', 'editor.action.moveLinesUpAction', null);
      },
    });
    
    editor.addAction({
      id: 'aethel.moveLineDown',
      label: 'Move Line Down',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.DownArrow],
      run: () => {
        editor.trigger('', 'editor.action.moveLinesDownAction', null);
      },
    });
    
    // Cmd+/ - Toggle Comment
    editor.addAction({
      id: 'aethel.toggleComment',
      label: 'Toggle Line Comment',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
      run: () => {
        editor.trigger('', 'editor.action.commentLine', null);
      },
    });
    
    // F2 - Rename Symbol
    editor.addAction({
      id: 'aethel.rename',
      label: 'Rename Symbol',
      keybindings: [monaco.KeyCode.F2],
      run: () => {
        editor.trigger('', 'editor.action.rename', null);
      },
    });
    
    // F12 - Go to Definition
    editor.addAction({
      id: 'aethel.goToDefinition',
      label: 'Go to Definition',
      keybindings: [monaco.KeyCode.F12],
      run: () => {
        editor.trigger('', 'editor.action.revealDefinition', null);
      },
    });
    
    // Cmd+. - Quick Fix
    editor.addAction({
      id: 'aethel.quickFix',
      label: 'Quick Fix',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period],
      run: () => {
        editor.trigger('', 'editor.action.quickFix', null);
      },
    });
  }

  // Register custom commands
  function registerCommands(
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) {
    // Format Document
    editor.addAction({
      id: 'aethel.formatDocument',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      contextMenuGroupId: 'modification',
      contextMenuOrder: 1,
      run: () => {
        editor.trigger('', 'editor.action.formatDocument', null);
      },
    });
    
    // Fold All
    editor.addAction({
      id: 'aethel.foldAll',
      label: 'Fold All',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft],
      run: () => {
        editor.trigger('', 'editor.foldAll', null);
      },
    });
    
    // Unfold All
    editor.addAction({
      id: 'aethel.unfoldAll',
      label: 'Unfold All',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight],
      run: () => {
        editor.trigger('', 'editor.unfoldAll', null);
      },
    });
  }

  const handleRollbackLastInlineApply = useCallback(async () => {
    const rollbackToken = lastRollbackTokenRef.current;
    if (!rollbackToken) {
      emitInlineEditToast('info', 'No rollback available', 'No recent AI patch token was found.');
      return false;
    }

    if (!pathRef.current || !projectIdRef.current || !editorRef.current) {
      emitInlineEditToast(
        'warning',
        'Rollback unavailable',
        'Rollback needs an open scoped file with projectId.'
      );
      return false;
    }

    try {
      const response = await fetch('/api/ai/change/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': projectIdRef.current,
        },
        body: JSON.stringify({ rollbackToken }),
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        emitInlineEditToast('error', 'Rollback failed', details || response.statusText);
        return false;
      }

      const payload = await response.json().catch(() => ({}));
      if (typeof payload?.content === 'string') {
        editorRef.current.setValue(payload.content);
        onChangeRef.current?.(payload.content, {} as any);
      }

      lastRollbackTokenRef.current = null;
      emitInlineEditToast('success', 'Rollback applied', 'Last AI patch was reverted.');
      return true;
    } catch (error) {
      emitInlineEditToast(
        'error',
        'Rollback failed',
        error instanceof Error ? error.message : 'Unknown rollback error'
      );
      return false;
    }
  }, [emitInlineEditToast]);

  useEffect(() => {
    const onRollbackEvent = async () => {
      await handleRollbackLastInlineApply();
    };
    window.addEventListener('aethel.editor.rollbackInlinePatch', onRollbackEvent);
    return () => {
      window.removeEventListener('aethel.editor.rollbackInlinePatch', onRollbackEvent);
    };
  }, [handleRollbackLastInlineApply]);

  // Apply diagnostics decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !enableErrorDecorations) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    
    const decorations: monacoEditor.editor.IModelDeltaDecoration[] = diagnostics.map(diag => {
      const severity = {
        error: monaco.MarkerSeverity.Error,
        warning: monaco.MarkerSeverity.Warning,
        info: monaco.MarkerSeverity.Info,
        hint: monaco.MarkerSeverity.Hint,
      }[diag.severity];
      
      const className = {
        error: 'editor-error-decoration',
        warning: 'editor-warning-decoration',
        info: 'editor-info-decoration',
        hint: 'editor-hint-decoration',
      }[diag.severity];
      
      return {
        range: new monaco.Range(
          diag.line,
          diag.column,
          diag.endLine || diag.line,
          diag.endColumn || diag.column + 1
        ),
        options: {
          inlineClassName: className,
          hoverMessage: { value: `**${diag.severity.toUpperCase()}**: ${diag.message}` },
          overviewRuler: {
            color: diag.severity === 'error' ? '#f38ba8' : '#f9e2af',
            position: monaco.editor.OverviewRulerLane.Right,
          },
        },
      };
    });
    
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
  }, [diagnostics, enableErrorDecorations]);

  // Apply git decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !enableGitDecorations) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    
    const gitDecorations: monacoEditor.editor.IModelDeltaDecoration[] = gitChanges.map(change => {
      const glyphClass = {
        added: 'git-glyph-added',
        modified: 'git-glyph-modified',
        deleted: 'git-glyph-deleted',
      }[change.type];
      
      return {
        range: new monaco.Range(change.startLine, 1, change.endLine, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: glyphClass,
        },
      };
    });
    
    // Apply separately from diagnostics
    editor.deltaDecorations([], gitDecorations);
  }, [gitChanges, enableGitDecorations]);

  // Handle inline edit apply
  const handleInlineEditApply = useCallback(async (newCode: string) => {
    if (!editorRef.current || !editorSelection.range) return false;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return false;

    const range = editorSelection.range;
    const originalSnippet = model.getValueInRange(range);

    const startOffset = model.getOffsetAt({
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    });
    const endOffset = model.getOffsetAt({
      lineNumber: range.endLineNumber,
      column: range.endColumn,
    });
    const currentDocument = model.getValue();
    const nextDocument = `${currentDocument.slice(0, startOffset)}${newCode}${currentDocument.slice(endOffset)}`;

    try {
      const validationResponse = await fetch('/api/ai/change/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original: originalSnippet,
          modified: newCode,
          fullDocument: nextDocument,
          language,
          filePath: path,
        }),
      });

      if (!validationResponse.ok) {
        console.warn('[MonacoEditorPro] Inline edit validation request failed', await validationResponse.text());
        return false;
      }

      const validation = await validationResponse.json();
      if (!validation?.canApply) {
        const firstFailure = Array.isArray(validation?.checks)
          ? validation.checks.find((check: any) => check?.status === 'fail')
          : null;
        const reason = firstFailure?.message || 'Validation blocked this patch.';
        console.warn('[MonacoEditorPro] Inline edit blocked:', reason);
        return false;
      }
    } catch (error) {
      console.error('[MonacoEditorPro] Inline edit validation error:', error);
      return false;
    }

    if (path && projectId) {
      try {
        const applyResponse = await fetch('/api/ai/change/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-project-id': projectId,
          },
          body: JSON.stringify({
            projectId,
            filePath: path,
            original: originalSnippet,
            modified: newCode,
            language,
            range: {
              startOffset,
              endOffset,
            },
          }),
        });

        if (!applyResponse.ok) {
          const details = await applyResponse.text().catch(() => '');
          console.warn('[MonacoEditorPro] Inline edit apply failed', details || applyResponse.statusText);
          return false;
        }

        const applyResult = await applyResponse.json().catch(() => ({}));
        const nextContent =
          typeof applyResult?.content === 'string' && applyResult.content.length > 0
            ? applyResult.content
            : nextDocument;
        const rollbackToken =
          typeof applyResult?.rollback?.token === 'string' ? applyResult.rollback.token : null;

        editor.setValue(nextContent);
        onChange?.(nextContent, {} as any);
        if (rollbackToken) {
          lastRollbackTokenRef.current = rollbackToken;
          emitInlineEditToast(
            'success',
            'AI patch applied',
            'Patch saved. Use Ctrl+Alt+Z to rollback this change.'
          );
        } else {
          emitInlineEditToast('success', 'AI patch applied', 'Patch saved successfully.');
        }
        return true;
      } catch (error) {
        console.error('[MonacoEditorPro] Inline edit apply error:', error);
        emitInlineEditToast(
          'error',
          'AI patch failed',
          error instanceof Error ? error.message : 'Unknown apply error'
        );
        return false;
      }
    }

    editor.executeEdits('aethel.inlineEdit', [
      {
        range,
        text: newCode,
      },
    ]);

    onChange?.(editor.getValue(), {} as any);
    emitInlineEditToast(
      'warning',
      'Local apply only',
      'Patch applied locally without server rollback token.'
    );
    return true;
  }, [editorSelection.range, onChange, language, path, projectId, emitInlineEditToast]);

  return (
    <div className="relative w-full h-full">
      <Editor
        height={height}
        language={language}
        value={value}
        defaultValue={defaultValue}
        path={path}
        theme="aethel-dark"
        onMount={handleMount}
        onChange={onChange}
        options={{
          automaticLayout: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-[#1e1e2e] text-[#6c7086]">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Carregando Editor...
            </div>
          </div>
        }
      />
      
      {/* Inline Edit Modal */}
      {enableInlineEdit && (
        <InlineEditModal
          isOpen={isOpen}
          onClose={closeInlineEdit}
          selectedCode={selection.code || editorSelection.code}
          onApply={handleInlineEditApply}
          language={language}
          filePath={path}
          cursorPosition={selection.position}
        />
      )}
      
      {/* CSS for decorations */}
      <style jsx global>{`
        .editor-error-decoration {
          background-color: rgba(243, 139, 168, 0.2);
          text-decoration: wavy underline #f38ba8;
        }
        .editor-warning-decoration {
          background-color: rgba(249, 226, 175, 0.1);
          text-decoration: wavy underline #f9e2af;
        }
        .editor-info-decoration {
          text-decoration: underline dotted #89b4fa;
        }
        .editor-hint-decoration {
          opacity: 0.7;
        }
        .git-glyph-added {
          background-color: #a6e3a1;
          width: 3px !important;
          margin-left: 3px;
        }
        .git-glyph-modified {
          background-color: #f9e2af;
          width: 3px !important;
          margin-left: 3px;
        }
        .git-glyph-deleted {
          background-color: #f38ba8;
          width: 3px !important;
          margin-left: 3px;
        }
      `}</style>
    </div>
  );
}

// Re-export the simple version as default for backward compatibility
export { MonacoEditorPro as MonacoEditor };
export default MonacoEditorPro;
