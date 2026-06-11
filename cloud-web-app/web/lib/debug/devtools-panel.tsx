'use client';

import React, { useContext, useState } from 'react';
import {
  Activity,
  Bug,
  Database,
  Download,
  History,
  Maximize2,
  Minimize2,
  Network,
  Pause,
  Play,
  Search,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { ActionsTab, ConsoleTab, NetworkTab, PerformanceTab, StateTab } from './devtools-tabs';
import { DevToolsContext } from './devtools-provider';
import type { DevToolsTab } from './devtools-types';

export function DevToolsPanel({ isMinimized, onMinimize }: { isMinimized: boolean; onMinimize: () => void }) {
  const ctx = useContext(DevToolsContext);
  const [searchQuery, setSearchQuery] = useState('');

  if (!ctx) return null;

  const { isOpen, toggle, activeTab, setActiveTab, isRecording, toggleRecording, clearAll, exportLogs } = ctx;

  const tabs: { id: DevToolsTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'state', label: 'State', icon: <Database className="w-4 h-4" />, count: ctx.snapshots.length },
    { id: 'actions', label: 'Actions', icon: <History className="w-4 h-4" />, count: ctx.actions.length },
    { id: 'performance', label: 'Perf', icon: <Activity className="w-4 h-4" />, count: ctx.metrics.length },
    { id: 'network', label: 'Network', icon: <Network className="w-4 h-4" />, count: ctx.requests.length },
    { id: 'console', label: 'Console', icon: <Terminal className="w-4 h-4" />, count: ctx.console.length }
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggle}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-[var(--aethel-primary-dark)] p-3 text-[var(--aethel-text-primary)] shadow-lg transition-colors hover:bg-[var(--aethel-primary)]"
          title="Open DevTools (Ctrl+Shift+D)"
        >
          <Bug className="w-5 h-5" />
        </button>
      )}

      {/* DevTools Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-2xl transition-[height,transform,opacity] duration-200 ${
            isMinimized ? 'h-12' : 'h-80'
          }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-12 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[var(--aethel-primary-light)]">
                  <Bug className="w-4 h-4" />
                  <span className="text-sm font-semibold">Aethel DevTools</span>
                </div>

                {!isMinimized && (
                  <div className="flex items-center">
                    {tabs.map(tab => (
                      <button type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]'
                            : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            activeTab === tab.id ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-surface-quaternary)]'
                          }`}>
                            {tab.count > 99 ? '99+' : tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isMinimized && (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--aethel-text-quaternary)]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-40 pl-7 pr-2 py-1 text-xs bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-secondary)] rounded-md text-[var(--aethel-text-secondary)] placeholder-[var(--aethel-text-quaternary)] focus:border-[var(--aethel-primary)] focus:outline-none"
                      />
                    </div>

                    {/* Recording */}
                    <button type="button"
                      onClick={toggleRecording}
                      className={`p-1.5 rounded-md transition-colors ${
                        isRecording ? 'text-[var(--aethel-error-light)] bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                      }`}
                      title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    >
                      {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    {/* Clear */}
                    <button type="button"
                      onClick={clearAll}
                      className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] rounded-md transition-colors"
                      title="Clear All"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Export */}
                    <button type="button"
                      onClick={exportLogs}
                      className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] rounded-md transition-colors"
                      title="Export Logs"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Minimize */}
                <button type="button"
                  onClick={onMinimize}
                  className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] rounded-md transition-colors"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>

                {/* Close */}
                <button type="button"
                  onClick={toggle}
                  className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error-light)] rounded-md transition-colors"
                  title="Close DevTools"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <div className="h-[calc(100%-3rem)] overflow-hidden">
                {activeTab === 'state' && <StateTab snapshots={ctx.snapshots} searchQuery={searchQuery} />}
                {activeTab === 'actions' && <ActionsTab actions={ctx.actions} searchQuery={searchQuery} />}
                {activeTab === 'performance' && <PerformanceTab metrics={ctx.metrics} searchQuery={searchQuery} />}
                {activeTab === 'network' && <NetworkTab requests={ctx.requests} searchQuery={searchQuery} />}
                {activeTab === 'console' && <ConsoleTab entries={ctx.console} searchQuery={searchQuery} />}
              </div>
            )}
        </div>
      )}
    </>
  );
}

