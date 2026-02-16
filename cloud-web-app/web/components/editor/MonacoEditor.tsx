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
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Resolve file path from either path or filePath prop
  const resolvedPath = path || filePath;

  const resolveProjectId = (): string => {
    if (typeof window === 'undefined') return 'default';
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('projectId');
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
    const fromStorage = localStorage.getItem('aethel.workbench.lastProjectId');
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
    return 'default';
  };
  
  // Load file content when path changes
  useEffect(() => {
    if (resolvedPath && !initialValue) {
      setLoading(true);
      setLoadError(null);
      const projectId = resolveProjectId();
      fetch('/api/files/fs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': projectId,
        },
        body: JSON.stringify({
          action: 'read',
          path: resolvedPath,
          projectId,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `File read failed (${res.status})`);
          }
          return res.json();
        })
        .then((payload) => {
          const content = typeof payload?.content === 'string' ? payload.content : '';
          setValue(content);
        })
        .catch((err) => {
          console.warn('Could not load file:', err);
          setValue('');
          setLoadError('File content unavailable. Verify canonical File API access for this project.');
        })
        .finally(() => setLoading(false));
    } else if (initialValue) {
      setValue(initialValue);
      setLoadError(null);
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
      ) : loadError ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-xs text-amber-300">
          {loadError}
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
