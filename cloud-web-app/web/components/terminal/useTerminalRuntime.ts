'use client';

import { useCallback, useRef, type ForwardedRef } from 'react';
import type { Terminal as XTermType } from 'xterm';
import type { TerminalTheme, XTerminalRef } from './terminalModels';
import { useTerminalImperativeHandle } from './useTerminalImperativeHandle';
import { useTerminalOptions } from './useTerminalOptions';
import { TerminalWebSocket } from './terminalWebSocket';
import { useTerminalSelection } from './useTerminalSelection';
import { useTerminalSessions } from './useTerminalSessions';
import { useTerminalShortcuts } from './useTerminalShortcuts';
import { useTerminalTransport } from './useTerminalTransport';
import { useTerminalViewport } from './useTerminalViewport';

type UseTerminalRuntimeOptions = {
  fontFamily: string;
  fontSize: number;
  initialCwd: string;
  initialSessionId?: string;
  initialShell?: string;
  forgeProjectId?: string;
  existingSandboxSessionId?: string;
  onData?: (data: string) => void;
  onTitleChange?: (title: string) => void;
  ref: ForwardedRef<XTerminalRef>;
  theme: TerminalTheme;
};

export function useTerminalRuntime({
  fontFamily,
  fontSize,
  initialCwd,
  initialSessionId,
  initialShell,
  forgeProjectId,
  existingSandboxSessionId,
  onData,
  onTitleChange,
  ref,
  theme,
}: UseTerminalRuntimeOptions) {
  const terminalRef = useRef<XTermType | null>(null);
  const websocketRef = useRef<TerminalWebSocket | null>(null);
  const {
    containerRef,
    disconnectViewport,
    fitAddonRef,
    fitTerminal,
    isMaximized,
    observeViewport,
    toggleMaximized,
  } = useTerminalViewport({
    terminalRef,
    websocketRef,
  });
  const {
    closeSearch,
    copySelection,
    pasteClipboard,
    search,
    searchAddonRef,
    searchNext,
    searchPrevious,
    showSearch,
    toggleSearch,
  } = useTerminalSelection({
    terminalRef,
    websocketRef,
  });
  const writeTerminalError = useCallback((message: string) => {
    terminalRef.current?.writeln(`\x1b[31m${message}\x1b[0m`);
  }, []);
  const terminalOptions = useTerminalOptions({
    fontFamily,
    fontSize,
    theme,
  });

  const {
    activeSessionId,
    connectToSession,
    createSession,
    createForgeSession,
    closeSession,
    isConnected,
    renameSession,
    sessions,
    switchSession,
  } = useTerminalSessions({
    initialSessionId,
    initialCwd,
    initialShell,
    forgeProjectId,
    existingSandboxSessionId,
    terminalRef,
    websocketRef,
    fitTerminal,
    writeTerminalError,
  });

  const { focusTerminal } = useTerminalTransport({
    activeSessionId,
    connectToSession,
    containerRef,
    createSession,
    disconnectViewport,
    fitAddonRef,
    fitTerminal,
    initialCwd,
    initialShell,
    observeViewport,
    onData,
    onTitleChange,
    searchAddonRef,
    terminalOptions,
    terminalRef,
    websocketRef,
  });

  useTerminalImperativeHandle({
    fitAddonRef,
    focusTerminal,
    ref,
    search,
    searchNext,
    searchPrevious,
    terminalRef,
    websocketRef,
  });

  useTerminalShortcuts({
    copySelection,
    createSession,
    pasteClipboard,
    toggleSearch,
  });

  return {
    activeSessionId,
    closeSearch,
    closeSession,
    containerRef,
    createSession,
    createForgeSession,
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
  };
}
