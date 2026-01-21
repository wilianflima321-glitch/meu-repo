/**
 * AETHEL ENGINE - WebSocket React Hooks
 * 
 * Hooks React para consumo de eventos WebSocket em tempo real.
 * Conecta o frontend aos eventos de render, saúde do sistema, e IA.
 * 
 * Features:
 * - useRenderProgress - Progresso de renderização
 * - useSystemHealth - Monitoramento de saúde
 * - useAIProgress - Progresso de geração IA
 * - useProjectSync - Sincronização de projeto
 * - Auto-reconexão e heartbeat
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempt: number;
  lastHeartbeat: Date | null;
}

export interface RenderProgress {
  jobId: string;
  status: 'queued' | 'preparing' | 'rendering' | 'compositing' | 'complete' | 'failed';
  progress: number; // 0-100
  currentFrame?: number;
  totalFrames?: number;
  eta?: number; // segundos
  preview?: string; // base64
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SystemHealth {
  cpu: {
    usage: number;
    temperature?: number;
    cores: { usage: number }[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  gpu?: {
    usage: number;
    memory: number;
    temperature?: number;
    name: string;
  };
  disk: {
    read: number;
    write: number;
    usage: number;
  };
  network: {
    latency: number;
    bandwidth: { up: number; down: number };
  };
  processes: {
    blender: boolean;
    ollama: boolean;
    renderQueue: number;
  };
}

export interface AIProgress {
  requestId: string;
  type: 'text' | 'code' | 'image' | 'audio';
  status: 'processing' | 'streaming' | 'complete' | 'error';
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  progress?: number;
  streamedContent?: string;
  error?: string;
}

export interface ProjectSyncEvent {
  type: 'file-changed' | 'file-created' | 'file-deleted' | 'scene-updated';
  path: string;
  timestamp: string;
  userId?: string;
  content?: string;
}

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private connectionState: ConnectionState = {
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempt: 0,
    lastHeartbeat: null
  };
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      debug: false,
      ...config
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    this.updateState({ connecting: true, error: null });
    
    try {
      this.ws = new WebSocket(this.config.url);
      
      this.ws.onopen = () => {
        this.log('Connected');
        this.updateState({ 
          connected: true, 
          connecting: false, 
          reconnectAttempt: 0,
          lastHeartbeat: new Date()
        });
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          this.log('Failed to parse message', e);
        }
      };

      this.ws.onerror = (error) => {
        this.log('WebSocket error', error);
        this.updateState({ error: 'Connection error' });
      };

      this.ws.onclose = (event) => {
        this.log('Disconnected', event.code, event.reason);
        this.updateState({ connected: false, connecting: false });
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch (error) {
      this.updateState({ 
        connecting: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      });
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateState({ connected: false, connecting: false });
  }

  subscribe<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (data: any) => void);
    
    return () => {
      this.listeners.get(event)?.delete(callback as (data: any) => void);
    };
  }

  send(event: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  onStateChange(callback: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(callback);
    callback(this.connectionState);
    return () => this.stateListeners.delete(callback);
  }

  getState(): ConnectionState {
    return { ...this.connectionState };
  }

  private handleMessage(message: { event: string; data: any }): void {
    if (message.event === 'pong') {
      this.updateState({ lastHeartbeat: new Date() });
      return;
    }
    
    const listeners = this.listeners.get(message.event);
    if (listeners) {
      listeners.forEach(callback => callback(message.data));
    }
    
    // Broadcast to wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => callback(message));
    }
  }

  private scheduleReconnect(): void {
    if (this.connectionState.reconnectAttempt >= this.config.reconnectAttempts) {
      this.updateState({ error: 'Max reconnection attempts reached' });
      return;
    }

    const delay = this.config.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempt);
    this.log(`Reconnecting in ${delay}ms...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.updateState({ reconnectAttempt: this.connectionState.reconnectAttempt + 1 });
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', { timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private updateState(partial: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...partial };
    this.stateListeners.forEach(callback => callback(this.connectionState));
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WS]', ...args);
    }
  }
}

// ============================================================================
// SINGLETON MANAGER
// ============================================================================

let globalManager: WebSocketManager | null = null;

function getManager(config?: WebSocketConfig): WebSocketManager {
  if (!globalManager && config) {
    globalManager = new WebSocketManager(config);
  }
  if (!globalManager) {
    throw new Error('WebSocket manager not initialized. Call useWebSocketInit first.');
  }
  return globalManager;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para inicializar a conexão WebSocket
 */
export function useWebSocketInit(config: WebSocketConfig): ConnectionState {
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempt: 0,
    lastHeartbeat: null
  });

  useEffect(() => {
    const manager = new WebSocketManager(config);
    globalManager = manager;
    
    const unsubscribe = manager.onStateChange(setState);
    manager.connect();

    return () => {
      unsubscribe();
      manager.disconnect();
      globalManager = null;
    };
  }, [config.url]);

  return state;
}

/**
 * Hook para obter o estado de conexão WebSocket
 */
export function useWebSocketState(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(() => {
    try {
      return getManager().getState();
    } catch {
      return {
        connected: false,
        connecting: false,
        error: 'Not initialized',
        reconnectAttempt: 0,
        lastHeartbeat: null
      };
    }
  });

  useEffect(() => {
    try {
      const manager = getManager();
      return manager.onStateChange(setState);
    } catch {
      // Manager not initialized yet
      return () => {};
    }
  }, []);

  return state;
}

/**
 * Hook para progresso de renderização
 */
export function useRenderProgress(jobId?: string): {
  jobs: Map<string, RenderProgress>;
  currentJob: RenderProgress | null;
  isRendering: boolean;
  cancelJob: (id: string) => void;
  pauseJob: (id: string) => void;
  resumeJob: (id: string) => void;
} {
  const [jobs, setJobs] = useState<Map<string, RenderProgress>>(new Map());
  
  useEffect(() => {
    try {
      const manager = getManager();
      
      return manager.subscribe<RenderProgress>('render:progress', (data) => {
        setJobs(prev => {
          const next = new Map(prev);
          next.set(data.jobId, data);
          
          // Limpar jobs completados após 1 minuto
          if (data.status === 'complete' || data.status === 'failed') {
            setTimeout(() => {
              setJobs(p => {
                const n = new Map(p);
                n.delete(data.jobId);
                return n;
              });
            }, 60000);
          }
          
          return next;
        });
      });
    } catch {
      return () => {};
    }
  }, []);

  const currentJob = useMemo(() => {
    if (jobId) return jobs.get(jobId) || null;
    // Retorna o primeiro job ativo
    for (const job of jobs.values()) {
      if (job.status !== 'complete' && job.status !== 'failed') {
        return job;
      }
    }
    return null;
  }, [jobs, jobId]);

  const isRendering = useMemo(() => {
    for (const job of jobs.values()) {
      if (job.status === 'rendering' || job.status === 'preparing' || job.status === 'compositing') {
        return true;
      }
    }
    return false;
  }, [jobs]);

  const cancelJob = useCallback((id: string) => {
    try {
      getManager().send('render:cancel', { jobId: id });
    } catch {}
  }, []);

  const pauseJob = useCallback((id: string) => {
    try {
      getManager().send('render:pause', { jobId: id });
    } catch {}
  }, []);

  const resumeJob = useCallback((id: string) => {
    try {
      getManager().send('render:resume', { jobId: id });
    } catch {}
  }, []);

  return { jobs, currentJob, isRendering, cancelJob, pauseJob, resumeJob };
}

/**
 * Hook para monitoramento de saúde do sistema
 */
export function useSystemHealth(pollingInterval = 5000): {
  health: SystemHealth | null;
  isHealthy: boolean;
  alerts: string[];
} {
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    try {
      const manager = getManager();
      
      // Subscribe to health updates
      const unsub = manager.subscribe<SystemHealth>('system:health', setHealth);
      
      // Request initial health data
      manager.send('system:health:request', { interval: pollingInterval });
      
      return unsub;
    } catch {
      return () => {};
    }
  }, [pollingInterval]);

  const { isHealthy, alerts } = useMemo(() => {
    if (!health) return { isHealthy: true, alerts: [] };
    
    const alerts: string[] = [];
    
    if (health.cpu.usage > 90) alerts.push('CPU usage critical (>90%)');
    if (health.memory.percentage > 85) alerts.push('Memory usage high (>85%)');
    if (health.gpu && health.gpu.usage > 95) alerts.push('GPU usage critical (>95%)');
    if (health.gpu?.temperature && health.gpu.temperature > 85) alerts.push('GPU temperature high');
    if (health.disk.usage > 95) alerts.push('Disk space low (<5%)');
    if (health.network.latency > 500) alerts.push('High network latency');
    
    return { isHealthy: alerts.length === 0, alerts };
  }, [health]);

  return { health, isHealthy, alerts };
}

/**
 * Hook para progresso de IA
 */
export function useAIProgress(requestId?: string): {
  requests: Map<string, AIProgress>;
  currentRequest: AIProgress | null;
  isProcessing: boolean;
  streamedContent: string;
  cancelRequest: (id: string) => void;
} {
  const [requests, setRequests] = useState<Map<string, AIProgress>>(new Map());

  useEffect(() => {
    try {
      const manager = getManager();
      
      return manager.subscribe<AIProgress>('ai:progress', (data) => {
        setRequests(prev => {
          const next = new Map(prev);
          const existing = next.get(data.requestId);
          
          // Merge streamed content
          if (existing?.streamedContent && data.streamedContent) {
            data.streamedContent = existing.streamedContent + data.streamedContent;
          }
          
          next.set(data.requestId, data);
          return next;
        });
      });
    } catch {
      return () => {};
    }
  }, []);

  const currentRequest = useMemo(() => {
    if (requestId) return requests.get(requestId) || null;
    for (const req of requests.values()) {
      if (req.status === 'processing' || req.status === 'streaming') {
        return req;
      }
    }
    return null;
  }, [requests, requestId]);

  const isProcessing = useMemo(() => {
    for (const req of requests.values()) {
      if (req.status === 'processing' || req.status === 'streaming') {
        return true;
      }
    }
    return false;
  }, [requests]);

  const streamedContent = useMemo(() => {
    return currentRequest?.streamedContent || '';
  }, [currentRequest]);

  const cancelRequest = useCallback((id: string) => {
    try {
      getManager().send('ai:cancel', { requestId: id });
    } catch {}
  }, []);

  return { requests, currentRequest, isProcessing, streamedContent, cancelRequest };
}

/**
 * Hook para sincronização de projeto em tempo real
 */
export function useProjectSync(projectId: string): {
  events: ProjectSyncEvent[];
  lastSync: Date | null;
  subscribeToFile: (path: string) => () => void;
  broadcastChange: (event: Omit<ProjectSyncEvent, 'timestamp'>) => void;
} {
  const [events, setEvents] = useState<ProjectSyncEvent[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const subscribedFilesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const manager = getManager();
      
      // Join project room
      manager.send('project:join', { projectId });
      
      const unsub = manager.subscribe<ProjectSyncEvent>('project:sync', (data) => {
        setEvents(prev => [data, ...prev.slice(0, 99)]); // Keep last 100
        setLastSync(new Date());
      });
      
      return () => {
        unsub();
        manager.send('project:leave', { projectId });
      };
    } catch {
      return () => {};
    }
  }, [projectId]);

  const subscribeToFile = useCallback((path: string) => {
    try {
      const manager = getManager();
      subscribedFilesRef.current.add(path);
      manager.send('project:watch', { projectId, path });
      
      return () => {
        subscribedFilesRef.current.delete(path);
        manager.send('project:unwatch', { projectId, path });
      };
    } catch {
      return () => {};
    }
  }, [projectId]);

  const broadcastChange = useCallback((event: Omit<ProjectSyncEvent, 'timestamp'>) => {
    try {
      getManager().send('project:change', {
        projectId,
        ...event,
        timestamp: new Date().toISOString()
      });
    } catch {}
  }, [projectId]);

  return { events, lastSync, subscribeToFile, broadcastChange };
}

/**
 * Hook para notificações em tempo real
 */
export function useNotifications(): {
  notifications: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
} {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>>([]);

  useEffect(() => {
    try {
      const manager = getManager();
      
      return manager.subscribe('notification', (data: any) => {
        setNotifications(prev => [{
          id: data.id || crypto.randomUUID(),
          type: data.type || 'info',
          title: data.title,
          message: data.message,
          timestamp: new Date(),
          read: false
        }, ...prev]);
      });
    } catch {
      return () => {};
    }
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll };
}

/**
 * Hook para métricas de performance em tempo real
 */
export function usePerformanceMetrics(): {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  memory: {
    geometries: number;
    textures: number;
    total: number;
  };
} {
  const [metrics, setMetrics] = useState({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    memory: {
      geometries: 0,
      textures: 0,
      total: 0
    }
  });

  useEffect(() => {
    try {
      const manager = getManager();
      
      return manager.subscribe('performance:metrics', (data: any) => {
        setMetrics(data);
      });
    } catch {
      return () => {};
    }
  }, []);

  return metrics;
}

/**
 * Hook genérico para eventos WebSocket customizados
 */
export function useWebSocketEvent<T>(eventName: string): {
  data: T | null;
  lastUpdate: Date | null;
  emit: (data: T) => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    try {
      const manager = getManager();
      
      return manager.subscribe<T>(eventName, (newData) => {
        setData(newData);
        setLastUpdate(new Date());
      });
    } catch {
      return () => {};
    }
  }, [eventName]);

  const emit = useCallback((emitData: T) => {
    try {
      getManager().send(eventName, emitData);
    } catch {}
  }, [eventName]);

  return { data, lastUpdate, emit };
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface WebSocketProviderProps {
  url: string;
  children: React.ReactNode;
  debug?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  url,
  children,
  debug = false,
  onConnect,
  onDisconnect,
  onError
}) => {
  const prevConnected = useRef(false);
  
  const state = useWebSocketInit({
    url,
    debug,
    reconnectAttempts: 10,
    reconnectDelay: 1000,
    heartbeatInterval: 30000
  });

  useEffect(() => {
    if (state.connected && !prevConnected.current) {
      onConnect?.();
    } else if (!state.connected && prevConnected.current) {
      onDisconnect?.();
    }
    prevConnected.current = state.connected;
  }, [state.connected, onConnect, onDisconnect]);

  useEffect(() => {
    if (state.error) {
      onError?.(state.error);
    }
  }, [state.error, onError]);

  return <>{children}</>;
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  WebSocketManager,
  getManager as getWebSocketManager
};

export default {
  WebSocketProvider,
  useWebSocketInit,
  useWebSocketState,
  useRenderProgress,
  useSystemHealth,
  useAIProgress,
  useProjectSync,
  useNotifications,
  usePerformanceMetrics,
  useWebSocketEvent
};
