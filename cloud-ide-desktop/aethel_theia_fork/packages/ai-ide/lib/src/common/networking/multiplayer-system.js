"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiplayerSystem = exports.RPCTarget = exports.ChannelType = exports.ReplicationMode = exports.ConnectionState = exports.NetworkRole = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
var NetworkRole;
(function (NetworkRole) {
    NetworkRole["None"] = "none";
    NetworkRole["Client"] = "client";
    NetworkRole["Server"] = "server";
    NetworkRole["ListenServer"] = "listen_server";
    NetworkRole["DedicatedServer"] = "dedicated_server";
})(NetworkRole || (exports.NetworkRole = NetworkRole = {}));
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["Disconnected"] = "disconnected";
    ConnectionState["Connecting"] = "connecting";
    ConnectionState["Connected"] = "connected";
    ConnectionState["Authenticating"] = "authenticating";
    ConnectionState["JoiningSession"] = "joining_session";
    ConnectionState["InSession"] = "in_session";
    ConnectionState["Disconnecting"] = "disconnecting";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));
var ReplicationMode;
(function (ReplicationMode) {
    /** Only server can modify */
    ReplicationMode["ServerOnly"] = "server_only";
    /** Owner client can modify */
    ReplicationMode["OwnerOnly"] = "owner_only";
    /** Any client can modify (rare) */
    ReplicationMode["Multicast"] = "multicast";
})(ReplicationMode || (exports.ReplicationMode = ReplicationMode = {}));
// ============================================================================
// NETWORK CHANNEL
// ============================================================================
var ChannelType;
(function (ChannelType) {
    /** Guaranteed delivery, ordered */
    ChannelType["ReliableOrdered"] = "reliable_ordered";
    /** Guaranteed delivery, unordered */
    ChannelType["ReliableUnordered"] = "reliable_unordered";
    /** No guarantee, may drop */
    ChannelType["Unreliable"] = "unreliable";
    /** No guarantee, only latest matters */
    ChannelType["UnreliableSequenced"] = "unreliable_sequenced";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
// ============================================================================
// RPC (REMOTE PROCEDURE CALLS)
// ============================================================================
var RPCTarget;
(function (RPCTarget) {
    /** Server only */
    RPCTarget["Server"] = "server";
    /** Owning client */
    RPCTarget["OwningClient"] = "owning_client";
    /** All clients */
    RPCTarget["AllClients"] = "all_clients";
    /** All clients except caller */
    RPCTarget["OtherClients"] = "other_clients";
    /** Specific client */
    RPCTarget["SpecificClient"] = "specific_client";
})(RPCTarget || (exports.RPCTarget = RPCTarget = {}));
// ============================================================================
// MULTIPLAYER SYSTEM
// ============================================================================
let MultiplayerSystem = class MultiplayerSystem {
    constructor() {
        this.role = NetworkRole.None;
        this.connectionState = ConnectionState.Disconnected;
        // Network objects
        this.networkObjects = new Map();
        this.objectClassRegistry = new Map();
        // Players
        this.playerConnections = new Map();
        // Channels
        this.channels = new Map();
        // Lag compensation
        this.predictionState = {
            predictedTick: 0,
            lastAckedTick: 0,
            pendingInputs: [],
            serverSnapshots: [],
        };
        // Tick rate
        this.tickRate = 60; // Server tick rate
        this.sendRate = 30; // Network send rate
        this.currentTick = 0;
        // RPC registry
        this.rpcRegistry = new Map();
        this.rtcConnections = new Map();
        this.dataChannels = new Map();
        // Events
        this.onConnectionStateChangedEmitter = new common_1.Emitter();
        this.onConnectionStateChanged = this.onConnectionStateChangedEmitter.event;
        this.onPlayerJoinedEmitter = new common_1.Emitter();
        this.onPlayerJoined = this.onPlayerJoinedEmitter.event;
        this.onPlayerLeftEmitter = new common_1.Emitter();
        this.onPlayerLeft = this.onPlayerLeftEmitter.event;
        this.onObjectSpawnedEmitter = new common_1.Emitter();
        this.onObjectSpawned = this.onObjectSpawnedEmitter.event;
        this.onObjectDestroyedEmitter = new common_1.Emitter();
        this.onObjectDestroyed = this.onObjectDestroyedEmitter.event;
        this.onRPCReceivedEmitter = new common_1.Emitter();
        this.onRPCReceived = this.onRPCReceivedEmitter.event;
    }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    async initialize() {
        // Setup default channels
        this.setupDefaultChannels();
        // Register built-in RPCs
        this.registerBuiltInRPCs();
    }
    setupDefaultChannels() {
        this.channels.set(0, {
            id: 0,
            type: ChannelType.ReliableOrdered,
            priority: 100,
        });
        this.channels.set(1, {
            id: 1,
            type: ChannelType.UnreliableSequenced,
            priority: 50,
        });
        this.channels.set(2, {
            id: 2,
            type: ChannelType.Unreliable,
            priority: 10,
        });
    }
    registerBuiltInRPCs() {
        this.registerRPC({
            name: 'PlayerReady',
            target: RPCTarget.Server,
            reliable: true,
        });
        this.registerRPC({
            name: 'SpawnRequest',
            target: RPCTarget.Server,
            reliable: true,
            rateLimit: { callsPerSecond: 1, burstLimit: 3 },
        });
    }
    dispose() {
        this.disconnect();
        this.networkObjects.clear();
        this.playerConnections.clear();
    }
    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================
    async hostSession(config) {
        this.role = config.dedicatedServer
            ? NetworkRole.DedicatedServer
            : NetworkRole.ListenServer;
        const sessionId = this.generateSessionId();
        this.localPlayerId = this.generatePlayerId();
        this.currentSession = {
            sessionId,
            hostId: this.localPlayerId,
            maxPlayers: config.maxPlayers,
            currentPlayers: config.dedicatedServer ? 0 : 1,
            isPrivate: config.isPrivate || false,
            password: config.password,
            gameMode: config.gameMode,
            mapName: config.mapName,
            state: 'lobby',
            players: new Map(),
            objects: new Map(),
            settings: {},
        };
        // Add host as player (if not dedicated server)
        if (!config.dedicatedServer) {
            this.addLocalPlayer();
        }
        // Start server tick loop
        this.startServerLoop();
        this.setConnectionState(ConnectionState.InSession);
        return this.currentSession;
    }
    async joinSession(serverAddress, playerName) {
        this.role = NetworkRole.Client;
        this.setConnectionState(ConnectionState.Connecting);
        try {
            // Connect via WebSocket
            this.webSocket = new WebSocket(serverAddress);
            await new Promise((resolve, reject) => {
                this.webSocket.onopen = () => {
                    this.setConnectionState(ConnectionState.Authenticating);
                    resolve();
                };
                this.webSocket.onerror = (e) => reject(e);
            });
            // Setup message handling
            this.webSocket.onmessage = (e) => this.handleServerMessage(e.data);
            this.webSocket.onclose = () => this.handleDisconnect();
            // Send join request
            this.sendToServer({
                type: 'join_request',
                playerName,
                timestamp: Date.now(),
            });
        }
        catch (error) {
            this.setConnectionState(ConnectionState.Disconnected);
            throw error;
        }
    }
    async disconnect() {
        this.setConnectionState(ConnectionState.Disconnecting);
        // Close WebSocket
        if (this.webSocket) {
            this.webSocket.close();
            this.webSocket = undefined;
        }
        // Close WebRTC connections
        this.rtcConnections.forEach(conn => conn.close());
        this.rtcConnections.clear();
        this.dataChannels.clear();
        // Stop voice
        await this.stopVoiceChat();
        this.currentSession = undefined;
        this.role = NetworkRole.None;
        this.setConnectionState(ConnectionState.Disconnected);
    }
    setConnectionState(state) {
        this.connectionState = state;
        this.onConnectionStateChangedEmitter.fire(state);
    }
    // ========================================================================
    // MATCHMAKING
    // ========================================================================
    async findMatch(request) {
        throw new Error(`NOT_IMPLEMENTED: matchmaking requer um serviço backend real. Configure um endpoint de matchmaking e integre aqui antes de usar (requestedMode=${request?.mode ?? 'unknown'}).`);
    }
    async cancelMatchmaking() {
        // Cancel ongoing matchmaking request
    }
    // ========================================================================
    // NETWORK OBJECT MANAGEMENT
    // ========================================================================
    registerObjectClass(classId, constructor) {
        this.objectClassRegistry.set(classId, constructor);
    }
    spawnNetworkObject(classId, ownerId) {
        const constructor = this.objectClassRegistry.get(classId);
        if (!constructor) {
            throw new Error(`Unknown network object class: ${classId}`);
        }
        const obj = new constructor();
        obj.networkId = this.generateNetworkId();
        obj.ownerId = ownerId || this.localPlayerId || '';
        obj.classId = classId;
        this.networkObjects.set(obj.networkId, obj);
        // Replicate spawn to all clients
        if (this.isServer()) {
            this.broadcastObjectSpawn(obj);
        }
        this.onObjectSpawnedEmitter.fire(obj);
        return obj;
    }
    destroyNetworkObject(networkId) {
        const obj = this.networkObjects.get(networkId);
        if (!obj)
            return;
        this.networkObjects.delete(networkId);
        // Replicate destroy to all clients
        if (this.isServer()) {
            this.broadcastObjectDestroy(networkId);
        }
        this.onObjectDestroyedEmitter.fire(networkId);
    }
    getNetworkObject(networkId) {
        return this.networkObjects.get(networkId);
    }
    startServerLoop() {
        const tickInterval = 1000 / this.tickRate;
        this.serverLoop = window.setInterval(() => {
            this.serverTick();
        }, tickInterval);
    }
    serverTick() {
        this.currentTick++;
        // 1. Process pending RPCs
        this.processRPCQueue();
        // 2. Update interest management (what's relevant to each player)
        this.updateInterestManagement();
        // 3. Replicate state to clients
        if (this.currentTick % (this.tickRate / this.sendRate) === 0) {
            this.replicateStateToClients();
        }
        // 4. Save snapshot for lag compensation
        this.saveServerSnapshot();
    }
    updateInterestManagement() {
        // For each player, determine which objects are relevant
        this.playerConnections.forEach((player, playerId) => {
            player.relevantObjects.clear();
            this.networkObjects.forEach((obj, networkId) => {
                if (obj.isRelevantTo(playerId)) {
                    player.relevantObjects.add(networkId);
                }
            });
        });
    }
    replicateStateToClients() {
        this.playerConnections.forEach((player, playerId) => {
            const updatePacket = this.buildUpdatePacket(player);
            this.sendToClient(playerId, updatePacket);
        });
    }
    buildUpdatePacket(player) {
        const encoder = new PacketEncoder();
        encoder.writeUint32(this.currentTick);
        encoder.writeUint16(player.relevantObjects.size);
        player.relevantObjects.forEach(networkId => {
            const obj = this.networkObjects.get(networkId);
            if (obj) {
                encoder.writeString(networkId);
                encoder.writeBuffer(obj.serializeDelta(player.lastAckedTick));
            }
        });
        return encoder.getBuffer();
    }
    saveServerSnapshot() {
        const snapshot = {
            tick: this.currentTick,
            timestamp: Date.now(),
            objects: new Map(),
        };
        this.networkObjects.forEach((obj, networkId) => {
            snapshot.objects.set(networkId, obj.serialize());
        });
        this.predictionState.serverSnapshots.push(snapshot);
        // Keep only last 1 second of snapshots
        const maxSnapshots = this.tickRate;
        while (this.predictionState.serverSnapshots.length > maxSnapshots) {
            this.predictionState.serverSnapshots.shift();
        }
    }
    // ========================================================================
    // CLIENT-SIDE PREDICTION
    // ========================================================================
    sendInput(input) {
        if (!this.isClient())
            return;
        // Apply input locally (prediction)
        this.applyInputLocally(input);
        // Store for reconciliation
        this.predictionState.pendingInputs.push(input);
        // Send to server
        this.sendToServer({
            type: 'input',
            data: input,
        });
    }
    applyInputLocally(input) {
        // Apply movement prediction to local player object
        const localObject = this.getLocalPlayerObject();
        if (!localObject)
            return;
        // Predicted movement logic would go here
    }
    reconcileWithServer(serverTick, serverState) {
        // Find the snapshot
        const localObject = this.getLocalPlayerObject();
        if (!localObject)
            return;
        // Apply server state
        localObject.deserialize(serverState);
        // Remove acknowledged inputs
        this.predictionState.pendingInputs =
            this.predictionState.pendingInputs.filter(i => i.tick > serverTick);
        // Re-apply pending inputs
        this.predictionState.pendingInputs.forEach(input => {
            this.applyInputLocally(input);
        });
        this.predictionState.lastAckedTick = serverTick;
    }
    getLocalPlayerObject() {
        if (!this.localPlayerId)
            return undefined;
        for (const obj of this.networkObjects.values()) {
            if (obj.ownerId === this.localPlayerId) {
                return obj;
            }
        }
        return undefined;
    }
    // ========================================================================
    // RPC SYSTEM
    // ========================================================================
    registerRPC(rpc) {
        this.rpcRegistry.set(rpc.name, rpc);
    }
    callRPC(name, params, targetClient) {
        const rpc = this.rpcRegistry.get(name);
        if (!rpc) {
            console.error(`Unknown RPC: ${name}`);
            return;
        }
        const message = {
            type: 'rpc',
            rpcName: name,
            params,
            sender: this.localPlayerId,
            timestamp: Date.now(),
        };
        switch (rpc.target) {
            case RPCTarget.Server:
                this.sendToServer(message);
                break;
            case RPCTarget.AllClients:
                this.broadcastToClients(message);
                break;
            case RPCTarget.OtherClients:
                this.broadcastToClientsExcept(message, this.localPlayerId);
                break;
            case RPCTarget.SpecificClient:
                if (targetClient) {
                    this.sendToClient(targetClient, message);
                }
                break;
        }
    }
    processRPCQueue() {
        // Process queued RPCs with rate limiting
    }
    // ========================================================================
    // VOICE CHAT
    // ========================================================================
    async startVoiceChat() {
        try {
            this.localAudioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            // Setup voice processing
            const audioContext = new AudioContext();
            await audioContext.audioWorklet.addModule('/workers/voice-processor.js');
            this.voiceProcessor = new AudioWorkletNode(audioContext, 'voice-processor');
            const source = audioContext.createMediaStreamSource(this.localAudioStream);
            source.connect(this.voiceProcessor);
            // Stream to other players via WebRTC
            this.setupVoiceStreaming();
        }
        catch (error) {
            console.error('Failed to start voice chat:', error);
        }
    }
    async stopVoiceChat() {
        if (this.localAudioStream) {
            this.localAudioStream.getTracks().forEach(track => track.stop());
            this.localAudioStream = undefined;
        }
        if (this.voiceProcessor) {
            this.voiceProcessor.disconnect();
            this.voiceProcessor = undefined;
        }
    }
    setupVoiceStreaming() {
        // Setup WebRTC peer connections for voice
        this.playerConnections.forEach((_, playerId) => {
            if (playerId !== this.localPlayerId) {
                this.createVoiceConnection(playerId);
            }
        });
    }
    async createVoiceConnection(playerId) {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        // Add local audio track
        if (this.localAudioStream) {
            this.localAudioStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localAudioStream);
            });
        }
        // Handle incoming audio
        peerConnection.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();
        };
        this.rtcConnections.set(playerId, peerConnection);
    }
    mutePlayer(playerId, muted) {
        const player = this.playerConnections.get(playerId);
        if (player) {
            player.voiceMuted = muted;
        }
    }
    // ========================================================================
    // ANTI-CHEAT
    // ========================================================================
    validatePlayerAction(playerId, action) {
        const player = this.playerConnections.get(playerId);
        if (!player)
            return false;
        // Basic validation
        // In production, would include:
        // - Speed hack detection
        // - Position validation
        // - Action rate limiting
        // - Input sequence validation
        return player.trustScore > 0.5;
    }
    reportPlayer(playerId, reason) {
        const player = this.playerConnections.get(playerId);
        if (player) {
            player.trustScore -= 0.1;
            // Log for review
            console.log(`Player ${playerId} reported: ${reason}`);
        }
    }
    // ========================================================================
    // MESSAGE HANDLING
    // ========================================================================
    handleServerMessage(data) {
        const message = JSON.parse(data);
        switch (message.type) {
            case 'join_accepted':
                this.handleJoinAccepted(message);
                break;
            case 'state_update':
                this.handleStateUpdate(message);
                break;
            case 'object_spawn':
                this.handleObjectSpawn(message);
                break;
            case 'object_destroy':
                this.handleObjectDestroy(message);
                break;
            case 'rpc':
                this.handleRPC(message);
                break;
            case 'player_joined':
                this.handlePlayerJoined(message);
                break;
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
        }
    }
    handleJoinAccepted(message) {
        this.setConnectionState(ConnectionState.InSession);
    }
    handleStateUpdate(message) {
        // Apply state updates
        Object.entries(message.objects).forEach(([networkId, stateBase64]) => {
            const obj = this.networkObjects.get(networkId);
            if (obj) {
                const buffer = this.base64ToArrayBuffer(stateBase64);
                // If this is our object, reconcile with prediction
                if (obj.ownerId === this.localPlayerId) {
                    this.reconcileWithServer(message.tick, buffer);
                }
                else {
                    // Just apply the state
                    obj.deserialize(buffer);
                }
            }
        });
    }
    handleObjectSpawn(message) {
        const constructor = this.objectClassRegistry.get(message.classId);
        if (!constructor)
            return;
        const obj = new constructor();
        obj.networkId = message.networkId;
        obj.ownerId = message.ownerId;
        obj.classId = message.classId;
        obj.deserialize(this.base64ToArrayBuffer(message.state));
        this.networkObjects.set(obj.networkId, obj);
        this.onObjectSpawnedEmitter.fire(obj);
    }
    handleObjectDestroy(message) {
        this.networkObjects.delete(message.networkId);
        this.onObjectDestroyedEmitter.fire(message.networkId);
    }
    handleRPC(message) {
        this.onRPCReceivedEmitter.fire({
            rpc: message.rpcName,
            params: message.params,
            sender: message.sender,
        });
    }
    handlePlayerJoined(message) {
        this.playerConnections.set(message.player.playerId, message.player);
        this.onPlayerJoinedEmitter.fire(message.player);
    }
    handlePlayerLeft(message) {
        this.playerConnections.delete(message.playerId);
        this.onPlayerLeftEmitter.fire(message.playerId);
    }
    handleDisconnect() {
        this.setConnectionState(ConnectionState.Disconnected);
    }
    // ========================================================================
    // SEND HELPERS
    // ========================================================================
    sendToServer(message) {
        if (this.webSocket?.readyState === WebSocket.OPEN) {
            this.webSocket.send(JSON.stringify(message));
        }
    }
    sendToClient(playerId, message) {
        // In a real implementation, use the appropriate connection
        const dataChannel = this.dataChannels.get(playerId);
        if (dataChannel?.readyState === 'open') {
            dataChannel.send(JSON.stringify(message));
        }
    }
    broadcastToClients(message) {
        this.playerConnections.forEach((_, playerId) => {
            this.sendToClient(playerId, message);
        });
    }
    broadcastToClientsExcept(message, excludeId) {
        this.playerConnections.forEach((_, playerId) => {
            if (playerId !== excludeId) {
                this.sendToClient(playerId, message);
            }
        });
    }
    broadcastObjectSpawn(obj) {
        this.broadcastToClients({
            type: 'object_spawn',
            classId: obj.classId,
            networkId: obj.networkId,
            ownerId: obj.ownerId,
            state: this.arrayBufferToBase64(obj.serialize()),
        });
    }
    broadcastObjectDestroy(networkId) {
        this.broadcastToClients({
            type: 'object_destroy',
            networkId,
        });
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    addLocalPlayer() {
        if (!this.localPlayerId || !this.currentSession)
            return;
        const localPlayer = {
            playerId: this.localPlayerId,
            connectionState: ConnectionState.InSession,
            ping: 0,
            packetLoss: 0,
            bandwidth: 0,
            playerName: 'Host',
            platform: 'web',
            region: 'local',
            ownedObjects: new Set(),
            relevantObjects: new Set(),
            lastAckedTick: 0,
            voiceEnabled: false,
            voiceMuted: false,
            trustScore: 1.0,
        };
        this.playerConnections.set(this.localPlayerId, localPlayer);
        this.currentSession.players.set(this.localPlayerId, localPlayer);
    }
    isServer() {
        return this.role === NetworkRole.Server ||
            this.role === NetworkRole.ListenServer ||
            this.role === NetworkRole.DedicatedServer;
    }
    isClient() {
        return this.role === NetworkRole.Client;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    generatePlayerId() {
        return `player_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    generateNetworkId() {
        return `net_${this.currentTick}_${Math.random().toString(36).substring(7)}`;
    }
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    getStatistics() {
        return {
            role: this.role,
            connectionState: this.connectionState,
            currentTick: this.currentTick,
            playerCount: this.playerConnections.size,
            networkObjectCount: this.networkObjects.size,
            pendingInputs: this.predictionState.pendingInputs.length,
        };
    }
};
exports.MultiplayerSystem = MultiplayerSystem;
exports.MultiplayerSystem = MultiplayerSystem = __decorate([
    (0, inversify_1.injectable)()
], MultiplayerSystem);
// ============================================================================
// PACKET ENCODER/DECODER
// ============================================================================
class PacketEncoder {
    constructor(size = 65536) {
        this.offset = 0;
        this.buffer = new ArrayBuffer(size);
        this.view = new DataView(this.buffer);
    }
    writeUint8(value) {
        this.view.setUint8(this.offset++, value);
    }
    writeUint16(value) {
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
    }
    writeUint32(value) {
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    }
    writeFloat32(value) {
        this.view.setFloat32(this.offset, value, true);
        this.offset += 4;
    }
    writeString(str) {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        this.writeUint16(bytes.length);
        new Uint8Array(this.buffer, this.offset, bytes.length).set(bytes);
        this.offset += bytes.length;
    }
    writeBuffer(data) {
        this.writeUint32(data.byteLength);
        new Uint8Array(this.buffer, this.offset, data.byteLength).set(new Uint8Array(data));
        this.offset += data.byteLength;
    }
    getBuffer() {
        return this.buffer.slice(0, this.offset);
    }
}
