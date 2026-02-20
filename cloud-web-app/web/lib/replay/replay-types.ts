/**
 * Shared contracts for replay runtime system.
 */

export interface ReplayFrame {
  frameNumber: number;
  timestamp: number;
  deltaTime: number;
  inputs: InputState[];
  events: ReplayEvent[];
  snapshot?: StateSnapshot;
}

export interface InputState {
  playerId: string;
  keys: Set<string>;
  mousePosition: { x: number; y: number };
  mouseButtons: Set<number>;
  axes: Map<string, number>;
}

export interface ReplayEvent {
  type: string;
  timestamp: number;
  data: unknown;
}

export interface StateSnapshot {
  entities: EntitySnapshot[];
  globals: Map<string, unknown>;
  random: number;
}

export interface EntitySnapshot {
  id: string;
  type: string;
  components: Map<string, unknown>;
  parent?: string;
  children?: string[];
}

export interface Recording {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  frameCount: number;
  frames: ReplayFrame[];
  keyframes: number[];
  metadata: RecordingMetadata;
  compressed?: boolean;
}

export interface RecordingMetadata {
  version: string;
  gameName: string;
  mapName: string;
  players: PlayerInfo[];
  customData: Record<string, unknown>;
}

export interface PlayerInfo {
  id: string;
  name: string;
  team?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;
  currentTime: number;
  speed: number;
  loop: boolean;
}

export interface ReplayConfig {
  snapshotInterval: number;
  maxFrames: number;
  compressOnSave: boolean;
  interpolate: boolean;
  recordInputs: boolean;
  recordEvents: boolean;
}
