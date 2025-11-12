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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
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
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      // Mock results
      setResults([
        {
          file: '/src/main.tsx',
          line: 10,
          content: 'const app = createApp();',
          match: 'createApp',
        },
        {
          file: '/src/utils.ts',
          line: 5,
          content: 'export function createApp() {',
          match: 'createApp',
        },
      ]);
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
      <h3 className="font-bold mb-4">Search & Replace</h3>
      
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for..."
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          placeholder="Replace with..."
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          value={includePattern}
          onChange={(e) => setIncludePattern(e.target.value)}
          placeholder="Include files (e.g., *.tsx)"
          className="w-full p-2 border rounded mb-2"
        />
        <input
          type="text"
          value={excludePattern}
          onChange={(e) => setExcludePattern(e.target.value)}
          placeholder="Exclude files (e.g., node_modules)"
          className="w-full p-2 border rounded mb-2"
        />
        
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Search
          </button>
          <button
            onClick={handleReplace}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!replaceQuery.trim()}
          >
            Replace All
          </button>
        </div>
      </div>
      
      <div className="results">
        <h4 className="font-semibold mb-2">Results ({results.length})</h4>
        {results.map((result, index) => (
          <div key={index} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded border">
            <div className="text-sm text-gray-600">{result.file}:{result.line}</div>
            <div className="font-mono text-sm">
              {result.content.replace(result.match, `<mark>${result.match}</mark>`)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
