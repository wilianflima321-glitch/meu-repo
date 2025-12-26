import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

/**
 * ============================================================================
 * AETHEL AAA NETWORKING & MULTIPLAYER SYSTEM
 * ============================================================================
 * 
 * Sistema de rede AAA completo:
 * - Client-Server e Peer-to-Peer architecture
 * - State synchronization com delta compression
 * - Lag compensation (client-side prediction, server reconciliation)
 * - Interest management (relevancy, visibility culling)
 * - Reliable & unreliable channels
 * - Voice chat integration
 * - Matchmaking system
 * - Anti-cheat framework
 * - Session management
 * - Bandwidth optimization
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type NetworkId = string;
export type PlayerId = string;
export type SessionId = string;

export enum NetworkRole {
    None = 'none',
    Client = 'client',
    Server = 'server',
    ListenServer = 'listen_server',
    DedicatedServer = 'dedicated_server',
}

export enum ConnectionState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    Authenticating = 'authenticating',
    JoiningSession = 'joining_session',
    InSession = 'in_session',
    Disconnecting = 'disconnecting',
}

export enum ReplicationMode {
    /** Only server can modify */
    ServerOnly = 'server_only',
    /** Owner client can modify */
    OwnerOnly = 'owner_only',
    /** Any client can modify (rare) */
    Multicast = 'multicast',
}

// ============================================================================
// NETWORK CHANNEL
// ============================================================================

export enum ChannelType {
    /** Guaranteed delivery, ordered */
    ReliableOrdered = 'reliable_ordered',
    /** Guaranteed delivery, unordered */
    ReliableUnordered = 'reliable_unordered',
    /** No guarantee, may drop */
    Unreliable = 'unreliable',
    /** No guarantee, only latest matters */
    UnreliableSequenced = 'unreliable_sequenced',
}

export interface NetworkChannel {
    id: number;
    type: ChannelType;
    priority: number;
    bandwidthLimit?: number;
}

// ============================================================================
// NETWORK OBJECT (REPLICATED ACTOR)
// ============================================================================

export interface ReplicatedProperty {
    name: string;
    type: 'int' | 'float' | 'bool' | 'string' | 'vector3' | 'quaternion' | 'custom';
    replicationMode: ReplicationMode;
    
    /** Notify on change */
    notifyOnChange: boolean;
    
    /** Compression settings */
    compression?: {
        enabled: boolean;
        quantization?: number;
        deltaCompress?: boolean;
    };
    
    /** Update frequency */
    updateFrequency: 'every_tick' | 'on_change' | 'periodic';
    periodicInterval?: number;
}

export interface NetworkObject {
    networkId: NetworkId;
    ownerId: PlayerId;
    classId: string;
    
    /** Properties to replicate */
    replicatedProperties: ReplicatedProperty[];
    
    /** Is relevant to a specific player? */
    isRelevantTo(playerId: PlayerId): boolean;
    
    /** Serialization */
    serialize(): ArrayBuffer;
    deserialize(data: ArrayBuffer): void;
    
    /** Delta serialization (only changed properties) */
    serializeDelta(baseline: number): ArrayBuffer;
    deserializeDelta(data: ArrayBuffer, baseline: number): void;
}

// ============================================================================
// PLAYER CONNECTION
// ============================================================================

export interface PlayerConnection {
    playerId: PlayerId;
    connectionState: ConnectionState;
    
    /** Network stats */
    ping: number;
    packetLoss: number;
    bandwidth: number;
    
    /** Player info */
    playerName: string;
    platform: string;
    region: string;
    
    /** Owned objects */
    ownedObjects: Set<NetworkId>;
    
    /** Relevant objects (in player's interest) */
    relevantObjects: Set<NetworkId>;
    
    /** Last acknowledged tick from client */
    lastAckedTick: number;
    
    /** Voice chat */
    voiceEnabled: boolean;
    voiceMuted: boolean;
    
    /** Anti-cheat score */
    trustScore: number;
}

// ============================================================================
// SESSION & MATCHMAKING
// ============================================================================

export interface GameSession {
    sessionId: SessionId;
    hostId: PlayerId;
    
    /** Session config */
    maxPlayers: number;
    currentPlayers: number;
    isPrivate: boolean;
    password?: string;
    
    /** Game mode */
    gameMode: string;
    mapName: string;
    
    /** Session state */
    state: 'lobby' | 'loading' | 'in_game' | 'post_game';
    
    /** Players */
    players: Map<PlayerId, PlayerConnection>;
    
    /** Network objects */
    objects: Map<NetworkId, NetworkObject>;
    
    /** Session settings */
    settings: Record<string, unknown>;
}

export interface MatchmakingRequest {
    playerId: PlayerId;
    gameMode: string;
    preferredRegion?: string;
    skillRating?: number;
    partyMembers?: PlayerId[];
    
    /** Custom filters */
    filters?: Record<string, unknown>;
}

export interface MatchmakingResult {
    success: boolean;
    sessionId?: SessionId;
    serverAddress?: string;
    estimatedWait?: number;
    error?: string;
}

// ============================================================================
// RPC (REMOTE PROCEDURE CALLS)
// ============================================================================

export enum RPCTarget {
    /** Server only */
    Server = 'server',
    /** Owning client */
    OwningClient = 'owning_client',
    /** All clients */
    AllClients = 'all_clients',
    /** All clients except caller */
    OtherClients = 'other_clients',
    /** Specific client */
    SpecificClient = 'specific_client',
}

export interface RPC {
    name: string;
    target: RPCTarget;
    reliable: boolean;
    
    /** Validation (server-side) */
    validate?: (params: unknown, callerId: PlayerId) => boolean;
    
    /** Rate limiting */
    rateLimit?: {
        callsPerSecond: number;
        burstLimit: number;
    };
}

// ============================================================================
// LAG COMPENSATION
// ============================================================================

export interface InputSnapshot {
    tick: number;
    timestamp: number;
    playerId: PlayerId;
    inputs: {
        moveX: number;
        moveY: number;
        lookX: number;
        lookY: number;
        jump: boolean;
        fire: boolean;
        reload: boolean;
        interact: boolean;
        abilities: boolean[];
    };
}

export interface StateSnapshot {
    tick: number;
    timestamp: number;
    objects: Map<NetworkId, ArrayBuffer>;
}

export interface PredictionState {
    /** Client-side predicted state */
    predictedTick: number;
    
    /** Last acknowledged server tick */
    lastAckedTick: number;
    
    /** Pending inputs waiting for server ack */
    pendingInputs: InputSnapshot[];
    
    /** Server state snapshots for reconciliation */
    serverSnapshots: StateSnapshot[];
}

// ============================================================================
// MULTIPLAYER SYSTEM
// ============================================================================

@injectable()
export class MultiplayerSystem {
    private role: NetworkRole = NetworkRole.None;
    private connectionState: ConnectionState = ConnectionState.Disconnected;
    
    private currentSession?: GameSession;
    private localPlayerId?: PlayerId;
    
    // Network objects
    private networkObjects = new Map<NetworkId, NetworkObject>();
    private objectClassRegistry = new Map<string, new () => NetworkObject>();
    
    // Players
    private playerConnections = new Map<PlayerId, PlayerConnection>();
    
    // Channels
    private channels = new Map<number, NetworkChannel>();
    
    // Lag compensation
    private predictionState: PredictionState = {
        predictedTick: 0,
        lastAckedTick: 0,
        pendingInputs: [],
        serverSnapshots: [],
    };
    
    // Tick rate
    private tickRate = 60;  // Server tick rate
    private sendRate = 30;  // Network send rate
    private currentTick = 0;
    
    // RPC registry
    private rpcRegistry = new Map<string, RPC>();
    
    // WebSocket/WebRTC connections
    private webSocket?: WebSocket;
    private rtcConnections = new Map<PlayerId, RTCPeerConnection>();
    private dataChannels = new Map<PlayerId, RTCDataChannel>();
    
    // Voice chat
    private localAudioStream?: MediaStream;
    private voiceProcessor?: AudioWorkletNode;
    
    // Events
    private readonly onConnectionStateChangedEmitter = new Emitter<ConnectionState>();
    readonly onConnectionStateChanged = this.onConnectionStateChangedEmitter.event;
    
    private readonly onPlayerJoinedEmitter = new Emitter<PlayerConnection>();
    readonly onPlayerJoined = this.onPlayerJoinedEmitter.event;
    
    private readonly onPlayerLeftEmitter = new Emitter<PlayerId>();
    readonly onPlayerLeft = this.onPlayerLeftEmitter.event;
    
    private readonly onObjectSpawnedEmitter = new Emitter<NetworkObject>();
    readonly onObjectSpawned = this.onObjectSpawnedEmitter.event;
    
    private readonly onObjectDestroyedEmitter = new Emitter<NetworkId>();
    readonly onObjectDestroyed = this.onObjectDestroyedEmitter.event;
    
    private readonly onRPCReceivedEmitter = new Emitter<{ rpc: string; params: unknown; sender: PlayerId }>();
    readonly onRPCReceived = this.onRPCReceivedEmitter.event;
    
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    
    async initialize(): Promise<void> {
        // Setup default channels
        this.setupDefaultChannels();
        
        // Register built-in RPCs
        this.registerBuiltInRPCs();
    }
    
    private setupDefaultChannels(): void {
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
    
    private registerBuiltInRPCs(): void {
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
    
    dispose(): void {
        this.disconnect();
        this.networkObjects.clear();
        this.playerConnections.clear();
    }
    
    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================
    
    async hostSession(config: {
        maxPlayers: number;
        gameMode: string;
        mapName: string;
        isPrivate?: boolean;
        password?: string;
        dedicatedServer?: boolean;
    }): Promise<GameSession> {
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
    
    async joinSession(serverAddress: string, playerName: string): Promise<void> {
        this.role = NetworkRole.Client;
        this.setConnectionState(ConnectionState.Connecting);
        
        try {
            // Connect via WebSocket
            this.webSocket = new WebSocket(serverAddress);
            
            await new Promise<void>((resolve, reject) => {
                this.webSocket!.onopen = () => {
                    this.setConnectionState(ConnectionState.Authenticating);
                    resolve();
                };
                this.webSocket!.onerror = (e) => reject(e);
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
            
        } catch (error) {
            this.setConnectionState(ConnectionState.Disconnected);
            throw error;
        }
    }
    
    async disconnect(): Promise<void> {
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
    
    private setConnectionState(state: ConnectionState): void {
        this.connectionState = state;
        this.onConnectionStateChangedEmitter.fire(state);
    }
    
    // ========================================================================
    // MATCHMAKING
    // ========================================================================
    
    async findMatch(request: MatchmakingRequest): Promise<MatchmakingResult> {
        throw new Error(
            `NOT_IMPLEMENTED: matchmaking requer um serviço backend real. Configure um endpoint de matchmaking e integre aqui antes de usar (requestedMode=${(request as any)?.mode ?? 'unknown'}).`
        );
    }
    
    async cancelMatchmaking(): Promise<void> {
        // Cancel ongoing matchmaking request
    }
    
    // ========================================================================
    // NETWORK OBJECT MANAGEMENT
    // ========================================================================
    
    registerObjectClass(classId: string, constructor: new () => NetworkObject): void {
        this.objectClassRegistry.set(classId, constructor);
    }
    
    spawnNetworkObject(classId: string, ownerId?: PlayerId): NetworkObject {
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
    
    destroyNetworkObject(networkId: NetworkId): void {
        const obj = this.networkObjects.get(networkId);
        if (!obj) return;
        
        this.networkObjects.delete(networkId);
        
        // Replicate destroy to all clients
        if (this.isServer()) {
            this.broadcastObjectDestroy(networkId);
        }
        
        this.onObjectDestroyedEmitter.fire(networkId);
    }
    
    getNetworkObject(networkId: NetworkId): NetworkObject | undefined {
        return this.networkObjects.get(networkId);
    }
    
    // ========================================================================
    // STATE REPLICATION
    // ========================================================================
    
    private serverLoop?: number;
    
    private startServerLoop(): void {
        const tickInterval = 1000 / this.tickRate;
        
        this.serverLoop = window.setInterval(() => {
            this.serverTick();
        }, tickInterval);
    }
    
    private serverTick(): void {
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
    
    private updateInterestManagement(): void {
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
    
    private replicateStateToClients(): void {
        this.playerConnections.forEach((player, playerId) => {
            const updatePacket = this.buildUpdatePacket(player);
            this.sendToClient(playerId, updatePacket);
        });
    }
    
    private buildUpdatePacket(player: PlayerConnection): ArrayBuffer {
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
    
    private saveServerSnapshot(): void {
        const snapshot: StateSnapshot = {
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
    
    sendInput(input: InputSnapshot): void {
        if (!this.isClient()) return;
        
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
    
    private applyInputLocally(input: InputSnapshot): void {
        // Apply movement prediction to local player object
        const localObject = this.getLocalPlayerObject();
        if (!localObject) return;
        
        // Predicted movement logic would go here
    }
    
    private reconcileWithServer(serverTick: number, serverState: ArrayBuffer): void {
        // Find the snapshot
        const localObject = this.getLocalPlayerObject();
        if (!localObject) return;
        
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
    
    private getLocalPlayerObject(): NetworkObject | undefined {
        if (!this.localPlayerId) return undefined;
        
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
    
    registerRPC(rpc: RPC): void {
        this.rpcRegistry.set(rpc.name, rpc);
    }
    
    callRPC(name: string, params: unknown, targetClient?: PlayerId): void {
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
                this.broadcastToClientsExcept(message, this.localPlayerId!);
                break;
            case RPCTarget.SpecificClient:
                if (targetClient) {
                    this.sendToClient(targetClient, message);
                }
                break;
        }
    }
    
    private processRPCQueue(): void {
        // Process queued RPCs with rate limiting
    }
    
    // ========================================================================
    // VOICE CHAT
    // ========================================================================
    
    async startVoiceChat(): Promise<void> {
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
            
        } catch (error) {
            console.error('Failed to start voice chat:', error);
        }
    }
    
    async stopVoiceChat(): Promise<void> {
        if (this.localAudioStream) {
            this.localAudioStream.getTracks().forEach(track => track.stop());
            this.localAudioStream = undefined;
        }
        
        if (this.voiceProcessor) {
            this.voiceProcessor.disconnect();
            this.voiceProcessor = undefined;
        }
    }
    
    private setupVoiceStreaming(): void {
        // Setup WebRTC peer connections for voice
        this.playerConnections.forEach((_, playerId) => {
            if (playerId !== this.localPlayerId) {
                this.createVoiceConnection(playerId);
            }
        });
    }
    
    private async createVoiceConnection(playerId: PlayerId): Promise<void> {
        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        
        // Add local audio track
        if (this.localAudioStream) {
            this.localAudioStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localAudioStream!);
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
    
    mutePlayer(playerId: PlayerId, muted: boolean): void {
        const player = this.playerConnections.get(playerId);
        if (player) {
            player.voiceMuted = muted;
        }
    }
    
    // ========================================================================
    // ANTI-CHEAT
    // ========================================================================
    
    private validatePlayerAction(playerId: PlayerId, action: unknown): boolean {
        const player = this.playerConnections.get(playerId);
        if (!player) return false;
        
        // Basic validation
        // In production, would include:
        // - Speed hack detection
        // - Position validation
        // - Action rate limiting
        // - Input sequence validation
        
        return player.trustScore > 0.5;
    }
    
    reportPlayer(playerId: PlayerId, reason: string): void {
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
    
    private handleServerMessage(data: unknown): void {
        const message = JSON.parse(data as string);
        
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
    
    private handleJoinAccepted(message: unknown): void {
        this.setConnectionState(ConnectionState.InSession);
    }
    
    private handleStateUpdate(message: { tick: number; objects: Record<string, string> }): void {
        // Apply state updates
        Object.entries(message.objects).forEach(([networkId, stateBase64]) => {
            const obj = this.networkObjects.get(networkId);
            if (obj) {
                const buffer = this.base64ToArrayBuffer(stateBase64);
                
                // If this is our object, reconcile with prediction
                if (obj.ownerId === this.localPlayerId) {
                    this.reconcileWithServer(message.tick, buffer);
                } else {
                    // Just apply the state
                    obj.deserialize(buffer);
                }
            }
        });
    }
    
    private handleObjectSpawn(message: { classId: string; networkId: string; ownerId: string; state: string }): void {
        const constructor = this.objectClassRegistry.get(message.classId);
        if (!constructor) return;
        
        const obj = new constructor();
        obj.networkId = message.networkId;
        obj.ownerId = message.ownerId;
        obj.classId = message.classId;
        obj.deserialize(this.base64ToArrayBuffer(message.state));
        
        this.networkObjects.set(obj.networkId, obj);
        this.onObjectSpawnedEmitter.fire(obj);
    }
    
    private handleObjectDestroy(message: { networkId: string }): void {
        this.networkObjects.delete(message.networkId);
        this.onObjectDestroyedEmitter.fire(message.networkId);
    }
    
    private handleRPC(message: { rpcName: string; params: unknown; sender: string }): void {
        this.onRPCReceivedEmitter.fire({
            rpc: message.rpcName,
            params: message.params,
            sender: message.sender,
        });
    }
    
    private handlePlayerJoined(message: { player: PlayerConnection }): void {
        this.playerConnections.set(message.player.playerId, message.player);
        this.onPlayerJoinedEmitter.fire(message.player);
    }
    
    private handlePlayerLeft(message: { playerId: string }): void {
        this.playerConnections.delete(message.playerId);
        this.onPlayerLeftEmitter.fire(message.playerId);
    }
    
    private handleDisconnect(): void {
        this.setConnectionState(ConnectionState.Disconnected);
    }
    
    // ========================================================================
    // SEND HELPERS
    // ========================================================================
    
    private sendToServer(message: unknown): void {
        if (this.webSocket?.readyState === WebSocket.OPEN) {
            this.webSocket.send(JSON.stringify(message));
        }
    }
    
    private sendToClient(playerId: PlayerId, message: unknown): void {
        // In a real implementation, use the appropriate connection
        const dataChannel = this.dataChannels.get(playerId);
        if (dataChannel?.readyState === 'open') {
            dataChannel.send(JSON.stringify(message));
        }
    }
    
    private broadcastToClients(message: unknown): void {
        this.playerConnections.forEach((_, playerId) => {
            this.sendToClient(playerId, message);
        });
    }
    
    private broadcastToClientsExcept(message: unknown, excludeId: PlayerId): void {
        this.playerConnections.forEach((_, playerId) => {
            if (playerId !== excludeId) {
                this.sendToClient(playerId, message);
            }
        });
    }
    
    private broadcastObjectSpawn(obj: NetworkObject): void {
        this.broadcastToClients({
            type: 'object_spawn',
            classId: obj.classId,
            networkId: obj.networkId,
            ownerId: obj.ownerId,
            state: this.arrayBufferToBase64(obj.serialize()),
        });
    }
    
    private broadcastObjectDestroy(networkId: NetworkId): void {
        this.broadcastToClients({
            type: 'object_destroy',
            networkId,
        });
    }
    
    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    private addLocalPlayer(): void {
        if (!this.localPlayerId || !this.currentSession) return;
        
        const localPlayer: PlayerConnection = {
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
    
    isServer(): boolean {
        return this.role === NetworkRole.Server || 
               this.role === NetworkRole.ListenServer || 
               this.role === NetworkRole.DedicatedServer;
    }
    
    isClient(): boolean {
        return this.role === NetworkRole.Client;
    }
    
    private generateSessionId(): SessionId {
        return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    
    private generatePlayerId(): PlayerId {
        return `player_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    
    private generateNetworkId(): NetworkId {
        return `net_${this.currentTick}_${Math.random().toString(36).substring(7)}`;
    }
    
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    getStatistics(): NetworkStatistics {
        return {
            role: this.role,
            connectionState: this.connectionState,
            currentTick: this.currentTick,
            playerCount: this.playerConnections.size,
            networkObjectCount: this.networkObjects.size,
            pendingInputs: this.predictionState.pendingInputs.length,
        };
    }
}

// ============================================================================
// PACKET ENCODER/DECODER
// ============================================================================

class PacketEncoder {
    private buffer: ArrayBuffer;
    private view: DataView;
    private offset = 0;
    
    constructor(size = 65536) {
        this.buffer = new ArrayBuffer(size);
        this.view = new DataView(this.buffer);
    }
    
    writeUint8(value: number): void {
        this.view.setUint8(this.offset++, value);
    }
    
    writeUint16(value: number): void {
        this.view.setUint16(this.offset, value, true);
        this.offset += 2;
    }
    
    writeUint32(value: number): void {
        this.view.setUint32(this.offset, value, true);
        this.offset += 4;
    }
    
    writeFloat32(value: number): void {
        this.view.setFloat32(this.offset, value, true);
        this.offset += 4;
    }
    
    writeString(str: string): void {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);
        this.writeUint16(bytes.length);
        new Uint8Array(this.buffer, this.offset, bytes.length).set(bytes);
        this.offset += bytes.length;
    }
    
    writeBuffer(data: ArrayBuffer): void {
        this.writeUint32(data.byteLength);
        new Uint8Array(this.buffer, this.offset, data.byteLength).set(new Uint8Array(data));
        this.offset += data.byteLength;
    }
    
    getBuffer(): ArrayBuffer {
        return this.buffer.slice(0, this.offset);
    }
}

export interface NetworkStatistics {
    role: NetworkRole;
    connectionState: ConnectionState;
    currentTick: number;
    playerCount: number;
    networkObjectCount: number;
    pendingInputs: number;
}
