'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes'; // Assuming you might use next-themes later

// Dynamically import MonacoEditor to avoid SSR issues
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
      Inicializando Editor...
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
  initialValue = '// Comece a digitar seu código aqui...',
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
    <div className="flex flex-col h-full w-full bg-slate-900">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{filename}</span>
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-yellow-500" title="Não salvo" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase">{language}</span>
          <button
            onClick={handleSave}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isDirty
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
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
