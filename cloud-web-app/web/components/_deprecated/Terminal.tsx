'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTerminalManager } from '@/lib/terminal/terminal-manager';

export default function Terminal() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>(['Welcome to Aethel Terminal']);
  const [command, setCommand] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalManager = useMemo(() => getTerminalManager(), []);

  const initializeTerminal = useCallback(async () => {
    try {
      const id = await terminalManager.createSession('Main Terminal', '/workspace');
      setSessionId(id);
      setOutput(prev => [...prev, 'Terminal session initialized']);
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      setOutput(prev => [...prev, 'Error: Failed to initialize terminal']);
    }
  }, [terminalManager]);

  const loadTasks = useCallback(async () => {
    try {
      await terminalManager.loadTasks('/workspace');
      const detectedTasks = await terminalManager.detectTasks('/workspace');
      setTasks([...terminalManager.getAllTasks(), ...detectedTasks]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [terminalManager]);

  useEffect(() => {
    initializeTerminal();
    loadTasks();
  }, [initializeTerminal, loadTasks]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCommand = async (cmd: string) => {
    if (!cmd.trim() || !sessionId) return;
    
    setOutput(prev => [...prev, `$ ${cmd}`]);
    setCommand('');
    
    try {
      await terminalManager.sendInput(sessionId, cmd + '\n');
      
      // Poll for output
      setTimeout(async () => {
        try {
          const newOutput = await terminalManager.getOutput(sessionId);
          if (newOutput) {
            setOutput(prev => [...prev, newOutput]);
          }
        } catch (error) {
          console.error('Failed to get output:', error);
        }
      }, 500);
    } catch (error) {
      setOutput(prev => [...prev, 'Error: Command execution failed']);
    }
  };

  const runTask = async (taskLabel: string) => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setOutput(prev => [...prev, `Running task: ${taskLabel}...`]);
    
    try {
      await terminalManager.executeTask(taskLabel, sessionId);
      setOutput(prev => [...prev, `Task ${taskLabel} started`]);
    } catch (error) {
      setOutput(prev => [...prev, `Error: Failed to run task ${taskLabel}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(command);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOutput(prev => [...prev, 'LEGACY_TERMINAL_NOTICE: command history unavailable in deprecated terminal.']);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setOutput(prev => [...prev, 'LEGACY_TERMINAL_NOTICE: autocomplete unavailable in deprecated terminal.']);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Tasks Panel */}
      {tasks.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm p-4 border-b border-slate-700">
          <h3 className="text-white font-semibold mb-2">Quick Tasks</h3>
          <div className="flex flex-wrap gap-2">
            {tasks.slice(0, 6).map((task, index) => (
              <button
                key={index}
                onClick={() => runTask(task.label)}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                {task.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <div 
        ref={outputRef}
        className="flex-1 bg-slate-900 text-green-400 p-4 font-mono text-sm overflow-y-auto"
      >
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">{line}</div>
        ))}
      </div>
      {/* Command Input */}
      <div className="bg-slate-900 p-4 border-t border-slate-700 flex items-center gap-2">
        <span className="text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 bg-transparent border-none outline-none text-green-400 font-mono"
          placeholder="Type a command..."
        />
      </div>
    </div>
  );
}
