/**
 * DevTools Provider - Development Tools System
 * 
 * Sistema profissional de ferramentas de desenvolvimento similar ao React DevTools.
 * Fornece inspeção de estado, histórico de ações, métricas de performance,
 * e debugging avançado para o Aethel Engine.
 * 
 * @module lib/debug/devtools-provider
 */

'use client';

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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  X,
  Activity,
  History,
  Settings,
  Layers,
  Database,
  Cpu,
  Network,
  Timer,
  ChevronRight,
  ChevronDown,
  Trash2,
  Download,
  Search,
  Pause,
  Play,
  RefreshCw,
  Copy,
  Terminal,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2
} from 'lucide-react';

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
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={toggle}
          className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-colors"
          title="Open DevTools (Ctrl+Shift+D)"
        >
          <Bug className="w-5 h-5" />
        </motion.button>
      )}
      
      {/* DevTools Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 shadow-2xl ${
              isMinimized ? 'h-12' : 'h-80'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 h-12 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Bug className="w-4 h-4" />
                  <span className="text-sm font-semibold">Aethel DevTools</span>
                </div>
                
                {!isMinimized && (
                  <div className="flex items-center">
                    {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            activeTab === tab.id ? 'bg-indigo-500' : 'bg-slate-600'
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
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-40 pl-7 pr-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded-md text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    
                    {/* Recording */}
                    <button
                      onClick={toggleRecording}
                      className={`p-1.5 rounded-md transition-colors ${
                        isRecording ? 'text-red-400 bg-red-500/20' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={isRecording ? 'Stop Recording' : 'Start Recording'}
                    >
                      {isRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    
                    {/* Clear */}
                    <button
                      onClick={clearAll}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                      title="Clear All"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Export */}
                    <button
                      onClick={exportLogs}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                      title="Export Logs"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                {/* Minimize */}
                <button
                  onClick={onMinimize}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-md transition-colors"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                
                {/* Close */}
                <button
                  onClick={toggle}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-md transition-colors"
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function StateTab({ snapshots, searchQuery }: { snapshots: StateSnapshot[]; searchQuery: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const filtered = snapshots.filter(s => 
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No state snapshots yet</p>
          <p className="text-xs mt-1">Use takeSnapshot() to capture state</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto p-2 space-y-1">
      {filtered.map(snapshot => (
        <div key={snapshot.id} className="bg-slate-800/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === snapshot.id ? null : snapshot.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/50 transition-colors"
          >
            {expandedId === snapshot.id ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-sm text-slate-200">{snapshot.label}</span>
            <span className="text-xs text-slate-500 ml-auto">
              {new Date(snapshot.timestamp).toLocaleTimeString()}
            </span>
          </button>
          {expandedId === snapshot.id && (
            <div className="px-3 pb-3">
              <pre className="text-xs text-slate-300 bg-slate-900 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(snapshot.state, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ActionsTab({ actions, searchQuery }: { actions: ActionLog[]; searchQuery: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const filtered = actions.filter(a => 
    a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.source.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No actions logged</p>
          <p className="text-xs mt-1">Use logAction() to log actions</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto p-2 space-y-1">
      {filtered.map(action => {
        const hasPayload = action.payload !== undefined && action.payload !== null;
        const payloadStr = hasPayload ? JSON.stringify(action.payload, null, 2) : '';
        
        return (
          <div key={action.id} className="bg-slate-800/50 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/50 transition-colors"
            >
              {expandedId === action.id ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-sm text-indigo-400 font-mono">{action.type}</span>
              <span className="text-xs text-slate-500">{action.source}</span>
              <span className="text-xs text-slate-500 ml-auto">
                {new Date(action.timestamp).toLocaleTimeString()}
              </span>
            </button>
            {expandedId === action.id && hasPayload && (
              <div className="px-3 pb-3">
                <pre className="text-xs text-slate-300 bg-slate-900 p-2 rounded overflow-auto max-h-40">
                  {payloadStr}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PerformanceTab({ metrics, searchQuery }: { metrics: PerformanceMetric[]; searchQuery: string }) {
  const filtered = metrics.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group by category
  const grouped = filtered.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = [];
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, PerformanceMetric[]>);
  
  const categoryIcons: Record<string, React.ReactNode> = {
    render: <Layers className="w-4 h-4" />,
    network: <Network className="w-4 h-4" />,
    memory: <Database className="w-4 h-4" />,
    cpu: <Cpu className="w-4 h-4" />,
    custom: <Timer className="w-4 h-4" />
  };
  
  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No performance metrics</p>
          <p className="text-xs mt-1">Metrics are collected automatically</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              {categoryIcons[category]}
              <span className="text-xs uppercase tracking-wide">{category}</span>
            </div>
            <div className="space-y-2">
              {items.slice(0, 5).map(metric => (
                <div key={metric.id} className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-300">{metric.name}</span>
                  <span className="text-sm font-mono text-indigo-400">
                    {metric.value.toFixed(1)} {metric.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkTab({ requests, searchQuery }: { requests: NetworkRequest[]; searchQuery: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const filtered = requests.filter(r => 
    r.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.method.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getStatusColor = (status?: number) => {
    if (!status) return 'text-slate-400';
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No network requests</p>
          <p className="text-xs mt-1">Use logNetwork() to log requests</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-800">
          <tr className="text-left text-slate-400">
            <th className="px-3 py-2">Method</th>
            <th className="px-3 py-2">URL</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Size</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(req => (
            <tr
              key={req.id}
              onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
              className="border-t border-slate-700/50 hover:bg-slate-800/50 cursor-pointer"
            >
              <td className="px-3 py-2 font-mono text-indigo-400">{req.method}</td>
              <td className="px-3 py-2 text-slate-300 max-w-xs truncate">{req.url}</td>
              <td className={`px-3 py-2 font-mono ${getStatusColor(req.status)}`}>
                {req.status || 'pending'}
              </td>
              <td className="px-3 py-2 text-slate-400">
                {req.duration ? `${req.duration}ms` : '-'}
              </td>
              <td className="px-3 py-2 text-slate-400">
                {req.size ? `${(req.size / 1024).toFixed(1)}KB` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsoleTab({ entries, searchQuery }: { entries: ConsoleEntry[]; searchQuery: string }) {
  const filtered = entries.filter(e => 
    e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.source?.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const levelColors: Record<string, string> = {
    log: 'text-slate-300',
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-purple-400'
  };
  
  const levelBgs: Record<string, string> = {
    log: 'bg-transparent',
    info: 'bg-blue-500/10',
    warn: 'bg-yellow-500/10',
    error: 'bg-red-500/10',
    debug: 'bg-purple-500/10'
  };
  
  if (filtered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No console entries</p>
          <p className="text-xs mt-1">Use log() to add entries</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto font-mono text-xs">
      {filtered.map(entry => (
        <div
          key={entry.id}
          className={`flex items-start gap-2 px-3 py-1.5 border-b border-slate-800 ${levelBgs[entry.level]}`}
        >
          <span className={`uppercase text-[10px] w-12 ${levelColors[entry.level]}`}>
            [{entry.level}]
          </span>
          <span className={`flex-1 ${levelColors[entry.level]}`}>{entry.message}</span>
          {entry.source && (
            <span className="text-slate-500">{entry.source}</span>
          )}
          <span className="text-slate-500">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}

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
