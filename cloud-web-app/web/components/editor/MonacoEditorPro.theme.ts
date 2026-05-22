'use client';

import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';

export const AETHEL_DARK_THEME_NAME = 'dark';

const AETHEL_DARK_THEME: monacoEditor.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
    { token: 'keyword', foreground: '8b5cf6' },
    { token: 'string', foreground: '10b981' },
    { token: 'number', foreground: 'f59e0b' },
    { token: 'type', foreground: 'fbbf24' },
    { token: 'function', foreground: '818cf8' },
    { token: 'variable', foreground: 'e2e8f0' },
    { token: 'class', foreground: 'fbbf24' },
    { token: 'interface', foreground: '22d3ee' },
    { token: 'namespace', foreground: 'ec4899' },
    { token: 'operator', foreground: '06b6d4' },
    { token: 'delimiter', foreground: '94a3b8' },
    { token: 'constant', foreground: 'f59e0b' },
    { token: 'regexp', foreground: 'ef4444' },
  ],
  colors: {
    'editor.background': 'var(--aethel-surface-primary)',
    'editor.foreground': 'var(--aethel-text-primary)',
    'editor.lineHighlightBackground': 'var(--aethel-surface-secondary)',
    'editor.selectionBackground': 'var(--aethel-surface-quaternary)',
    'editor.selectionHighlightBackground': 'color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)',
    'editorCursor.foreground': 'var(--aethel-text-primary)',
    'editorWhitespace.foreground': 'var(--aethel-border-secondary)',
    'editorIndentGuide.background1': 'var(--aethel-border-primary)',
    'editorIndentGuide.activeBackground1': 'var(--aethel-border-secondary)',
    'editorLineNumber.foreground': 'var(--aethel-text-quaternary)',
    'editorLineNumber.activeForeground': 'var(--aethel-text-secondary)',
    'editorBracketMatch.background': 'var(--aethel-surface-tertiary)',
    'editorBracketMatch.border': 'var(--aethel-primary)',
    'editorGutter.addedBackground': 'var(--aethel-success)',
    'editorGutter.modifiedBackground': 'var(--aethel-warning)',
    'editorGutter.deletedBackground': 'var(--aethel-error)',
    'minimap.background': 'var(--aethel-surface-primary)',
    'scrollbar.shadow': 'transparent',
    'scrollbarSlider.background': 'color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)',
    'scrollbarSlider.hoverBackground': 'var(--aethel-border-secondary)',
    'scrollbarSlider.activeBackground': 'var(--aethel-text-quaternary)',
  },
};

export function registerAethelMonacoTheme(monaco: Monaco) {
  monaco.editor.defineTheme(AETHEL_DARK_THEME_NAME, AETHEL_DARK_THEME);
  monaco.editor.setTheme(AETHEL_DARK_THEME_NAME);
}
