"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionWebSocketClient = exports.WebSocketService = exports.WSMessageType = void 0;
const inversify_1 = require("inversify");
const core_1 = require("@theia/core");
/**
 * WebSocket message types
 */
var WSMessageType;
(function (WSMessageType) {
    WSMessageType["MISSION_UPDATE"] = "mission.update";
    WSMessageType["MISSION_COMPLETE"] = "mission.complete";
    WSMessageType["MISSION_ERROR"] = "mission.error";
    WSMessageType["AGENT_STATUS"] = "agent.status";
    WSMessageType["COST_ALERT"] = "cost.alert";
    WSMessageType["SLO_BREACH"] = "slo.breach";
    WSMessageType["NOTIFICATION"] = "notification";
    WSMessageType["HEARTBEAT"] = "heartbeat";
})(WSMessageType || (exports.WSMessageType = WSMessageType = {}));
/**
 * WebSocket Service - Real-time communication
 */
let WebSocketService = class WebSocketService {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = [];
        this.idSeq = 0;
        this.onMessageEmitter = new core_1.Emitter();
        this.onMessage = this.onMessageEmitter.event;
        this.onConnectedEmitter = new core_1.Emitter();
        this.onConnected = this.onConnectedEmitter.event;
        this.onDisconnectedEmitter = new core_1.Emitter();
        this.onDisconnected = this.onDisconnectedEmitter.event;
        this.onErrorEmitter = new core_1.Emitter();
        this.onError = this.onErrorEmitter.event;
    }
    /**
     * Connect to WebSocket server
     */
    connect(url) {
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
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.onErrorEmitter.fire(error);
        }
    }
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.ws) {
            this.stopHeartbeat();
            this.ws.close();
            this.ws = null;
        }
    }
    /**
     * Send message
     */
    send(type, payload) {
        const message = {
            type,
            payload,
            timestamp: Date.now(),
            id: this.generateId(),
        };
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
        else {
            // Queue message for later
            this.messageQueue.push(message);
        }
    }
    /**
     * Subscribe to specific message type
     */
    subscribe(type, handler) {
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
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
    // Private methods
    handleMessage(message) {
        // Handle heartbeat
        if (message.type === WSMessageType.HEARTBEAT) {
            this.send(WSMessageType.HEARTBEAT, { timestamp: Date.now() });
            return;
        }
        // Emit message
        this.onMessageEmitter.fire(message);
    }
    attemptReconnect(url) {
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
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected()) {
                this.send(WSMessageType.HEARTBEAT, { timestamp: Date.now() });
            }
        }, 30000); // Every 30 seconds
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message && this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify(message));
            }
        }
    }
    generateId() {
        // Deterministic, monotonic IDs (no Math.random in runtime).
        this.idSeq += 1;
        return `ws_${Date.now()}_${this.idSeq}`;
    }
    resolveDefaultUrl() {
        // Optional env override (works in Node-ish builds).
        try {
            const envUrl = (typeof process !== 'undefined' && process?.env && process.env.AETHEL_WS_URL)
                ? String(process.env.AETHEL_WS_URL)
                : '';
            if (envUrl) {
                return envUrl;
            }
        }
        catch {
            // ignore
        }
        // Browser default: same-origin, swap http(s) -> ws(s)
        try {
            if (typeof window !== 'undefined' && window.location?.origin) {
                const origin = String(window.location.origin);
                const wsOrigin = origin.startsWith('https://')
                    ? origin.replace(/^https:\/\//, 'wss://')
                    : origin.replace(/^http:\/\//, 'ws://');
                return `${wsOrigin.replace(/\/+$/, '')}/ws`;
            }
        }
        catch {
            // ignore
        }
        // Fallback
        return 'ws://localhost:3000/ws';
    }
};
exports.WebSocketService = WebSocketService;
exports.WebSocketService = WebSocketService = __decorate([
    (0, inversify_1.injectable)()
], WebSocketService);
/**
 * Mission WebSocket Client - Specialized client for Mission Control
 */
let MissionWebSocketClient = class MissionWebSocketClient {
    constructor(wsService) {
        this.wsService = wsService ?? new WebSocketService();
    }
    /**
     * Connect to the Mission WS. Default keeps existing local-dev behavior.
     */
    async connect(url) {
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
    disconnect() {
        this.wsService.disconnect();
    }
    /**
     * MissionControlWidget uses legacy event names like 'mission:update'.
     * This adapter maps those names to typed WSMessageType.
     */
    on(event, handler) {
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
    send(event, payload) {
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
    mapLegacyEventToType(event) {
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
    mapLegacyMissionAction(event) {
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
    subscribeMission(missionId, handler) {
        return this.wsService.subscribe(WSMessageType.MISSION_UPDATE, (payload) => {
            if (payload.missionId === missionId) {
                handler(payload);
            }
        });
    }
    /**
     * Subscribe to all mission updates
     */
    subscribeAllMissions(handler) {
        return this.wsService.subscribe(WSMessageType.MISSION_UPDATE, handler);
    }
    /**
     * Subscribe to mission completion
     */
    subscribeMissionComplete(handler) {
        return this.wsService.subscribe(WSMessageType.MISSION_COMPLETE, handler);
    }
    /**
     * Subscribe to mission errors
     */
    subscribeMissionError(handler) {
        return this.wsService.subscribe(WSMessageType.MISSION_ERROR, handler);
    }
    /**
     * Subscribe to cost alerts
     */
    subscribeCostAlerts(handler) {
        return this.wsService.subscribe(WSMessageType.COST_ALERT, handler);
    }
    /**
     * Subscribe to SLO breaches
     */
    subscribeSLOBreaches(handler) {
        return this.wsService.subscribe(WSMessageType.SLO_BREACH, handler);
    }
    /**
     * Request mission status
     */
    requestMissionStatus(missionId) {
        this.wsService.send(WSMessageType.AGENT_STATUS, { missionId });
    }
    /**
     * Pause mission
     */
    pauseMission(missionId) {
        this.wsService.send(WSMessageType.MISSION_UPDATE, {
            missionId,
            action: 'pause',
        });
    }
    /**
     * Resume mission
     */
    resumeMission(missionId) {
        this.wsService.send(WSMessageType.MISSION_UPDATE, {
            missionId,
            action: 'resume',
        });
    }
    /**
     * Cancel mission
     */
    cancelMission(missionId) {
        this.wsService.send(WSMessageType.MISSION_UPDATE, {
            missionId,
            action: 'cancel',
        });
    }
};
exports.MissionWebSocketClient = MissionWebSocketClient;
exports.MissionWebSocketClient = MissionWebSocketClient = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [WebSocketService])
], MissionWebSocketClient);
