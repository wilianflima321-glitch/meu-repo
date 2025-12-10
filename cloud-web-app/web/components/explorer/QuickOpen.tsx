/**
 * Quick Open Component (Ctrl+P)
 * Fuzzy file search dialog
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getQuickOpen, QuickOpenItem } from '../../lib/explorer/quick-open';

interface QuickOpenProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

export const QuickOpen: React.FC<QuickOpenProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuickOpenItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickOpen = getQuickOpen();

  // Search on query change
  useEffect(() => {
    const search = async () => {
      const items = await quickOpen.search(query, {
        maxResults: 50,
        includeSymbols: false,
        includeDirectories: false,
      });
      setResults(items);
      setSelectedIndex(0);
    };

    search();
  }, [query, quickOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [results, selectedIndex, onClose]);

  // Handle item selection
  const handleSelect = useCallback((item: QuickOpenItem) => {
    quickOpen.addRecent(item.path);
    onSelect(item.path);
    onClose();
  }, [quickOpen, onSelect, onClose]);

  // Highlight matching characters
  const highlightMatch = (text: string, highlights?: number[]) => {
    if (!highlights || highlights.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    highlights.forEach((index, i) => {
      if (index > lastIndex) {
        parts.push(<span key={`text-${i}`}>{text.substring(lastIndex, index)}</span>);
      }
      parts.push(
        <mark key={`mark-${i}`} className="highlight">
          {text[index]}
        </mark>
      );
      lastIndex = index + 1;
    });

    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  if (!isOpen) return null;

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div className="quick-open-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="quick-open-input-container">
          <input
            ref={inputRef}
            type="text"
            className="quick-open-input"
            placeholder="Search files by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="quick-open-results">
          {results.length === 0 ? (
            <div className="no-results">
              {query ? 'No files found' : 'Type to search files'}
            </div>
          ) : (
            results.map((item, index) => (
              <div
                key={item.path}
                className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="result-name">
                  {highlightMatch(item.name, item.highlights)}
                </div>
                <div className="result-path">{item.path}</div>
              </div>
            ))
          )}
        </div>

        <div className="quick-open-footer">
          <span className="footer-hint">
            ↑↓ to navigate • Enter to open • Esc to close
          </span>
        </div>
      </div>

      <style jsx>{`
        .quick-open-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 100px;
          z-index: 10000;
        }

        .quick-open-dialog {
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          border-radius: 6px;
          width: 600px;
          max-height: 500px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .quick-open-input-container {
          padding: 12px;
          border-bottom: 1px solid var(--panel-border);
        }

        .quick-open-input {
          width: 100%;
          padding: 10px 12px;
          background: var(--editor-bg);
          border: 1px solid var(--panel-border);
          color: var(--editor-fg);
          font-size: 14px;
          border-radius: 4px;
        }

        .quick-open-input:focus {
          outline: none;
          border-color: var(--activitybar-activeBorder);
        }

        .quick-open-results {
          flex: 1;
          overflow-y: auto;
          max-height: 400px;
        }

        .no-results {
          padding: 32px;
          text-align: center;
          color: var(--editor-fg);
          opacity: 0.6;
        }

        .result-item {
          padding: 8px 12px;
          cursor: pointer;
          border-left: 3px solid transparent;
        }

        .result-item:hover,
        .result-item.selected {
          background: rgba(255, 255, 255, 0.05);
        }

        .result-item.selected {
          border-left-color: var(--activitybar-activeBorder);
        }

        .result-name {
          font-size: 14px;
          margin-bottom: 4px;
          color: var(--editor-fg);
        }

        .result-name :global(.highlight) {
          background: var(--activitybar-activeBorder);
          color: white;
          padding: 0 2px;
          border-radius: 2px;
        }

        .result-path {
          font-size: 11px;
          color: var(--editor-fg);
          opacity: 0.6;
        }

        .quick-open-footer {
          padding: 8px 12px;
          border-top: 1px solid var(--panel-border);
          font-size: 11px;
          color: var(--editor-fg);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};
