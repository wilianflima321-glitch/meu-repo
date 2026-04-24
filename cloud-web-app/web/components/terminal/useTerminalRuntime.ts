'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';
import type { Terminal as XTermType, ITerminalOptions } from 'xterm';
import type { FitAddon } from 'xterm-addon-fit';
import type { SearchAddon } from 'xterm-addon-search';
import type { TerminalTheme, XTerminalRef } from './terminalModels';
import { TerminalWebSocket } from './terminalWebSocket';
import { useTerminalSessions } from './useTerminalSessions';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('useTerminalRuntime');
const SEARCH_DECORATIONS = {
  decorations: { matchOverviewRuler: '#FF0' },
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTermType | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const websocketRef = useRef<TerminalWebSocket | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [isMaximized, setIsMaximized] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const writeTerminalError = useCallback((message: string) => {
    terminalRef.current?.writeln(`\x1b[31m${message}\x1b[0m`);
  }, []);

  const fitTerminal = useCallback((socket?: TerminalWebSocket | null) => {
    if (!fitAddonRef.current || !terminalRef.current) {
      return;
    }

    fitAddonRef.current.fit();

    const activeSocket = socket ?? websocketRef.current;
    if (activeSocket?.connected) {
      activeSocket.resize(terminalRef.current.cols, terminalRef.current.rows);
    }
  }, []);

  const search = useCallback(
    (term: string) => searchAddonRef.current?.findNext(term, SEARCH_DECORATIONS) || false,
    []
  );
  const searchNext = useCallback(() => searchAddonRef.current?.findNext('') || false, []);
  const searchPrevious = useCallback(
    () => searchAddonRef.current?.findPrevious('') || false,
    []
  );
  const closeSearch = useCallback(() => {
    setShowSearch(false);
  }, []);
  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
  }, []);
  const toggleMaximized = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);
  const disconnectTerminalRuntime = useCallback(() => {
    resizeObserverRef.current?.disconnect();
    websocketRef.current?.disconnect();
    terminalRef.current?.dispose();
  }, []);
  const copySelection = useCallback(() => {
    const selection = terminalRef.current?.getSelection();
    if (selection) {
      void navigator.clipboard.writeText(selection);
    }
  }, []);
  const pasteClipboard = useCallback(() => {
    void navigator.clipboard.readText().then((text) => {
      websocketRef.current?.send(text);
    });
  }, []);
  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus();
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

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    let isMounted = true;

    const initTerminal = async () => {
      try {
        const [{ Terminal }, { FitAddon }, { WebLinksAddon }, { SearchAddon }] =
          await Promise.all([
            import('xterm'),
            import('xterm-addon-fit'),
            import('xterm-addon-web-links'),
            import('xterm-addon-search'),
          ]);

        if (!isMounted || !containerRef.current) return;

        const terminal = new Terminal(terminalOptions);

        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        const searchAddon = new SearchAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(webLinksAddon);
        terminal.loadAddon(searchAddon);

        try {
          const { Unicode11Addon } = await import('xterm-addon-unicode11');
          terminal.loadAddon(new Unicode11Addon());
          if (terminal.unicode) {
            terminal.unicode.activeVersion = '11';
          }
        } catch {
          log.warn('Unicode11 addon not available');
        }

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;
        searchAddonRef.current = searchAddon;

        terminal.open(containerRef.current);

        requestAnimationFrame(() => {
          fitTerminal();
        });

        const resizeObserver = new ResizeObserver(() => {
          fitTerminal();
        });

        resizeObserver.observe(containerRef.current);
        resizeObserverRef.current = resizeObserver;

        terminal.onData((data) => {
          websocketRef.current?.send(data);
          onData?.(data);
        });

        terminal.onTitleChange((newTitle) => {
          onTitleChange?.(newTitle);
        });

        if (!activeSessionId) {
          void createSession(initialCwd, initialShell);
        } else {
          connectToSession(activeSessionId);
        }
      } catch (error) {
        log.error('Failed to initialize terminal runtime', { error });
      }
    };

    void initTerminal();
    void import('xterm/css/xterm.css');

    return () => {
      isMounted = false;
      disconnectTerminalRuntime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- terminal runtime is initialized once and lifecycle-managed manually
  }, [disconnectTerminalRuntime]);

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
    [focusTerminal, search, searchNext, searchPrevious]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey)) {
        return;
      }

      switch (event.key) {
        case 'F':
          event.preventDefault();
          toggleSearch();
          break;
        case 'C':
          event.preventDefault();
          copySelection();
          break;
        case 'V':
          event.preventDefault();
          pasteClipboard();
          break;
        case '`':
          event.preventDefault();
          void createSession();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, createSession, pasteClipboard, toggleSearch]);

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
