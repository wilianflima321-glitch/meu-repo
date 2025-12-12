import React from 'react';
import { useIDEStore } from '@/store/ideStore';
import AIAssistant from './AIAssistant';
import AnimationTools from './AnimationTools';
import ProfilingTools from './ProfilingTools';
import { Sparkles, Layers, Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const RightPanel = () => {
  const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel } = useIDEStore();
  
  const tabs = [
    { id: 'ai', label: 'AI Assistant', icon: Sparkles, color: 'text-purple-400' },
    { id: 'animation', label: 'Animation', icon: Layers, color: 'text-orange-400' },
    { id: 'profiling', label: 'Profiler', icon: Activity, color: 'text-green-400' },
  ];
  
  if (!rightPanelOpen) return null;
  
  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col" data-testid="right-panel">
      {/* Tabs */}
      <div className="flex items-center border-b border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setRightPanelTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 transition-colors flex-1 justify-center",
              rightPanelTab === tab.id
                ? "border-blue-500 text-white bg-zinc-800/50"
                : "border-transparent text-zinc-500 hover:text-white hover:bg-zinc-800/30"
            )}
            data-testid={`right-tab-${tab.id}`}
          >
            <tab.icon className={cn("w-3.5 h-3.5", rightPanelTab === tab.id && tab.color)} />
            {tab.label}
          </button>
        ))}
        <button
          onClick={toggleRightPanel}
          className="px-2 py-2 text-zinc-500 hover:text-white"
          data-testid="close-right-panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'ai' && <AIAssistant />}
        {rightPanelTab === 'animation' && <AnimationTools />}
        {rightPanelTab === 'profiling' && <ProfilingTools />}
      </div>
    </div>
  );
};

export default RightPanel;
