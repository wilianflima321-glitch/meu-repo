/**
 * Aethel Engine - Terminal Widget Component
 *
 * Componente React de terminal profissional com:
 * - WebSocket PTY real
 * - Tabs múltiplas
 * - Split panels
 * - Temas customizáveis
 * - Search integrado
 * - Copiar/colar
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTerminal, TerminalTheme } from '../../lib/hooks/useTerminal';
import { TERMINAL_THEMES } from '@/lib/terminal/terminal-themes';

// ============================================================================
// Types
// ============================================================================

export interface TerminalTab {
  id: string;
  name: string;
  sessionId: string | null;
  cwd?: string;
  shell?: string;
  isActive: boolean;
}

export interface TerminalWidgetProps {
  className?: string;
  initialCwd?: string;
  initialShell?: string;
  theme?: TerminalTheme;
  fontSize?: number;
  showTabs?: boolean;
  showToolbar?: boolean;
  maxTabs?: number;
  onSessionCreated?: (sessionId: string) => void;
  onSessionClosed?: (sessionId: string) => void;
}

// ============================================================================
// Sub-components
// ============================================================================

interface ToolbarProps {
  isConnected: boolean;
  isReady: boolean;
  onNewTab: () => void;
  onSplit: () => void;
  onKill: () => void;
  onClear: () => void;
  onSearch: () => void;
  searchVisible: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isConnected,
  isReady,
  onNewTab,
  onSplit,
  onKill,
  onClear,
  onSearch,
  searchVisible,
}) => (
  <div className="terminal-toolbar">
    <div className="toolbar-left">
      <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? (isReady ? '●' : '○') : '○'}
      </span>
      <span className="status-text">
        {isConnected ? (isReady ? 'Conectado' : 'Conectando...') : 'Desconectado'}
      </span>
    </div>
    <div className="toolbar-right">
      <button type="button" onClick={onNewTab} title="Novo terminal (Ctrl+Shift+`)" aria-label="Novo terminal (Ctrl+Shift+`)">
        <PlusIcon />
      </button>
      <button type="button" onClick={onSplit} title="Dividir terminal" aria-label="Dividir terminal">
        <SplitIcon />
      </button>
      <button type="button" onClick={onSearch} title="Search (Ctrl+F)" aria-label="Search no terminal (Ctrl+F)" className={searchVisible ? 'active' : ''}>
        <SearchIcon />
      </button>
      <button type="button" onClick={onClear} title="Limpar terminal" aria-label="Limpar terminal">
        <ClearIcon />
      </button>
      <button type="button" onClick={onKill} title="Encerrar terminal" aria-label="Encerrar terminal" className="danger">
        <TrashIcon />
      </button>
    </div>
    <style jsx>{`
      .terminal-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 8px;
        background: var(--terminal-toolbar-bg, var(--aethel-surface-secondary));
        border-bottom: 1px solid var(--terminal-border, var(--aethel-border-secondary));
      }
      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .status-indicator {
        font-size: 8px;
      }
      .status-indicator.connected {
        color: var(--aethel-success-light);
      }
      .status-indicator.disconnected {
        color: var(--aethel-error-light);
      }
      .status-text {
        font-size: 12px;
        color: var(--terminal-text-muted, var(--aethel-text-tertiary));
      }
      .toolbar-right {
        display: flex;
        gap: 4px;
      }
      .toolbar-right button {
        background: transparent;
        border: none;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 4px;
        color: var(--terminal-text, var(--aethel-text-secondary));
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .toolbar-right button:hover {
        background: var(--terminal-button-hover, var(--aethel-surface-quaternary));
      }
      .toolbar-right button.active {
        background: var(--terminal-button-active, color-mix(in srgb, var(--aethel-info) 16%, var(--aethel-surface-quaternary)));
      }
      .toolbar-right button.danger:hover {
        background: color-mix(in srgb, var(--aethel-error) 20%, transparent);
        color: var(--aethel-error-light);
      }
    `}</style>
  </div>
);

interface TabsProps {
  tabs: TerminalTab[];
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, name: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, onSelectTab, onCloseTab, onRenameTab }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleDoubleClick = (tab: TerminalTab) => {
    setEditingId(tab.id);
    setEditValue(tab.name);
  };

  const handleBlur = () => {
    if (editingId && editValue.trim()) {
      onRenameTab(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="terminal-tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`terminal-tab ${tab.isActive ? 'active' : ''}`}
          onClick={() => onSelectTab(tab.id)}
          onDoubleClick={() => handleDoubleClick(tab)}
        >
          <TerminalIcon />
          {editingId === tab.id ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="tab-input"
            />
          ) : (
            <span className="tab-name">{tab.name}</span>
          )}
          <button
            type="button"
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab(tab.id);
            }}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      <style jsx>{`
        .terminal-tabs {
          display: flex;
          background: var(--terminal-tabs-bg, var(--aethel-surface-primary));
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .terminal-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          cursor: pointer;
          border-right: 1px solid var(--terminal-border, var(--aethel-border-secondary));
          background: var(--terminal-tab-bg, var(--aethel-surface-secondary));
          min-width: 100px;
          max-width: 200px;
        }
        .terminal-tab.active {
          background: var(--terminal-tab-active-bg, var(--aethel-surface-primary));
          border-bottom: 2px solid var(--terminal-accent, var(--aethel-info));
        }
        .terminal-tab:hover {
          background: var(--terminal-tab-hover-bg, var(--aethel-surface-quaternary));
        }
        .tab-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: var(--terminal-text, var(--aethel-text-secondary));
        }
        .tab-input {
          flex: 1;
          background: transparent;
          border: 1px solid var(--terminal-accent, var(--aethel-info));
          color: var(--terminal-text, var(--aethel-text-secondary));
          font-size: 12px;
          padding: 2px 4px;
          border-radius: 2px;
          outline: none;
        }
        .tab-close {
          background: transparent;
          border: none;
          padding: 2px;
          cursor: pointer;
          color: var(--terminal-text-muted, var(--aethel-text-tertiary));
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.5;
        }
        .terminal-tab:hover .tab-close {
          opacity: 1;
        }
        .tab-close:hover {
          background: color-mix(in srgb, var(--aethel-error) 20%, transparent);
          color: var(--aethel-error-light);
        }
      `}</style>
    </div>
  );
};

interface SearchBarProps {
  visible: boolean;
  onSearch: (query: string) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  onClose: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  visible,
  onSearch,
  onFindNext,
  onFindPrevious,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        onFindPrevious();
      } else {
        onFindNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search no terminal..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch(e.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      <button type="button" onClick={onFindPrevious} title="Resultado anterior (Shift+Enter)" aria-label="Resultado anterior (Shift+Enter)">
        <ChevronUpIcon />
      </button>
      <button type="button" onClick={onFindNext} title="Next resultado (Enter)" aria-label="Next resultado (Enter)">
        <ChevronDownIcon />
      </button>
      <button type="button" onClick={onClose} title="Fechar busca (Escape)" aria-label="Fechar busca (Escape)">
        <CloseIcon />
      </button>
      <style jsx>{`
        .search-bar {
          display: flex;
          gap: 4px;
          padding: 4px 8px;
          background: var(--terminal-search-bg, var(--aethel-surface-secondary));
          border-bottom: 1px solid var(--terminal-border, var(--aethel-border-secondary));
        }
        .search-bar input {
          flex: 1;
          background: var(--terminal-input-bg, var(--aethel-surface-quaternary));
          border: 1px solid var(--terminal-border, var(--aethel-border-primary));
          color: var(--terminal-text, var(--aethel-text-secondary));
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          outline: none;
        }
        .search-bar input:focus {
          border-color: var(--terminal-accent, var(--aethel-info));
        }
        .search-bar button {
          background: transparent;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--terminal-text, var(--aethel-text-secondary));
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .search-bar button:hover {
          background: var(--terminal-button-hover, var(--aethel-surface-quaternary));
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Icons (inline SVG)
// ============================================================================

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const SplitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="1" y="1" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="8" y1="1" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="9.5" y1="9.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 4v10h8V4M6 4V2h4v2M2 4h12M6 7v4M10 7v4" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const TerminalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 4l4 4-4 4M9 12h4" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

export const TerminalWidget: React.FC<TerminalWidgetProps> = ({
  className = '',
  initialCwd,
  initialShell,
  theme = TERMINAL_THEMES.catppuccinMocha,
  fontSize = 14,
  showTabs = true,
  showToolbar = true,
  maxTabs = 10,
  onSessionCreated,
  onSessionClosed,
}) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const {
    terminalRef,
    isConnected,
    isReady,
    sessionId,
    clear,
    fit,
    search,
    findNext,
    findPrevious,
    sendSignal,
    disconnect,
    focus,
  } = useTerminal({
    sessionId: activeTab?.sessionId || undefined,
    name: activeTab?.name || 'Terminal',
    cwd: activeTab?.cwd || initialCwd,
    shell: activeTab?.shell || initialShell,
    theme,
    fontSize,
    onExit: (exitCode) => {
      if (activeTabId) {
        handleCloseTab(activeTabId);
      }
    },
  });

  const handleNewTab = useCallback(() => {
    if (tabs.length >= maxTabs) return;

    const id = `terminal_${Date.now()}`;
    const newTab: TerminalTab = {
      id,
      name: `Terminal ${tabs.length + 1}`,
      sessionId: null,
      cwd: initialCwd,
      shell: initialShell,
      isActive: true,
    };

    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, isActive: false })),
      newTab,
    ]);
    setActiveTabId(id);
  }, [tabs.length, maxTabs, initialCwd, initialShell]);

  // Update session ID when created
  useEffect(() => {
    if (sessionId && activeTabId) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, sessionId } : t
        )
      );
      onSessionCreated?.(sessionId);
    }
  }, [sessionId, activeTabId, onSessionCreated]);

  // Create initial tab
  useEffect(() => {
    if (tabs.length === 0) {
      handleNewTab();
    }
  }, [tabs.length, handleNewTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+` - New terminal
      if (e.ctrlKey && e.shiftKey && e.key === '`') {
        e.preventDefault();
        handleNewTab();
      }
      // Ctrl+F - Search
      if (e.ctrlKey && e.key === 'f' && terminalRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        setSearchVisible(true);
      }
      // Escape - Close search
      if (e.key === 'Escape' && searchVisible) {
        setSearchVisible(false);
        focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchVisible, focus, handleNewTab, terminalRef]);

  const handleSelectTab = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((t) => ({ ...t, isActive: t.id === id }))
    );
    setActiveTabId(id);
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.sessionId) {
      onSessionClosed?.(tab.sessionId);
    }

    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (filtered.length === 0) {
        // Create new tab if closing last one
        const newId = `terminal_${Date.now()}`;
        return [{
          id: newId,
          name: 'Terminal 1',
          sessionId: null,
          cwd: initialCwd,
          shell: initialShell,
          isActive: true,
        }];
      }
      // Activate next tab if closing active
      if (id === activeTabId) {
        const lastTab = filtered[filtered.length - 1];
        return filtered.map((t) => ({
          ...t,
          isActive: t.id === lastTab.id,
        }));
      }
      return filtered;
    });

    if (id === activeTabId) {
      setTabs((prev) => {
        const active = prev.find((t) => t.isActive);
        if (active) {
          setActiveTabId(active.id);
        }
        return prev;
      });
    }
  }, [tabs, activeTabId, initialCwd, initialShell, onSessionClosed]);

  const handleRenameTab = useCallback((id: string, name: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name } : t))
    );
  }, []);

  const handleSplit = useCallback(() => {
    // P0 fallback: keep user flow productive by opening another tab session.
    handleNewTab();
  }, [handleNewTab]);

  const handleKill = useCallback(() => {
    disconnect();
    if (activeTabId) {
      handleCloseTab(activeTabId);
    }
  }, [disconnect, activeTabId, handleCloseTab]);

  return (
    <div className={`terminal-widget ${className}`}>
      {showTabs && (
        <Tabs
          tabs={tabs}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onRenameTab={handleRenameTab}
        />
      )}
      {showToolbar && (
        <Toolbar
          isConnected={isConnected}
          isReady={isReady}
          onNewTab={handleNewTab}
          onSplit={handleSplit}
          onKill={handleKill}
          onClear={clear}
          onSearch={() => setSearchVisible(!searchVisible)}
          searchVisible={searchVisible}
        />
      )}
      <SearchBar
        visible={searchVisible}
        onSearch={search}
        onFindNext={findNext}
        onFindPrevious={findPrevious}
        onClose={() => {
          setSearchVisible(false);
          focus();
        }}
      />
      <div
        ref={terminalRef}
        className="terminal-container"
        onContextMenu={(e) => {
          e.preventDefault();
          focus();
        }}
      />
      <style jsx>{`
        .terminal-widget {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: ${theme.background};
          border-radius: 4px;
          overflow: hidden;
        }
        .terminal-container {
          flex: 1;
          padding: 8px;
          overflow: hidden;
        }
        .terminal-container :global(.xterm) {
          height: 100%;
        }
        .terminal-container :global(.xterm-viewport) {
          scrollbar-width: thin;
          scrollbar-color: color-mix(in srgb, var(--aethel-text-primary) 20%, transparent) transparent;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar) {
          width: 8px;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar-track) {
          background: transparent;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar-thumb) {
          background: color-mix(in srgb, var(--aethel-text-primary) 20%, transparent);
          border-radius: 4px;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
          background: color-mix(in srgb, var(--aethel-text-primary) 30%, transparent);
        }
      `}</style>
    </div>
  );
};

export default TerminalWidget;
