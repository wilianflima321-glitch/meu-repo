import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';

/**
 * WebSocket message types
 */
export enum WSMessageType {
    MISSION_UPDATE = 'mission.update',
    MISSION_COMPLETE = 'mission.complete',
    MISSION_ERROR = 'mission.error',
    AGENT_STATUS = 'agent.status',
    COST_ALERT = 'cost.alert',
    SLO_BREACH = 'slo.breach',
    NOTIFICATION = 'notification',
    HEARTBEAT = 'heartbeat',
}

/**
 * WebSocket message
 */
export interface WSMessage {
    type: WSMessageType;
    payload: any;
    timestamp: number;
    id: string;
}

/**
 * Mission update payload
 */
export interface MissionUpdatePayload {
    missionId: string;
    status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
    progress: number;
    currentStage: string;
    actualCost: number;
    estimatedCompletion?: number;
    errors?: string[];
    warnings?: string[];
}

/**
 * WebSocket Service - Real-time communication
 */
@injectable()
export class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private heartbeatInterval: any;
    private messageQueue: WSMessage[] = [];
    private idSeq = 0;

    private readonly onMessageEmitter = new Emitter<WSMessage>();
    readonly onMessage: Event<WSMessage> = this.onMessageEmitter.event;

    private readonly onConnectedEmitter = new Emitter<void>();
    readonly onConnected: Event<void> = this.onConnectedEmitter.event;

    private readonly onDisconnectedEmitter = new Emitter<void>();
    readonly onDisconnected: Event<void> = this.onDisconnectedEmitter.event;

    private readonly onErrorEmitter = new Emitter<Error>();
    readonly onError: Event<Error> = this.onErrorEmitter.event;

    /**
     * Connect to WebSocket server
     */
    connect(url?: string): void {
        const resolvedUrl = url || this.resolveDefaultUrl();
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(resolvedUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.onConnectedEmitter.fire();
                this.startHeartbeat();
                this.flushMessageQueue();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WSMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.onErrorEmitter.fire(new Error('WebSocket error'));
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.onDisconnectedEmitter.fire();
                this.stopHeartbeat();
                this.attemptReconnect(resolvedUrl);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.onErrorEmitter.fire(error as Error);
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        if (this.ws) {
            this.stopHeartbeat();
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Send message
     */
    send(type: WSMessageType, payload: any): void {
        const message: WSMessage = {
            type,
            payload,
            timestamp: Date.now(),
            id: this.generateId(),
        };

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message for later
            this.messageQueue.push(message);
        }
    }

    /**
     * Subscribe to specific message type
     */
    subscribe(type: WSMessageType, handler: (payload: any) => void): () => void {
        const listener = this.onMessage((message) => {
            if (message.type === type) {
                handler(message.payload);
            }
        });

        return () => listener.dispose();
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // Private methods

    private handleMessage(message: WSMessage): void {
        // Handle heartbeat
        if (message.type === WSMessageType.HEARTBEAT) {
            this.send(WSMessageType.HEARTBEAT, { timestamp: Date.now() });
            return;
        }

        // Emit message
        this.onMessageEmitter.fire(message);
    }

    private attemptReconnect(url: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect(url);
        }, delay);
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send(WSMessageType.HEARTBEAT, { timestamp: Date.now() });
            }
        }, 30000); // Every 30 seconds
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message && this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(message));
            }
        }
    }

    private generateId(): string {
        // Deterministic, monotonic IDs (no Math.random in runtime).
        this.idSeq += 1;
        return `ws_${Date.now()}_${this.idSeq}`;
    }

    private resolveDefaultUrl(): string {
        // Optional env override (works in Node-ish builds).
        try {
            const envUrl = (typeof process !== 'undefined' && (process as any)?.env && (process as any).env.AETHEL_WS_URL)
                ? String((process as any).env.AETHEL_WS_URL)
                : '';
            if (envUrl) {
                return envUrl;
            }
        } catch {
            // ignore
        }

        // Browser default: same-origin, swap http(s) -> ws(s)
        try {
            if (typeof window !== 'undefined' && (window as any).location?.origin) {
                const origin = String((window as any).location.origin);
                const wsOrigin = origin.startsWith('https://')
                    ? origin.replace(/^https:\/\//, 'wss://')
                    : origin.replace(/^http:\/\//, 'ws://');
                return `${wsOrigin.replace(/\/+$/, '')}/ws`;
            }
        } catch {
            // ignore
        }

        // Fallback
        return 'ws://localhost:3000/ws';
    }
}

/**
 * Mission WebSocket Client - Specialized client for Mission Control
 */
@injectable()
export class MissionWebSocketClient {
    constructor(private wsService: WebSocketService) {}

    /**
     * Connect to the Mission WS. Default keeps existing local-dev behavior.
     */
    async connect(url?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const disposeConnected = this.wsService.onConnected(() => {
                disposeConnected.dispose();
                disposeError.dispose();
                resolve();
            });

            const disposeError = this.wsService.onError((err) => {
                disposeConnected.dispose();
                disposeError.dispose();
                reject(err);
            });

            this.wsService.connect(url);
        });
    }

    disconnect(): void {
        this.wsService.disconnect();
    }

    /**
     * MissionControlWidget uses legacy event names like 'mission:update'.
     * This adapter maps those names to typed WSMessageType.
     */
    on(event: string, handler: (payload: any) => void): () => void {
        const mapped = this.mapLegacyEventToType(event);
        if (!mapped) {
            throw new Error(`Unsupported WS event: ${event}`);
        }

        return this.wsService.subscribe(mapped, (payload) => {
            // Preserve MissionControlWidget's expected shape: { missionId, updates }
            if (mapped === WSMessageType.MISSION_UPDATE && payload?.missionId) {
                handler({ missionId: payload.missionId, updates: payload });
                return;
            }
            handler(payload);
        });
    }

    /**
     * MissionControlWidget uses legacy send events like 'mission:start'.
     * We encode them as MISSION_UPDATE actions.
     */
    send(event: string, payload: any): void {
        const mapped = this.mapLegacyEventToType(event);
        if (!mapped) {
            throw new Error(`Unsupported WS event: ${event}`);
        }

        if (mapped === WSMessageType.MISSION_UPDATE) {
            const action = this.mapLegacyMissionAction(event);
            this.wsService.send(mapped, { ...payload, action });
            return;
        }

        this.wsService.send(mapped, payload);
    }

    private mapLegacyEventToType(event: string): WSMessageType | null {
        switch (event) {
            case 'mission:update':
                return WSMessageType.MISSION_UPDATE;
            case 'mission:complete':
                return WSMessageType.MISSION_COMPLETE;
            case 'mission:error':
                return WSMessageType.MISSION_ERROR;
            case 'agent:status':
                return WSMessageType.AGENT_STATUS;
            case 'cost:alert':
                return WSMessageType.COST_ALERT;
            case 'slo:breach':
                return WSMessageType.SLO_BREACH;
            case 'notification':
                return WSMessageType.NOTIFICATION;
            case 'heartbeat':
                return WSMessageType.HEARTBEAT;

            // legacy mission control commands
            case 'mission:start':
            case 'mission:pause':
            case 'mission:resume':
            case 'mission:cancel':
                return WSMessageType.MISSION_UPDATE;

            default:
                return null;
        }
    }

    private mapLegacyMissionAction(event: string): string {
        switch (event) {
            case 'mission:start':
                return 'start';
            case 'mission:pause':
                return 'pause';
            case 'mission:resume':
                return 'resume';
            case 'mission:cancel':
                return 'cancel';
            default:
                return 'update';
        }
    }

    /**
     * Subscribe to mission updates
     */
    subscribeMission(missionId: string, handler: (update: MissionUpdatePayload) => void): () => void {
        return this.wsService.subscribe(WSMessageType.MISSION_UPDATE, (payload) => {
            if (payload.missionId === missionId) {
                handler(payload);
            }
        });
    }

    /**
     * Subscribe to all mission updates
     */
    subscribeAllMissions(handler: (update: MissionUpdatePayload) => void): () => void {
        return this.wsService.subscribe(WSMessageType.MISSION_UPDATE, handler);
    }

    /**
     * Subscribe to mission completion
     */
    subscribeMissionComplete(handler: (payload: any) => void): () => void {
        return this.wsService.subscribe(WSMessageType.MISSION_COMPLETE, handler);
    }

    /**
     * Subscribe to mission errors
     */
    subscribeMissionError(handler: (payload: any) => void): () => void {
        return this.wsService.subscribe(WSMessageType.MISSION_ERROR, handler);
    }

    /**
     * Subscribe to cost alerts
     */
    subscribeCostAlerts(handler: (payload: any) => void): () => void {
        return this.wsService.subscribe(WSMessageType.COST_ALERT, handler);
    }

    /**
     * Subscribe to SLO breaches
     */
    subscribeSLOBreaches(handler: (payload: any) => void): () => void {
        return this.wsService.subscribe(WSMessageType.SLO_BREACH, handler);
    }

    /**
     * Request mission status
     */
    requestMissionStatus(missionId: string): void {
        this.wsService.send(WSMessageType.AGENT_STATUS, { missionId });
    }

    /**
     * Pause mission
     */
    pauseMission(missionId: string): void {
        this.wsService.send(WSMessageType.MISSION_UPDATE, {
            missionId,
            action: 'pause',
        });
    }

    /**
     * Resume mission
     */
    resumeMission(missionId: string): void {
        this.wsService.send(WSMessageType.MISSION_UPDATE, {
            missionId,
            action: 'resume',
        });
    }

    /**
     * Cancel mission
     */
    cancelMission(missionId: string): void {
        this.wsService.send(WSMessageType.MISSION_UPDATE, {
            missionId,
            action: 'cancel',
        });
    }
}
