'use client';

/**
 * DevTools Provider - Development Tools System
 *
 * Sistema profissional de ferramentas de desenvolvimento similar ao React DevTools.
 * Fornece inspeção de estado, histórico de ações, métricas de performance,
 * e debugging avançado para o Aethel Engine.
 *
 * @module lib/debug/devtools-provider
 */
import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  type ReactNode
} from 'react';
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

// ============================================================================
// TYPES
// ============================================================================

export type DevToolsTab = 'state' | 'actions' | 'performance' | 'network' | 'console';

export interface StateSnapshot {
  id: string;
  timestamp: number;
  label: string;
  state: Record<string, unknown>;
}

export interface ActionLog {
  id: string;
  timestamp: number;
  type: string;
  payload?: unknown;
  duration?: number;
  source: string;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'render' | 'network' | 'memory' | 'cpu' | 'custom';
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  duration?: number;
  size?: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface ConsoleEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
  timestamp: number;
  source?: string;
  stack?: string;
}

interface DevToolsContextValue {
  /** Is DevTools panel visible */
  isOpen: boolean;
  /** Toggle DevTools panel */
  toggle: () => void;
  /** Open DevTools panel */
  open: () => void;
  /** Close DevTools panel */
  close: () => void;
  /** Current active tab */
  activeTab: DevToolsTab;
  /** Set active tab */
  setActiveTab: (tab: DevToolsTab) => void;
  /** Is recording enabled */
  isRecording: boolean;
  /** Toggle recording */
  toggleRecording: () => void;
  /** Log an action */
  logAction: (type: string, payload?: unknown, source?: string) => void;
  /** Take a state snapshot */
  takeSnapshot: (label: string, state: Record<string, unknown>) => void;
  /** Log a performance metric */
  logMetric: (name: string, value: number, unit?: string, category?: PerformanceMetric['category']) => void;
  /** Log a network request */
  logNetwork: (request: Omit<NetworkRequest, 'id' | 'timestamp'>) => void;
  /** Log to console */
  log: (level: ConsoleEntry['level'], message: string, data?: unknown, source?: string) => void;
  /** Clear all logs */
  clearAll: () => void;
  /** Export logs as JSON */
  exportLogs: () => void;
  /** State snapshots */
  snapshots: StateSnapshot[];
  /** Action logs */
  actions: ActionLog[];
  /** Performance metrics */
  metrics: PerformanceMetric[];
  /** Network requests */
  requests: NetworkRequest[];
  /** Console entries */
  console: ConsoleEntry[];
}

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface DevToolsProviderProps {
  children: ReactNode;
  /** Enable DevTools (typically only in development) */
  enabled?: boolean;
  /** Max entries to keep in each log */
  maxEntries?: number;
}

export function DevToolsProvider({
  children,
  enabled = process.env.NODE_ENV === 'development',
  maxEntries = 500
}: DevToolsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DevToolsTab>('state');
  const [isRecording, setIsRecording] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);

  const idCounter = useRef(0);

  const generateId = useCallback(() => {
    idCounter.current += 1;
    return `devtools-${Date.now()}-${idCounter.current}`;
  }, []);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggleRecording = useCallback(() => setIsRecording(prev => !prev), []);

  const logAction = useCallback((type: string, payload?: unknown, source = 'unknown') => {
    if (!isRecording) return;

    const newAction: ActionLog = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      payload,
      source
    };

    setActions(prev => {
      const updated = [newAction, ...prev];
      return updated.slice(0, maxEntries);
    });
  }, [isRecording, generateId, maxEntries]);

  const takeSnapshot = useCallback((label: string, state: Record<string, unknown>) => {
    if (!isRecording) return;

    const snapshot: StateSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      label,
      state: JSON.parse(JSON.stringify(state)) // Deep clone
    };

    setSnapshots(prev => {
      const updated = [snapshot, ...prev];
      return updated.slice(0, maxEntries);
    });
  }, [isRecording, generateId, maxEntries]);

  const logMetric = useCallback((
    name: string,
    value: number,
    unit = 'ms',
    category: PerformanceMetric['category'] = 'custom'
  ) => {
    if (!isRecording) return;

    const metric: PerformanceMetric = {
      id: generateId(),
      name,
      value,
      unit,
      category,
      timestamp: Date.now()
    };

    setMetrics(prev => {
      const updated = [metric, ...prev];
      return updated.slice(0, maxEntries);
    });
  }, [isRecording, generateId, maxEntries]);

  const logNetwork = useCallback((request: Omit<NetworkRequest, 'id' | 'timestamp'>) => {
    if (!isRecording) return;

    const networkEntry: NetworkRequest = {
      ...request,
      id: generateId(),
      timestamp: Date.now()
    };

    setRequests(prev => {
      const updated = [networkEntry, ...prev];
      return updated.slice(0, maxEntries);
    });
  }, [isRecording, generateId, maxEntries]);

  const log = useCallback((
    level: ConsoleEntry['level'],
    message: string,
    data?: unknown,
    source?: string
  ) => {
    if (!isRecording) return;

    const entry: ConsoleEntry = {
      id: generateId(),
      level,
      message,
      data,
      source,
      timestamp: Date.now()
    };

    setConsoleEntries(prev => {
      const updated = [entry, ...prev];
      return updated.slice(0, maxEntries);
    });
  }, [isRecording, generateId, maxEntries]);

  const clearAll = useCallback(() => {
    setSnapshots([]);
    setActions([]);
    setMetrics([]);
    setRequests([]);
    setConsoleEntries([]);
  }, []);

  const exportLogs = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      snapshots,
      actions,
      metrics,
      requests,
      console: consoleEntries
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethel-devtools-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [snapshots, actions, metrics, requests, consoleEntries]);

  // Keyboard shortcut to toggle DevTools (Ctrl+Shift+D)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, toggle]);

  // Auto-log performance metrics
  useEffect(() => {
    if (!enabled || !isRecording) return;

    const collectPerformanceMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as { memory: { usedJSHeapSize: number } }).memory;
        logMetric('JS Heap Size', Math.round(memory.usedJSHeapSize / 1024 / 1024), 'MB', 'memory');
      }

      const entries = performance.getEntriesByType('paint');
      entries.forEach(entry => {
        if (entry.name === 'first-contentful-paint') {
          logMetric('FCP', Math.round(entry.startTime), 'ms', 'render');
        }
      });
    };

    const interval = setInterval(collectPerformanceMetrics, 5000);
    return () => clearInterval(interval);
  }, [enabled, isRecording, logMetric]);

  const value = useMemo<DevToolsContextValue>(() => ({
    isOpen,
    toggle,
    open,
    close,
    activeTab,
    setActiveTab,
    isRecording,
    toggleRecording,
    logAction,
    takeSnapshot,
    logMetric,
    logNetwork,
    log,
    clearAll,
    exportLogs,
    snapshots,
    actions,
    metrics,
    requests,
    console: consoleEntries
  }), [
    isOpen, toggle, open, close, activeTab, isRecording, toggleRecording,
    logAction, takeSnapshot, logMetric, logNetwork, log, clearAll, exportLogs,
    snapshots, actions, metrics, requests, consoleEntries
  ]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <DevToolsContext.Provider value={value}>
      {children}
      <DevToolsPanel isMinimized={isMinimized} onMinimize={() => setIsMinimized(prev => !prev)} />
    </DevToolsContext.Provider>
  );
}

// ============================================================================
// DEVTOOLS PANEL
// ============================================================================

function DevToolsPanel({ isMinimized, onMinimize }: { isMinimized: boolean; onMinimize: () => void }) {
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

// ============================================================================
// TAB COMPONENTS
// ============================================================================

// ============================================================================
// HOOKS
// ============================================================================

export function useDevTools() {
  const context = useContext(DevToolsContext);

  if (!context) {
    // Return no-op functions when not in DevTools provider
    return {
      isOpen: false,
      toggle: () => {},
      open: () => {},
      close: () => {},
      activeTab: 'state' as DevToolsTab,
      setActiveTab: () => {},
      isRecording: false,
      toggleRecording: () => {},
      logAction: () => {},
      takeSnapshot: () => {},
      logMetric: () => {},
      logNetwork: () => {},
      log: () => {},
      clearAll: () => {},
      exportLogs: () => {},
      snapshots: [],
      actions: [],
      metrics: [],
      requests: [],
      console: []
    };
  }

  return context;
}

/**
 * Hook for performance measurement
 */
export function usePerformanceMeasure(name: string) {
  const { logMetric } = useDevTools();
  const startTime = useRef<number>(0);

  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const end = useCallback(() => {
    if (startTime.current > 0) {
      const duration = performance.now() - startTime.current;
      logMetric(name, duration, 'ms', 'custom');
      startTime.current = 0;
    }
  }, [name, logMetric]);

  return { start, end };
}

/**
 * Hook for action logging
 */
export function useActionLogger(source: string) {
  const { logAction } = useDevTools();

  return useCallback((type: string, payload?: unknown) => {
    logAction(type, payload, source);
  }, [logAction, source]);
}

export default DevToolsProvider;
