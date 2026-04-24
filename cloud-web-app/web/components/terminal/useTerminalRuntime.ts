'use client';

import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ForwardedRef,
} from 'react';
import type { Terminal as XTermType, ITerminalOptions } from 'xterm';
import type { TerminalTheme, XTerminalRef } from './terminalModels';
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

  const terminalOptions: ITerminalOptions = useMemo(
    () => ({
      fontSize,
      fontFamily,
      cursorBlink: true,
      cursorStyle: 'block',
      cursorWidth: 2,
      scrollback: 10000,
      tabStopWidth: 4,
      allowProposedApi: true,
      allowTransparency: true,
      convertEol: true,
      theme: {
        background: theme.colors.background,
        foreground: theme.colors.foreground,
        cursor: theme.colors.cursor,
        cursorAccent: theme.colors.cursorAccent,
        selectionBackground: theme.colors.selection,
        black: theme.colors.black,
        red: theme.colors.red,
        green: theme.colors.green,
        yellow: theme.colors.yellow,
        blue: theme.colors.blue,
        magenta: theme.colors.magenta,
        cyan: theme.colors.cyan,
        white: theme.colors.white,
        brightBlack: theme.colors.brightBlack,
        brightRed: theme.colors.brightRed,
        brightGreen: theme.colors.brightGreen,
        brightYellow: theme.colors.brightYellow,
        brightBlue: theme.colors.brightBlue,
        brightMagenta: theme.colors.brightMagenta,
        brightCyan: theme.colors.brightCyan,
        brightWhite: theme.colors.brightWhite,
      },
    }),
    [fontFamily, fontSize, theme]
  );

  const {
    activeSessionId,
    connectToSession,
    createSession,
    closeSession,
    isConnected,
    renameSession,
    sessions,
    switchSession,
  } = useTerminalSessions({
    initialSessionId,
    initialCwd,
    initialShell,
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

  useImperativeHandle(
    ref,
    () => ({
      write: (data: string) => terminalRef.current?.write(data),
      writeln: (data: string) => terminalRef.current?.writeln(data),
      clear: () => terminalRef.current?.clear(),
      focus: focusTerminal,
      fit: () => fitAddonRef.current?.fit(),
      search,
      searchNext,
      searchPrevious,
      getSelection: () => terminalRef.current?.getSelection() || '',
      dispose: () => {
        websocketRef.current?.disconnect();
        terminalRef.current?.dispose();
      },
    }),
    [fitAddonRef, focusTerminal, search, searchNext, searchPrevious]
  );

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
