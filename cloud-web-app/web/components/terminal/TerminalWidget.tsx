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
// Themes
// ============================================================================

export const TERMINAL_THEMES: Record<string, TerminalTheme> = {
  catppuccinMocha: {
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    cursor: '#f5e0dc',
    cursorAccent: '#1e1e2e',
    selection: 'rgba(137, 180, 250, 0.3)',
    black: '#45475a',
    red: '#f38ba8',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    blue: '#89b4fa',
    magenta: '#f5c2e7',
    cyan: '#94e2d5',
    white: '#bac2de',
    brightBlack: '#585b70',
    brightRed: '#f38ba8',
    brightGreen: '#a6e3a1',
    brightYellow: '#f9e2af',
    brightBlue: '#89b4fa',
    brightMagenta: '#f5c2e7',
    brightCyan: '#94e2d5',
    brightWhite: '#a6adc8',
  },
  dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    cursorAccent: '#282a36',
    selection: 'rgba(68, 71, 90, 0.5)',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
  },
  tokyoNight: {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    cursorAccent: '#1a1b26',
    selection: 'rgba(51, 59, 91, 0.5)',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
  },
  vscodeDark: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#aeafad',
    cursorAccent: '#1e1e1e',
    selection: 'rgba(38, 79, 120, 0.5)',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff',
  },
};

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
        {isConnected ? (isReady ? 'Connected' : 'Connecting...') : 'Disconnected'}
      </span>
    </div>
    <div className="toolbar-right">
      <button onClick={onNewTab} title="New Terminal (Ctrl+Shift+`)">
        <PlusIcon />
      </button>
      <button onClick={onSplit} title="Split Terminal">
        <SplitIcon />
      </button>
      <button onClick={onSearch} title="Search (Ctrl+F)" className={searchVisible ? 'active' : ''}>
        <SearchIcon />
      </button>
      <button onClick={onClear} title="Clear Terminal">
        <ClearIcon />
      </button>
      <button onClick={onKill} title="Kill Terminal" className="danger">
        <TrashIcon />
      </button>
    </div>
    <style jsx>{`
      .terminal-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 8px;
        background: var(--terminal-toolbar-bg, #252526);
        border-bottom: 1px solid var(--terminal-border, #3c3c3c);
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
        color: #4ec9b0;
      }
      .status-indicator.disconnected {
        color: #f38ba8;
      }
      .status-text {
        font-size: 12px;
        color: var(--terminal-text-muted, #858585);
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
        color: var(--terminal-text, #ccc);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .toolbar-right button:hover {
        background: var(--terminal-button-hover, #3c3c3c);
      }
      .toolbar-right button.active {
        background: var(--terminal-button-active, #505050);
      }
      .toolbar-right button.danger:hover {
        background: rgba(243, 139, 168, 0.2);
        color: #f38ba8;
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
          background: var(--terminal-tabs-bg, #1e1e1e);
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .terminal-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          cursor: pointer;
          border-right: 1px solid var(--terminal-border, #3c3c3c);
          background: var(--terminal-tab-bg, #2d2d2d);
          min-width: 100px;
          max-width: 200px;
        }
        .terminal-tab.active {
          background: var(--terminal-tab-active-bg, #1e1e1e);
          border-bottom: 2px solid var(--terminal-accent, #89b4fa);
        }
        .terminal-tab:hover {
          background: var(--terminal-tab-hover-bg, #383838);
        }
        .tab-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: var(--terminal-text, #ccc);
        }
        .tab-input {
          flex: 1;
          background: transparent;
          border: 1px solid var(--terminal-accent, #89b4fa);
          color: var(--terminal-text, #ccc);
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
          color: var(--terminal-text-muted, #858585);
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
          background: rgba(243, 139, 168, 0.2);
          color: #f38ba8;
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
        placeholder="Search..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch(e.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      <button onClick={onFindPrevious} title="Previous (Shift+Enter)">
        <ChevronUpIcon />
      </button>
      <button onClick={onFindNext} title="Next (Enter)">
        <ChevronDownIcon />
      </button>
      <button onClick={onClose} title="Close (Escape)">
        <CloseIcon />
      </button>
      <style jsx>{`
        .search-bar {
          display: flex;
          gap: 4px;
          padding: 4px 8px;
          background: var(--terminal-search-bg, #252526);
          border-bottom: 1px solid var(--terminal-border, #3c3c3c);
        }
        .search-bar input {
          flex: 1;
          background: var(--terminal-input-bg, #3c3c3c);
          border: 1px solid var(--terminal-border, #545454);
          color: var(--terminal-text, #ccc);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          outline: none;
        }
        .search-bar input:focus {
          border-color: var(--terminal-accent, #89b4fa);
        }
        .search-bar button {
          background: transparent;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--terminal-text, #ccc);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .search-bar button:hover {
          background: var(--terminal-button-hover, #3c3c3c);
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
  }, []);
  
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
  }, [searchVisible, focus]);
  
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
    // TODO: Implement split terminal
    console.log('Split terminal - TODO');
  }, []);
  
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
          // TODO: Implement context menu
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
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar) {
          width: 8px;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar-track) {
          background: transparent;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar-thumb) {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .terminal-container :global(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default TerminalWidget;
