'use client';

import { useCallback, useEffect, type MutableRefObject, type RefObject } from 'react';
import type { ITerminalOptions, Terminal as XTermType } from 'xterm';
import type { FitAddon } from 'xterm-addon-fit';
import type { SearchAddon } from 'xterm-addon-search';
import type { TerminalSocketHandle } from './terminalModels';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('useTerminalTransport');

type UseTerminalTransportOptions = {
  activeSessionId: string | null;
  connectToSession: (sessionId: string, websocketUrl?: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  createSession: (cwd?: string, shell?: string) => Promise<unknown>;
  disconnectViewport: () => void;
  fitAddonRef: MutableRefObject<FitAddon | null>;
  fitTerminal: (socket?: TerminalSocketHandle | null) => void;
  initialCwd: string;
  initialShell?: string;
  observeViewport: (container: HTMLDivElement) => void;
  onData?: (data: string) => void;
  onTitleChange?: (title: string) => void;
  searchAddonRef: MutableRefObject<SearchAddon | null>;
  terminalOptions: ITerminalOptions;
  terminalRef: MutableRefObject<XTermType | null>;
  websocketRef: MutableRefObject<TerminalSocketHandle | null>;
};

export function useTerminalTransport({
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
}: UseTerminalTransportOptions) {
  const writeTerminalError = useCallback((message: string) => {
    terminalRef.current?.writeln(`\x1b[31m${message}\x1b[0m`);
  }, [terminalRef]);

  const focusTerminal = useCallback(() => {
    terminalRef.current?.focus();
  }, [terminalRef]);

  const disconnectTerminalRuntime = useCallback(() => {
    disconnectViewport();
    websocketRef.current?.disconnect();
    terminalRef.current?.dispose();
  }, [disconnectViewport, terminalRef, websocketRef]);

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

        observeViewport(containerRef.current);

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

  return {
    focusTerminal,
  };
}

export default useTerminalTransport;
