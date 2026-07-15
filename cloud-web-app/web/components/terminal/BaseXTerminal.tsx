'use client';

import React, { forwardRef } from 'react';
import { SearchBar } from './XTerminalChrome';
import {
  TERMINAL_THEMES,
  type XTerminalProps,
  type XTerminalRef,
} from './terminalModels';
import { TerminalSessionHeader } from './terminalSessionHeader';
import { useTerminalRuntime } from './useTerminalRuntime';

export const XTerminal = forwardRef<XTerminalRef, XTerminalProps>(
  function XTerminal(
    {
      sessionId: initialSessionId,
      initialCwd = '~',
      initialShell,
      theme = TERMINAL_THEMES['dark-plus'],
      fontSize = 14,
      fontFamily = "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
      onClose,
      onData,
      onTitleChange,
      className = '',
    },
    ref
  ) {
    const {
      activeSessionId,
      closeSearch,
      closeSession,
      containerRef,
      createSession,
      focusTerminal,
      isConnected,
      isMaximized,
      renameSession,
      sessions,
      search,
      searchNext,
      searchPrevious,
      showSearch,
      switchSession,
      toggleMaximized,
      toggleSearch,
    } = useTerminalRuntime({
      fontFamily,
      fontSize,
      initialSessionId,
      initialCwd,
      initialShell,
      onData,
      onTitleChange,
      ref,
      theme,
    });

    return (
      <div
        className={`
          flex flex-col h-full
          aethel-glass
          border border-[var(--aethel-glass-border)]
          rounded-xl overflow-hidden
          ${isMaximized ? 'fixed inset-0 z-50 rounded-none border-0' : ''}
          ${className}
        `}
        role="application"
        aria-label="Terminal"
      >
        {/* ── Tab / session header ── */}
        <TerminalSessionHeader
          sessions={sessions}
          activeSessionId={activeSessionId}
          isConnected={isConnected}
          showSearch={showSearch}
          isMaximized={isMaximized}
          onSelectSession={switchSession}
          onCloseSession={(sessionId) => { void closeSession(sessionId); }}
          onRenameSession={renameSession}
          onCreateSession={(shellPath) => createSession(undefined, shellPath)}
          onToggleSearch={toggleSearch}
          onToggleMaximized={toggleMaximized}
          onClosePanel={onClose}
        />

        {/* ── Search bar ── */}
        {showSearch && (
          <SearchBar
            onSearch={search}
            onSearchNext={searchNext}
            onSearchPrevious={searchPrevious}
            onClose={closeSearch}
          />
        )}

        {/* ── xterm.js canvas mount point ── */}
        <div
          ref={containerRef}
          className="
            flex-1 min-h-0 overflow-hidden
            p-2
            bg-[#090d13]
            font-mono
          "
          style={{ fontSize }}
          onClick={focusTerminal}
          aria-label="Terminal output"
        />
      </div>
    );
  }
);

export default XTerminal;
