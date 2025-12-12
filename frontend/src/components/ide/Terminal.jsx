import React, { useState, useRef, useEffect } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { executeCommand } from '@/services/api';
import { Terminal as TerminalIcon, Plus, X, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const Terminal = () => {
  const { terminalOutput, addTerminalOutput, clearTerminal, terminalHistory, addTerminalHistory, currentProject } = useIDEStore();
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalOutput]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isExecuting) return;
    
    const cmd = input.trim();
    addTerminalOutput({ type: 'input', content: `$ ${cmd}`, timestamp: new Date() });
    addTerminalHistory(cmd);
    setInput('');
    setHistoryIndex(-1);
    setIsExecuting(true);
    
    try {
      const projectId = currentProject?.id || 'default';
      const response = await executeCommand(projectId, { command: cmd });
      
      if (response.data.output) {
        addTerminalOutput({ type: 'output', content: response.data.output, timestamp: new Date() });
      }
      if (response.data.error) {
        addTerminalOutput({ type: 'error', content: response.data.error, timestamp: new Date() });
      }
    } catch (err) {
      addTerminalOutput({ type: 'error', content: `Error: ${err.message}`, timestamp: new Date() });
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < terminalHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(terminalHistory[terminalHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(terminalHistory[terminalHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clearTerminal();
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-950" onClick={() => inputRef.current?.focus()}>
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-400">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearTerminal}
            className="p-1 hover:bg-zinc-800 rounded transition-colors"
            title="Clear"
            data-testid="terminal-clear"
          >
            <Trash2 className="w-3 h-3 text-zinc-500" />
          </button>
          <button className="p-1 hover:bg-zinc-800 rounded transition-colors" title="New Terminal">
            <Plus className="w-3 h-3 text-zinc-500" />
          </button>
        </div>
      </div>
      
      {/* Terminal Output */}
      <ScrollArea className="flex-1 p-3 font-mono text-sm" ref={scrollRef}>
        {terminalOutput.length === 0 && (
          <div className="text-zinc-600">
            Welcome to AI IDE Terminal. Type commands below.
          </div>
        )}
        {terminalOutput.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap break-all",
              line.type === 'input' && 'text-blue-400',
              line.type === 'output' && 'text-zinc-300',
              line.type === 'error' && 'text-red-400'
            )}
          >
            {line.content}
          </div>
        ))}
        {isExecuting && (
          <div className="text-yellow-400 animate-pulse">Executing...</div>
        )}
      </ScrollArea>
      
      {/* Terminal Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-t border-zinc-800">
        <span className="text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          className="flex-1 bg-transparent text-white outline-none font-mono text-sm"
          placeholder="Enter command..."
          autoFocus
          data-testid="terminal-input"
        />
      </form>
    </div>
  );
};

export default Terminal;
