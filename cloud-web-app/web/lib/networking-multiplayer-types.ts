export interface NetworkConfig {
  serverUrl: string;
  maxPlayers: number;
  tickRate: number;
  interpolationDelay: number;
  predictionEnabled: boolean;
  rollbackFrames: number;
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
