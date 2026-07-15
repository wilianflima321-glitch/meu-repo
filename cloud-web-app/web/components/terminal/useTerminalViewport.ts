'use client';

import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { Terminal as XTermType } from 'xterm';
import type { FitAddon } from 'xterm-addon-fit';
import { TerminalWebSocket } from './terminalWebSocket';

type UseTerminalViewportOptions = {
  terminalRef: MutableRefObject<XTermType | null>;
  websocketRef: MutableRefObject<TerminalWebSocket | null>;
};

export function useTerminalViewport({
  terminalRef,
  websocketRef,
}: UseTerminalViewportOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [isMaximized, setIsMaximized] = useState(false);

  const fitTerminal = useCallback((socket?: TerminalWebSocket | null) => {
    if (!fitAddonRef.current || !terminalRef.current) {
      return;
    }

    fitAddonRef.current.fit();

    const activeSocket = socket ?? websocketRef.current;
    if (activeSocket?.connected) {
      activeSocket.resize(terminalRef.current.cols, terminalRef.current.rows);
    }
  }, [terminalRef, websocketRef]);

  const observeViewport = useCallback((container: HTMLDivElement) => {
    resizeObserverRef.current?.disconnect();

    const resizeObserver = new ResizeObserver(() => {
      fitTerminal();
    });

    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;
  }, [fitTerminal]);

  const disconnectViewport = useCallback(() => {
    resizeObserverRef.current?.disconnect();
  }, []);

  const toggleMaximized = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  return {
    containerRef,
    disconnectViewport,
    fitAddonRef,
    fitTerminal,
    isMaximized,
    observeViewport,
    toggleMaximized,
  };
}

export default useTerminalViewport;
