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
  Minimize2,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  Send,
  Bot,
  User,
  Zap,
  FileCode,
  Wrench,
  Lightbulb,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  ChevronUp,
  Code2,
  BookOpen,
  Rocket,
  Shield,
  Wand2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type DevToolsTab = 'state' | 'actions' | 'performance' | 'network' | 'console' | 'ai-help';

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
  category?: 'runtime' | 'network' | 'typescript' | 'react' | 'nextjs' | 'general';
  suggestion?: string;
}

// AI Chat Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'code' | 'error-analysis' | 'quick-action';
}

type QuickAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
};

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
    { id: 'console', label: 'Console', icon: <Terminal className="w-4 h-4" />, count: ctx.console.length },
    { id: 'ai-help', label: 'ARIA', icon: <Wand2 className="w-4 h-4" />, count: ctx.console.filter(e => e.level === 'error').length }
  ];
  
  return (
    <>
      {/* Floating Toggle Button - Professional AAA Style */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-4 right-4 z-50"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 blur-lg opacity-40" />
          
          <motion.button
            onClick={toggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl hover:from-indigo-500 hover:to-purple-500 transition-all border border-white/10"
            title="Open DevTools (Ctrl+Shift+D)"
          >
            <Bug className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">DevTools</span>
            <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
              ⌃⇧D
            </kbd>
          </motion.button>
        </motion.div>
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
                {activeTab === 'ai-help' && <AIHelpTab errors={ctx.console.filter(e => e.level === 'error')} />}
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
// ARIA - Aethel Runtime Intelligence Assistant
// Advanced AI-powered debugging and development assistance
// ============================================================================

function AIHelpTab({ errors }: { errors: ConsoleEntry[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [errorFilter, setErrorFilter] = useState<'all' | 'runtime' | 'typescript' | 'network'>('all');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Categorize errors
  const categorizedErrors = useMemo(() => {
    return errors.map(err => ({
      ...err,
      category: categorizeError(err.message)
    }));
  }, [errors]);
  
  const filteredErrors = useMemo(() => {
    if (errorFilter === 'all') return categorizedErrors;
    return categorizedErrors.filter(e => e.category === errorFilter);
  }, [categorizedErrors, errorFilter]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aria_chat_history', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);
  
  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('aria_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch {}
    }
  }, []);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: generateARIAResponse(userMessage.content, errors),
        timestamp: Date.now(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 800 + Math.random() * 400);
  };
  
  const handleQuickAction = (actionId: string) => {
    setActiveQuickAction(actionId);
    let response = '';
    
    switch (actionId) {
      case 'analyze-errors':
        if (errors.length === 0) {
          response = '✅ **Sistema Saudável**\n\nNenhum erro detectado no console. Seu projeto está funcionando corretamente!\n\n**Próximos passos sugeridos:**\n• Verificar performance no tab Performance\n• Analisar requests de rede\n• Testar fluxos críticos';
        } else {
          const byCategory = categorizedErrors.reduce((acc, e) => {
            const cat = e.category || 'general';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          response = `🔍 **Análise Completa de Erros**\n\n**Resumo:** ${errors.length} erro(s) encontrado(s)\n\n`;
          Object.entries(byCategory).forEach(([cat, count]) => {
            const emoji = cat === 'typescript' ? '📘' : cat === 'runtime' ? '⚡' : cat === 'network' ? '🌐' : '📋';
            response += `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${count}\n`;
          });
          response += `\n**Top 3 Erros Críticos:**\n`;
          errors.slice(0, 3).forEach((e, i) => {
            response += `\n${i + 1}. \`${e.message.substring(0, 80)}...\`\n   💡 ${getSuggestionForError(e.message)}\n`;
          });
        }
        break;
        
      case 'performance-tips':
        response = `🚀 **Dicas de Performance para Next.js 14**

**1. Componentes**
• Use \`React.memo()\` para componentes pesados
• Implemente \`useMemo\` e \`useCallback\` estrategicamente
• Evite re-renders desnecessários

**2. Carregamento**
• Use \`next/dynamic\` para code splitting
• Implemente Suspense boundaries
• Lazy load imagens com \`next/image\`

**3. Build**
• Analise bundle com \`@next/bundle-analyzer\`
• Remova dependências não utilizadas
• Use tree-shaking efetivamente

**4. Runtime**
• Evite blocking no main thread
• Use Web Workers para operações pesadas
• Implemente Service Workers para cache

Quer uma análise específica do seu projeto?`;
        break;
        
      case 'check-deps':
        response = `📦 **Verificação de Dependências**

**Next.js 14.2.35** ✅ Atualizado

**Verificações Recomendadas:**
\`\`\`bash
npm outdated          # Ver pacotes desatualizados
npm audit            # Verificar vulnerabilidades
npx depcheck         # Encontrar deps não usadas
\`\`\`

**Dicas:**
• Mantenha React e Next.js sincronizados
• Use \`--legacy-peer-deps\` se houver conflitos
• Verifique changelogs antes de atualizar majors

**Comandos úteis:**
\`\`\`bash
npm update           # Atualizar patches/minors
npm install pkg@latest  # Atualizar específico
\`\`\``;
        break;
        
      case 'code-snippets':
        response = `📝 **Snippets Úteis para Aethel**

**1. Componente com Loading State:**
\`\`\`tsx
'use client';
import { useState, useEffect } from 'react';

export function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);
  
  if (loading) return <Skeleton />;
  return <DataView data={data} />;
}
\`\`\`

**2. API Route com Error Handling:**
\`\`\`tsx
export async function GET(req: Request) {
  try {
    const data = await fetchFromDB();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
\`\`\`

**3. Custom Hook:**
\`\`\`tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
\`\`\``;
        break;
        
      case 'dev-bypass':
        response = `🔓 **Modo Desenvolvimento - Bypass Auth**

**Para testar interfaces sem login:**

1. **Query Parameter:**
   Adicione \`?devMode=true\` na URL:
   \`http://localhost:3000/dashboard?devMode=true\`

2. **Cookie Manual:**
   No DevTools Console:
   \`\`\`js
   document.cookie = "dev_bypass=true; path=/";
   \`\`\`

3. **Middleware já permite em dev:**
   Se \`JWT_SECRET\` não está configurado, o middleware permite acesso em desenvolvimento.

**⚠️ Importante:**
• Funciona apenas em \`NODE_ENV=development\`
• Nunca use em produção
• Logs de warning aparecerão no console

**Páginas para testar:**
• /dashboard - Painel principal
• /editor-hub - Hub de editores
• /level-editor - Editor de níveis
• /visual-script - Script visual`;
        break;
        
      case 'clear-chat':
        setMessages([]);
        localStorage.removeItem('aria_chat_history');
        response = '🗑️ Chat limpo! Como posso ajudar?';
        break;
        
      default:
        response = 'Ação não reconhecida.';
    }
    
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      type: 'quick-action'
    }]);
    
    setTimeout(() => setActiveQuickAction(null), 300);
  };

  const quickActions: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'analyze-errors', label: 'Analisar Erros', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-red-400' },
    { id: 'performance-tips', label: 'Performance', icon: <Rocket className="w-3.5 h-3.5" />, color: 'text-green-400' },
    { id: 'check-deps', label: 'Dependências', icon: <Package className="w-3.5 h-3.5" />, color: 'text-blue-400' },
    { id: 'code-snippets', label: 'Snippets', icon: <Code2 className="w-3.5 h-3.5" />, color: 'text-purple-400' },
    { id: 'dev-bypass', label: 'Dev Mode', icon: <Shield className="w-3.5 h-3.5" />, color: 'text-yellow-400' },
    { id: 'clear-chat', label: 'Limpar', icon: <Trash2 className="w-3.5 h-3.5" />, color: 'text-slate-400' },
  ];
  
  return (
    <div className="h-full flex">
      {/* Left Panel - Errors & Quick Actions */}
      <div className="w-80 border-r border-slate-700 flex flex-col bg-slate-900/50">
        {/* ARIA Header */}
        <div className="p-3 border-b border-slate-700 bg-gradient-to-r from-violet-900/30 to-indigo-900/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-wide">ARIA</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium">AI</span>
              </div>
              <p className="text-[10px] text-slate-400">Aethel Runtime Intelligence</p>
            </div>
          </div>
        </div>
        
        {/* Quick Actions Grid */}
        <div className="p-2 border-b border-slate-700">
          <p className="text-[10px] text-slate-500 mb-2 px-1">AÇÕES RÁPIDAS</p>
          <div className="grid grid-cols-3 gap-1">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  activeQuickAction === action.id 
                    ? 'bg-violet-600 scale-95' 
                    : 'bg-slate-800/50 hover:bg-slate-700/50'
                }`}
              >
                <span className={action.color}>{action.icon}</span>
                <span className="text-[9px] text-slate-400">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Error Filters */}
        <div className="p-2 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-slate-300">Erros</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
              {filteredErrors.length}
            </span>
          </div>
          <div className="flex gap-1">
            {(['all', 'runtime', 'typescript', 'network'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setErrorFilter(filter)}
                className={`flex-1 text-[9px] py-1 rounded transition-colors ${
                  errorFilter === filter 
                    ? 'bg-violet-600 text-white' 
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                {filter === 'all' ? 'Todos' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Errors List */}
        <div className="flex-1 overflow-auto">
          {filteredErrors.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500/30" />
              <p className="text-xs text-slate-500">Nenhum erro detectado</p>
              <p className="text-[10px] text-slate-600 mt-1">Seu código está saudável!</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {filteredErrors.slice(0, 15).map((error, idx) => (
                <div
                  key={error.id}
                  className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-red-500/30 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 flex-shrink-0 ${
                      error.category === 'typescript' ? 'text-blue-400' :
                      error.category === 'runtime' ? 'text-orange-400' :
                      error.category === 'network' ? 'text-cyan-400' : 'text-red-400'
                    }`}>
                      {error.category === 'typescript' ? <FileCode className="w-3 h-3" /> :
                       error.category === 'runtime' ? <Zap className="w-3 h-3" /> :
                       error.category === 'network' ? <Network className="w-3 h-3" /> :
                       <XCircle className="w-3 h-3" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-red-300 line-clamp-2 group-hover:text-red-200">
                        {error.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-slate-500">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                        {error.source && (
                          <span className="text-[9px] text-slate-600 truncate max-w-[80px]">
                            {error.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-700/50">
                    <button
                      onClick={() => {
                        setInputValue(`Explique e resolva: ${error.message}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600/20 hover:bg-violet-600/40 rounded text-[10px] text-violet-300 transition-colors"
                      title="Enviar para ARIA analisar"
                    >
                      <Send className="w-3 h-3" />
                      <span>Enviar para ARIA</span>
                    </button>
                    <button
                      onClick={() => {
                        const errorText = `[${error.category || 'error'}] ${error.message}${error.source ? `\nSource: ${error.source}` : ''}${error.stack ? `\nStack: ${error.stack}` : ''}`;
                        navigator.clipboard.writeText(errorText);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded text-[10px] text-slate-400 transition-colors"
                      title="Copiar erro"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Export Button */}
        <div className="p-2 border-t border-slate-700">
          <button
            onClick={() => {
              const exportData = {
                timestamp: new Date().toISOString(),
                errors: errors.slice(0, 50),
                chatHistory: messages,
              };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `aria-debug-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-slate-400 text-xs transition-colors"
          >
            <Download className="w-3 h-3" />
            Exportar Diagnóstico
          </button>
        </div>
      </div>
      
      {/* Right Panel - Chat */}
      <div className="flex-1 flex flex-col bg-slate-900/30">
        {/* Chat Header */}
        <div className="p-3 border-b border-slate-700 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-300">Chat com ARIA</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-1.5 rounded transition-colors ${showHistory ? 'bg-violet-600' : 'hover:bg-slate-700'}`}
                title="Histórico"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => {
                  const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
                  navigator.clipboard.writeText(text);
                }}
                className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                title="Copiar conversa"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center">
                  <Wand2 className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Olá! Sou a ARIA</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Assistente de Runtime Inteligente do Aethel. Use as ações rápidas ou pergunte qualquer coisa!
                </p>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {[
                    { icon: <Zap className="w-4 h-4 text-red-400" />, text: 'Diagnosticar erros automaticamente' },
                    { icon: <Rocket className="w-4 h-4 text-green-400" />, text: 'Otimizar performance do projeto' },
                    { icon: <Code2 className="w-4 h-4 text-blue-400" />, text: 'Gerar snippets de código' },
                    { icon: <Shield className="w-4 h-4 text-yellow-400" />, text: 'Configurar modo desenvolvimento' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                      {item.icon}
                      <span className="text-[11px] text-slate-400">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                    <Wand2 className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white px-4 py-2.5'
                      : 'bg-slate-800/70 text-slate-200 px-4 py-3 border border-slate-700/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                    {msg.content.split('```').map((part, idx) => {
                      if (idx % 2 === 1) {
                        const lines = part.split('\n');
                        const lang = lines[0] || 'code';
                        const code = lines.slice(1).join('\n');
                        return (
                          <div key={idx} className="my-2 rounded-lg bg-slate-900/80 border border-slate-700 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 border-b border-slate-700">
                              <span className="text-[10px] text-slate-500 font-mono">{lang}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(code)}
                                className="text-slate-500 hover:text-slate-300"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <pre className="p-3 text-[11px] text-green-300 font-mono overflow-x-auto">
                              {code}
                            </pre>
                          </div>
                        );
                      }
                      return <span key={idx}>{part}</span>;
                    })}
                  </div>
                  <p className="text-[10px] opacity-40 mt-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Wand2 className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              <div className="bg-slate-800/70 px-4 py-3 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-500">ARIA está pensando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="p-3 border-t border-slate-700 bg-slate-800/30">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Pergunte à ARIA sobre erros, código, performance..."
                className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 focus:outline-none transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-600">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Enter</kbd>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white transition-all shadow-lg shadow-violet-500/20 disabled:shadow-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Categorize errors
function categorizeError(message: string): 'runtime' | 'typescript' | 'network' | 'general' {
  const lower = message.toLowerCase();
  if (lower.includes('type') || lower.includes('typescript') || lower.includes('ts') || lower.includes('cannot find name') || lower.includes('property') && lower.includes('does not exist')) {
    return 'typescript';
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('cors') || lower.includes('http') || lower.includes('api') || lower.includes('request')) {
    return 'network';
  }
  if (lower.includes('runtime') || lower.includes('undefined') || lower.includes('null') || lower.includes('reference') || lower.includes('syntax')) {
    return 'runtime';
  }
  return 'general';
}

// Helper: Get suggestion for error
function getSuggestionForError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('cannot find name')) return 'Verifique se o import está correto';
  if (lower.includes('undefined')) return 'Adicione verificação de null/undefined';
  if (lower.includes('cors')) return 'Configure headers CORS no servidor';
  if (lower.includes('fetch failed')) return 'Verifique a URL e conexão de rede';
  if (lower.includes('type')) return 'Verifique os tipos TypeScript';
  if (lower.includes('hydration')) return 'Evite diferenças entre server e client';
  return 'Clique para análise detalhada';
}

// Helper: Generate ARIA responses
function generateARIAResponse(userMessage: string, errors: ConsoleEntry[]): string {
  const lower = userMessage.toLowerCase();
  
  // Error analysis
  if (lower.includes('erro') || lower.includes('error') || lower.includes('resolve') || lower.includes('explique')) {
    if (lower.includes(':')) {
      const errorPart = userMessage.split(':').slice(1).join(':').trim();
      return `🔍 **Análise do Erro**

\`\`\`
${errorPart.substring(0, 150)}
\`\`\`

**Diagnóstico:**
${getSuggestionForError(errorPart)}

**Possíveis Causas:**
1. Import ou declaração ausente
2. Tipo incorreto ou incompatível
3. Dependência não instalada

**Solução Sugerida:**
\`\`\`typescript
// Verifique se o import existe
import { ComponenteOuFuncao } from './caminho/correto';

// Ou declare o tipo se necessário
declare const variavel: TipoEsperado;
\`\`\`

**Próximos Passos:**
• Verifique o arquivo mencionado no erro
• Confirme que todas as dependências estão instaladas
• Reinicie o servidor de desenvolvimento

Precisa de mais detalhes?`;
    }
    
    if (errors.length > 0) {
      return `📋 **${errors.length} Erro(s) Encontrado(s)**

Erro mais recente:
\`\`\`
${errors[0].message.substring(0, 200)}
\`\`\`

**Sugestão:** ${getSuggestionForError(errors[0].message)}

Clique em um erro específico na lista à esquerda para uma análise detalhada, ou use a ação rápida "Analisar Erros" para um diagnóstico completo.`;
    }
    
    return '✅ Não encontrei erros ativos no console. Se você está vendo um erro específico, cole a mensagem aqui para eu analisar.';
  }
  
  // Performance questions
  if (lower.includes('performance') || lower.includes('lento') || lower.includes('otimizar') || lower.includes('rápido')) {
    return `🚀 **Otimização de Performance**

**Para Next.js 14:**

1. **Server Components** (padrão)
   Use \`'use client'\` apenas quando necessário

2. **Image Optimization**
   \`\`\`tsx
   import Image from 'next/image';
   <Image src="/img.jpg" width={800} height={600} priority />
   \`\`\`

3. **Dynamic Imports**
   \`\`\`tsx
   const HeavyComponent = dynamic(() => import('./Heavy'), {
     loading: () => <Skeleton />
   });
   \`\`\`

4. **Caching**
   \`\`\`tsx
   // Em route handlers
   export const revalidate = 3600; // 1 hora
   \`\`\`

Use a ação rápida "Performance" para mais dicas!`;
  }
  
  // How to / Implementation
  if (lower.includes('como') || lower.includes('implementar') || lower.includes('criar') || lower.includes('fazer')) {
    return `💡 **Guia de Implementação**

Para ajudar melhor, preciso entender:

1. **O que você quer criar?**
   • Componente UI
   • API Route
   • Funcionalidade específica

2. **Contexto atual**
   • Quais tecnologias está usando?
   • Tem código existente relacionado?

3. **Comportamento esperado**
   • Como deve funcionar?
   • Quais são os inputs/outputs?

**Dica:** Seja específico! Por exemplo:
• "Como criar um modal com animação"
• "Como fazer upload de arquivos"
• "Como conectar com API externa"

Me dê mais detalhes e eu forneço código pronto para usar!`;
  }
  
  // Login / Auth bypass
  if (lower.includes('login') || lower.includes('auth') || lower.includes('bypass') || lower.includes('testar')) {
    return `🔓 **Modo Desenvolvimento**

Para testar interfaces sem autenticação:

**Opção 1: Rotas Públicas**
As seguintes rotas não requerem login:
• \`/\` - Landing page
• \`/login\` - Página de login
• \`/register\` - Registro

**Opção 2: Dev Bypass**
O middleware permite acesso em dev quando:
• \`JWT_SECRET\` não está configurado
• \`NODE_ENV=development\`

**Opção 3: Cookie Fake (DevTools Console)**
\`\`\`javascript
// Cria sessão fake para desenvolvimento
document.cookie = "token=dev-test-token; path=/";
location.reload();
\`\`\`

⚠️ Lembre-se: isso funciona apenas em desenvolvimento local!`;
  }
  
  // Default response
  return `Entendi sua pergunta sobre "${userMessage.substring(0, 40)}${userMessage.length > 40 ? '...' : ''}"

**Como posso ajudar:**
• 🔍 Analisar erros específicos
• 🚀 Sugerir otimizações
• 📝 Gerar código
• 🔧 Configurar ambiente

**Dica:** Use as ações rápidas à esquerda ou seja mais específico na sua pergunta.

Por exemplo:
• "Como resolver erro de hydration?"
• "Otimize este componente para performance"
• "Crie um hook de debounce"`;
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
