'use client';

import React, { useState } from 'react';

interface Breakpoint {
  file: string;
  line: number;
  enabled: boolean;
}

interface Variable {
  name: string;
  value: string;
  type: string;
}

interface StackFrame {
  function: string;
  file: string;
  line: number;
}

export default function Debugger() {
  const [isRunning, setIsRunning] = useState(false);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([
    { file: '/src/main.tsx', line: 10, enabled: true },
    { file: '/src/utils.ts', line: 5, enabled: false },
  ]);
  const [variables, setVariables] = useState<Variable[]>([
    { name: 'app', value: 'App {}', type: 'object' },
    { name: 'count', value: '5', type: 'number' },
  ]);
  const [callStack, setCallStack] = useState<StackFrame[]>([
    { function: 'main()', file: '/src/main.tsx', line: 10 },
    { function: 'init()', file: '/src/main.tsx', line: 5 },
  ]);

  const toggleBreakpoint = (index: number) => {
    const newBreakpoints = [...breakpoints];
    newBreakpoints[index].enabled = !newBreakpoints[index].enabled;
    setBreakpoints(newBreakpoints);
  };

  const handleDebugAction = (action: string) => {
    // Mock debug actions
    console.log(`Debug action: ${action}`);
    if (action === 'start') setIsRunning(true);
    if (action === 'stop') setIsRunning(false);
  };

  return (
    <div className="debugger p-4 bg-gray-50 dark:bg-gray-900">
      <h3 className="font-bold mb-4">Debugger</h3>
      
      <div className="debug-controls mb-4 flex gap-2">
        <button
          onClick={() => handleDebugAction('start')}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={isRunning}
        >
          Start
        </button>
        <button
          onClick={() => handleDebugAction('stop')}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={!isRunning}
        >
          Stop
        </button>
        <button
          onClick={() => handleDebugAction('step')}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Step
        </button>
        <button
          onClick={() => handleDebugAction('continue')}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Continue
        </button>
      </div>
      
      <div className="debug-panels grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="breakpoints">
          <h4 className="font-semibold mb-2">Breakpoints</h4>
          <div className="max-h-40 overflow-y-auto">
            {breakpoints.map((bp, index) => (
              <div key={index} className="flex items-center gap-2 p-1">
                <input
                  type="checkbox"
                  checked={bp.enabled}
                  onChange={() => toggleBreakpoint(index)}
                />
                <span className="text-sm">{bp.file}:{bp.line}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="variables">
          <h4 className="font-semibold mb-2">Variables</h4>
          <div className="max-h-40 overflow-y-auto">
            {variables.map((var_, index) => (
              <div key={index} className="p-1 border-b">
                <div className="font-mono text-sm">
                  <span className="text-blue-600">{var_.name}</span>: {var_.value} ({var_.type})
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="call-stack">
          <h4 className="font-semibold mb-2">Call Stack</h4>
          <div className="max-h-40 overflow-y-auto">
            {callStack.map((frame, index) => (
              <div key={index} className={`p-1 ${index === 0 ? 'bg-yellow-100' : ''}`}>
                <div className="font-mono text-sm">
                  {frame.function} at {frame.file}:{frame.line}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
