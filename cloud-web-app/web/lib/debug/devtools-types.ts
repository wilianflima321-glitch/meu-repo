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

export interface DevToolsContextValue {
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

export interface DevToolsProviderProps {
  children: React.ReactNode
  enabled?: boolean
  maxEntries?: number
}
