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
    <div className="search-replace p-4 bg-[var(--aethel-surface-secondary)] dark:bg-[var(--aethel-surface-secondary)]">
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
          <button type="button"
            onClick={handleSearch}
            className="px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] rounded hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]"
          >
            Buscar
          </button>
          <button type="button"
            onClick={handleReplace}
            className="px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-text-primary)] rounded hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]"
            disabled={!replaceQuery.trim()}
          >
            Substituir tudo
          </button>
        </div>
      </div>

      <div className="results">
        {error && (
          <div className="mb-4 p-3 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] dark:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] dark:border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] rounded text-[var(--aethel-error-light)] dark:text-[var(--aethel-error-light)] text-sm">
            {error}
          </div>
        )}

        {isSearching ? (
          <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)]">
            <div className="animate-spin w-4 h-4 border-2 border-[var(--aethel-border-primary)] border-t-[var(--aethel-info)] rounded-full" />
            Buscando...
          </div>
        ) : (
          <>
            <h4 className="font-semibold mb-2">Resultados ({results.length})</h4>
            {results.length === 0 && searchQuery && !error ? (
              <div className="text-[var(--aethel-text-tertiary)] text-sm">Nenhum resultado encontrado para &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-2 p-2 bg-[var(--aethel-surface-secondary)] dark:bg-[var(--aethel-surface-secondary)] rounded border">
                  <div className="text-sm text-[var(--aethel-text-secondary)]">{result.file}:{result.line}</div>
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
