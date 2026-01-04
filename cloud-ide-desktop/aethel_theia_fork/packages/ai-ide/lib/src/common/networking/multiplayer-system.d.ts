import { Event } from '@theia/core/lib/common';
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
export type NetworkId = string;
export type PlayerId = string;
export type SessionId = string;
export declare enum NetworkRole {
    None = "none",
    Client = "client",
    Server = "server",
    ListenServer = "listen_server",
    DedicatedServer = "dedicated_server"
}
export declare enum ConnectionState {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
    Authenticating = "authenticating",
    JoiningSession = "joining_session",
    InSession = "in_session",
    Disconnecting = "disconnecting"
}
export declare enum ReplicationMode {
    /** Only server can modify */
    ServerOnly = "server_only",
    /** Owner client can modify */
    OwnerOnly = "owner_only",
    /** Any client can modify (rare) */
    Multicast = "multicast"
}
export declare enum ChannelType {
    /** Guaranteed delivery, ordered */
    ReliableOrdered = "reliable_ordered",
    /** Guaranteed delivery, unordered */
    ReliableUnordered = "reliable_unordered",
    /** No guarantee, may drop */
    Unreliable = "unreliable",
    /** No guarantee, only latest matters */
    UnreliableSequenced = "unreliable_sequenced"
}
export interface NetworkChannel {
    id: number;
    type: ChannelType;
    priority: number;
    bandwidthLimit?: number;
}
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
export declare enum RPCTarget {
    /** Server only */
    Server = "server",
    /** Owning client */
    OwningClient = "owning_client",
    /** All clients */
    AllClients = "all_clients",
    /** All clients except caller */
    OtherClients = "other_clients",
    /** Specific client */
    SpecificClient = "specific_client"
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
export declare class MultiplayerSystem {
    private role;
    private connectionState;
    private currentSession?;
    private localPlayerId?;
    private networkObjects;
    private objectClassRegistry;
    private playerConnections;
    private channels;
    private predictionState;
    private tickRate;
    private sendRate;
    private currentTick;
    private rpcRegistry;
    private webSocket?;
    private rtcConnections;
    private dataChannels;
    private localAudioStream?;
    private voiceProcessor?;
    private readonly onConnectionStateChangedEmitter;
    readonly onConnectionStateChanged: Event<ConnectionState>;
    private readonly onPlayerJoinedEmitter;
    readonly onPlayerJoined: Event<PlayerConnection>;
    private readonly onPlayerLeftEmitter;
    readonly onPlayerLeft: Event<string>;
    private readonly onObjectSpawnedEmitter;
    readonly onObjectSpawned: Event<NetworkObject>;
    private readonly onObjectDestroyedEmitter;
    readonly onObjectDestroyed: Event<string>;
    private readonly onRPCReceivedEmitter;
    readonly onRPCReceived: Event<{
        rpc: string;
        params: unknown;
        sender: PlayerId;
    }>;
    initialize(): Promise<void>;
    private setupDefaultChannels;
    private registerBuiltInRPCs;
    dispose(): void;
    hostSession(config: {
        maxPlayers: number;
        gameMode: string;
        mapName: string;
        isPrivate?: boolean;
        password?: string;
        dedicatedServer?: boolean;
    }): Promise<GameSession>;
    joinSession(serverAddress: string, playerName: string): Promise<void>;
    disconnect(): Promise<void>;
    private setConnectionState;
    findMatch(request: MatchmakingRequest): Promise<MatchmakingResult>;
    cancelMatchmaking(): Promise<void>;
    registerObjectClass(classId: string, constructor: new () => NetworkObject): void;
    spawnNetworkObject(classId: string, ownerId?: PlayerId): NetworkObject;
    destroyNetworkObject(networkId: NetworkId): void;
    getNetworkObject(networkId: NetworkId): NetworkObject | undefined;
    private serverLoop?;
    private startServerLoop;
    private serverTick;
    private updateInterestManagement;
    private replicateStateToClients;
    private buildUpdatePacket;
    private saveServerSnapshot;
    sendInput(input: InputSnapshot): void;
    private applyInputLocally;
    private reconcileWithServer;
    private getLocalPlayerObject;
    registerRPC(rpc: RPC): void;
    callRPC(name: string, params: unknown, targetClient?: PlayerId): void;
    private processRPCQueue;
    startVoiceChat(): Promise<void>;
    stopVoiceChat(): Promise<void>;
    private setupVoiceStreaming;
    private createVoiceConnection;
    mutePlayer(playerId: PlayerId, muted: boolean): void;
    private validatePlayerAction;
    reportPlayer(playerId: PlayerId, reason: string): void;
    private handleServerMessage;
    private handleJoinAccepted;
    private handleStateUpdate;
    private handleObjectSpawn;
    private handleObjectDestroy;
    private handleRPC;
    private handlePlayerJoined;
    private handlePlayerLeft;
    private handleDisconnect;
    private sendToServer;
    private sendToClient;
    private broadcastToClients;
    private broadcastToClientsExcept;
    private broadcastObjectSpawn;
    private broadcastObjectDestroy;
    private addLocalPlayer;
    isServer(): boolean;
    isClient(): boolean;
    private generateSessionId;
    private generatePlayerId;
    private generateNetworkId;
    private arrayBufferToBase64;
    private base64ToArrayBuffer;
    getStatistics(): NetworkStatistics;
}
export interface NetworkStatistics {
    role: NetworkRole;
    connectionState: ConnectionState;
    currentTick: number;
    playerCount: number;
    networkObjectCount: number;
    pendingInputs: number;
}
