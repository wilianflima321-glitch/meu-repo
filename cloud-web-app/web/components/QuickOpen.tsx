'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FileItem {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
}

export default function QuickOpen({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const openFile = useCallback((file: FileItem | undefined) => {
    if (!file) return;
    
    if (file.type === 'file') {
      router.push(`/editor?file=${encodeURIComponent(file.path)}`);
      onClose();
    }
  }, [onClose, router]);

  const fuzzyMatch = useCallback((str: string, pattern: string): boolean => {
    const patternLower = pattern.toLowerCase();
    const strLower = str.toLowerCase();
    
    let patternIdx = 0;
    let strIdx = 0;
    
    while (patternIdx < patternLower.length && strIdx < strLower.length) {
      if (patternLower[patternIdx] === strLower[strIdx]) {
        patternIdx++;
      }
      strIdx++;
    }
    
    return patternIdx === patternLower.length;
  }, []);

  const filteredFiles = useMemo(() => {
    return files
      .filter(file => {
        if (!query) return true;
        return fuzzyMatch(file.name, query) || fuzzyMatch(file.path, query);
      })
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.name.toLowerCase().startsWith(query.toLowerCase());
        const bExact = b.name.toLowerCase().startsWith(query.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [files, fuzzyMatch, query]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/workspace' })
      });
      if (!response.ok) {
        throw new Error(`Workspace files request failed (${response.status})`);
      }
      const data = await response.json();
      if (Array.isArray(data?.files)) {
        setFiles(data.files);
      } else {
        setFiles([]);
        setErrorMessage('Lista de arquivos indisponível (resposta inválida do backend).');
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
      setErrorMessage('Não foi possível carregar arquivos. Verifique o endpoint /api/workspace/files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadFiles();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, loadFiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredFiles.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        openFile(filteredFiles[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredFiles, isOpen, onClose, openFile, query, selectedIndex]);

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      ts: 'TS',
      tsx: 'TSX',
      js: 'JS',
      jsx: 'JSX',
      json: 'JSON',
      md: 'MD',
      css: 'CSS',
      html: 'HTML',
      py: 'PY',
      go: 'GO',
      rs: 'RS',
      java: 'JAVA',
      cpp: 'CPP',
      c: 'C',
      php: 'PHP',
      rb: 'RB',
      sh: 'SH',
      yml: 'YML',
      yaml: 'YAML',
      xml: 'XML',
      svg: 'IMG',
      png: 'IMG',
      jpg: 'IMG',
      gif: 'IMG'
    };
    return iconMap[ext || ''] || 'FILE';
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const highlightMatch = (text: string, query: string): JSX.Element => {
    if (!query) return <>{text}</>;
    
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    for (let i = 0; i < lowerQuery.length; i++) {
      const char = lowerQuery[i];
      const index = lowerText.indexOf(char, lastIndex);
      
      if (index !== -1) {
        if (index > lastIndex) {
          parts.push(<span key={`text-${i}`}>{text.substring(lastIndex, index)}</span>);
        }
        parts.push(
          <span key={`match-${i}`} className="text-purple-400 font-semibold">
            {text[index]}
          </span>
        );
        lastIndex = index + 1;
      }
    }
    
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }
    
    return <>{parts}</>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[600px] overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 w-10 text-center">FIND</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search files by name..."
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Files List */}
        <div className="overflow-y-auto max-h-[450px]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              <p className="text-slate-400 mt-2">Loading files...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-8 text-center text-slate-400">
              {errorMessage}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Nenhum arquivo encontrado
            </div>
          ) : (
            <div className="p-2">
              {filteredFiles.map((file, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={file.path}
                    onClick={() => openFile(file)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-center justify-between rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`text-xs font-semibold w-10 text-center flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`}>{getFileIcon(file.name)}</span>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">
                          {highlightMatch(file.name, query)}
                        </div>
                        <div className={`text-xs truncate ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                          {file.path}
                        </div>
                      </div>
                    </div>
                    {file.size && (
                      <span className={`text-xs ml-4 flex-shrink-0 ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                        {formatSize(file.size)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div className="flex gap-4">
            <span>Setas: navegar</span>
            <span>Enter: abrir</span>
            <span>Esc: fechar</span>
          </div>
          <div>
            {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
