import React from 'react';
import { useIDEStore } from '@/store/ideStore';
import Terminal from './Terminal';
import Debugger from './Debugger';
import { Terminal as TerminalIcon, Bug, AlertTriangle, FileOutput, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomPanel = () => {
  const { bottomPanelTab, setBottomPanelTab, bottomPanelOpen, toggleBottomPanel } = useIDEStore();
  
  const tabs = [
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
    { id: 'problems', label: 'Problems', icon: AlertTriangle, badge: 2 },
    { id: 'output', label: 'Output', icon: FileOutput },
    { id: 'debug', label: 'Debug Console', icon: Bug },
  ];
  
  if (!bottomPanelOpen) return null;
  
  return (
    <div className="h-64 bg-zinc-900 border-t border-zinc-800 flex flex-col" data-testid="bottom-panel">
      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setBottomPanelTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs border-b-2 transition-colors",
              bottomPanelTab === tab.id
                ? "border-blue-500 text-white bg-zinc-800/50"
                : "border-transparent text-zinc-500 hover:text-white hover:bg-zinc-800/30"
            )}
            data-testid={`bottom-tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleBottomPanel}
          className="px-3 py-2 text-zinc-500 hover:text-white"
          data-testid="close-bottom-panel"
        >
          ×
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {bottomPanelTab === 'terminal' && <Terminal />}
        {bottomPanelTab === 'debug' && <Debugger />}
        {bottomPanelTab === 'problems' && <ProblemsPanel />}
        {bottomPanelTab === 'output' && <OutputPanel />}
      </div>
    </div>
  );
};

const ProblemsPanel = () => {
  const problems = [
    { type: 'error', message: "Cannot find module 'lodash'", file: 'src/utils.js', line: 5 },
    { type: 'warning', message: "'count' is defined but never used", file: 'src/App.jsx', line: 12 },
    { type: 'warning', message: "Unexpected console statement", file: 'src/index.js', line: 8 },
  ];
  
  return (
    <div className="p-2 text-sm">
      {problems.map((problem, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded cursor-pointer"
          data-testid={`problem-${i}`}
        >
          {problem.type === 'error' ? (
            <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">×</span>
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}
          <span className="text-zinc-300 flex-1">{problem.message}</span>
          <span className="text-zinc-500">{problem.file}:{problem.line}</span>
        </div>
      ))}
    </div>
  );
};

const OutputPanel = () => {
  return (
    <div className="p-3 font-mono text-sm text-zinc-400">
      <div>[Info] Build started...</div>
      <div>[Info] Compiling...</div>
      <div className="text-green-400">[Success] Build completed in 2.3s</div>
    </div>
  );
};

export default BottomPanel;
