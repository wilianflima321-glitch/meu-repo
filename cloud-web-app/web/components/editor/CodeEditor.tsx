'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes'; // Assuming you might use next-themes later

// Dynamically import MonacoEditor to avoid SSR issues
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)]">
      Inicializando editor...
    </div>
  ),
});

interface CodeEditorProps {
  initialValue?: string;
  language?: string;
  filename?: string;
  onSave?: (content: string) => void;
}

export default function CodeEditor({
  initialValue = '// Comece a digitar seu codigo aqui...',
  language = 'typescript',
  filename = 'untitled.ts',
  onSave,
}: CodeEditorProps) {
  const [content, setContent] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setContent(initialValue);
    setIsDirty(false);
  }, [initialValue]);

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsDirty(true);
    }
  };

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(content);
      setIsDirty(false);
    }
  }, [content, onSave]);

  // Keyboard shortcut for save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--aethel-surface-primary)]">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{filename}</span>
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-[var(--aethel-warning)]" title="Nao salvo" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--aethel-text-tertiary)] uppercase">{language}</span>
          <button
            type="button"
            onClick={handleSave}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isDirty
                ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] hover:brightness-110'
                : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)] cursor-not-allowed'
            }`}
            disabled={!isDirty}
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
        <MonacoEditor
          value={content}
          language={language}
          theme="vs-dark"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
