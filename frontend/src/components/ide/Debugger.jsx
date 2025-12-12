import React, { useState, useEffect } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { startDebugSession, addBreakpoint as addBreakpointAPI, debugStep, stopDebugSession } from '@/services/api';
import { 
  Bug, Play, Pause, Square, ArrowDownToLine, ArrowRight, ArrowUpFromLine, RotateCcw,
  Circle, ChevronRight, ChevronDown, Variable, Layers, FileCode
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Debugger = () => {
  const {
    currentProject, debugSession, setDebugSession,
    breakpoints, setBreakpoints, addBreakpoint, removeBreakpoint,
    callStack, setCallStack, variables, setVariables
  } = useIDEStore();
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set(['variables', 'callstack', 'breakpoints']));
  
  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };
  
  const handleStart = async () => {
    if (!currentProject?.id) return;
    try {
      const response = await startDebugSession(currentProject.id);
      setDebugSession(response.data);
      setIsRunning(true);
      setIsPaused(false);
      
      // Simulate hitting a breakpoint
      setTimeout(() => {
        setIsPaused(true);
        setVariables([
          { name: 'count', type: 'number', value: '42' },
          { name: 'name', type: 'string', value: '"Hello World"' },
          { name: 'items', type: 'array', value: '[1, 2, 3]' },
          { name: 'config', type: 'object', value: '{...}' }
        ]);
        setCallStack([
          { name: 'main', file: 'src/index.js', line: 15 },
          { name: 'processData', file: 'src/utils.js', line: 42 },
          { name: 'transform', file: 'src/helpers.js', line: 8 }
        ]);
      }, 1000);
    } catch (err) {
      console.error('Failed to start debug session:', err);
    }
  };
  
  const handleStop = async () => {
    if (!debugSession) return;
    try {
      await stopDebugSession(debugSession.id);
      setDebugSession(null);
      setIsRunning(false);
      setIsPaused(false);
      setVariables([]);
      setCallStack([]);
    } catch (err) {
      console.error('Failed to stop debug session:', err);
    }
  };
  
  const handleStep = async (action) => {
    if (!debugSession) return;
    try {
      await debugStep(debugSession.id, action);
      // Simulate step
      setVariables(prev => prev.map(v => 
        v.name === 'count' ? { ...v, value: String(parseInt(v.value) + 1) } : v
      ));
    } catch (err) {
      console.error('Failed to step:', err);
    }
  };
  
  const handleContinue = () => {
    setIsPaused(false);
    setTimeout(() => setIsPaused(true), 500);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-white">Debugger</span>
          {isRunning && (
            <span className={cn(
              "px-2 py-0.5 text-xs rounded",
              isPaused ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"
            )}>
              {isPaused ? 'Paused' : 'Running'}
            </span>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800">
        {!isRunning ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleStart} data-testid="debug-start">
            <Play className="w-4 h-4 text-green-400" />
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleContinue} data-testid="debug-continue">
                <Play className="w-4 h-4 text-green-400" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsPaused(true)} data-testid="debug-pause">
                <Pause className="w-4 h-4 text-yellow-400" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleStop} data-testid="debug-stop">
              <Square className="w-4 h-4 text-red-400" />
            </Button>
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStep('over')} disabled={!isPaused} data-testid="debug-step-over">
              <StepOver className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStep('into')} disabled={!isPaused} data-testid="debug-step-into">
              <StepInto className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStep('out')} disabled={!isPaused} data-testid="debug-step-out">
              <StepOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleStart} data-testid="debug-restart">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Variables */}
          <div className="mb-2">
            <button
              className="flex items-center gap-1 w-full text-left text-xs font-semibold text-zinc-400 uppercase py-1 hover:text-white"
              onClick={() => toggleSection('variables')}
              data-testid="toggle-variables"
            >
              {expandedSections.has('variables') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Variables
            </button>
            {expandedSections.has('variables') && (
              <div className="space-y-1 pl-4">
                {variables.length > 0 ? variables.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                    <Variable className="w-3 h-3 text-blue-400" />
                    <span className="text-purple-400">{v.name}</span>
                    <span className="text-zinc-500">=</span>
                    <span className="text-green-400">{v.value}</span>
                    <span className="text-zinc-600 text-xs">({v.type})</span>
                  </div>
                )) : (
                  <div className="text-xs text-zinc-600 py-1">No variables</div>
                )}
              </div>
            )}
          </div>
          
          {/* Call Stack */}
          <div className="mb-2">
            <button
              className="flex items-center gap-1 w-full text-left text-xs font-semibold text-zinc-400 uppercase py-1 hover:text-white"
              onClick={() => toggleSection('callstack')}
              data-testid="toggle-callstack"
            >
              {expandedSections.has('callstack') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Call Stack
            </button>
            {expandedSections.has('callstack') && (
              <div className="space-y-1 pl-4">
                {callStack.length > 0 ? callStack.map((frame, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-2 text-sm py-1 px-2 rounded cursor-pointer hover:bg-zinc-800",
                    i === 0 && "bg-yellow-500/10"
                  )}>
                    <Layers className="w-3 h-3 text-orange-400" />
                    <span className="text-white">{frame.name}</span>
                    <span className="text-zinc-500 text-xs">{frame.file}:{frame.line}</span>
                  </div>
                )) : (
                  <div className="text-xs text-zinc-600 py-1">No call stack</div>
                )}
              </div>
            )}
          </div>
          
          {/* Breakpoints */}
          <div>
            <button
              className="flex items-center gap-1 w-full text-left text-xs font-semibold text-zinc-400 uppercase py-1 hover:text-white"
              onClick={() => toggleSection('breakpoints')}
              data-testid="toggle-breakpoints"
            >
              {expandedSections.has('breakpoints') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Breakpoints ({breakpoints.length})
            </button>
            {expandedSections.has('breakpoints') && (
              <div className="space-y-1 pl-4">
                {breakpoints.length > 0 ? breakpoints.map((bp, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1 group">
                    <Circle className={cn(
                      "w-3 h-3",
                      bp.enabled ? "fill-red-500 text-red-500" : "text-zinc-500"
                    )} />
                    <FileCode className="w-3 h-3 text-zinc-500" />
                    <span className="text-zinc-300 truncate flex-1">{bp.file_path}</span>
                    <span className="text-zinc-500">:{bp.line}</span>
                    <button
                      onClick={() => removeBreakpoint(bp.line)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                )) : (
                  <div className="text-xs text-zinc-600 py-1">No breakpoints</div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      
      {/* Empty State */}
      {!isRunning && (
        <div className="flex-1 flex items-center justify-center pb-4">
          <div className="text-center">
            <Bug className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-500 text-sm">Ready to debug</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleStart}>
              Start Debugging
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Step icons
const StepOver = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
    <circle cx="12" cy="17" r="2" />
  </svg>
);

const StepInto = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
);

const StepOut = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export default Debugger;
