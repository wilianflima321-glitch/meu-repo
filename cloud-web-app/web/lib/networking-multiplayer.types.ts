// Multiplayer transport contracts shared by clients, netcode and matchmaking.
export interface NetworkConfig {
  serverUrl: string;
  maxPlayers: number;
  tickRate: number; // Server ticks per second
  interpolationDelay: number; // ms
  predictionEnabled: boolean;
  rollbackFrames: number; // For fighting games
}
export interface NetworkPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isLocal: boolean;
  ping: number;
  state: PlayerState;
  lastInputTime: number;
  connection?: RTCPeerConnection;
}
export interface PlayerState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
  animation: string;
  health: number;
  customData: Record<string, unknown>;
}
export interface NetworkInput {
  timestamp: number;
  sequence: number;
  playerId: string;
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseButtons: number;
  actions: string[];
}
export interface NetworkMessage {
  type: MessageType;
  timestamp: number;
  sequence: number;
  payload: unknown;
}
export enum MessageType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  JOIN_LOBBY = 'join_lobby',
  LEAVE_LOBBY = 'leave_lobby',
  LOBBY_UPDATE = 'lobby_update',
  CHAT = 'chat',
  GAME_START = 'game_start',
  GAME_END = 'game_end',
  STATE_UPDATE = 'state_update',
  INPUT = 'input',
  ACTION = 'action',
  FULL_STATE = 'full_state',
  DELTA_STATE = 'delta_state',
  SNAPSHOT = 'snapshot',
  RPC = 'rpc',
  RPC_RESPONSE = 'rpc_response',
  /**
   * OMNI-PLAN PILAR 2 (Matchmaking e Justiça) — pushed by the Headless Rust
   * server when its anomaly detector (`physics_kernel.rs`'s client-consensus
   * plausibility check) rejects a client-reported transform as physically
   * implausible (speed hack, teleport, impossible acceleration). The client
   * must treat this as authoritative and hard-rollback — see
   * `networking-netcode.ts#RollbackNetcode.applyAnomalyCorrection`.
   */
  ANOMALY_CORRECTION = 'anomaly_correction',
}
/** Payload shape for `MessageType.ANOMALY_CORRECTION`. */
export interface AnomalyCorrection {
  frame: number;
  playerId: string;
  authoritativeState: PlayerState;
  /** Machine-readable reason from the server's anomaly detector, e.g. `speed_exceeded`, `acceleration_exceeded`, `teleport_suspected`. */
  reason: string;
  /** How far (in engine units) the client's self-reported position deviated from what the server considered plausible — useful for anti-cheat dashboards/telemetry, not required to apply the correction. */
  deviationMagnitude?: number;
}
export interface Lobby {
  id: string;
  name: string;
  host: string;
  players: NetworkPlayer[];
  maxPlayers: number;
  isPrivate: boolean;
  gameMode: string;
  settings: Record<string, unknown>;
}
