// @aethel-heavy-async-boundary Studio/network runtime; do not import from public route shells.
/**
 * Networking & Multiplayer System - split runtime modules.
 *
 * Keep this package Studio/runtime-only. Public surfaces should lazy-load it
 * through explicit boundaries rather than importing the multiplayer barrel.
 */

import { EventEmitter } from 'events';
import * as THREE from 'three';
import { InputPredictor } from './input-predictor';
import { LobbyManager } from './lobby-manager';
import { StateSynchronizer } from './state-synchronizer';
import type { ConnectionState, InputSnapshot, NetworkConfig, NetworkEntity, NetworkMessage, NetworkTransport, Player, PlayerState, RPCCall, SyncMode, SyncedVariable } from './types';
import { WebSocketTransport } from './websocket-transport';

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
