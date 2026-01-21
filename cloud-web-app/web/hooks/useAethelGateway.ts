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

// ============================================================================
// TYPES
// ============================================================================

export interface ConnectionState {
    connected: boolean;
    reconnecting: boolean;
    error: string | null;
    latency: number;
}

export interface RenderProgress {
    jobId: string;
    status: 'pending' | 'rendering' | 'complete' | 'failed' | 'cancelled';
    progress: number;
    currentFrame?: number;
    totalFrames?: number;
    currentSample?: number;
    totalSamples?: number;
    eta?: number;
    memory?: number;
    message?: string;
    output?: string;
    error?: string;
}

export interface ServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'offline' | 'unknown';
    latency?: number;
    message?: string;
    lastCheck: number;
}

export interface SystemMetrics {
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    disk: {
        used: number;
        total: number;
        percentage: number;
    };
    gpu?: {
        name: string;
        usage: number;
        memory: number;
        temperature?: number;
    };
}

export interface HealthDashboardState {
    services: Record<string, ServiceHealth>;
    system: SystemMetrics;
    alerts: HealthAlert[];
    uptime: number;
}

export interface HealthAlert {
    id: string;
    level: 'info' | 'warning' | 'critical';
    service: string;
    message: string;
    timestamp: number;
}

export interface Job {
    id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'critical';
    payload: any;
    progress?: number;
    result?: any;
    error?: string;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}

export interface DiskUsage {
    category: string;
    used: number;
    quota: number;
    percentage: number;
    files: number;
}

export interface DownloadProgress {
    id: string;
    url: string;
    filename: string;
    progress: number;
    speed: number;
    downloaded: number;
    total: number;
    status: 'pending' | 'downloading' | 'verifying' | 'complete' | 'failed';
    error?: string;
}

// ============================================================================
// GATEWAY CONNECTION CONTEXT
// ============================================================================

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://localhost:4000';

interface GatewayContextValue {
    ws: WebSocket | null;
    connected: boolean;
    send: (data: any) => void;
    subscribe: (event: string, callback: (data: any) => void) => () => void;
    request: <T>(type: string, payload?: any) => Promise<T>;
}

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function GatewayProvider({ children }: { children: ReactNode }) {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
    const pendingRequestsRef = useRef<Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>>(new Map());
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        
        try {
            const ws = new WebSocket(`${GATEWAY_URL}/events?subscribe=*`);
            wsRef.current = ws;
            
            ws.onopen = () => {
                setConnected(true);
                reconnectAttemptsRef.current = 0;
                console.log('🔗 Connected to Aethel Gateway');
            };
            
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    
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
                    console.error('Gateway message parse error:', err);
                }
            };
            
            ws.onclose = () => {
                setConnected(false);
                wsRef.current = null;
                
                // Schedule reconnect
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                reconnectAttemptsRef.current++;
                
                if (reconnectAttemptsRef.current < 10) {
                    console.log(`Reconnecting in ${delay}ms...`);
                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                }
            };
            
            ws.onerror = (err) => {
                console.error('Gateway WebSocket error:', err);
            };
        } catch (err) {
            console.error('Failed to connect to Gateway:', err);
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
    
    const send = useCallback((data: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);
    
    const subscribe = useCallback((event: string, callback: (data: any) => void) => {
        if (!listenersRef.current.has(event)) {
            listenersRef.current.set(event, new Set());
        }
        listenersRef.current.get(event)!.add(callback);
        
        return () => {
            listenersRef.current.get(event)?.delete(callback);
        };
    }, []);
    
    const request = useCallback(<T,>(type: string, payload?: any): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                reject(new Error('Not connected'));
                return;
            }
            
            const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            const timeout = setTimeout(() => {
                pendingRequestsRef.current.delete(requestId);
                reject(new Error('Request timeout'));
            }, 30000);
            
            pendingRequestsRef.current.set(requestId, { resolve, reject, timeout });
            
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
            
            const start = Date.now();
            try {
                await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/health`);
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
            try {
                const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/health/dashboard`);
                const data = await response.json();
                if (data.success) {
                    setState(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch health:', err);
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
        try {
            const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/health/dashboard`);
            const data = await response.json();
            if (data.success) {
                setState(data.data);
            }
        } catch (err) {
            console.error('Failed to refresh health:', err);
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
    createJob: (type: string, payload: any, priority?: string) => Promise<string>;
    cancelJob: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
} {
    const { subscribe, request } = useGateway();
    const [jobs, setJobs] = useState<Job[]>([]);
    
    useEffect(() => {
        // Fetch initial jobs
        const fetchJobs = async () => {
            try {
                const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/jobs`);
                const data = await response.json();
                if (data.success) {
                    setJobs(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch jobs:', err);
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
    
    const createJob = useCallback(async (type: string, payload: any, priority = 'normal') => {
        const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/jobs`, {
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
        await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/jobs/${id}`, {
            method: 'DELETE'
        });
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'cancelled' as const } : j));
    }, []);
    
    const refresh = useCallback(async () => {
        try {
            const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/jobs`);
            const data = await response.json();
            if (data.success) {
                setJobs(data.data);
            }
        } catch (err) {
            console.error('Failed to refresh jobs:', err);
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
            try {
                const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/system/disk`);
                const data = await response.json();
                if (data.success) {
                    setUsage(data.data.usage || []);
                    setAlerts(data.data.alerts || []);
                }
            } catch (err) {
                console.error('Failed to fetch disk usage:', err);
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
        const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/system/disk/cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category })
        });
        const data = await response.json();
        return data.data?.freedBytes || 0;
    }, []);
    
    const refresh = useCallback(async () => {
        try {
            const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/system/disk`);
            const data = await response.json();
            if (data.success) {
                setUsage(data.data.usage || []);
                setAlerts(data.data.alerts || []);
            }
        } catch (err) {
            console.error('Failed to refresh disk usage:', err);
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
        const response = await fetch(`${GATEWAY_URL.replace('ws', 'http')}/api/assets/download`, {
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
    generateDNA: (genre: string, style: string, description?: string) => Promise<any>;
    renderBlender: (request: string, output: string) => Promise<string>;
    getBible: () => Promise<any>;
    addFact: (category: string, fact: string) => Promise<void>;
} {
    const { connected, request, send, subscribe } = useGateway();
    const [tools, setTools] = useState({ blender: false, ffmpeg: false, unreal: false });
    const bridgeWsRef = useRef<WebSocket | null>(null);
    
    // Connect to bridge endpoint
    useEffect(() => {
        const connectBridge = () => {
            try {
                const ws = new WebSocket(`${GATEWAY_URL}/bridge`);
                bridgeWsRef.current = ws;
                
                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
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
                console.error('Failed to connect to bridge:', err);
            }
        };
        
        if (connected) {
            connectBridge();
        }
        
        return () => {
            bridgeWsRef.current?.close();
        };
    }, [connected]);
    
    const sendBridgeCommand = useCallback((command: string, data?: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const ws = bridgeWsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Bridge not connected'));
                return;
            }
            
            const handler = (event: MessageEvent) => {
                try {
                    const msg = JSON.parse(event.data);
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
    awareness: any;
    doc: any;
    users: { id: string; name: string; color: string }[];
} {
    const { connected } = useGateway();
    const [collabConnected, setCollabConnected] = useState(false);
    const [users, setUsers] = useState<{ id: string; name: string; color: string }[]>([]);
    const docRef = useRef<any>(null);
    const awarenessRef = useRef<any>(null);
    
    useEffect(() => {
        if (!connected || !docName) return;
        
        const setupCollab = async () => {
            try {
                // Dynamic import Yjs (it's heavy)
                const Y = await import('yjs');
                const { WebsocketProvider } = await import('y-websocket');
                
                const doc = new Y.Doc();
                docRef.current = doc;
                
                const provider = new WebsocketProvider(
                    GATEWAY_URL.replace('/events', ''),
                    docName,
                    doc
                );
                
                awarenessRef.current = provider.awareness;
                
                provider.on('status', (event: { status: string }) => {
                    setCollabConnected(event.status === 'connected');
                });
                
                provider.awareness.on('change', () => {
                    const states = Array.from(provider.awareness.getStates().values()) as any[];
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
                console.error('Failed to setup collaboration:', err);
            }
        };
        
        setupCollab();
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
