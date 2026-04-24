'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import type { Terminal as XTermType, ITerminalOptions } from 'xterm';
import type { FitAddon } from 'xterm-addon-fit';
import type { SearchAddon } from 'xterm-addon-search';
import { SearchBar } from './XTerminalChrome';
import {
  TERMINAL_THEMES,
  type TerminalSession,
  type XTerminalProps,
  type XTerminalRef,
} from './terminalModels';
import { TerminalSessionHeader } from './terminalSessionHeader';
import { TerminalWebSocket } from './terminalWebSocket';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('XTerminal');
const SEARCH_DECORATIONS = {
  decorations: { matchOverviewRuler: '#FF0' },
};

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
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTermType | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);
    const wsRef = useRef<TerminalWebSocket | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    const [sessions, setSessions] = useState<TerminalSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
    const [isMaximized, setIsMaximized] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const writeTerminalError = useCallback((message: string) => {
      terminalRef.current?.writeln(`\x1b[31m${message}\x1b[0m`);
    }, []);

    const fitTerminal = useCallback((socket?: TerminalWebSocket | null) => {
      if (!fitAddonRef.current || !terminalRef.current) {
        return;
      }

      fitAddonRef.current.fit();

      const activeSocket = socket ?? wsRef.current;
      if (activeSocket?.connected) {
        activeSocket.resize(terminalRef.current.cols, terminalRef.current.rows);
      }
    }, []);

    const search = useCallback(
      (term: string) => searchAddonRef.current?.findNext(term, SEARCH_DECORATIONS) || false,
      []
    );
    const searchNext = useCallback(
      () => searchAddonRef.current?.findNext('') || false,
      []
    );
    const searchPrevious = useCallback(
      () => searchAddonRef.current?.findPrevious('') || false,
      []
    );
    const toggleSearch = useCallback(() => {
      setShowSearch((prev) => !prev);
    }, []);
    const toggleMaximized = useCallback(() => {
      setIsMaximized((prev) => !prev);
    }, []);
    const copySelection = useCallback(() => {
      const selection = terminalRef.current?.getSelection();
      if (selection) {
        void navigator.clipboard.writeText(selection);
      }
    }, []);
    const pasteClipboard = useCallback(() => {
      void navigator.clipboard.readText().then((text) => {
        wsRef.current?.send(text);
      });
    }, []);

    const terminalOptions: ITerminalOptions = useMemo(() => ({
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
    }), [fontSize, fontFamily, theme]);

    useEffect(() => {
      if (!containerRef.current || terminalRef.current) return;

      let isMounted = true;

      const initTerminal = async () => {
        try {
          const [
            { Terminal },
            { FitAddon },
            { WebLinksAddon },
            { SearchAddon },
          ] = await Promise.all([
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
            wsRef.current?.send(data);
            onData?.(data);
          });

          terminal.onTitleChange((newTitle) => {
            onTitleChange?.(newTitle);
          });

          if (!activeSessionId) {
            createSession(initialCwd, initialShell);
          } else {
            connectToSession(activeSessionId);
          }
        } catch (error) {
          log.error('Failed to initialize terminal runtime', { error });
        }
      };

      initTerminal();
      import('xterm/css/xterm.css');

      return () => {
        isMounted = false;
        resizeObserverRef.current?.disconnect();
        wsRef.current?.disconnect();
        terminalRef.current?.dispose();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- terminal runtime is initialized once and lifecycle-managed manually
    }, []);

    const createSession = useCallback(async (cwd?: string, shell?: string) => {
      try {
        const response = await fetch('/api/terminal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Terminal ${sessions.length + 1}`,
            cwd: cwd || initialCwd,
            shellPath: shell || initialShell,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create terminal session');
        }

        const data = await response.json();

        const newSession: TerminalSession = {
          id: data.sessionId,
          name: data.name || `Terminal ${sessions.length + 1}`,
          shell: data.shell || 'bash',
          cwd: data.cwd || cwd || '~',
          createdAt: new Date(),
          isActive: true,
        };

        setSessions((prev) => [...prev, newSession]);
        setActiveSessionId(newSession.id);
        connectToSession(newSession.id, data.websocketUrl);

        return newSession;
      } catch (error) {
        log.error('Failed to create terminal session', { error });
        writeTerminalError('Failed to create terminal session. Please try again.');

        return null;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connectToSession is stable in runtime flow and invoked after terminal init
    }, [sessions, initialCwd, initialShell]);

    const connectToSession = useCallback((sessionId: string, websocketUrl?: string) => {
      if (!terminalRef.current) return;

      wsRef.current?.disconnect();
      terminalRef.current.clear();

      const ws = new TerminalWebSocket();

      if (websocketUrl) {
        ws.setRuntimeUrl(websocketUrl);
      }

      ws.onData = (data) => {
        terminalRef.current?.write(data);
      };

      ws.onConnect = () => {
        setIsConnected(true);
        terminalRef.current?.focus();
        fitTerminal(ws);
      };

      ws.onDisconnect = () => {
        setIsConnected(false);
      };

      ws.onError = (error) => {
        log.error('Terminal websocket error', { error });
        writeTerminalError('Connection error. Attempting to reconnect...');
      };

      wsRef.current = ws;
      ws.connect(sessionId);
    }, [fitTerminal, writeTerminalError]);

    const closeSession = useCallback(async (sessionId: string) => {
      try {
        await fetch('/api/terminal/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        if (sessionId === activeSessionId) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
            connectToSession(remaining[0].id);
          } else {
            createSession();
          }
        }
      } catch (error) {
        log.error('Failed to close terminal session', { error, sessionId });
      }
    }, [activeSessionId, sessions, connectToSession, createSession]);

    const renameSession = useCallback((sessionId: string, newName: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, name: newName } : s
        )
      );
    }, []);

    const switchSession = useCallback((sessionId: string) => {
      if (sessionId === activeSessionId) return;

      setActiveSessionId(sessionId);
      connectToSession(sessionId);
    }, [activeSessionId, connectToSession]);

    useImperativeHandle(ref, () => ({
      write: (data: string) => terminalRef.current?.write(data),
      writeln: (data: string) => terminalRef.current?.writeln(data),
      clear: () => terminalRef.current?.clear(),
      focus: () => terminalRef.current?.focus(),
      fit: () => fitAddonRef.current?.fit(),
      search,
      searchNext,
      searchPrevious,
      getSelection: () => terminalRef.current?.getSelection() || '',
      dispose: () => {
        wsRef.current?.disconnect();
        terminalRef.current?.dispose();
      },
    }), [search, searchNext, searchPrevious]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!(e.ctrlKey && e.shiftKey)) {
          return;
        }

        switch (e.key) {
          case 'F':
            e.preventDefault();
            toggleSearch();
            break;
          case 'C':
            e.preventDefault();
            copySelection();
            break;
          case 'V':
            e.preventDefault();
            pasteClipboard();
            break;
          case '`':
            e.preventDefault();
            void createSession();
            break;
          default:
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [copySelection, createSession, pasteClipboard, toggleSearch]);

    return (
      <div
        className={`
          flex flex-col h-full bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-primary)] rounded-lg overflow-hidden
          ${isMaximized ? 'fixed inset-0 z-50' : ''}
          ${className}
        `}
        role="application"
        aria-label="Terminal"
      >
        <TerminalSessionHeader
          sessions={sessions}
          activeSessionId={activeSessionId}
          isConnected={isConnected}
          showSearch={showSearch}
          isMaximized={isMaximized}
          onSelectSession={switchSession}
          onCloseSession={(sessionId) => {
            void closeSession(sessionId);
          }}
          onRenameSession={renameSession}
          onCreateSession={(shellPath) => createSession(undefined, shellPath)}
          onToggleSearch={toggleSearch}
          onToggleMaximized={toggleMaximized}
          onClosePanel={onClose}
        />

        {showSearch && (
          <SearchBar
            onSearch={search}
            onSearchNext={searchNext}
            onSearchPrevious={searchPrevious}
            onClose={() => setShowSearch(false)}
          />
        )}

        <div
          ref={containerRef}
          className="flex-1 p-2 overflow-hidden"
          onClick={() => terminalRef.current?.focus()}
        />
      </div>
    );
  }
);

export default XTerminal;
