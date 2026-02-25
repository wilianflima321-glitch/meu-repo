/**
 * Multiplayer networking shared contracts.
 */

import * as THREE from 'three';

export type NetworkMode = 'host' | 'client' | 'dedicated';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
export type SyncMode = 'reliable' | 'unreliable' | 'state';

export interface NetworkConfig {
  mode: NetworkMode;
  serverUrl?: string;
  maxPlayers: number;
  tickRate: number;
  interpolationDelay: number;
  predictionEnabled: boolean;
  lagCompensation: boolean;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isLocal: boolean;
  ping: number;
  state: PlayerState;
  customData: Record<string, unknown>;
}

export interface PlayerState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
  animation: string;
  health: number;
  score: number;
}

export interface NetworkEntity {
  id: string;
  ownerId: string;
  type: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  velocity: THREE.Vector3;
  state: Record<string, unknown>;
  lastUpdateTime: number;
}

export interface NetworkMessage {
  type: string;
  senderId: string;
  timestamp: number;
  reliable: boolean;
  data: unknown;
}

export interface LobbyInfo {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameMode: string;
  mapName: string;
  isPrivate: boolean;
  ping: number;
}

export interface RPCCall {
  methodName: string;
  args: unknown[];
  target: 'all' | 'others' | 'host' | string;
}

export interface SyncedVariable {
  name: string;
  value: unknown;
  mode: SyncMode;
  owner: string;
  lastUpdate: number;
}

export interface InputSnapshot {
  tick: number;
  timestamp: number;
  inputs: Record<string, unknown>;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
}
