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
import { DevToolsPanel } from './devtools-panel';

import type {
  ActionLog,
  ConsoleEntry,
  DevToolsContextValue,
  DevToolsProviderProps,
  DevToolsTab,
  NetworkRequest,
  PerformanceMetric,
  StateSnapshot,
} from './devtools-types';
export type {
  ActionLog,
  ConsoleEntry,
  DevToolsContextValue,
  DevToolsProviderProps,
  DevToolsTab,
  NetworkRequest,
  PerformanceMetric,
  StateSnapshot,
} from './devtools-types';

export const DevToolsContext = createContext<DevToolsContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================


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
