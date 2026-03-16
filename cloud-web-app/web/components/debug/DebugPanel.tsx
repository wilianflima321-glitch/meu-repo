'use client';

/**
 * Aethel Debug Panel
 * 
 * UI completa para debugging similar ao VS Code.
 * Inclui call stack, variables, watches, breakpoints e console.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Circle,
  Bug,
  Layers,
  Variable,
  Eye,
  Terminal,
  AlertCircle,
  Info,
  Trash2,
} from 'lucide-react';
import {
  debugSessionManager,
  DebugAdapter,
  StackFrame,
  Variable as DebugVariable,
  Scope,
  Thread,
  Breakpoint,
  ConsoleMessage,
} from '@/lib/debug/debug-adapter';

// ============================================================================
// TYPES
// ============================================================================

interface DebugPanelProps {
  onBreakpointClick?: (file: string, line: number) => void;
  onFrameSelect?: (frame: StackFrame) => void;
}

type DebugPanelTab = 'variables' | 'watch' | 'callstack' | 'breakpoints' | 'console';

// ============================================================================
// COMPONENT
// ============================================================================

export function DebugPanel({ onBreakpointClick, onFrameSelect }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<DebugPanelTab>('variables');
  const [session, setSession] = useState<DebugAdapter | null>(null);
  const [status, setStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  
  // State for different panels
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThread, setCurrentThread] = useState<number>(1);
  const [callStack, setCallStack] = useState<StackFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [variables, setVariables] = useState<Map<number, DebugVariable[]>>(new Map());
  const [expandedScopes, setExpandedScopes] = useState<Set<number>>(new Set([1]));
  const [expandedVars, setExpandedVars] = useState<Set<number>>(new Set());
  const [watches, setWatches] = useState<string[]>([]);
  const [watchResults, setWatchResults] = useState<{ expression: string; result: string; error?: string }[]>([]);
  const [newWatch, setNewWatch] = useState('');
  const [breakpoints, setBreakpoints] = useState<Map<string, Breakpoint[]>>(new Map());
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [consoleInput, setConsoleInput] = useState('');
  
  const consoleEndRef = useRef<HTMLDivElement>(null);
  
  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================
  
  const refreshState = useCallback(async () => {
    const activeSession = debugSessionManager.getActiveSession();
    if (!activeSession) return;
    
    setSession(activeSession);
    
    // Get threads
    const threadList = await activeSession.getThreads();
    setThreads(threadList);
    
    // Get stack trace
    const { stackFrames } = await activeSession.getStackTrace(currentThread);
    setCallStack(stackFrames);
    
    if (stackFrames.length > 0 && !selectedFrame) {
      setSelectedFrame(stackFrames[0].id);
      
      // Get scopes for top frame
      const frameScopes = await activeSession.getScopes(stackFrames[0].id);
      setScopes(frameScopes);
      
      // Load variables for first scope
      const vars = new Map<number, DebugVariable[]>();
      for (const scope of frameScopes) {
        const scopeVars = await activeSession.getVariables(scope.variablesReference);
        vars.set(scope.variablesReference, scopeVars);
      }
      setVariables(vars);
    }
    
    // Get breakpoints
    setBreakpoints(activeSession.getState().breakpoints);
    
    // Get watches
    const watchRes = await activeSession.evaluateWatches();
    setWatchResults(watchRes);
    
    // Get console
    setConsoleMessages(activeSession.getConsoleMessages());
  }, [currentThread, selectedFrame]);

  useEffect(() => {
    const handleEvent = (event: any) => {
      switch (event.event) {
        case 'stopped':
          setStatus('paused');
          refreshState();
          break;
        case 'continued':
          setStatus('running');
          break;
        case 'terminated':
        case 'exited':
          setStatus('stopped');
          setSession(null);
          break;
        case 'output':
          if (event.body?.output) {
            setConsoleMessages(prev => [...prev, {
              type: event.body.category === 'stderr' ? 'error' : 'output',
              message: event.body.output,
              timestamp: Date.now(),
            }]);
          }
          break;
      }
    };

    debugSessionManager.on('event', handleEvent);

    return () => {
      debugSessionManager.off('event', handleEvent);
    };
  }, [refreshState]);
  
  // ============================================================================
  // CONTROL ACTIONS
  // ============================================================================
  
  const handleContinue = useCallback(async () => {
    if (session) {
      await session.continue(currentThread);
    }
  }, [session, currentThread]);
  
  const handlePause = useCallback(async () => {
    if (session) {
      await session.pause(currentThread);
    }
  }, [session, currentThread]);
  
  const handleStop = useCallback(async () => {
    if (session) {
      await debugSessionManager.terminateSession(session.getState().id);
    }
  }, [session]);
  
  const handleStepOver = useCallback(async () => {
    if (session) {
      await session.stepOver(currentThread);
    }
  }, [session, currentThread]);
  
  const handleStepInto = useCallback(async () => {
    if (session) {
      await session.stepInto(currentThread);
    }
  }, [session, currentThread]);
  
  const handleStepOut = useCallback(async () => {
    if (session) {
      await session.stepOut(currentThread);
    }
  }, [session, currentThread]);
  
  const handleRestart = useCallback(async () => {
    if (session) {
      await session.terminate();
      // Re-launch would happen here
    }
  }, [session]);
  
  // ============================================================================
  // FRAME SELECTION
  // ============================================================================
  
  const handleFrameSelect = useCallback(async (frame: StackFrame) => {
    setSelectedFrame(frame.id);
    onFrameSelect?.(frame);
    
    if (session) {
      const frameScopes = await session.getScopes(frame.id);
      setScopes(frameScopes);
      
      const vars = new Map<number, DebugVariable[]>();
      for (const scope of frameScopes) {
        const scopeVars = await session.getVariables(scope.variablesReference);
        vars.set(scope.variablesReference, scopeVars);
      }
      setVariables(vars);
    }
  }, [session, onFrameSelect]);
  
  // ============================================================================
  // VARIABLE EXPANSION
  // ============================================================================
  
  const toggleScope = useCallback((scopeRef: number) => {
    setExpandedScopes(prev => {
      const next = new Set(prev);
      if (next.has(scopeRef)) {
        next.delete(scopeRef);
      } else {
        next.add(scopeRef);
      }
      return next;
    });
  }, []);
  
  const toggleVariable = useCallback(async (varRef: number) => {
    if (!session) return;
    
    setExpandedVars(prev => {
      const next = new Set(prev);
      if (next.has(varRef)) {
        next.delete(varRef);
      } else {
        next.add(varRef);
      }
      return next;
    });
    
    // Load children if not already loaded
    if (!variables.has(varRef)) {
      const children = await session.getVariables(varRef);
      setVariables(prev => new Map(prev).set(varRef, children));
    }
  }, [session, variables]);
  
  // ============================================================================
  // WATCHES
  // ============================================================================
  
  const addWatch = useCallback(() => {
    if (!newWatch.trim()) return;
    
    setWatches(prev => [...prev, newWatch.trim()]);
    session?.addWatch(newWatch.trim());
    setNewWatch('');
    
    // Refresh watch results
    session?.evaluateWatches().then(setWatchResults);
  }, [newWatch, session]);
  
  const removeWatch = useCallback((expression: string) => {
    setWatches(prev => prev.filter(w => w !== expression));
    session?.removeWatch(expression);
    setWatchResults(prev => prev.filter(w => w.expression !== expression));
  }, [session]);
  
  // ============================================================================
  // CONSOLE
  // ============================================================================
  
  const handleConsoleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim() || !session) return;
    
    await session.evaluate(consoleInput.trim(), selectedFrame || undefined, 'repl');
    setConsoleMessages(session.getConsoleMessages());
    setConsoleInput('');
    
    // Scroll to bottom
    setTimeout(() => {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [consoleInput, session, selectedFrame]);
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderVariable = (variable: DebugVariable, depth: number = 0) => {
    const hasChildren = variable.variablesReference > 0;
    const isExpanded = expandedVars.has(variable.variablesReference);
    const children = variables.get(variable.variablesReference) || [];
    
    return (
      <div key={variable.name} style={{ marginLeft: depth * 16 }}>
        <div
          className="flex items-center gap-1 py-0.5 px-2 hover:bg-[var(--aethel-border-primary)] cursor-pointer rounded text-sm"
          onClick={() => hasChildren && toggleVariable(variable.variablesReference)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-3" />
          )}
          <span className="text-[var(--aethel-info)]">{variable.name}</span>
          <span className="text-[var(--aethel-text-quaternary)]">:</span>
          <span className="text-[var(--aethel-success-light)] ml-1 truncate">{variable.value}</span>
          {variable.type && (
            <span className="text-[var(--aethel-text-quaternary)] ml-1 text-xs">({variable.type})</span>
          )}
        </div>
        
        {hasChildren && isExpanded && children.map(child => renderVariable(child, depth + 1))}
      </div>
    );
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const tabs: { id: DebugPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: 'variables', label: 'Variables', icon: <Variable size={14} /> },
    { id: 'watch', label: 'Watch', icon: <Eye size={14} /> },
    { id: 'callstack', label: 'Call Stack', icon: <Layers size={14} /> },
    { id: 'breakpoints', label: 'Breakpoints', icon: <Circle size={14} /> },
    { id: 'console', label: 'Debug Console', icon: <Terminal size={14} /> },
  ];
  
  return (
    <div className="h-full flex flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-[var(--aethel-border-primary)]">
        <button
          onClick={status === 'paused' ? handleContinue : handlePause}
          className="p-1.5 hover:bg-[var(--aethel-border-primary)] rounded transition-colors"
          title={status === 'paused' ? 'Continue (F5)' : 'Pause (F6)'}
          disabled={status === 'stopped'}
        >
          {status === 'paused' ? <Play size={16} className="text-[var(--aethel-success-light)]" /> : <Pause size={16} />}
        </button>
        
        <button
          onClick={handleStop}
          className="p-1.5 hover:bg-[var(--aethel-border-primary)] rounded transition-colors"
          title="Stop (Shift+F5)"
          disabled={status === 'stopped'}
        >
          <Square size={16} className="text-[var(--aethel-error-light)]" />
        </button>
        
        <button
          onClick={handleRestart}
          className="p-1.5 hover:bg-[var(--aethel-border-primary)] rounded transition-colors"
          title="Restart (Ctrl+Shift+F5)"
          disabled={status === 'stopped'}
        >
          <RotateCcw size={16} />
        </button>
        
        <div className="w-px h-4 bg-[var(--aethel-border-primary)] mx-1" />
        
        <button
          onClick={handleStepOver}
          className="p-1.5 hover:bg-[var(--aethel-border-primary)] rounded transition-colors"
          title="Step Over (F10)"
          disabled={status !== 'paused'}
        >
          <SkipForward size={16} />
        </button>
        
        <button
          onClick={handleStepInto}
          className="p-1.5 hover:bg-[var(--aethel-border-primary)] rounded transition-colors"
          title="Step Into (F11)"
          disabled={status !== 'paused'}
        >
          <ArrowDown size={16} />
        </button>
        
        <button
          onClick={handleStepOut}
          className="p-1.5 hover:bg-[var(--aethel-border-primary)] rounded transition-colors"
          title="Step Out (Shift+F11)"
          disabled={status !== 'paused'}
        >
          <ArrowUp size={16} />
        </button>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2 text-xs text-[var(--aethel-text-quaternary)]">
          <Bug size={14} />
          <span>
            {status === 'stopped' ? 'Not debugging' : 
             status === 'running' ? 'Running...' : 'Paused'}
          </span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-2 text-xs transition-colors
              ${activeTab === tab.id 
                ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-primary-light)]' 
                : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]'}
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* Variables */}
          {activeTab === 'variables' && (
            <motion.div
              key="variables"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2"
            >
              {scopes.map(scope => (
                <div key={scope.variablesReference} className="mb-2">
                  <div
                    className="flex items-center gap-1 py-1 px-2 bg-[var(--aethel-border-primary)] rounded cursor-pointer"
                    onClick={() => toggleScope(scope.variablesReference)}
                  >
                    {expandedScopes.has(scope.variablesReference) 
                      ? <ChevronDown size={14} /> 
                      : <ChevronRight size={14} />}
                    <span className="text-sm font-medium">{scope.name}</span>
                  </div>
                  
                  {expandedScopes.has(scope.variablesReference) && (
                    <div className="mt-1">
                      {(variables.get(scope.variablesReference) || []).map(v => renderVariable(v))}
                    </div>
                  )}
                </div>
              ))}
              
              {scopes.length === 0 && (
                <div className="text-center text-[var(--aethel-text-quaternary)] py-8">
                  No variables available
                </div>
              )}
            </motion.div>
          )}
          
          {/* Watch */}
          {activeTab === 'watch' && (
            <motion.div
              key="watch"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2"
            >
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newWatch}
                  onChange={(e) => setNewWatch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWatch()}
                  placeholder="Add expression..."
                  className="flex-1 bg-[var(--aethel-border-primary)] rounded px-2 py-1 text-sm outline-none focus:ring-1 ring-[var(--aethel-primary-light)]"
                />
                <button
                  onClick={addWatch}
                  className="p-1.5 bg-[var(--aethel-border-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              {watchResults.map((watch, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1 px-2 hover:bg-[var(--aethel-border-primary)] rounded group"
                >
                  <Eye size={12} className="text-[var(--aethel-text-quaternary)]" />
                  <span className="text-[var(--aethel-info)]">{watch.expression}</span>
                  <span className="text-[var(--aethel-text-quaternary)]">=</span>
                  <span className={watch.error ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-success-light)]'}>
                    {watch.error || watch.result}
                  </span>
                  <button
                    onClick={() => removeWatch(watch.expression)}
                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--aethel-surface-quaternary)] rounded"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
          
          {/* Call Stack */}
          {activeTab === 'callstack' && (
            <motion.div
              key="callstack"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2"
            >
              {/* Thread selector */}
              {threads.length > 1 && (
                <select
                  value={currentThread}
                  onChange={(e) => setCurrentThread(Number(e.target.value))}
                  className="w-full bg-[var(--aethel-border-primary)] rounded px-2 py-1 text-sm mb-2"
                >
                  {threads.map(thread => (
                    <option key={thread.id} value={thread.id}>
                      Thread {thread.id}: {thread.name}
                    </option>
                  ))}
                </select>
              )}
              
              {callStack.map((frame, i) => (
                <div
                  key={frame.id}
                  onClick={() => handleFrameSelect(frame)}
                  className={`
                    flex items-center gap-2 py-1 px-2 cursor-pointer rounded text-sm
                    ${selectedFrame === frame.id ? 'bg-[var(--aethel-surface-quaternary)]' : 'hover:bg-[var(--aethel-border-primary)]'}
                  `}
                >
                  <span className="text-[var(--aethel-warning-light)]">{frame.name}</span>
                  <span className="text-[var(--aethel-text-quaternary)] text-xs">
                    {frame.source?.name}:{frame.line}
                  </span>
                </div>
              ))}
              
              {callStack.length === 0 && (
                <div className="text-center text-[var(--aethel-text-quaternary)] py-8">
                  No call stack
                </div>
              )}
            </motion.div>
          )}
          
          {/* Breakpoints */}
          {activeTab === 'breakpoints' && (
            <motion.div
              key="breakpoints"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-2"
            >
              {Array.from(breakpoints.entries()).map(([file, bps]) => (
                <div key={file} className="mb-2">
                  <div className="text-xs text-[var(--aethel-text-quaternary)] mb-1">{file}</div>
                  {bps.map(bp => (
                    <div
                      key={bp.id}
                      onClick={() => onBreakpointClick?.(file, bp.line || 0)}
                      className="flex items-center gap-2 py-1 px-2 hover:bg-[var(--aethel-border-primary)] rounded cursor-pointer"
                    >
                      <Circle
                        size={12}
                        className={bp.verified ? 'text-[var(--aethel-error-light)] fill-[var(--aethel-error-light)]' : 'text-[var(--aethel-text-quaternary)]'}
                      />
                      <span>Line {bp.line}</span>
                      {bp.message && (
                        <span className="text-xs text-[var(--aethel-text-quaternary)]">{bp.message}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              
              {breakpoints.size === 0 && (
                <div className="text-center text-[var(--aethel-text-quaternary)] py-8">
                  No breakpoints set
                </div>
              )}
            </motion.div>
          )}
          
          {/* Console */}
          {activeTab === 'console' && (
            <motion.div
              key="console"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-auto p-2 font-mono text-sm">
                {consoleMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`
                      flex items-start gap-2 py-0.5
                      ${msg.type === 'error' ? 'text-[var(--aethel-error-light)]' : ''}
                      ${msg.type === 'warn' ? 'text-[var(--aethel-warning-light)]' : ''}
                      ${msg.type === 'info' ? 'text-[var(--aethel-primary-light)]' : ''}
                      ${msg.type === 'input' ? 'text-[var(--aethel-text-quaternary)]' : ''}
                    `}
                  >
                    {msg.type === 'error' && <AlertCircle size={12} />}
                    {msg.type === 'info' && <Info size={12} />}
                    {msg.type === 'input' && <ChevronRight size={12} />}
                    <span className="whitespace-pre-wrap">{msg.message}</span>
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
              
              <form onSubmit={handleConsoleSubmit} className="border-t border-[var(--aethel-border-primary)] p-2">
                <div className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-[var(--aethel-text-quaternary)]" />
                  <input
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="Evaluate expression..."
                    className="flex-1 bg-transparent outline-none text-sm font-mono"
                    disabled={status !== 'paused'}
                  />
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DebugPanel;
