import React from 'react';
import { useIDEStore } from '@/store/ideStore';
import { 
  GitBranch, AlertCircle, CheckCircle, XCircle, Info, 
  Terminal as TerminalIcon, Bell, Wifi, WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

const StatusBar = () => {
  const {
    currentProject, gitBranch, gitChanges, cursorPosition,
    activeFileId, openFiles, settings, profilingActive
  } = useIDEStore();
  
  const activeFile = openFiles.find(f => f.id === activeFileId);
  const errors = 0;
  const warnings = 2;
  const infos = 1;
  
  return (
    <div className="h-6 bg-blue-600 flex items-center justify-between px-2 text-xs text-white" data-testid="status-bar">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Git Branch */}
        <button className="flex items-center gap-1 hover:bg-blue-700 px-1.5 py-0.5 rounded transition-colors">
          <GitBranch className="w-3 h-3" />
          <span>{gitBranch}</span>
          {gitChanges?.length > 0 && (
            <span className="text-blue-200">*{gitChanges.length}</span>
          )}
        </button>
        
        {/* Problems */}
        <button className="flex items-center gap-2 hover:bg-blue-700 px-1.5 py-0.5 rounded transition-colors">
          <span className="flex items-center gap-0.5">
            <XCircle className="w-3 h-3" />
            {errors}
          </span>
          <span className="flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" />
            {warnings}
          </span>
          <span className="flex items-center gap-0.5">
            <Info className="w-3 h-3" />
            {infos}
          </span>
        </button>
        
        {/* Profiling Indicator */}
        {profilingActive && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded animate-pulse">
            <span className="w-2 h-2 bg-white rounded-full" />
            Profiling
          </span>
        )}
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Cursor Position */}
        {activeFile && (
          <span className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}
        
        {/* Tab Size */}
        <span className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
          Spaces: {settings.tabSize}
        </span>
        
        {/* Encoding */}
        <span className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
          UTF-8
        </span>
        
        {/* Language */}
        {activeFile && (
          <span className="hover:bg-blue-700 px-1.5 py-0.5 rounded cursor-pointer">
            {activeFile.language || 'Plain Text'}
          </span>
        )}
        
        {/* Connection Status */}
        <span className="flex items-center gap-1">
          <Wifi className="w-3 h-3" />
        </span>
        
        {/* Notifications */}
        <button className="hover:bg-blue-700 p-0.5 rounded transition-colors">
          <Bell className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
