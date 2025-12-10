'use client';

import { useState, useEffect, useRef } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadFiles();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
  }, [isOpen, selectedIndex, query]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/workspace' })
      });
      const data = await response.json();
      setFiles(data.files || getMockFiles());
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles(getMockFiles());
    } finally {
      setLoading(false);
    }
  };

  const getMockFiles = (): FileItem[] => [
    { path: '/workspace/src/index.ts', name: 'index.ts', type: 'file', size: 1024 },
    { path: '/workspace/src/app.tsx', name: 'app.tsx', type: 'file', size: 2048 },
    { path: '/workspace/src/components/Button.tsx', name: 'Button.tsx', type: 'file', size: 512 },
    { path: '/workspace/src/utils/helpers.ts', name: 'helpers.ts', type: 'file', size: 768 },
    { path: '/workspace/package.json', name: 'package.json', type: 'file', size: 1536 },
    { path: '/workspace/tsconfig.json', name: 'tsconfig.json', type: 'file', size: 256 },
    { path: '/workspace/README.md', name: 'README.md', type: 'file', size: 2048 },
    { path: '/workspace/src/styles/main.css', name: 'main.css', type: 'file', size: 4096 },
    { path: '/workspace/tests/app.test.ts', name: 'app.test.ts', type: 'file', size: 1024 },
    { path: '/workspace/.gitignore', name: '.gitignore', type: 'file', size: 128 }
  ];

  const fuzzyMatch = (str: string, pattern: string): boolean => {
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
  };

  const filteredFiles = files
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

  const openFile = (file: FileItem | undefined) => {
    if (!file) return;
    
    if (file.type === 'file') {
      router.push(`/editor?file=${encodeURIComponent(file.path)}`);
      onClose();
    }
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'ts': '📘',
      'tsx': '⚛️',
      'js': '📜',
      'jsx': '⚛️',
      'json': '📋',
      'md': '📝',
      'css': '🎨',
      'html': '🌐',
      'py': '🐍',
      'go': '🐹',
      'rs': '🦀',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'php': '🐘',
      'rb': '💎',
      'sh': '🔧',
      'yml': '⚙️',
      'yaml': '⚙️',
      'xml': '📄',
      'svg': '🖼️',
      'png': '🖼️',
      'jpg': '🖼️',
      'gif': '🖼️'
    };
    return iconMap[ext || ''] || '📄';
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
            <span className="text-2xl">🔍</span>
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
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No files found
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
                      <span className="text-2xl flex-shrink-0">{getFileIcon(file.name)}</span>
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
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc Close</span>
          </div>
          <div>
            {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
