/**
 * Networking & Multiplayer System - Sistema de Rede e Multiplayer
 * 
 * Sistema completo de rede com:
 * - WebSocket/WebRTC communication
 * - State synchronization
 * - Lobby system
 * - P2P & Server-authoritative modes
 * - Network entity interpolation
 * - Lag compensation
 * - Voice chat integration ready
 * 
 * @module lib/networking/multiplayer-system
 */

import { EventEmitter } from 'events';
import * as THREE from 'three';

import { WebSocketTransport } from './multiplayer-transport';
import type { NetworkTransport } from './multiplayer-transport';
import type {
  ConnectionState,
  InputSnapshot,
  LobbyInfo,
  NetworkConfig,
  NetworkEntity,
  NetworkMessage,
  NetworkMode,
  Player,
  PlayerState,
  RPCCall,
  SyncMode,
  SyncedVariable,
} from './multiplayer-types';
export type { NetworkTransport } from './multiplayer-transport';
export { WebSocketTransport } from './multiplayer-transport';
export type {
  ConnectionState,
  InputSnapshot,
  LobbyInfo,
  NetworkConfig,
  NetworkEntity,
  NetworkMessage,
  NetworkMode,
  Player,
  PlayerState,
  RPCCall,
  SyncMode,
  SyncedVariable,
} from './multiplayer-types';

// ============================================================================
// STATE SYNCHRONIZATION
// ============================================================================

export class StateSynchronizer {
  private syncedVars: Map<string, SyncedVariable> = new Map();
  private dirtyVars: Set<string> = new Set();
  private interpolationBuffer: Map<string, { value: unknown; timestamp: number }[]> = new Map();
  private interpolationDelay: number;
  
  constructor(interpolationDelay = 100) {
    this.interpolationDelay = interpolationDelay;
  }
  
  register(name: string, initialValue: unknown, mode: SyncMode, owner: string): void {
    this.syncedVars.set(name, {
      name,
      value: initialValue,
      mode,
      owner,
      lastUpdate: Date.now(),
    });
    this.interpolationBuffer.set(name, []);
  }
  
  unregister(name: string): void {
    this.syncedVars.delete(name);
    this.interpolationBuffer.delete(name);
  }
  
  set(name: string, value: unknown, localPlayerId: string): void {
    const syncVar = this.syncedVars.get(name);
    if (!syncVar) return;
    
    // Only owner can modify
    if (syncVar.owner !== localPlayerId && syncVar.owner !== 'any') return;
    
    syncVar.value = value;
    syncVar.lastUpdate = Date.now();
    this.dirtyVars.add(name);
  }
  
  get<T>(name: string): T | undefined {
    return this.syncedVars.get(name)?.value as T;
  }
  
  receiveUpdate(name: string, value: unknown, timestamp: number): void {
    const syncVar = this.syncedVars.get(name);
    if (!syncVar) return;
    
    // Add to interpolation buffer
    const buffer = this.interpolationBuffer.get(name);
    if (buffer) {
      buffer.push({ value, timestamp });
      
      // Keep only recent values
      const cutoff = timestamp - this.interpolationDelay * 3;
      while (buffer.length > 1 && buffer[0].timestamp < cutoff) {
        buffer.shift();
      }
    }
    
    // For state mode, update immediately
    if (syncVar.mode === 'state') {
      syncVar.value = value;
      syncVar.lastUpdate = timestamp;
    }
  }
  
  interpolate(currentTime: number): void {
    const targetTime = currentTime - this.interpolationDelay;
    
    for (const [name, buffer] of this.interpolationBuffer) {
      if (buffer.length < 2) continue;
      
      const syncVar = this.syncedVars.get(name);
      if (!syncVar || syncVar.mode === 'state') continue;
      
      // Find surrounding samples
      let from = buffer[0];
      let to = buffer[1];
      
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i].timestamp <= targetTime && buffer[i + 1].timestamp >= targetTime) {
          from = buffer[i];
          to = buffer[i + 1];
          break;
        }
      }
      
      // Interpolate
      const t = (targetTime - from.timestamp) / (to.timestamp - from.timestamp);
      syncVar.value = this.interpolateValue(from.value, to.value, Math.max(0, Math.min(1, t)));
    }
  }
  
  private interpolateValue(from: unknown, to: unknown, t: number): unknown {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * t;
    }
    
    if (typeof from === 'object' && from !== null && typeof to === 'object' && to !== null) {
      const result: Record<string, unknown> = {};
      
      for (const key of Object.keys(from as Record<string, unknown>)) {
        result[key] = this.interpolateValue(
          (from as Record<string, unknown>)[key],
          (to as Record<string, unknown>)[key],
          t
        );
      }
      
      return result;
    }
    
    return t < 0.5 ? from : to;
  }
  
  getDirtyVars(): Map<string, SyncedVariable> {
    const dirty = new Map<string, SyncedVariable>();
    
    for (const name of this.dirtyVars) {
      const syncVar = this.syncedVars.get(name);
      if (syncVar) {
        dirty.set(name, syncVar);
      }
    }
    
    this.dirtyVars.clear();
    return dirty;
  }
  
  getAllVars(): Map<string, SyncedVariable> {
    return new Map(this.syncedVars);
  }
}

// ============================================================================
// INPUT PREDICTION
// ============================================================================

export class InputPredictor {
  private inputHistory: InputSnapshot[] = [];
  private maxHistoryLength: number;
  private currentTick = 0;
  
  constructor(maxHistoryLength = 120) {
    this.maxHistoryLength = maxHistoryLength;
  }
  
  recordInput(inputs: Record<string, unknown>, position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number; w: number }): InputSnapshot {
    const snapshot: InputSnapshot = {
      tick: this.currentTick++,
      timestamp: Date.now(),
      inputs,
      position,
      rotation,
    };
    
    this.inputHistory.push(snapshot);
    
    // Trim old history
    while (this.inputHistory.length > this.maxHistoryLength) {
      this.inputHistory.shift();
    }
    
    return snapshot;
  }
  
  getInputsAfterTick(tick: number): InputSnapshot[] {
    return this.inputHistory.filter((s) => s.tick > tick);
  }
  
  reconcile(
    serverTick: number,
    serverPosition: { x: number; y: number; z: number },
    serverRotation: { x: number; y: number; z: number; w: number },
    applyInput: (input: Record<string, unknown>, dt: number) => { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } }
  ): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } } {
    // Find the snapshot matching server tick
    const serverSnapshotIndex = this.inputHistory.findIndex((s) => s.tick === serverTick);
    
    if (serverSnapshotIndex === -1) {
      return { position: serverPosition, rotation: serverRotation };
    }
    
    // Check if reconciliation needed
    const serverSnapshot = this.inputHistory[serverSnapshotIndex];
    const positionError = Math.sqrt(
      Math.pow(serverPosition.x - serverSnapshot.position.x, 2) +
      Math.pow(serverPosition.y - serverSnapshot.position.y, 2) +
      Math.pow(serverPosition.z - serverSnapshot.position.z, 2)
    );
    
    if (positionError < 0.01) {
      // No correction needed
      return this.inputHistory[this.inputHistory.length - 1]?.position 
        ? { position: this.inputHistory[this.inputHistory.length - 1].position, rotation: this.inputHistory[this.inputHistory.length - 1].rotation }
        : { position: serverPosition, rotation: serverRotation };
    }
    
    // Re-simulate from server state
    let currentPos = serverPosition;
    let currentRot = serverRotation;
    
    for (let i = serverSnapshotIndex + 1; i < this.inputHistory.length; i++) {
      const snapshot = this.inputHistory[i];
      const prevSnapshot = this.inputHistory[i - 1];
      const dt = (snapshot.timestamp - prevSnapshot.timestamp) / 1000;
      
      const result = applyInput(snapshot.inputs, dt);
      currentPos = result.position;
      currentRot = result.rotation;
      
      // Update history with corrected positions
      snapshot.position = currentPos;
      snapshot.rotation = currentRot;
    }
    
    return { position: currentPos, rotation: currentRot };
  }
  
  clear(): void {
    this.inputHistory = [];
    this.currentTick = 0;
  }
}

// ============================================================================
// LOBBY SYSTEM
// ============================================================================

export class LobbyManager extends EventEmitter {
  private transport: NetworkTransport;
  private currentLobby: LobbyInfo | null = null;
  private lobbies: Map<string, LobbyInfo> = new Map();
  
  constructor(transport: NetworkTransport) {
    super();
    this.transport = transport;
    this.setupMessageHandlers();
  }
  
  private setupMessageHandlers(): void {
    this.transport.onMessage((message) => {
      switch (message.type) {
        case 'lobby_list':
          this.handleLobbyList(message.data as LobbyInfo[]);
          break;
        case 'lobby_joined':
          this.handleLobbyJoined(message.data as LobbyInfo);
          break;
        case 'lobby_left':
          this.handleLobbyLeft();
          break;
        case 'lobby_updated':
          this.handleLobbyUpdated(message.data as LobbyInfo);
          break;
      }
    });
  }
  
  async refreshLobbies(): Promise<LobbyInfo[]> {
    this.transport.send({
      type: 'get_lobbies',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: null,
    });
    
    return new Promise((resolve) => {
      const handler = (lobbies: LobbyInfo[]) => {
        this.off('lobbiesUpdated', handler);
        resolve(lobbies);
      };
      this.on('lobbiesUpdated', handler);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.off('lobbiesUpdated', handler);
        resolve([]);
      }, 5000);
    });
  }
  
  async createLobby(name: string, maxPlayers: number, gameMode: string, isPrivate = false): Promise<LobbyInfo | null> {
    this.transport.send({
      type: 'create_lobby',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: { name, maxPlayers, gameMode, isPrivate },
    });
    
    return new Promise((resolve) => {
      const handler = (lobby: LobbyInfo) => {
        this.off('lobbyJoined', handler);
        resolve(lobby);
      };
      this.on('lobbyJoined', handler);
      
      setTimeout(() => {
        this.off('lobbyJoined', handler);
        resolve(null);
      }, 5000);
    });
  }
  
  async joinLobby(lobbyId: string, password?: string): Promise<boolean> {
    this.transport.send({
      type: 'join_lobby',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: { lobbyId, password },
    });
    
    return new Promise((resolve) => {
      const successHandler = () => {
        this.off('lobbyJoined', successHandler);
        this.off('lobbyJoinFailed', failHandler);
        resolve(true);
      };
      
      const failHandler = () => {
        this.off('lobbyJoined', successHandler);
        this.off('lobbyJoinFailed', failHandler);
        resolve(false);
      };
      
      this.on('lobbyJoined', successHandler);
      this.on('lobbyJoinFailed', failHandler);
      
      setTimeout(() => {
        this.off('lobbyJoined', successHandler);
        this.off('lobbyJoinFailed', failHandler);
        resolve(false);
      }, 5000);
    });
  }
  
  leaveLobby(): void {
    this.transport.send({
      type: 'leave_lobby',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: null,
    });
  }
  
  startGame(): void {
    if (!this.currentLobby) return;
    
    this.transport.send({
      type: 'start_game',
      senderId: 'local',
      timestamp: Date.now(),
      reliable: true,
      data: { lobbyId: this.currentLobby.id },
    });
  }
  
  getCurrentLobby(): LobbyInfo | null {
    return this.currentLobby;
  }
  
  getLobbies(): LobbyInfo[] {
    return Array.from(this.lobbies.values());
  }
  
  private handleLobbyList(lobbies: LobbyInfo[]): void {
    this.lobbies.clear();
    for (const lobby of lobbies) {
      this.lobbies.set(lobby.id, lobby);
    }
    this.emit('lobbiesUpdated', lobbies);
  }
  
  private handleLobbyJoined(lobby: LobbyInfo): void {
    this.currentLobby = lobby;
    this.emit('lobbyJoined', lobby);
  }
  
  private handleLobbyLeft(): void {
    this.currentLobby = null;
    this.emit('lobbyLeft');
  }
  
  private handleLobbyUpdated(lobby: LobbyInfo): void {
    if (this.currentLobby?.id === lobby.id) {
      this.currentLobby = lobby;
    }
    this.lobbies.set(lobby.id, lobby);
    this.emit('lobbyUpdated', lobby);
  }
}

// ============================================================================
// NETWORK MANAGER
// ============================================================================

export class NetworkManager extends EventEmitter {
  private config: NetworkConfig;
  private transport: NetworkTransport;
  private stateSynchronizer: StateSynchronizer;
  private inputPredictor: InputPredictor;
  private lobbyManager: LobbyManager;
  
  private players: Map<string, Player> = new Map();
  private entities: Map<string, NetworkEntity> = new Map();
  private localPlayerId: string = '';
  
  private tickInterval: NodeJS.Timeout | null = null;
  private currentTick = 0;
  private reconnectAttempts = 0;
  
  private rpcHandlers: Map<string, (...args: unknown[]) => void> = new Map();
  
  constructor(config: Partial<NetworkConfig> = {}) {
    super();
    
    this.config = {
      mode: 'client',
      maxPlayers: 16,
      tickRate: 20,
      interpolationDelay: 100,
      predictionEnabled: true,
      lagCompensation: true,
      maxReconnectAttempts: 5,
      heartbeatInterval: 5000,
      ...config,
    };
    
    this.transport = new WebSocketTransport();
    this.stateSynchronizer = new StateSynchronizer(this.config.interpolationDelay);
    this.inputPredictor = new InputPredictor();
    this.lobbyManager = new LobbyManager(this.transport);
    
    this.setupTransportHandlers();
  }
  
  private setupTransportHandlers(): void {
    this.transport.onConnect(() => {
      this.reconnectAttempts = 0;
      this.startTickLoop();
      this.emit('connected');
    });
    
    this.transport.onDisconnect((reason) => {
      this.stopTickLoop();
      this.emit('disconnected', { reason });
      
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    });
    
    this.transport.onMessage((message) => {
      this.handleMessage(message);
    });
  }
  
  async connect(serverUrl?: string): Promise<void> {
    const url = serverUrl || this.config.serverUrl;
    if (!url) throw new Error('No server URL provided');
    
    await this.transport.connect(url);
  }
  
  disconnect(): void {
    this.transport.disconnect();
    this.players.clear();
    this.entities.clear();
    this.stopTickLoop();
  }
  
  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });
    
    await new Promise((resolve) => setTimeout(resolve, 2000 * this.reconnectAttempts));
    
    try {
      await this.connect();
    } catch {
      if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.attemptReconnect();
      } else {
        this.emit('reconnectFailed');
      }
    }
  }
  
  private startTickLoop(): void {
    const tickMs = 1000 / this.config.tickRate;
    
    this.tickInterval = setInterval(() => {
      this.tick();
    }, tickMs);
  }
  
  private stopTickLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
  
  private tick(): void {
    this.currentTick++;
    
    // Interpolate remote entities
    this.stateSynchronizer.interpolate(Date.now());
    
    // Send dirty state
    const dirtyVars = this.stateSynchronizer.getDirtyVars();
    if (dirtyVars.size > 0) {
      this.sendStateUpdate(dirtyVars);
    }
    
    this.emit('tick', { tick: this.currentTick });
  }
  
  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'player_joined':
        this.handlePlayerJoined(message.data as Player);
        break;
      case 'player_left':
        this.handlePlayerLeft(message.data as { playerId: string });
        break;
      case 'player_update':
        this.handlePlayerUpdate(message.data as { playerId: string; state: Partial<PlayerState> });
        break;
      case 'state_update':
        this.handleStateUpdate(message.data as { name: string; value: unknown; timestamp: number }[]);
        break;
      case 'entity_spawn':
        this.handleEntitySpawn(message.data as NetworkEntity);
        break;
      case 'entity_despawn':
        this.handleEntityDespawn(message.data as { entityId: string });
        break;
      case 'entity_update':
        this.handleEntityUpdate(message.data as Partial<NetworkEntity> & { id: string });
        break;
      case 'rpc':
        this.handleRPC(message.data as RPCCall);
        break;
      case 'server_tick':
        this.handleServerTick(message.data as { tick: number; timestamp: number });
        break;
      case 'welcome':
        this.handleWelcome(message.data as { playerId: string; players: Player[] });
        break;
    }
  }
  
  private handleWelcome(data: { playerId: string; players: Player[] }): void {
    this.localPlayerId = data.playerId;
    
    for (const player of data.players) {
      player.isLocal = player.id === this.localPlayerId;
      this.players.set(player.id, player);
    }
    
    this.emit('welcome', { localPlayerId: this.localPlayerId });
  }
  
  private handlePlayerJoined(player: Player): void {
    player.isLocal = player.id === this.localPlayerId;
    this.players.set(player.id, player);
    this.emit('playerJoined', { player });
  }
  
  private handlePlayerLeft(data: { playerId: string }): void {
    const player = this.players.get(data.playerId);
    if (player) {
      this.players.delete(data.playerId);
      this.emit('playerLeft', { player });
    }
  }
  
  private handlePlayerUpdate(data: { playerId: string; state: Partial<PlayerState> }): void {
    const player = this.players.get(data.playerId);
    if (player) {
      Object.assign(player.state, data.state);
      this.emit('playerUpdated', { player });
    }
  }
  
  private handleStateUpdate(updates: { name: string; value: unknown; timestamp: number }[]): void {
    for (const update of updates) {
      this.stateSynchronizer.receiveUpdate(update.name, update.value, update.timestamp);
    }
  }
  
  private handleEntitySpawn(entity: NetworkEntity): void {
    entity.position = new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z);
    entity.rotation = new THREE.Quaternion(entity.rotation.x, entity.rotation.y, entity.rotation.z, (entity.rotation as any).w);
    entity.velocity = new THREE.Vector3(entity.velocity.x, entity.velocity.y, entity.velocity.z);
    
    this.entities.set(entity.id, entity);
    this.emit('entitySpawned', { entity });
  }
  
  private handleEntityDespawn(data: { entityId: string }): void {
    const entity = this.entities.get(data.entityId);
    if (entity) {
      this.entities.delete(data.entityId);
      this.emit('entityDespawned', { entity });
    }
  }
  
  private handleEntityUpdate(data: Partial<NetworkEntity> & { id: string }): void {
    const entity = this.entities.get(data.id);
    if (entity) {
      if (data.position) {
        entity.position.set(data.position.x, data.position.y, data.position.z);
      }
      if (data.rotation) {
        entity.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z, (data.rotation as any).w);
      }
      if (data.velocity) {
        entity.velocity.set(data.velocity.x, data.velocity.y, data.velocity.z);
      }
      if (data.state) {
        Object.assign(entity.state, data.state);
      }
      entity.lastUpdateTime = Date.now();
      
      this.emit('entityUpdated', { entity });
    }
  }
  
  private handleRPC(data: RPCCall): void {
    const handler = this.rpcHandlers.get(data.methodName);
    if (handler) {
      handler(...data.args);
    }
  }
  
  private handleServerTick(data: { tick: number; timestamp: number }): void {
    // Server-authoritative tick for reconciliation
    this.emit('serverTick', data);
  }
  
  private sendStateUpdate(dirtyVars: Map<string, SyncedVariable>): void {
    const updates = Array.from(dirtyVars.values()).map((v) => ({
      name: v.name,
      value: v.value,
      timestamp: v.lastUpdate,
    }));
    
    this.transport.send({
      type: 'state_update',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      reliable: false,
      data: updates,
    });
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  sendInput(inputs: Record<string, unknown>): InputSnapshot {
    const localPlayer = this.getLocalPlayer();
    
    const snapshot = this.inputPredictor.recordInput(
      inputs,
      localPlayer?.state.position || { x: 0, y: 0, z: 0 },
      localPlayer?.state.rotation || { x: 0, y: 0, z: 0, w: 1 }
    );
    
    this.transport.send({
      type: 'input',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      reliable: false,
      data: snapshot,
    });
    
    return snapshot;
  }
  
  updatePlayerState(state: Partial<PlayerState>): void {
    this.transport.send({
      type: 'player_update',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      reliable: false,
      data: state,
    });
  }
  
  spawnEntity(type: string, position: THREE.Vector3, rotation: THREE.Quaternion, state: Record<string, unknown> = {}): void {
    this.transport.send({
      type: 'entity_spawn',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      reliable: true,
      data: {
        type,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
        state,
      },
    });
  }
  
  despawnEntity(entityId: string): void {
    this.transport.send({
      type: 'entity_despawn',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      reliable: true,
      data: { entityId },
    });
  }
  
  rpc(methodName: string, target: 'all' | 'others' | 'host' | string, ...args: unknown[]): void {
    this.transport.send({
      type: 'rpc',
      senderId: this.localPlayerId,
      timestamp: Date.now(),
      reliable: true,
      data: { methodName, target, args },
    });
  }
  
  registerRPC(methodName: string, handler: (...args: unknown[]) => void): void {
    this.rpcHandlers.set(methodName, handler);
  }
  
  unregisterRPC(methodName: string): void {
    this.rpcHandlers.delete(methodName);
  }
  
  syncVariable(name: string, initialValue: unknown, mode: SyncMode = 'reliable'): void {
    this.stateSynchronizer.register(name, initialValue, mode, this.localPlayerId);
  }
  
  setSyncedVariable(name: string, value: unknown): void {
    this.stateSynchronizer.set(name, value, this.localPlayerId);
  }
  
  getSyncedVariable<T>(name: string): T | undefined {
    return this.stateSynchronizer.get<T>(name);
  }
  
  getLocalPlayer(): Player | undefined {
    return this.players.get(this.localPlayerId);
  }
  
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }
  
  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }
  
  getRemotePlayers(): Player[] {
    return Array.from(this.players.values()).filter((p) => !p.isLocal);
  }
  
  getEntity(entityId: string): NetworkEntity | undefined {
    return this.entities.get(entityId);
  }
  
  getAllEntities(): NetworkEntity[] {
    return Array.from(this.entities.values());
  }
  
  getOwnedEntities(): NetworkEntity[] {
    return Array.from(this.entities.values()).filter((e) => e.ownerId === this.localPlayerId);
  }
  
  getPing(): number {
    return this.transport.getPing();
  }
  
  getConnectionState(): ConnectionState {
    return this.transport.getState();
  }
  
  isHost(): boolean {
    return this.config.mode === 'host' || this.getLocalPlayer()?.isHost === true;
  }
  
  getLobbyManager(): LobbyManager {
    return this.lobbyManager;
  }
  
  getInputPredictor(): InputPredictor {
    return this.inputPredictor;
  }
  
  dispose(): void {
    this.disconnect();
    this.rpcHandlers.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useCallback, useRef, useEffect, useContext, createContext } from 'react';

const NetworkContext = createContext<NetworkManager | null>(null);

export function NetworkProvider({ 
  children, 
  config 
}: { 
  children: React.ReactNode;
  config?: Partial<NetworkConfig>;
}) {
  const managerRef = useRef<NetworkManager>(new NetworkManager(config));
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <NetworkContext.Provider value={managerRef.current}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const manager = useContext(NetworkContext);
  if (!manager) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [players, setPlayers] = useState<Player[]>([]);
  const [ping, setPing] = useState(0);
  
  useEffect(() => {
    const updatePlayers = () => setPlayers(manager.getAllPlayers());
    const updateConnection = () => setConnectionState(manager.getConnectionState());
    
    manager.on('connected', updateConnection);
    manager.on('disconnected', updateConnection);
    manager.on('playerJoined', updatePlayers);
    manager.on('playerLeft', updatePlayers);
    manager.on('playerUpdated', updatePlayers);
    manager.on('welcome', updatePlayers);
    
    const pingInterval = setInterval(() => {
      setPing(manager.getPing());
    }, 1000);
    
    return () => {
      manager.off('connected', updateConnection);
      manager.off('disconnected', updateConnection);
      manager.off('playerJoined', updatePlayers);
      manager.off('playerLeft', updatePlayers);
      manager.off('playerUpdated', updatePlayers);
      manager.off('welcome', updatePlayers);
      clearInterval(pingInterval);
    };
  }, [manager]);
  
  const connect = useCallback(async (url?: string) => {
    await manager.connect(url);
  }, [manager]);
  
  const disconnect = useCallback(() => {
    manager.disconnect();
  }, [manager]);
  
  return {
    manager,
    connectionState,
    players,
    ping,
    connect,
    disconnect,
    isConnected: connectionState === 'connected',
    isHost: manager.isHost(),
    localPlayer: manager.getLocalPlayer(),
    rpc: manager.rpc.bind(manager),
    registerRPC: manager.registerRPC.bind(manager),
    spawnEntity: manager.spawnEntity.bind(manager),
    despawnEntity: manager.despawnEntity.bind(manager),
    lobbyManager: manager.getLobbyManager(),
  };
}

export function useSyncedVariable<T>(name: string, initialValue: T, mode: SyncMode = 'reliable'): [T, (value: T) => void] {
  const { manager } = useNetwork();
  const [value, setValue] = useState<T>(initialValue);
  
  useEffect(() => {
    manager.syncVariable(name, initialValue, mode);
  }, [manager, name, initialValue, mode]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const syncedValue = manager.getSyncedVariable<T>(name);
      if (syncedValue !== undefined) {
        setValue(syncedValue);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [manager, name]);
  
  const setSyncedValue = useCallback((newValue: T) => {
    setValue(newValue);
    manager.setSyncedVariable(name, newValue);
  }, [manager, name]);
  
  return [value, setSyncedValue];
}

const __defaultExport = {
  NetworkManager,
  NetworkProvider,
  useNetwork,
  useSyncedVariable,
  WebSocketTransport,
  StateSynchronizer,
  InputPredictor,
  LobbyManager,
};

export default __defaultExport;
