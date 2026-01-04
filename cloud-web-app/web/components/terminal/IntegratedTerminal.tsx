'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import {
  Terminal,
  Plus,
  X,
  ChevronDown,
  Maximize2,
  Minimize2,
  Search,
  Trash2,
  Copy,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Aethel Integrated Terminal
 * 
 * Terminal profissional com:
 * - Múltiplas instâncias/tabs
 * - Xterm.js com addons
 * - Web Links detection
 * - Search within terminal
 * - Copy/paste support
 * - Theming (Catppuccin)
 * - Command history
 * - API integration para execução real
 */

interface TerminalInstance {
  id: string;
  name: string;
  terminal: XTerm;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  history: string[];
  historyIndex: number;
  currentLine: string;
  cwd: string;
}

interface IntegratedTerminalProps {
  initialCwd?: string;
  onCommand?: (command: string, output: string) => void;
}

// Catppuccin Mocha theme for xterm
const CATPPUCCIN_THEME = {
  background: '#1e1e2e',
  foreground: '#cdd6f4',
  cursor: '#f5e0dc',
  cursorAccent: '#1e1e2e',
  selectionBackground: '#45475a',
  selectionForeground: '#cdd6f4',
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

export function IntegratedTerminal({ initialCwd = '~', onCommand }: IntegratedTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Create new terminal instance
  const createTerminal = useCallback((name?: string) => {
    const id = `term-${Date.now()}`;
    
    const terminal = new XTerm({
      theme: CATPPUCCIN_THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowTransparency: true,
      scrollback: 10000,
    });
    
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);
    
    const instance: TerminalInstance = {
      id,
      name: name || `Terminal ${terminals.length + 1}`,
      terminal,
      fitAddon,
      searchAddon,
      history: [],
      historyIndex: -1,
      currentLine: '',
      cwd: initialCwd,
    };
    
    setTerminals(prev => [...prev, instance]);
    setActiveTerminalId(id);
    
    return instance;
  }, [terminals.length, initialCwd]);

  // Initialize first terminal
  useEffect(() => {
    if (terminals.length === 0) {
      createTerminal();
    }
  }, []);

  // Mount terminal to DOM when active
  useEffect(() => {
    if (!activeTerminalId) return;
    
    const instance = terminals.find(t => t.id === activeTerminalId);
    if (!instance) return;
    
    const container = terminalRefs.current.get(activeTerminalId);
    if (!container) return;
    
    // Check if already mounted
    if (container.querySelector('.xterm')) return;
    
    instance.terminal.open(container);
    instance.fitAddon.fit();
    
    // Write welcome message
    instance.terminal.writeln('\x1b[38;5;141m╔════════════════════════════════════════════╗\x1b[0m');
    instance.terminal.writeln('\x1b[38;5;141m║\x1b[0m     \x1b[1;38;5;183mAethel Engine Terminal\x1b[0m                 \x1b[38;5;141m║\x1b[0m');
    instance.terminal.writeln('\x1b[38;5;141m╚════════════════════════════════════════════╝\x1b[0m');
    instance.terminal.writeln('');
    
    // Write prompt
    writePrompt(instance);
    
    // Handle input
    setupInputHandler(instance);
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      instance.fitAddon.fit();
    });
    resizeObserver.observe(container);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [activeTerminalId, terminals]);

  // Write prompt
  const writePrompt = (instance: TerminalInstance) => {
    const cwdDisplay = instance.cwd.replace(/^\/home\/[^/]+/, '~');
    instance.terminal.write(`\x1b[38;5;141m❯\x1b[0m \x1b[38;5;117m${cwdDisplay}\x1b[0m $ `);
  };

  // Setup input handler
  const setupInputHandler = (instance: TerminalInstance) => {
    let currentLine = '';
    
    instance.terminal.onData(async (data) => {
      const code = data.charCodeAt(0);
      
      if (code === 13) { // Enter
        instance.terminal.writeln('');
        
        if (currentLine.trim()) {
          // Add to history
          instance.history.push(currentLine);
          instance.historyIndex = instance.history.length;
          
          // Execute command
          await executeCommand(instance, currentLine);
        }
        
        currentLine = '';
        writePrompt(instance);
        
      } else if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          instance.terminal.write('\b \b');
        }
        
      } else if (code === 27) { // Escape sequences
        if (data === '\x1b[A') { // Up arrow
          if (instance.historyIndex > 0) {
            // Clear current line
            instance.terminal.write('\r\x1b[K');
            writePrompt(instance);
            
            instance.historyIndex--;
            currentLine = instance.history[instance.historyIndex];
            instance.terminal.write(currentLine);
          }
        } else if (data === '\x1b[B') { // Down arrow
          if (instance.historyIndex < instance.history.length - 1) {
            instance.terminal.write('\r\x1b[K');
            writePrompt(instance);
            
            instance.historyIndex++;
            currentLine = instance.history[instance.historyIndex];
            instance.terminal.write(currentLine);
          } else {
            instance.terminal.write('\r\x1b[K');
            writePrompt(instance);
            currentLine = '';
            instance.historyIndex = instance.history.length;
          }
        } else if (data === '\x1b[C') { // Right arrow
          // Allow right arrow
        } else if (data === '\x1b[D') { // Left arrow
          // Allow left arrow
        }
        
      } else if (code === 3) { // Ctrl+C
        instance.terminal.writeln('^C');
        currentLine = '';
        writePrompt(instance);
        
      } else if (code === 12) { // Ctrl+L (clear)
        instance.terminal.clear();
        writePrompt(instance);
        
      } else if (code === 9) { // Tab (autocomplete)
        // Simple tab completion
        const completions = getCompletions(currentLine);
        if (completions.length === 1) {
          const completion = completions[0].slice(currentLine.split(' ').pop()?.length || 0);
          currentLine += completion;
          instance.terminal.write(completion);
        } else if (completions.length > 1) {
          instance.terminal.writeln('');
          instance.terminal.writeln(completions.join('  '));
          writePrompt(instance);
          instance.terminal.write(currentLine);
        }
        
      } else if (code >= 32) { // Printable characters
        currentLine += data;
        instance.terminal.write(data);
      }
    });
  };

  // Execute command
  const executeCommand = async (instance: TerminalInstance, command: string) => {
    const [cmd, ...args] = command.trim().split(/\s+/);
    
    try {
      // Built-in commands
      if (cmd === 'clear' || cmd === 'cls') {
        instance.terminal.clear();
        return;
      }
      
      if (cmd === 'cd') {
        const newDir = args[0] || '~';
        if (newDir === '~') {
          instance.cwd = '~';
        } else if (newDir === '..') {
          const parts = instance.cwd.split('/');
          parts.pop();
          instance.cwd = parts.join('/') || '/';
        } else if (newDir.startsWith('/')) {
          instance.cwd = newDir;
        } else {
          instance.cwd = `${instance.cwd}/${newDir}`.replace(/\/+/g, '/');
        }
        return;
      }
      
      if (cmd === 'pwd') {
        instance.terminal.writeln(instance.cwd);
        return;
      }
      
      if (cmd === 'help') {
        instance.terminal.writeln('\x1b[1mBuilt-in commands:\x1b[0m');
        instance.terminal.writeln('  clear, cls    - Clear terminal');
        instance.terminal.writeln('  cd <dir>      - Change directory');
        instance.terminal.writeln('  pwd           - Print working directory');
        instance.terminal.writeln('  help          - Show this help');
        instance.terminal.writeln('');
        instance.terminal.writeln('\x1b[1mAPI commands:\x1b[0m');
        instance.terminal.writeln('  All other commands are sent to the backend API');
        return;
      }
      
      // Send to API for real execution
      instance.terminal.writeln('\x1b[38;5;245m⏳ Executing...\x1b[0m');
      
      const response = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          cwd: instance.cwd,
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        instance.terminal.writeln(`\x1b[38;5;203m${result.error}\x1b[0m`);
      } else {
        // Print output
        if (result.output) {
          result.output.split('\n').forEach((line: string) => {
            instance.terminal.writeln(line);
          });
        }
        
        // Update cwd if changed
        if (result.cwd) {
          instance.cwd = result.cwd;
        }
      }
      
      // Callback
      onCommand?.(command, result.output || result.error);
      
    } catch (error) {
      instance.terminal.writeln(`\x1b[38;5;203mError: ${error}\x1b[0m`);
    }
  };

  // Simple tab completion
  const getCompletions = (line: string): string[] => {
    const lastWord = line.split(' ').pop() || '';
    const commands = [
      'cd', 'ls', 'pwd', 'clear', 'help', 'git', 'npm', 'node',
      'python', 'pip', 'cat', 'echo', 'mkdir', 'rm', 'cp', 'mv',
    ];
    
    if (line.includes(' ')) {
      // File completion would go here
      return [];
    }
    
    return commands.filter(c => c.startsWith(lastWord));
  };

  // Close terminal
  const closeTerminal = (id: string) => {
    const instance = terminals.find(t => t.id === id);
    if (instance) {
      instance.terminal.dispose();
    }
    
    setTerminals(prev => prev.filter(t => t.id !== id));
    
    if (activeTerminalId === id) {
      const remaining = terminals.filter(t => t.id !== id);
      setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Search in terminal
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const instance = terminals.find(t => t.id === activeTerminalId);
    if (instance && query) {
      instance.searchAddon.findNext(query);
    }
  };

  // Copy selection
  const copySelection = () => {
    const instance = terminals.find(t => t.id === activeTerminalId);
    if (instance) {
      const selection = instance.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  return (
    <div className={cn(
      'flex flex-col bg-[#1e1e2e] border-t border-[#313244]',
      isMaximized ? 'fixed inset-0 z-50' : 'h-64'
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#181825] border-b border-[#313244]">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {terminals.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTerminalId(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 text-xs rounded transition-colors',
                t.id === activeTerminalId
                  ? 'bg-[#313244] text-white'
                  : 'text-[#6c7086] hover:text-white hover:bg-[#313244]/50'
              )}
            >
              <Terminal className="h-3 w-3" />
              {t.name}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(t.id);
                }}
                className="ml-1 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => createTerminal()}
            className="h-6 w-6 text-[#6c7086] hover:text-white"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="h-6 w-6 text-[#6c7086] hover:text-white"
          >
            <Search className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={copySelection}
            className="h-6 w-6 text-[#6c7086] hover:text-white"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const instance = terminals.find(t => t.id === activeTerminalId);
              if (instance) instance.terminal.clear();
            }}
            className="h-6 w-6 text-[#6c7086] hover:text-white"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-6 w-6 text-[#6c7086] hover:text-white"
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-2 py-1 bg-[#181825] border-b border-[#313244]">
          <Search className="h-3 w-3 text-[#6c7086]" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            className="h-6 text-xs bg-[#1e1e2e] border-[#313244]"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const instance = terminals.find(t => t.id === activeTerminalId);
              if (instance) instance.searchAddon.findNext(searchQuery);
            }}
            className="h-6 text-xs"
          >
            Next
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const instance = terminals.find(t => t.id === activeTerminalId);
              if (instance) instance.searchAddon.findPrevious(searchQuery);
            }}
            className="h-6 text-xs"
          >
            Prev
          </Button>
        </div>
      )}
      
      {/* Terminal Content */}
      <div className="flex-1 relative" ref={containerRef}>
        {terminals.map((t) => (
          <div
            key={t.id}
            ref={(el) => {
              if (el) terminalRefs.current.set(t.id, el);
            }}
            className={cn(
              'absolute inset-0 p-2',
              t.id === activeTerminalId ? 'block' : 'hidden'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default IntegratedTerminal;
