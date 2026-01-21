'use client';

import React, { useState } from 'react';

interface SearchResult {
  file: string;
  line: number;
  content: string;
  match: string;
}

export default function SearchReplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          include: includePattern,
          exclude: excludePattern,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Erro na busca: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError('Não foi possível realizar a busca. Verifique se o projeto está aberto e tente novamente.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReplace = async () => {
    if (!searchQuery.trim() || !replaceQuery.trim()) return;
    
    try {
      await fetch('/api/search/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          replacement: replaceQuery,
          include: includePattern,
          exclude: excludePattern,
        }),
      });
      // Refresh search
      handleSearch();
    } catch (error) {
      console.error('Replace failed');
    }
  };

  return (
    <div className="search-replace p-4 bg-gray-50 dark:bg-gray-900">
      <h3 className="font-bold mb-4">Buscar e substituir</h3>
      
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por..."
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          placeholder="Substituir por..."
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          value={includePattern}
          onChange={(e) => setIncludePattern(e.target.value)}
          placeholder="Incluir arquivos (ex.: *.tsx)"
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          value={excludePattern}
          onChange={(e) => setExcludePattern(e.target.value)}
          placeholder="Excluir arquivos (ex.: node_modules)"
          className="w-full p-2 border rounded mb-2"
        />
        
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Buscar
          </button>
          <button
            onClick={handleReplace}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!replaceQuery.trim()}
          >
            Substituir tudo
          </button>
        </div>
      </div>
      
      <div className="results">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {isSearching ? (
          <div className="flex items-center gap-2 text-slate-500">
            <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full" />
            Buscando...
          </div>
        ) : (
          <>
            <h4 className="font-semibold mb-2">Resultados ({results.length})</h4>
            {results.length === 0 && searchQuery && !error ? (
              <div className="text-slate-500 text-sm">Nenhum resultado encontrado para &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="text-sm text-gray-600">{result.file}:{result.line}</div>
                  <div className="font-mono text-sm">
                    {result.content.replace(result.match, `<mark>${result.match}</mark>`)}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
