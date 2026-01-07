/**
 * Aethel Engine - Terminal WebSocket Hook
 * 
 * Hook React para integrar terminal com WebSocket real.
 * Usa xterm.js com WebSocket addon para PTY streaming.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import { getWebSocketClient, AethelWebSocketClient, WS_MESSAGE_TYPES } from '../websocket/websocket-client';

// ============================================================================
// Types
// ============================================================================

export interface UseTerminalOptions {
  sessionId?: string;
  name?: string;
  cwd?: string;
  shell?: string;
  theme?: TerminalTheme;
  fontSize?: number;
  fontFamily?: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  onExit?: (exitCode: number, signal?: number) => void;
  onError?: (error: string) => void;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface UseTerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement>;
  isConnected: boolean;
  isReady: boolean;
  sessionId: string | null;
  terminal: Terminal | null;
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
  fit: () => void;
  search: (query: string) => boolean;
  findNext: () => boolean;
  findPrevious: () => boolean;
  sendSignal: (signal: 'SIGINT' | 'SIGTSTP' | 'SIGQUIT' | 'EOF') => void;
  disconnect: () => void;
}

// ============================================================================
// Default Theme (Catppuccin Mocha)
// ============================================================================

const DEFAULT_THEME: TerminalTheme = {
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
};

// ============================================================================
// Hook
// ============================================================================

export function useTerminal(options: UseTerminalOptions = {}): UseTerminalReturn {
  const {
    sessionId: initialSessionId,
    name = 'Terminal',
    cwd,
    shell,
    theme = DEFAULT_THEME,
    fontSize = 14,
    fontFamily = 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
    onData,
    onResize,
    onExit,
    onError,
  } = options;
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  const wsClient = useRef<AethelWebSocketClient | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  
  // ==========================================================================
  // Initialize Terminal
  // ==========================================================================
  
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Create terminal instance
    const term = new Terminal({
      theme,
      fontSize,
      fontFamily,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      tabStopWidth: 4,
      allowProposedApi: true,
      windowsMode: navigator.platform.includes('Win'),
    });
    
    // Create addons
    const fit = new FitAddon();
    const search = new SearchAddon();
    const webLinks = new WebLinksAddon();
    const unicode = new Unicode11Addon();
    
    // Load addons
    term.loadAddon(fit);
    term.loadAddon(search);
    term.loadAddon(webLinks);
    term.loadAddon(unicode);
    if (term.unicode) {
      term.unicode.activeVersion = '11';
    }
    
    // Open terminal
    term.open(terminalRef.current);
    fit.fit();
    
    // Store references
    terminalInstance.current = term;
    fitAddon.current = fit;
    searchAddon.current = search;
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
    });
    resizeObserver.observe(terminalRef.current);
    
    // Cleanup
    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalInstance.current = null;
      fitAddon.current = null;
      searchAddon.current = null;
    };
  }, [theme, fontSize, fontFamily]);
  
  // ==========================================================================
  // WebSocket Connection
  // ==========================================================================
  
  useEffect(() => {
    const term = terminalInstance.current;
    if (!term) return;
    
    const client = getWebSocketClient();
    wsClient.current = client;
    
    // Connect to WebSocket
    const connect = async () => {
      try {
        await client.connect();
        setIsConnected(true);
        
        // Authenticate (in real app, get userId from auth context)
        client.authenticate('user_' + Date.now());
        
        // Create or attach to terminal session
        if (initialSessionId) {
          // Attach to existing session
          client.subscribe(`terminal:${initialSessionId}`);
          setSessionId(initialSessionId);
        } else {
          // Create new session
          client.createTerminal({
            name,
            cwd,
            shell,
            cols: term.cols,
            rows: term.rows,
          });
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        onError?.('Failed to connect to terminal server');
      }
    };
    
    // Handle terminal data from server
    const handleTerminalData = (payload: { sessionId: string; data: string }) => {
      if (payload.sessionId === sessionId || !sessionId) {
        term.write(payload.data);
        onData?.(payload.data);
      }
    };
    
    // Handle terminal created
    const handleTerminalCreated = (payload: { sessionId: string }) => {
      setSessionId(payload.sessionId);
      setIsReady(true);
      client.subscribe(`terminal:${payload.sessionId}`);
    };
    
    // Handle terminal exit
    const handleTerminalExit = (payload: { sessionId: string; exitCode: number; signal?: number }) => {
      if (payload.sessionId === sessionId) {
        term.writeln(`\r\n[Process exited with code ${payload.exitCode}]`);
        setIsReady(false);
        onExit?.(payload.exitCode, payload.signal);
      }
    };
    
    // Handle errors
    const handleError = (payload: { error: string }) => {
      term.writeln(`\r\n[Error: ${payload.error}]`);
      onError?.(payload.error);
    };
    
    // Subscribe to events
    client.on(WS_MESSAGE_TYPES.TERMINAL_DATA, handleTerminalData);
    client.on(WS_MESSAGE_TYPES.TERMINAL_CREATED, handleTerminalCreated);
    client.on(WS_MESSAGE_TYPES.TERMINAL_EXIT, handleTerminalExit);
    client.on(WS_MESSAGE_TYPES.TERMINAL_ERROR, handleError);
    client.on('disconnected', () => setIsConnected(false));
    client.on('connected', () => setIsConnected(true));
    
    // Handle user input
    const inputDisposable = term.onData((data: string) => {
      if (sessionId && isReady) {
        client.writeTerminal(sessionId, data);
      }
    });
    
    // Handle resize
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      if (sessionId) {
        client.resizeTerminal(sessionId, cols, rows);
        onResize?.(cols, rows);
      }
    });
    
    // Connect
    connect();
    
    // Cleanup
    return () => {
      inputDisposable.dispose();
      resizeDisposable.dispose();
      client.off(WS_MESSAGE_TYPES.TERMINAL_DATA, handleTerminalData);
      client.off(WS_MESSAGE_TYPES.TERMINAL_CREATED, handleTerminalCreated);
      client.off(WS_MESSAGE_TYPES.TERMINAL_EXIT, handleTerminalExit);
      client.off(WS_MESSAGE_TYPES.TERMINAL_ERROR, handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId, name, cwd, shell, onData, onResize, onExit, onError]);
  
  // ==========================================================================
  // Actions
  // ==========================================================================
  
  const write = useCallback((data: string) => {
    if (sessionId && wsClient.current) {
      wsClient.current.writeTerminal(sessionId, data);
    }
  }, [sessionId]);
  
  const writeln = useCallback((data: string) => {
    write(data + '\r\n');
  }, [write]);
  
  const clear = useCallback(() => {
    terminalInstance.current?.clear();
  }, []);
  
  const focus = useCallback(() => {
    terminalInstance.current?.focus();
  }, []);
  
  const fit = useCallback(() => {
    fitAddon.current?.fit();
  }, []);
  
  const search = useCallback((query: string): boolean => {
    return searchAddon.current?.findNext(query) || false;
  }, []);
  
  const findNext = useCallback((): boolean => {
    return searchAddon.current?.findNext('') || false;
  }, []);
  
  const findPrevious = useCallback((): boolean => {
    return searchAddon.current?.findPrevious('') || false;
  }, []);
  
  const sendSignal = useCallback((signal: 'SIGINT' | 'SIGTSTP' | 'SIGQUIT' | 'EOF') => {
    const signalMap: Record<string, string> = {
      SIGINT: '\x03',    // Ctrl+C
      SIGTSTP: '\x1a',   // Ctrl+Z
      SIGQUIT: '\x1c',   // Ctrl+\
      EOF: '\x04',       // Ctrl+D
    };
    
    if (sessionId && wsClient.current) {
      wsClient.current.writeTerminal(sessionId, signalMap[signal]);
    }
  }, [sessionId]);
  
  const disconnect = useCallback(() => {
    if (sessionId && wsClient.current) {
      wsClient.current.killTerminal(sessionId);
    }
  }, [sessionId]);
  
  return {
    terminalRef,
    isConnected,
    isReady,
    sessionId,
    terminal: terminalInstance.current,
    write,
    writeln,
    clear,
    focus,
    fit,
    search,
    findNext,
    findPrevious,
    sendSignal,
    disconnect,
  };
}

export default useTerminal;
