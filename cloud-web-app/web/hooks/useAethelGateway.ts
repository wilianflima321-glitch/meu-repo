/**
 * AETHEL ENGINE - REACT HOOKS FOR WEBSOCKET
 * ==========================================
 * 
 * Hooks para conectar componentes React com o Unified Gateway.
 * 
 * Hooks disponíveis:
 * - useAethelConnection: Conexão base com o Gateway
 * - useRenderProgress: Progresso de renderização em tempo real
 * - useSystemHealth: Saúde do sistema e serviços
 * - useJobQueue: Fila de jobs
 * - useDiskUsage: Uso de disco
 * - useCollaboration: Colaboração em tempo real (Yjs)
 * - useAssetDownload: Downloads com progresso
 * - useBridge: Comandos para Local Bridge
 */

'use client';

import { 
    useState, 
    useEffect, 
    useCallback, 
    useRef, 
    useMemo,
    createElement,
    createContext,
    useContext,
    ReactNode
} from 'react';
import { createComponentLogger } from '@/lib/observability/logger';

import type {
    AwarenessState,
    BridgeData,
    BridgeResult,
    ConnectionState,
    DiskUsage,
    DownloadProgress,
    GatewayEventCallback,
    GatewayMessage,
    GatewayPayload,
    GatewayRequestPayload,
    HealthAlert,
    HealthDashboardState,
    Job,
    PendingGatewayRequest,
    RenderProgress,
    ServiceHealth,
    SystemMetrics,
} from './aethel-gateway-types';

export type {
    ConnectionState,
    DiskUsage,
    DownloadProgress,
    HealthAlert,
    HealthDashboardState,
    Job,
    RenderProgress,
    ServiceHealth,
    SystemMetrics,
} from './aethel-gateway-types';

// ============================================================================
// GATEWAY CONNECTION CONTEXT
// ============================================================================

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL?.trim() || null;
const logger = createComponentLogger('aethel-gateway');

function getGatewayHttpUrl(): string | null {
    return GATEWAY_URL ? GATEWAY_URL.replace(/^ws/, 'http') : null;
}

function getGatewayWsBaseUrl(): string | null {
    return GATEWAY_URL ? GATEWAY_URL.replace(/\/events$/, '') : null;
}

interface GatewayContextValue {
    ws: WebSocket | null;
    connected: boolean;
    send: (data: GatewayPayload) => void;
    subscribe: <T = GatewayPayload>(event: string, callback: (data: T) => void) => () => void;
    request: <T>(type: string, payload?: GatewayRequestPayload) => Promise<T>;
}

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function GatewayProvider({ children }: { children: ReactNode }) {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const listenersRef = useRef<Map<string, Set<GatewayEventCallback>>>(new Map());
    const pendingRequestsRef = useRef<Map<string, PendingGatewayRequest>>(new Map());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    
    const connect = useCallback(() => {
        if (!GATEWAY_URL) {
            logger.info('Gateway URL not configured; realtime bridge remains held');
            return;
        }

        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        
        try {
            const ws = new WebSocket(`${GATEWAY_URL}/events?subscribe=*`);
            wsRef.current = ws;
            
            ws.onopen = () => {
                setConnected(true);
                reconnectAttemptsRef.current = 0;
                logger.info('Connected to Aethel Gateway');
            };
            
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data) as GatewayMessage;
                    
                    // Handle request response
                    if (msg.requestId && pendingRequestsRef.current.has(msg.requestId)) {
                        const { resolve, timeout } = pendingRequestsRef.current.get(msg.requestId)!;
                        clearTimeout(timeout);
                        pendingRequestsRef.current.delete(msg.requestId);
                        resolve(msg.payload || msg.data);
                        return;
                    }
                    
                    // Handle event
                    const eventType = msg.event || msg.type;
                    if (eventType) {
                        listenersRef.current.get(eventType)?.forEach(cb => cb(msg.data || msg.payload || msg));
                        listenersRef.current.get('*')?.forEach(cb => cb({ event: eventType, data: msg.data || msg.payload }));
                    }
                } catch (err) {
                    logger.error('Gateway message parse error', err);
                }
            };
            
            ws.onclose = () => {
                setConnected(false);
                wsRef.current = null;
                
                // Schedule reconnect
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                reconnectAttemptsRef.current++;
                
                if (reconnectAttemptsRef.current < 10) {
                    logger.warn(`Reconnecting in ${delay}ms...`);
                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                }
            };
            
            ws.onerror = (err) => {
                logger.error('Gateway WebSocket error', err);
            };
        } catch (err) {
            logger.error('Failed to connect to Gateway', err);
        }
    }, []);
    
    useEffect(() => {
        connect();
        
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            wsRef.current?.close();
        };
    }, [connect]);
    
    const send = useCallback((data: GatewayPayload) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);
    
    const subscribe = useCallback(<T,>(event: string, callback: (data: T) => void) => {
        if (!listenersRef.current.has(event)) {
            listenersRef.current.set(event, new Set());
        }
        const wrapped: GatewayEventCallback = (data) => callback(data as T);
        listenersRef.current.get(event)!.add(wrapped);
        
        return () => {
            listenersRef.current.get(event)?.delete(wrapped);
        };
    }, []);
    
    const request = useCallback(<T,>(type: string, payload?: GatewayRequestPayload): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                reject(new Error(GATEWAY_URL ? 'Not connected' : 'Gateway URL not configured'));
                return;
            }
            
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
            
            const timeout = setTimeout(() => {
                pendingRequestsRef.current.delete(requestId);
                reject(new Error('Request timeout'));
            }, 30000);
            
            pendingRequestsRef.current.set(requestId, { resolve: resolve as (value: unknown) => void, reject, timeout });
            
            wsRef.current.send(JSON.stringify({ type, payload, requestId }));
        });
    }, []);
    
    const value = useMemo(() => ({
        ws: wsRef.current,
        connected,
        send,
        subscribe,
        request
    }), [connected, send, subscribe, request]);

    return createElement(GatewayContext.Provider, { value }, children);
}

function useGateway(): GatewayContextValue {
    const context = useContext(GatewayContext);
    if (!context) {
        throw new Error('useGateway must be used within GatewayProvider');
    }
    return context;
}

// ============================================================================
// useAethelConnection
// ============================================================================

export function useAethelConnection(): ConnectionState & {
    reconnect: () => void;
} {
    const { connected, ws } = useGateway();
    const [latency, setLatency] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [reconnecting, setReconnecting] = useState(false);
    
    useEffect(() => {
        // Ping to measure latency
        const pingInterval = setInterval(async () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;
            
            const start = Date.now();
            try {
                await fetch(`${gatewayHttpUrl}/api/health`);
                setLatency(Date.now() - start);
                setError(null);
            } catch {
                setError('Connection error');
            }
        }, 5000);
        
        return () => clearInterval(pingInterval);
    }, [ws]);
    
    const reconnect = useCallback(() => {
        setReconnecting(true);
        ws?.close();
        // Will auto-reconnect via the provider
        setTimeout(() => setReconnecting(false), 2000);
    }, [ws]);
    
    return {
        connected,
        reconnecting,
        error,
        latency,
        reconnect
    };
}

// ============================================================================
// useRenderProgress
// ============================================================================

export function useRenderProgress(jobId?: string): {
    renders: RenderProgress[];
    currentRender: RenderProgress | null;
    cancelRender: (id: string) => Promise<void>;
} {
    const { subscribe, request } = useGateway();
    const [renders, setRenders] = useState<RenderProgress[]>([]);
    
    useEffect(() => {
        // Fetch initial state
        request<{ active: RenderProgress[] }>('render:list')
            .then(data => {
                if (data?.active) {
                    setRenders(data.active);
                }
            })
            .catch(() => {});
        
        // Subscribe to updates
        const unsub1 = subscribe('render:progress', (progress: RenderProgress) => {
            setRenders(prev => {
                const idx = prev.findIndex(r => r.jobId === progress.jobId);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = progress;
                    return updated;
                }
                return [...prev, progress];
            });
        });
        
        const unsub2 = subscribe('render:complete', (result: { jobId: string; path: string }) => {
            setRenders(prev => prev.map(r => 
                r.jobId === result.jobId 
                    ? { ...r, status: 'complete' as const, progress: 100, output: result.path }
                    : r
            ));
        });
        
        const unsub3 = subscribe('render:failed', (error: { jobId: string; error: string }) => {
            setRenders(prev => prev.map(r => 
                r.jobId === error.jobId 
                    ? { ...r, status: 'failed' as const, error: error.error }
                    : r
            ));
        });
        
        return () => {
            unsub1();
            unsub2();
            unsub3();
        };
    }, [subscribe, request]);
    
    const currentRender = useMemo(() => {
        if (jobId) {
            return renders.find(r => r.jobId === jobId) || null;
        }
        return renders.find(r => r.status === 'rendering') || renders[renders.length - 1] || null;
    }, [renders, jobId]);
    
    const cancelRender = useCallback(async (id: string) => {
        await request('render:cancel', { jobId: id });
        setRenders(prev => prev.map(r => 
            r.jobId === id ? { ...r, status: 'cancelled' as const } : r
        ));
    }, [request]);
    
    return { renders, currentRender, cancelRender };
}

// ============================================================================
// useSystemHealth
// ============================================================================

export function useSystemHealth(): {
    state: HealthDashboardState | null;
    services: Record<string, ServiceHealth>;
    metrics: SystemMetrics | null;
    alerts: HealthAlert[];
    refresh: () => Promise<void>;
} {
    const { subscribe, request } = useGateway();
    const [state, setState] = useState<HealthDashboardState | null>(null);
    
    useEffect(() => {
        // Fetch initial state
        const fetchHealth = async () => {
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;

            try {
                const response = await fetch(`${gatewayHttpUrl}/api/health/dashboard`);
                const data = await response.json();
                if (data.success) {
                    setState(data.data);
                }
            } catch (err) {
                logger.error('Failed to fetch health:', err);
            }
        };
        
        fetchHealth();
        
        // Subscribe to updates
        const unsub1 = subscribe('health:update', (update: Partial<HealthDashboardState>) => {
            setState(prev => prev ? { ...prev, ...update } : null);
        });
        
        const unsub2 = subscribe('health:alert', (alert: HealthAlert) => {
            setState(prev => prev ? {
                ...prev,
                alerts: [alert, ...prev.alerts.slice(0, 49)]
            } : null);
        });
        
        // Poll every 30 seconds as backup
        const pollInterval = setInterval(fetchHealth, 30000);
        
        return () => {
            unsub1();
            unsub2();
            clearInterval(pollInterval);
        };
    }, [subscribe]);
    
    const refresh = useCallback(async () => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return;

        try {
            const response = await fetch(`${gatewayHttpUrl}/api/health/dashboard`);
            const data = await response.json();
            if (data.success) {
                setState(data.data);
            }
        } catch (err) {
            logger.error('Failed to refresh health:', err);
        }
    }, []);
    
    return {
        state,
        services: state?.services || {},
        metrics: state?.system || null,
        alerts: state?.alerts || [],
        refresh
    };
}

// ============================================================================
// useJobQueue
// ============================================================================

export function useJobQueue(): {
    jobs: Job[];
    stats: { pending: number; running: number; completed: number; failed: number };
    createJob: (type: string, payload: GatewayRequestPayload, priority?: string) => Promise<string>;
    cancelJob: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
} {
    const { subscribe, request } = useGateway();
    const [jobs, setJobs] = useState<Job[]>([]);
    
    useEffect(() => {
        // Fetch initial jobs
        const fetchJobs = async () => {
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;

            try {
                const response = await fetch(`${gatewayHttpUrl}/api/jobs`);
                const data = await response.json();
                if (data.success) {
                    setJobs(data.data);
                }
            } catch (err) {
                logger.error('Failed to fetch jobs:', err);
            }
        };
        
        fetchJobs();
        
        // Subscribe to updates
        const unsub1 = subscribe('job:started', (job: Job) => {
            setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        });
        
        const unsub2 = subscribe('job:completed', (job: Job) => {
            setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        });
        
        const unsub3 = subscribe('job:failed', (job: Job) => {
            setJobs(prev => prev.map(j => j.id === job.id ? job : j));
        });
        
        return () => {
            unsub1();
            unsub2();
            unsub3();
        };
    }, [subscribe]);
    
    const stats = useMemo(() => ({
        pending: jobs.filter(j => j.status === 'pending').length,
        running: jobs.filter(j => j.status === 'running').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length
    }), [jobs]);
    
    const createJob = useCallback(async (type: string, payload: GatewayRequestPayload, priority = 'normal') => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) throw new Error('Gateway URL not configured');

        const response = await fetch(`${gatewayHttpUrl}/api/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload, priority })
        });
        const data = await response.json();
        
        if (data.success) {
            // Job will be added via WebSocket event
            return data.data.jobId;
        }
        throw new Error(data.error);
    }, []);
    
    const cancelJob = useCallback(async (id: string) => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) throw new Error('Gateway URL not configured');

        await fetch(`${gatewayHttpUrl}/api/jobs/${id}`, {
            method: 'DELETE'
        });
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled' as const } : j));
    }, []);
    
    const refresh = useCallback(async () => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return;

        try {
            const response = await fetch(`${gatewayHttpUrl}/api/jobs`);
            const data = await response.json();
            if (data.success) {
                setJobs(data.data);
            }
        } catch (err) {
            logger.error('Failed to refresh jobs:', err);
        }
    }, []);
    
    return { jobs, stats, createJob, cancelJob, refresh };
}

// ============================================================================
// useDiskUsage
// ============================================================================

export function useDiskUsage(): {
    usage: DiskUsage[];
    total: { used: number; quota: number; percentage: number };
    alerts: HealthAlert[];
    cleanup: (category?: string) => Promise<number>;
    refresh: () => Promise<void>;
} {
    const { subscribe } = useGateway();
    const [usage, setUsage] = useState<DiskUsage[]>([]);
    const [alerts, setAlerts] = useState<HealthAlert[]>([]);
    
    useEffect(() => {
        // Fetch initial state
        const fetchUsage = async () => {
            const gatewayHttpUrl = getGatewayHttpUrl();
            if (!gatewayHttpUrl) return;

            try {
                const response = await fetch(`${gatewayHttpUrl}/api/system/disk`);
                const data = await response.json();
                if (data.success) {
                    setUsage(data.data.usage || []);
                    setAlerts(data.data.alerts || []);
                }
            } catch (err) {
                logger.error('Failed to fetch disk usage:', err);
            }
        };
        
        fetchUsage();
        
        // Subscribe to alerts
        const unsub = subscribe('disk:alert', (alert: HealthAlert) => {
            setAlerts(prev => [alert, ...prev.slice(0, 9)]);
        });
        
        // Poll every minute
        const pollInterval = setInterval(fetchUsage, 60000);
        
        return () => {
            unsub();
            clearInterval(pollInterval);
        };
    }, [subscribe]);
    
    const total = useMemo(() => {
        const used = usage.reduce((sum, u) => sum + u.used, 0);
        const quota = usage.reduce((sum, u) => sum + u.quota, 0);
        return {
            used,
            quota,
            percentage: quota > 0 ? (used / quota) * 100 : 0
        };
    }, [usage]);
    
    const cleanup = useCallback(async (category?: string) => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return 0;

        const response = await fetch(`${gatewayHttpUrl}/api/system/disk/cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category })
        });
        const data = await response.json();
        return data.data?.freedBytes || 0;
    }, []);
    
    const refresh = useCallback(async () => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) return;

        try {
            const response = await fetch(`${gatewayHttpUrl}/api/system/disk`);
            const data = await response.json();
            if (data.success) {
                setUsage(data.data.usage || []);
                setAlerts(data.data.alerts || []);
            }
        } catch (err) {
            logger.error('Failed to refresh disk usage:', err);
        }
    }, []);
    
    return { usage, total, alerts, cleanup, refresh };
}

// ============================================================================
// useAssetDownload
// ============================================================================

export function useAssetDownload(): {
    downloads: DownloadProgress[];
    startDownload: (url: string, options?: { filename?: string; sha256?: string }) => Promise<string>;
    cancelDownload: (id: string) => void;
} {
    const { subscribe, send } = useGateway();
    const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
    
    useEffect(() => {
        const unsub1 = subscribe('download:progress', (progress: DownloadProgress) => {
            setDownloads(prev => {
                const idx = prev.findIndex(d => d.id === progress.id);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = progress;
                    return updated;
                }
                return [...prev, progress];
            });
        });
        
        const unsub2 = subscribe('download:complete', (result: DownloadProgress) => {
            setDownloads(prev => prev.map(d => 
                d.id === result.id ? { ...d, status: 'complete' as const, progress: 100 } : d
            ));
        });
        
        return () => {
            unsub1();
            unsub2();
        };
    }, [subscribe]);
    
    const startDownload = useCallback(async (url: string, options?: { filename?: string; sha256?: string }) => {
        const gatewayHttpUrl = getGatewayHttpUrl();
        if (!gatewayHttpUrl) throw new Error('Gateway URL not configured');

        const response = await fetch(`${gatewayHttpUrl}/api/assets/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                destination: options?.filename,
                expectedSha256: options?.sha256
            })
        });
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        return data.data.id || url;
    }, []);
    
    const cancelDownload = useCallback((id: string) => {
        send({ type: 'download:cancel', payload: { id } });
        setDownloads(prev => prev.filter(d => d.id !== id));
    }, [send]);
    
    return { downloads, startDownload, cancelDownload };
}

// ============================================================================
// useBridge - Commands for Local Bridge (Blender/AI)
// ============================================================================

export function useBridge(): {
    connected: boolean;
    tools: { blender: boolean; ffmpeg: boolean; unreal: boolean };
    checkTools: () => Promise<void>;
    generateDNA: (genre: string, style: string, description?: string) => Promise<BridgeResult>;
    renderBlender: (request: string, output: string) => Promise<string>;
    getBible: () => Promise<BridgeResult | BridgeData | undefined>;
    addFact: (category: string, fact: string) => Promise<void>;
} {
    const { connected, request, send, subscribe } = useGateway();
    const [tools, setTools] = useState({ blender: false, ffmpeg: false, unreal: false });
    const bridgeWsRef = useRef<WebSocket | null>(null);
    
    // Connect to bridge endpoint
    useEffect(() => {
        const connectBridge = () => {
            if (!GATEWAY_URL) return;

            try {
                const ws = new WebSocket(`${GATEWAY_URL}/bridge`);
                bridgeWsRef.current = ws;
                
                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data) as BridgeResult;
                        if (msg.type === 'tools_status') {
                            setTools({
                                blender: msg.data?.blender?.available || false,
                                ffmpeg: msg.data?.ffmpeg?.available || false,
                                unreal: msg.data?.unreal?.available || false
                            });
                        }
                    } catch {}
                };
                
                ws.onopen = () => {
                    // Check tools on connect
                    ws.send(JSON.stringify({ command: 'check_tools' }));
                };
            } catch (err) {
                logger.error('Failed to connect to bridge:', err);
            }
        };
        
        if (connected) {
            connectBridge();
        }
        
        return () => {
            bridgeWsRef.current?.close();
        };
    }, [connected]);
    
    const sendBridgeCommand = useCallback((command: string, data?: Record<string, unknown>): Promise<BridgeResult> => {
        return new Promise((resolve, reject) => {
            const ws = bridgeWsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Bridge not connected'));
                return;
            }
            
            const handler = (event: MessageEvent) => {
                try {
                    const msg = JSON.parse(event.data) as BridgeResult;
                    if (msg.type?.includes('complete') || msg.type?.includes('created') || msg.type?.includes('data')) {
                        ws.removeEventListener('message', handler);
                        resolve(msg.data || msg);
                    } else if (msg.type === 'error') {
                        ws.removeEventListener('message', handler);
                        reject(new Error(msg.message));
                    }
                } catch {}
            };
            
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ command, ...data }));
            
            // Timeout
            setTimeout(() => {
                ws.removeEventListener('message', handler);
                reject(new Error('Command timeout'));
            }, 120000);
        });
    }, []);
    
    const checkTools = useCallback(async () => {
        const result = await sendBridgeCommand('check_tools');
        if (result?.data) {
            setTools({
                blender: result.data.blender?.available || false,
                ffmpeg: result.data.ffmpeg?.available || false,
                unreal: result.data.unreal?.available || false
            });
        }
    }, [sendBridgeCommand]);
    
    const generateDNA = useCallback(async (genre: string, style: string, description = '') => {
        return sendBridgeCommand('generate_dna', {
            payload: { genre, style, description }
        });
    }, [sendBridgeCommand]);
    
    const renderBlender = useCallback(async (request: string, output: string) => {
        const result = await sendBridgeCommand('render_blender_script', {
            request,
            output
        });
        return result?.path || '';
    }, [sendBridgeCommand]);
    
    const getBible = useCallback(async () => {
        const result = await sendBridgeCommand('get_bible');
        return result?.data || result;
    }, [sendBridgeCommand]);
    
    const addFact = useCallback(async (category: string, fact: string) => {
        await sendBridgeCommand('add_fact', { category, fact });
    }, [sendBridgeCommand]);
    
    return {
        connected,
        tools,
        checkTools,
        generateDNA,
        renderBlender,
        getBible,
        addFact
    };
}

// ============================================================================
// useCollaboration - Yjs Real-time Collaboration
// ============================================================================

export function useCollaboration(docName: string): {
    connected: boolean;
    awareness: unknown;
    doc: unknown;
    users: { id: string; name: string; color: string }[];
} {
    const { connected } = useGateway();
    const [collabConnected, setCollabConnected] = useState(false);
    const [users, setUsers] = useState<{ id: string; name: string; color: string }[]>([]);
    const docRef = useRef<unknown>(null);
    const awarenessRef = useRef<unknown>(null);
    
    useEffect(() => {
        if (!connected || !docName) return;
        const gatewayWsBaseUrl = getGatewayWsBaseUrl();
        if (!gatewayWsBaseUrl) return;

        let cleanup: (() => void) | undefined;
        let cancelled = false;
        
        const setupCollab = async () => {
            try {
                // Dynamic import Yjs (it's heavy)
                const Y = await import('yjs');
                const { WebsocketProvider } = await import('y-websocket');
                
                const doc = new Y.Doc();
                docRef.current = doc;
                
                const provider = new WebsocketProvider(
                    gatewayWsBaseUrl,
                    docName,
                    doc
                );
                
                awarenessRef.current = provider.awareness;
                
                provider.on('status', (event: { status: string }) => {
                    setCollabConnected(event.status === 'connected');
                });
                
                provider.awareness.on('change', () => {
                    const states = Array.from(provider.awareness.getStates().values()) as AwarenessState[];
                    setUsers(states.map((state, idx) => ({
                        id: String(idx),
                        name: state.user?.name || 'Anonymous',
                        color: state.user?.color || '#666'
                    })));
                });
                
                return () => {
                    provider.destroy();
                    doc.destroy();
                };
            } catch (err) {
                logger.error('Failed to setup collaboration:', err);
            }
        };
        
        setupCollab().then((teardown) => {
            if (!teardown) return;
            if (cancelled) teardown();
            else cleanup = teardown;
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [connected, docName]);
    
    return {
        connected: collabConnected,
        awareness: awarenessRef.current,
        doc: docRef.current,
        users
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { useGateway, GatewayContext };
