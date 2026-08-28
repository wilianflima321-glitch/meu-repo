'use client';

import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';

type OpenInlineEditFn = (
  selectedCode: string,
  language: string,
  filePath?: string,
  position?: { line: number; column: number },
) => void;

export type MonacoEditorActionConfig = {
  enableAISuggestions: boolean;
  enableInlineEdit: boolean;
  language: string;
  path?: string;
  onSave?: (value: string) => void;
  onOpenInlineChat?: () => void;
  openInlineEdit: OpenInlineEditFn;
  readOnly: boolean;
};

export function configureMonacoEditor(
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  monaco: Monaco,
  config: Pick<
    MonacoEditorActionConfig,
    'enableAISuggestions' | 'readOnly'
  > & {
    fontSize: number;
    lineNumbers: 'on' | 'off' | 'relative' | 'interval';
    minimap: boolean;
    tabSize: number;
    wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  },
) {
  editor.updateOptions({
    fontSize: config.fontSize,
    lineHeight: Math.round(config.fontSize * 1.5),
    tabSize: config.tabSize,
    minimap: { enabled: config.minimap },
    lineNumbers: config.lineNumbers,
    wordWrap: config.wordWrap,
    readOnly: config.readOnly,
    glyphMargin: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    fontFamily: "var(--font-geist-mono), 'JetBrains Mono', 'Fira Code', Consolas, monospace",
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
      enabled: config.enableAISuggestions,
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
}

export function registerMonacoEditorActions(
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  monaco: Monaco,
  config: MonacoEditorActionConfig,
) {
  editor.addAction({
    id: 'aethel.save',
    label: 'Save File',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
    run: () => {
      const value = editor.getValue();
      config.onSave?.(value);
    },
  });

  if (config.enableInlineEdit) {
    editor.addAction({
      id: 'aethel.inlineEdit',
      label: 'Inline Edit (AI)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
      run: () => {
        const selection = editor.getSelection();
        const model = editor.getModel();

        if (selection && model) {
          const selectedText = model.getValueInRange(selection);
          config.openInlineEdit(selectedText, config.language, config.path, {
            line: selection.startLineNumber,
            column: selection.startColumn,
          });
          return;
        }

        config.openInlineEdit('', config.language, config.path);
      },
    });
  }

  if (config.onOpenInlineChat) {
    editor.addAction({
      id: 'aethel.inlineChat',
      label: 'Inline AI Chat',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL],
      run: () => {
        config.onOpenInlineChat?.();
      },
    });
  }

  editor.addAction({
    id: 'aethel.deleteLine',
    label: 'Delete Line',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK],
    run: () => {
      editor.trigger('', 'editor.action.deleteLines', null);
    },
  });

  editor.addAction({
    id: 'aethel.addSelectionToNextFindMatch',
    label: 'Add Selection To Next Find Match',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD],
    run: () => {
      editor.trigger('', 'editor.action.addSelectionToNextFindMatch', null);
    },
  });

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

  editor.addAction({
    id: 'aethel.toggleComment',
    label: 'Toggle Line Comment',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
    run: () => {
      editor.trigger('', 'editor.action.commentLine', null);
    },
  });

  editor.addAction({
    id: 'aethel.rename',
    label: 'Rename Symbol',
    keybindings: [monaco.KeyCode.F2],
    run: () => {
      editor.trigger('', 'editor.action.rename', null);
    },
  });

  editor.addAction({
    id: 'aethel.goToDefinition',
    label: 'Go to Definition',
    keybindings: [monaco.KeyCode.F12],
    run: () => {
      editor.trigger('', 'editor.action.revealDefinition', null);
    },
  });

  editor.addAction({
    id: 'aethel.quickFix',
    label: 'Quick Fix',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period],
    run: () => {
      editor.trigger('', 'editor.action.quickFix', null);
    },
  });

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

  editor.addAction({
    id: 'aethel.foldAll',
    label: 'Fold All',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft],
    run: () => {
      editor.trigger('', 'editor.foldAll', null);
    },
  });

  editor.addAction({
    id: 'aethel.unfoldAll',
    label: 'Unfold All',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight],
    run: () => {
      editor.trigger('', 'editor.unfoldAll', null);
    },
  });
}
