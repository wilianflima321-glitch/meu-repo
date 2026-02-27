/**
 * Aethel Engine - Professional XTerm Terminal Component
 * 
 * Terminal real usando xterm.js com conexão WebSocket ao PTY backend.
 * Features: múltiplas sessões, addons, themes, shortcuts profissionais.
 */

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
import type { WebLinksAddon } from 'xterm-addon-web-links';
import type { SearchAddon } from 'xterm-addon-search';
import type { Unicode11Addon } from 'xterm-addon-unicode11';
import {
  X,
  Plus,
  Maximize2,
  Minimize2,
  Split,
  Search,
} from 'lucide-react';

import { SearchBar, ShellSelector, TerminalTab } from './XTerminal.chrome';
import { TERMINAL_THEMES } from './XTerminal.themes';

// ============================================================================
// Types
// ============================================================================

export interface TerminalSession {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  createdAt: Date;
  isActive: boolean;
}

export interface TerminalTheme {
  name: string;
  colors: {
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
  };
}

export interface XTerminalProps {
  sessionId?: string;
  initialCwd?: string;
  initialShell?: string;
  theme?: TerminalTheme;
  fontSize?: number;
  fontFamily?: string;
  onClose?: () => void;
  onData?: (data: string) => void;
  onTitleChange?: (title: string) => void;
  className?: string;
}

export interface XTerminalRef {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
  fit: () => void;
  search: (term: string) => boolean;
  searchNext: () => boolean;
  searchPrevious: () => boolean;
  getSelection: () => string;
  dispose: () => void;
}

// ============================================================================
// WebSocket Connection Manager
// ============================================================================

class TerminalWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: string[] = [];
  private isConnected = false;
  private runtimeUrl: string = '';
  
  onData: ((data: string) => void) | null = null;
  onConnect: (() => void) | null = null;
  onDisconnect: (() => void) | null = null;
  onError: ((error: Event) => void) | null = null;
  
  setRuntimeUrl(url: string): void {
    this.runtimeUrl = url;
  }
  
  connect(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Use runtime URL if provided, otherwise fallback to env or default
    const baseUrl = this.runtimeUrl || 
      process.env.NEXT_PUBLIC_WS_URL || 
      (typeof window !== 'undefined' ? 'ws://localhost:3001' : '');
    
    const wsUrl = `${baseUrl}/terminal/${sessionId}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg) this.ws?.send(msg);
        }
        
        this.onConnect?.();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'output' && message.data) {
            this.onData?.(message.data);
          } else if (message.type === 'error') {
            console.error('[Terminal] Server error:', message.message);
          }
        } catch {
          // Raw data
          this.onData?.(event.data);
        }
      };
      
      this.ws.onclose = () => {
        this.isConnected = false;
        this.onDisconnect?.();
        this.attemptReconnect(sessionId);
      };
      
      this.ws.onerror = (error) => {
        this.onError?.(error);
      };
    } catch (error) {
      console.error('[Terminal] WebSocket connection failed:', error);
      this.attemptReconnect(sessionId);
    }
  }
  
  private attemptReconnect(sessionId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Terminal] Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`[Terminal] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect(sessionId);
    }, delay);
  }
  
  send(data: string): void {
    const message = JSON.stringify({ type: 'input', data });
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }
  
  resize(cols: number, rows: number): void {
    const message = JSON.stringify({ type: 'resize', cols, rows });
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }
  
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    this.messageQueue = [];
  }
  
  get connected(): boolean {
    return this.isConnected;
  }
}

// ============================================================================
// Main XTerminal Component
// ============================================================================

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
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<XTermType | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);
    const wsRef = useRef<TerminalWebSocket | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    
    // State
    const [sessions, setSessions] = useState<TerminalSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId || null);
    const [isMaximized, setIsMaximized] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [title, setTitle] = useState('Terminal');
    
    // Memoized terminal options
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
    
    // Initialize terminal
    useEffect(() => {
      if (!containerRef.current || terminalRef.current) return;
      
      let isMounted = true;
      
      const initTerminal = async () => {
        try {
          // Dynamic imports for client-side only
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
          
          // Create terminal
          const terminal = new Terminal(terminalOptions);
          
          // Load addons
          const fitAddon = new FitAddon();
          const webLinksAddon = new WebLinksAddon();
          const searchAddon = new SearchAddon();
          
          terminal.loadAddon(fitAddon);
          terminal.loadAddon(webLinksAddon);
          terminal.loadAddon(searchAddon);
          
          // Try to load unicode11 addon
          try {
            const { Unicode11Addon } = await import('xterm-addon-unicode11');
            terminal.loadAddon(new Unicode11Addon());
            if (terminal.unicode) {
              terminal.unicode.activeVersion = '11';
            }
          } catch {
            console.warn('[Terminal] Unicode11 addon not available');
          }
          
          // Store refs
          terminalRef.current = terminal;
          fitAddonRef.current = fitAddon;
          searchAddonRef.current = searchAddon;
          
          // Open terminal in container
          terminal.open(containerRef.current);
          
          // Initial fit
          requestAnimationFrame(() => {
            if (fitAddonRef.current) {
              fitAddonRef.current.fit();
            }
          });
          
          // Setup resize observer
          const resizeObserver = new ResizeObserver(() => {
            if (fitAddonRef.current) {
              fitAddonRef.current.fit();
              
              // Notify server of resize
              if (terminalRef.current && wsRef.current?.connected) {
                wsRef.current.resize(
                  terminalRef.current.cols,
                  terminalRef.current.rows
                );
              }
            }
          });
          
          resizeObserver.observe(containerRef.current);
          resizeObserverRef.current = resizeObserver;
          
          // Handle user input
          terminal.onData((data) => {
            wsRef.current?.send(data);
            onData?.(data);
          });
          
          // Handle title changes
          terminal.onTitleChange((newTitle) => {
            setTitle(newTitle);
            onTitleChange?.(newTitle);
          });
          
          // Create initial session if none exists
          if (!activeSessionId) {
            createSession(initialCwd, initialShell);
          } else {
            connectToSession(activeSessionId);
          }
          
        } catch (error) {
          console.error('[Terminal] Failed to initialize:', error);
        }
      };
      
      initTerminal();
      
      // Import CSS
      import('xterm/css/xterm.css');
      
      return () => {
        isMounted = false;
        resizeObserverRef.current?.disconnect();
        wsRef.current?.disconnect();
        terminalRef.current?.dispose();
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- terminal runtime is initialized once and lifecycle-managed manually
    }, []);
    
    // Create new terminal session
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
        
        // Connect to the new session with the websocket URL from server
        connectToSession(newSession.id, data.websocketUrl);
        
        return newSession;
      } catch (error) {
        console.error('[Terminal] Failed to create session:', error);
        
        // Write error to terminal
        terminalRef.current?.writeln(
          '\x1b[31mFailed to create terminal session. Please try again.\x1b[0m'
        );
        
        return null;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connectToSession is stable in runtime flow and invoked after terminal init
    }, [sessions, initialCwd, initialShell]);
    
    // Connect to existing session
    const connectToSession = useCallback((sessionId: string, websocketUrl?: string) => {
      if (!terminalRef.current) return;
      
      // Disconnect from previous session
      wsRef.current?.disconnect();
      
      // Clear terminal
      terminalRef.current.clear();
      
      // Create new WebSocket connection
      const ws = new TerminalWebSocket();
      
      // Set runtime URL if provided
      if (websocketUrl) {
        ws.setRuntimeUrl(websocketUrl);
      }
      
      ws.onData = (data) => {
        terminalRef.current?.write(data);
      };
      
      ws.onConnect = () => {
        setIsConnected(true);
        terminalRef.current?.focus();
        
        // Send initial resize
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit();
          ws.resize(terminalRef.current.cols, terminalRef.current.rows);
        }
      };
      
      ws.onDisconnect = () => {
        setIsConnected(false);
      };
      
      ws.onError = (error) => {
        console.error('[Terminal] WebSocket error:', error);
        terminalRef.current?.writeln(
          '\x1b[31mConnection error. Attempting to reconnect...\x1b[0m'
        );
      };
      
      wsRef.current = ws;
      ws.connect(sessionId);
    }, []);
    
    // Close session
    const closeSession = useCallback(async (sessionId: string) => {
      try {
        await fetch('/api/terminal/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        
        // If closing active session, switch to another or create new
        if (sessionId === activeSessionId) {
          const remaining = sessions.filter((s) => s.id !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
            connectToSession(remaining[0].id);
          } else {
            // Create new session
            createSession();
          }
        }
      } catch (error) {
        console.error('[Terminal] Failed to close session:', error);
      }
    }, [activeSessionId, sessions, connectToSession, createSession]);
    
    // Rename session
    const renameSession = useCallback((sessionId: string, newName: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, name: newName } : s
        )
      );
    }, []);
    
    // Switch active session
    const switchSession = useCallback((sessionId: string) => {
      if (sessionId === activeSessionId) return;
      
      setActiveSessionId(sessionId);
      connectToSession(sessionId);
    }, [activeSessionId, connectToSession]);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      write: (data: string) => terminalRef.current?.write(data),
      writeln: (data: string) => terminalRef.current?.writeln(data),
      clear: () => terminalRef.current?.clear(),
      focus: () => terminalRef.current?.focus(),
      fit: () => fitAddonRef.current?.fit(),
      search: (term: string) => {
        const result = searchAddonRef.current?.findNext(term, { 
          decorations: { matchOverviewRuler: '#FF0' } 
        });
        return result || false;
      },
      searchNext: () => searchAddonRef.current?.findNext('') || false,
      searchPrevious: () => searchAddonRef.current?.findPrevious('') || false,
      getSelection: () => terminalRef.current?.getSelection() || '',
      dispose: () => {
        wsRef.current?.disconnect();
        terminalRef.current?.dispose();
      },
    }), []);
    
    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+Shift+F - Search
        if (e.ctrlKey && e.shiftKey && e.key === 'F') {
          e.preventDefault();
          setShowSearch((prev) => !prev);
        }
        
        // Ctrl+Shift+C - Copy
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault();
          const selection = terminalRef.current?.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection);
          }
        }
        
        // Ctrl+Shift+V - Paste
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
          e.preventDefault();
          navigator.clipboard.readText().then((text) => {
            wsRef.current?.send(text);
          });
        }
        
        // Ctrl+Shift+` - New terminal
        if (e.ctrlKey && e.shiftKey && e.key === '`') {
          e.preventDefault();
          createSession();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [createSession]);
    
    return (
      <div
        className={`
          flex flex-col h-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg overflow-hidden
          ${isMaximized ? 'fixed inset-0 z-50' : ''}
          ${className}
        `}
        role="application"
        aria-label="Terminal"
      >
        {/* Header / Tab Bar */}
        <div className="flex items-center justify-between bg-[#252526] border-b border-[#3c3c3c] min-h-[35px]">
          {/* Tabs */}
          <div className="flex items-center overflow-x-auto flex-1" role="tablist">
            {sessions.map((session) => (
              <TerminalTab
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => switchSession(session.id)}
                onClose={() => closeSession(session.id)}
                onRename={(name) => renameSession(session.id, name)}
              />
            ))}
            
            <ShellSelector
              onSelect={(shell) => createSession(undefined, shell.path)}
              selectedShell={sessions.find((s) => s.id === activeSessionId)?.shell}
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 px-2">
            {/* Connection Status */}
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
            
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch((prev) => !prev)}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
              aria-label="Toggle search"
              aria-pressed={showSearch}
            >
              <Search size={14} />
            </button>
            
            {/* Split */}
            <button
              onClick={() => createSession()}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
              aria-label="Split terminal"
            >
              <Split size={14} />
            </button>
            
            {/* Maximize */}
            <button
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            
            {/* Close */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
                aria-label="Close terminal panel"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <SearchBar
            onSearch={(term) => searchAddonRef.current?.findNext(term)}
            onSearchNext={() => searchAddonRef.current?.findNext('')}
            onSearchPrevious={() => searchAddonRef.current?.findPrevious('')}
            onClose={() => setShowSearch(false)}
          />
        )}
        
        {/* Terminal Container */}
        <div
          ref={containerRef}
          className="flex-1 p-2 overflow-hidden"
          onClick={() => terminalRef.current?.focus()}
        />
      </div>
    );
  }
);

// ============================================================================
// Multi-Terminal Panel
// ============================================================================

export interface MultiTerminalPanelProps {
  className?: string;
  initialSessions?: number;
  onClose?: () => void;
}

export const MultiTerminalPanel: React.FC<MultiTerminalPanelProps> = ({
  className = '',
  initialSessions = 1,
  onClose,
}) => {
  const [terminals, setTerminals] = useState<string[]>(() =>
    Array.from({ length: initialSessions }, () => crypto.randomUUID())
  );
  const [activeTerminal, setActiveTerminal] = useState(0);
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  
  const addTerminal = useCallback(() => {
    setTerminals((prev) => [...prev, crypto.randomUUID()]);
    setActiveTerminal(terminals.length);
  }, [terminals.length]);
  
  const removeTerminal = useCallback((index: number) => {
    setTerminals((prev) => prev.filter((_, i) => i !== index));
    if (activeTerminal >= terminals.length - 1) {
      setActiveTerminal(Math.max(0, terminals.length - 2));
    }
  }, [activeTerminal, terminals.length]);
  
  if (terminals.length === 0) {
    return null;
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <button
            onClick={addTerminal}
            className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
            aria-label="New terminal"
          >
            <Plus size={14} />
          </button>
          
          <button
            onClick={() => setSplitDirection(splitDirection === 'horizontal' ? 'vertical' : 'horizontal')}
            className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
            aria-label="Toggle split direction"
          >
            <Split size={14} className={splitDirection === 'vertical' ? 'rotate-90' : ''} />
          </button>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
            aria-label="Close terminal panel"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {/* Terminal Grid */}
      <div
        className={`flex-1 flex ${
          splitDirection === 'horizontal' ? 'flex-row' : 'flex-col'
        } gap-px bg-[#3c3c3c]`}
      >
        {terminals.map((id, index) => (
          <div key={id} className="flex-1 min-w-0 min-h-0">
            <XTerminal
              sessionId={id}
              onClose={terminals.length > 1 ? () => removeTerminal(index) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default XTerminal;
export { TERMINAL_THEMES };
