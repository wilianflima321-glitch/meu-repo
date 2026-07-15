/**
 * Shared types for the Aethel Gateway React hooks.
 * Kept separate so the runtime hook stays below the large-file ceiling.
 */

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
    payload: unknown;
    progress?: number;
    result?: unknown;
    error?: string;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
}

export type GatewayPayload = unknown;
export type GatewayEventCallback = (data: GatewayPayload) => void;
export type GatewayRequestPayload = Record<string, unknown> | undefined;

export type GatewayMessage = {
    requestId?: string;
    event?: string;
    type?: string;
    data?: unknown;
    payload?: unknown;
    message?: string;
};

export type PendingGatewayRequest = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
};

export type BridgeToolStatus = {
    available?: boolean;
};

export type BridgeData = {
    blender?: BridgeToolStatus;
    ffmpeg?: BridgeToolStatus;
    unreal?: BridgeToolStatus;
    id?: string;
    path?: string;
};

export type BridgeResult = {
    type?: string;
    data?: BridgeData;
    message?: string;
    path?: string;
};

export type AwarenessState = {
    user?: {
        name?: string;
        color?: string;
    };
};

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

