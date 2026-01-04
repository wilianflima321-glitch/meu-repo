import { Event } from '@theia/core';
/**
 * WebSocket message types
 */
export declare enum WSMessageType {
    MISSION_UPDATE = "mission.update",
    MISSION_COMPLETE = "mission.complete",
    MISSION_ERROR = "mission.error",
    AGENT_STATUS = "agent.status",
    COST_ALERT = "cost.alert",
    SLO_BREACH = "slo.breach",
    NOTIFICATION = "notification",
    HEARTBEAT = "heartbeat"
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
export declare class WebSocketService {
    private ws;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private heartbeatInterval;
    private messageQueue;
    private idSeq;
    private readonly onMessageEmitter;
    readonly onMessage: Event<WSMessage>;
    private readonly onConnectedEmitter;
    readonly onConnected: Event<void>;
    private readonly onDisconnectedEmitter;
    readonly onDisconnected: Event<void>;
    private readonly onErrorEmitter;
    readonly onError: Event<Error>;
    /**
     * Connect to WebSocket server
     */
    connect(url?: string): void;
    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void;
    /**
     * Send message
     */
    send(type: WSMessageType, payload: any): void;
    /**
     * Subscribe to specific message type
     */
    subscribe(type: WSMessageType, handler: (payload: any) => void): () => void;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    private handleMessage;
    private attemptReconnect;
    private startHeartbeat;
    private stopHeartbeat;
    private flushMessageQueue;
    private generateId;
    private resolveDefaultUrl;
}
/**
 * Mission WebSocket Client - Specialized client for Mission Control
 */
export declare class MissionWebSocketClient {
    private readonly wsService;
    constructor(wsService?: WebSocketService);
    /**
     * Connect to the Mission WS. Default keeps existing local-dev behavior.
     */
    connect(url?: string): Promise<void>;
    disconnect(): void;
    /**
     * MissionControlWidget uses legacy event names like 'mission:update'.
     * This adapter maps those names to typed WSMessageType.
     */
    on(event: string, handler: (payload: any) => void): () => void;
    /**
     * MissionControlWidget uses legacy send events like 'mission:start'.
     * We encode them as MISSION_UPDATE actions.
     */
    send(event: string, payload: any): void;
    private mapLegacyEventToType;
    private mapLegacyMissionAction;
    /**
     * Subscribe to mission updates
     */
    subscribeMission(missionId: string, handler: (update: MissionUpdatePayload) => void): () => void;
    /**
     * Subscribe to all mission updates
     */
    subscribeAllMissions(handler: (update: MissionUpdatePayload) => void): () => void;
    /**
     * Subscribe to mission completion
     */
    subscribeMissionComplete(handler: (payload: any) => void): () => void;
    /**
     * Subscribe to mission errors
     */
    subscribeMissionError(handler: (payload: any) => void): () => void;
    /**
     * Subscribe to cost alerts
     */
    subscribeCostAlerts(handler: (payload: any) => void): () => void;
    /**
     * Subscribe to SLO breaches
     */
    subscribeSLOBreaches(handler: (payload: any) => void): () => void;
    /**
     * Request mission status
     */
    requestMissionStatus(missionId: string): void;
    /**
     * Pause mission
     */
    pauseMission(missionId: string): void;
    /**
     * Resume mission
     */
    resumeMission(missionId: string): void;
    /**
     * Cancel mission
     */
    cancelMission(missionId: string): void;
}
