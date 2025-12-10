/**
 * Search Panel Component
 * Main search and replace UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getSearchManager, SearchOptions, SearchResult } from '../../lib/search/search-manager';

interface SearchPanelProps {
  onClose?: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    query: '',
    isRegex: false,
    isCaseSensitive: false,
    isWholeWord: false,
    includePatterns: ['**/*'],
    excludePatterns: ['**/node_modules/**', '**/.git/**'],
  });
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const [showReplace, setShowReplace] = useState(false);

  const searchManager = getSearchManager();

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchOptions: SearchOptions = {
        ...options,
        query,
      };

      const searchResults = await searchManager.search(searchOptions);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [query, options, searchManager]);

  // Replace single occurrence
  const handleReplace = useCallback(async (result: SearchResult) => {
    try {
      await searchManager.replace(result, { replacement });
      // Refresh search results
      await handleSearch();
    } catch (error) {
      console.error('Replace failed:', error);
    }
  }, [replacement, searchManager, handleSearch]);

  // Replace all occurrences
  const handleReplaceAll = useCallback(async () => {
    if (results.length === 0) return;

    try {
      const count = await searchManager.replaceAll(results, { replacement });
      console.log(`Replaced ${count} occurrences`);
      // Refresh search results
      await handleSearch();
    } catch (error) {
      console.error('Replace all failed:', error);
    }
  }, [results, replacement, searchManager, handleSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSearch();
      } else if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSearch, onClose]);

  // Group results by file
  const resultsByFile = results.reduce((acc, result) => {
    if (!acc[result.file]) {
      acc[result.file] = [];
    }
    acc[result.file].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="search-panel">
      <div className="search-header">
        <h2>Search</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="search-input-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        
        <div className="search-options">
          <button
            className={`option-button ${options.isCaseSensitive ? 'active' : ''}`}
            onClick={() => setOptions({ ...options, isCaseSensitive: !options.isCaseSensitive })}
            title="Match Case"
          >
            Aa
          </button>
          <button
            className={`option-button ${options.isWholeWord ? 'active' : ''}`}
            onClick={() => setOptions({ ...options, isWholeWord: !options.isWholeWord })}
            title="Match Whole Word"
          >
            ab
          </button>
          <button
            className={`option-button ${options.isRegex ? 'active' : ''}`}
            onClick={() => setOptions({ ...options, isRegex: !options.isRegex })}
            title="Use Regular Expression"
          >
            .*
          </button>
          <button
            className="option-button"
            onClick={() => setShowReplace(!showReplace)}
            title="Toggle Replace"
          >
            ⇄
          </button>
        </div>
      </div>

      {showReplace && (
        <div className="replace-input-container">
          <input
            type="text"
            className="replace-input"
            placeholder="Replace"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          />
          <div className="replace-buttons">
            <button
              className="replace-button"
              onClick={() => selectedResult !== null && handleReplace(results[selectedResult])}
              disabled={selectedResult === null}
            >
              Replace
            </button>
            <button
              className="replace-all-button"
              onClick={handleReplaceAll}
              disabled={results.length === 0}
            >
              Replace All
            </button>
          </div>
        </div>
      )}

      <div className="search-results-header">
        <span>
          {isSearching ? 'Searching...' : `${results.length} results`}
          {results.length > 0 && ` in ${Object.keys(resultsByFile).length} files`}
        </span>
      </div>

      <div className="search-results">
        {Object.entries(resultsByFile).map(([file, fileResults]) => (
          <div key={file} className="file-results">
            <div className="file-header">
              <span className="file-name">{file}</span>
              <span className="file-count">{fileResults.length}</span>
            </div>
            {fileResults.map((result, index) => (
              <div
                key={`${result.file}-${result.line}-${result.column}`}
                className={`result-item ${selectedResult === results.indexOf(result) ? 'selected' : ''}`}
                onClick={() => setSelectedResult(results.indexOf(result))}
              >
                <span className="line-number">{result.line + 1}</span>
                <span className="line-text">
                  {result.lineText.substring(0, result.matchStart)}
                  <mark>{result.matchText}</mark>
                  {result.lineText.substring(result.matchEnd)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        .search-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--sidebar-bg);
          color: var(--sidebar-fg);
        }

        .search-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--sidebar-border);
        }

        .search-header h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--sidebar-fg);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .search-input-container {
          padding: 8px 16px;
          border-bottom: 1px solid var(--sidebar-border);
        }

        .search-input {
          width: 100%;
          padding: 6px 8px;
          background: var(--editor-bg);
          border: 1px solid var(--sidebar-border);
          color: var(--editor-fg);
          font-size: 13px;
          border-radius: 3px;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--activitybar-activeBorder);
        }

        .search-options {
          display: flex;
          gap: 4px;
          margin-top: 8px;
        }

        .option-button {
          padding: 4px 8px;
          background: var(--editor-bg);
          border: 1px solid var(--sidebar-border);
          color: var(--editor-fg);
          font-size: 12px;
          cursor: pointer;
          border-radius: 3px;
        }

        .option-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .option-button.active {
          background: var(--activitybar-activeBorder);
          color: white;
        }

        .replace-input-container {
          padding: 8px 16px;
          border-bottom: 1px solid var(--sidebar-border);
        }

        .replace-input {
          width: 100%;
          padding: 6px 8px;
          background: var(--editor-bg);
          border: 1px solid var(--sidebar-border);
          color: var(--editor-fg);
          font-size: 13px;
          border-radius: 3px;
          margin-bottom: 8px;
        }

        .replace-buttons {
          display: flex;
          gap: 8px;
        }

        .replace-button,
        .replace-all-button {
          flex: 1;
          padding: 6px 12px;
          background: var(--activitybar-activeBorder);
          border: none;
          color: white;
          font-size: 12px;
          cursor: pointer;
          border-radius: 3px;
        }

        .replace-button:hover,
        .replace-all-button:hover {
          opacity: 0.9;
        }

        .replace-button:disabled,
        .replace-all-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .search-results-header {
          padding: 8px 16px;
          font-size: 12px;
          color: var(--sidebar-fg);
          opacity: 0.8;
          border-bottom: 1px solid var(--sidebar-border);
        }

        .search-results {
          flex: 1;
          overflow-y: auto;
        }

        .file-results {
          margin-bottom: 16px;
        }

        .file-header {
          display: flex;
          justify-content: space-between;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          font-size: 12px;
          font-weight: 600;
        }

        .file-count {
          opacity: 0.6;
        }

        .result-item {
          display: flex;
          padding: 4px 16px;
          cursor: pointer;
          font-size: 12px;
          font-family: monospace;
        }

        .result-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .result-item.selected {
          background: var(--editor-selectionBackground);
        }

        .line-number {
          min-width: 40px;
          color: var(--editorLineNumber-foreground);
          margin-right: 8px;
        }

        .line-text {
          flex: 1;
          white-space: pre;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .line-text mark {
          background: var(--editor-selectionBackground);
          color: var(--editor-fg);
        }
      `}</style>
    </div>
  );
};
