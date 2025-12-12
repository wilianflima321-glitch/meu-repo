import React from 'react';
import { useIDEStore } from '@/store/ideStore';
import { 
  GitBranch, AlertCircle, CheckCircle, XCircle, Info, Sparkles,
  Terminal as TerminalIcon, Bell, Wifi, WifiOff, Bug, Activity,
  Layers, Clock, HardDrive, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const StatusBar = () => {
  const {
    currentProject, gitBranch, gitChanges, cursorPosition,
    activeFileId, openFiles, settings, profilingActive, debugSession,
    toggleBottomPanel, setBottomPanelTab, toggleRightPanel, setRightPanelTab
  } = useIDEStore();
  
  const activeFile = openFiles.find(f => f.id === activeFileId);
  const errors = 0;
  const warnings = 2;
  const infos = 1;
  
  const getLanguageLabel = (lang) => {
    const labels = {
      javascript: 'JavaScript',
      javascriptreact: 'JavaScript React',
      typescript: 'TypeScript',
      typescriptreact: 'TypeScript React',
      python: 'Python',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      markdown: 'Markdown',
    };
    return labels[lang] || lang || 'Plain Text';
  };
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-6 bg-blue-600 flex items-center justify-between px-2 text-xs text-white select-none" data-testid="status-bar">
        {/* Left Section */}
        <div className="flex items-center gap-1">
          {/* Remote Indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center gap-1 hover:bg-blue-700 px-1.5 py-0.5 rounded transition-colors">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <span className="text-[11px]">Local</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Connected to local workspace</p></TooltipContent>
          </Tooltip>
          
          {/* Git Branch */}
          {currentProject && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center gap-1 hover:bg-blue-700 px-1.5 py-0.5 rounded transition-colors">
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{gitBranch}</span>
                  {gitChanges?.length > 0 && (
                    <span className="text-blue-200">*</span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Branch: {gitBranch}</p>
                {gitChanges?.length > 0 && <p>{gitChanges.length} pending changes</p>}
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Sync Status */}
          {currentProject && (
            <button className="flex items-center gap-0.5 hover:bg-blue-700 px-1.5 py-0.5 rounded transition-colors">
              <span className="text-[11px]">↓0 ↑0</span>
            </button>
          )}
          
          {/* Problems */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="flex items-center gap-1.5 hover:bg-blue-700 px-1.5 py-0.5 rounded transition-colors"
                onClick={() => { toggleBottomPanel(); setBottomPanelTab('problems'); }}
              >
                <span className="flex items-center gap-0.5">
                  <XCircle className="w-3.5 h-3.5" />
                  {errors}
                </span>
                <span className="flex items-center gap-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {warnings}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{errors} errors, {warnings} warnings</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Debug Status */}
          {debugSession?.status === 'running' && (
            <button 
              className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/80 rounded"
              onClick={() => { toggleBottomPanel(); setBottomPanelTab('debug'); }}
            >
              <Bug className="w-3 h-3" />
              <span className="text-[11px]">Debugging</span>
            </button>
          )}
          
          {/* Profiling Indicator */}
          {profilingActive && (
            <button 
              className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded animate-pulse"
              onClick={() => { toggleRightPanel(); setRightPanelTab('profiling'); }}
            >
              <Activity className="w-3 h-3" />
              <span className="text-[11px]">Recording</span>
            </button>
          )}
        </div>
        
        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* Cursor Position */}
          {activeFile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
                  Ln {cursorPosition.line}, Col {cursorPosition.column}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Go to Line (Ctrl+G)</p></TooltipContent>
            </Tooltip>
          )}
          
          {/* Tab Size */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
                Spaces: {settings.tabSize}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Select Indentation</p></TooltipContent>
          </Tooltip>
          
          {/* Encoding */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
                UTF-8
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Select Encoding</p></TooltipContent>
          </Tooltip>
          
          {/* EOL */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
                LF
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Select End of Line Sequence</p></TooltipContent>
          </Tooltip>
          
          {/* Language */}
          {activeFile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
                  {getLanguageLabel(activeFile.language)}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Select Language Mode</p></TooltipContent>
            </Tooltip>
          )}
          
          {/* AI Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                className="flex items-center gap-1 hover:bg-blue-700 px-1.5 py-0.5 rounded transition-colors"
                onClick={() => { toggleRightPanel(); setRightPanelTab('ai'); }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px]">AI</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>AI Assistant Ready</p></TooltipContent>
          </Tooltip>
          
          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:bg-blue-700 p-1 rounded transition-colors relative">
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Notifications</p></TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default StatusBar;
