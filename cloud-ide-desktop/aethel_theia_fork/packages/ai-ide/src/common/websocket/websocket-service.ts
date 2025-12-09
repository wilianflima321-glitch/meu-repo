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
    connect(url: string = 'ws://localhost:3000/ws'): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(url);

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
                this.attemptReconnect(url);
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
        return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Mission WebSocket Client - Specialized client for Mission Control
 */
@injectable()
export class MissionWebSocketClient {
    constructor(private wsService: WebSocketService) {}

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
