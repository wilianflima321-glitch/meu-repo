import React, { useState, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';

export interface MonacoEditorProps {
  value?: string;
  path?: string;
  filePath?: string;
  language?: string;
  theme?: 'vs-dark' | 'light';
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  height?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value: initialValue,
  path,
  filePath,
  language = 'typescript',
  theme = 'vs-dark',
  onChange,
  readOnly = false,
  height = '100%',
}) => {
  const [value, setValue] = useState<string>(initialValue || '');
  const [loading, setLoading] = useState(false);
  
  // Resolve file path from either path or filePath prop
  const resolvedPath = path || filePath;
  
  // Load file content when path changes
  useEffect(() => {
    if (resolvedPath && !initialValue) {
      setLoading(true);
      // In a real implementation, this would fetch from API
      // For now, we'll set a placeholder
      fetch(`/api/files?path=${encodeURIComponent(resolvedPath)}`)
        .then(res => res.ok ? res.text() : Promise.reject(new Error('File not found')))
        .then(content => {
          setValue(content);
        })
        .catch(err => {
          console.warn('Could not load file:', err);
          setValue(`// File: ${resolvedPath}\n// Content not available\n`);
        })
        .finally(() => setLoading(false));
    } else if (initialValue) {
      setValue(initialValue);
    }
  }, [resolvedPath, initialValue]);
  
  // Infer language from file path
  const inferredLanguage = resolvedPath 
    ? getLanguageFromPath(resolvedPath)
    : language;

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Configure editor settings here if needed
    editor.updateOptions({
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "'Fira Code', monospace",
      fontLigatures: true,
      readOnly: readOnly,
    });
  };

  const handleEditorChange: OnChange = (newValue, event) => {
    setValue(newValue || '');
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="w-full h-full overflow-hidden rounded-md border border-slate-700">
      {loading ? (
        <div className="flex items-center justify-center h-full text-slate-400">
          Carregando arquivo...
        </div>
      ) : (
        <Editor
          height={height}
          defaultLanguage={inferredLanguage}
          language={inferredLanguage}
          path={resolvedPath}
          value={value}
          theme={theme}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={{
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
          }}
          loading={
            <div className="flex items-center justify-center h-full text-slate-400">
              Carregando Editor...
            </div>
          }
        />
      )}
    </div>
  );
};

// Helper function to infer language from file path
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    ps1: 'powershell',
  };
  return languageMap[ext || ''] || 'plaintext';
}

export default MonacoEditor;
