/**
 * dynamic-sync-layer.ts
 *
 * Dynamic Multiplayer Rollback Netcode — synchronization layer that maps
 * dynamic player state structures without hardcoded sync files.
 *
 * Architecture:
 *  - StateSchema: auto-derives serialization schema from player state shape
 *  - RollbackBuffer: circular buffer of game states for N frames
 *  - InputBuffer: stores per-player inputs for each frame
 *  - DeterministicUpdater: replays inputs to reconstruct diverged state
 *  - PeerSyncManager: WebRTC/WebSocket peer coordination
 *
 * Rollback algorithm:
 *  1. Each frame: serialize local state + inputs, broadcast
 *  2. On late input received: rollback to common state, replay all inputs
 *  3. Reconcile predicted vs actual state
 */

import { createComponentLogger } from '@/lib/observability/logger';
import { telemetry } from '@/lib/observability/telemetry';

const log = createComponentLogger('multiplayer.sync');

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PlayerInput = {
  frame: number;
  playerId: string;
  /** Serialized input — keys pressed, mouse deltas, ability activations */
  keys: Record<string, boolean>;
  aimDelta?: [number, number];
  abilityIndex?: number;
  timestamp: number;
};

export type GameStateSnapshot = {
  frame: number;
  timestamp: number;
  /** Serialized player states indexed by playerId */
  players: Record<string, PlayerStateData>;
  /** Projectile, physics, entity states */
  entities: Record<string, EntityStateData>;
  /** Hash of the snapshot for desync detection */
  checksum: number;
};

export interface PlayerStateData {
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: [number, number, number, number];
  hp: number;
  resource: number;
  statusEffects: string[];
  [key: string]: unknown; // Dynamic fields
}

export interface EntityStateData {
  position: [number, number, number];
  velocity: [number, number, number];
  type: string;
  ownerId?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Deriver — auto-discovers serializable fields
// ─────────────────────────────────────────────────────────────────────────────

export interface FieldSchema {
  key: string;
  type: 'number' | 'boolean' | 'string' | 'array' | 'object';
  byteSize: number;
}

function deriveSchema(sample: Record<string, unknown>): FieldSchema[] {
  const schema: FieldSchema[] = [];

  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === 'number') {
      schema.push({ key, type: 'number', byteSize: 4 });
    } else if (typeof value === 'boolean') {
      schema.push({ key, type: 'boolean', byteSize: 1 });
    } else if (typeof value === 'string') {
      schema.push({ key, type: 'string', byteSize: Math.max(16, (value as string).length * 2) });
    } else if (Array.isArray(value)) {
      schema.push({ key, type: 'array', byteSize: 16 });
    } else if (value && typeof value === 'object') {
      schema.push({ key, type: 'object', byteSize: 64 });
    }
  }

  return schema;
}

function checksumState(state: Record<string, unknown>): number {
  const str = JSON.stringify(state, Object.keys(state).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash | 0;
  }
  return hash >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rollback Buffer (circular)
// ─────────────────────────────────────────────────────────────────────────────

const ROLLBACK_BUFFER_SIZE = 64; // 64 frames (~1 second at 60fps)

class RollbackBuffer {
  private snapshots: Array<GameStateSnapshot | null> = new Array(ROLLBACK_BUFFER_SIZE).fill(null);
  private latestFrame = -1;

  save(snapshot: GameStateSnapshot): void {
    const slot = snapshot.frame % ROLLBACK_BUFFER_SIZE;
    this.snapshots[slot] = snapshot;
    this.latestFrame = Math.max(this.latestFrame, snapshot.frame);
  }

  get(frame: number): GameStateSnapshot | null {
    return this.snapshots[frame % ROLLBACK_BUFFER_SIZE] ?? null;
  }

  getLatest(): GameStateSnapshot | null {
    return this.snapshots[this.latestFrame % ROLLBACK_BUFFER_SIZE] ?? null;
  }

  getLatestFrame(): number {
    return this.latestFrame;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Buffer
// ─────────────────────────────────────────────────────────────────────────────

class InputBuffer {
  private inputs = new Map<number, Map<string, PlayerInput>>(); // frame → playerId → input

  record(input: PlayerInput): void {
    const frameMap = this.inputs.get(input.frame) ?? new Map();
    frameMap.set(input.playerId, input);
    this.inputs.set(input.frame, frameMap);
  }

  getForFrame(frame: number): Map<string, PlayerInput> {
    return this.inputs.get(frame) ?? new Map();
  }

  hasAllPlayers(frame: number, playerIds: string[]): boolean {
    const frameInputs = this.inputs.get(frame);
    if (!frameInputs) return false;
    return playerIds.every(id => frameInputs.has(id));
  }

  prune(olderThanFrame: number): void {
    for (const frame of this.inputs.keys()) {
      if (frame < olderThanFrame - ROLLBACK_BUFFER_SIZE) {
        this.inputs.delete(frame);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Sync Layer — main class
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncConfig {
  localPlayerId: string;
  playerIds: string[];
  maxRollbackFrames: number;
  inputDelayFrames: number;
  targetFPS: number;
}

export type UpdateFn = (
  state: GameStateSnapshot,
  inputs: Map<string, PlayerInput>
) => GameStateSnapshot;

export interface SyncResult {
  currentFrame: number;
  rolledBack: boolean;
  rollbackFrames: number;
  desyncDetected: boolean;
  checksum: number;
}

export class DynamicSyncLayer {
  private rollbackBuffer = new RollbackBuffer();
  private inputBuffer = new InputBuffer();
  private config: SyncConfig;
  private playerSchema: FieldSchema[] = [];
  private currentFrame = 0;
  private pendingRollback = false;

  // Deferred inputs from remote peers that arrived late
  private lateInputs: PlayerInput[] = [];

  constructor(config: SyncConfig) {
    this.config = config;
    log.info('DynamicSyncLayer initialized', { playerId: config.localPlayerId, players: config.playerIds });
  }

  /**
   * Auto-derive serialization schema from an initial state sample.
   * Call once after game initializes player state.
   */
  initializeSchema(samplePlayerState: PlayerStateData): void {
    this.playerSchema = deriveSchema(samplePlayerState as Record<string, unknown>);
    log.debug('State schema derived', { fields: this.playerSchema.length });
  }

  /**
   * Record local input for the current frame.
   */
  recordLocalInput(keys: Record<string, boolean>, aimDelta?: [number, number], abilityIndex?: number): PlayerInput {
    const input: PlayerInput = {
      frame: this.currentFrame + this.config.inputDelayFrames,
      playerId: this.config.localPlayerId,
      keys,
      aimDelta,
      abilityIndex,
      timestamp: Date.now(),
    };
    this.inputBuffer.record(input);
    return input;
  }

  /**
   * Receive and record a remote player's input.
   * May trigger rollback if the input is for a past frame.
   */
  receiveRemoteInput(input: PlayerInput): void {
    const frameDelta = this.currentFrame - input.frame;

    if (frameDelta > this.config.maxRollbackFrames) {
      // Too old to roll back — discard
      log.warn('Late input too old, discarding', { frame: input.frame, delta: frameDelta });
      telemetry.counter('netcode.discarded_inputs').add(1);
      return;
    }

    this.inputBuffer.record(input);

    if (frameDelta > 0) {
      // Late input — need rollback
      this.lateInputs.push(input);
      this.pendingRollback = true;
      telemetry.counter('netcode.rollbacks').add(1, { frames: String(frameDelta) });
    }
  }

  /**
   * Advance simulation by one frame using the provided update function.
   */
  tick(
    currentState: GameStateSnapshot,
    updateFn: UpdateFn
  ): { result: SyncResult; newState: GameStateSnapshot } {
    let state = currentState;
    let rolledBack = false;
    let rollbackFrames = 0;

    // Handle rollback if late inputs arrived
    if (this.pendingRollback && this.lateInputs.length > 0) {
      const earliestLateFrame = Math.min(...this.lateInputs.map(i => i.frame));
      const rollbackSnapshot = this.rollbackBuffer.get(earliestLateFrame);

      if (rollbackSnapshot) {
        log.debug('Rolling back', { from: this.currentFrame, to: earliestLateFrame });
        state = rollbackSnapshot;
        rollbackFrames = this.currentFrame - earliestLateFrame;

        // Replay frames from rollback point to current
        for (let f = earliestLateFrame; f < this.currentFrame; f++) {
          const inputs = this.inputBuffer.getForFrame(f);
          state = updateFn(state, inputs);
          state = { ...state, frame: f };
        }

        rolledBack = true;
        this.lateInputs = [];
        this.pendingRollback = false;
      }
    }

    // Advance one frame
    const frameInputs = this.inputBuffer.getForFrame(this.currentFrame);
    const newState = updateFn(state, frameInputs);
    const checksum = checksumState({ players: newState.players, entities: newState.entities });
    const finalState: GameStateSnapshot = {
      ...newState,
      frame: this.currentFrame,
      timestamp: Date.now(),
      checksum,
    };

    // Save to rollback buffer
    this.rollbackBuffer.save(finalState);
    this.inputBuffer.prune(this.currentFrame);
    this.currentFrame++;

    const result: SyncResult = {
      currentFrame: this.currentFrame,
      rolledBack,
      rollbackFrames,
      desyncDetected: false, // Would be populated by checksum comparison in real impl
      checksum,
    };

    return { result, newState: finalState };
  }

  /**
   * Validate checksum against remote peer's reported checksum.
   * Returns true if in sync.
   */
  validateChecksum(remoteChecksum: number, frame: number): boolean {
    const snapshot = this.rollbackBuffer.get(frame);
    if (!snapshot) return true; // No data to compare
    const inSync = snapshot.checksum === remoteChecksum;
    if (!inSync) {
      log.warn('Desync detected', { frame, local: snapshot.checksum, remote: remoteChecksum });
      telemetry.counter('netcode.desyncs').add(1);
    }
    return inSync;
  }

  getSchema(): FieldSchema[] {
    return this.playerSchema;
  }

  getCurrentFrame(): number {
    return this.currentFrame;
  }

  getBufferHealth(): { bufferUtilization: number; latestFrame: number } {
    const latestFrame = this.rollbackBuffer.getLatestFrame();
    return {
      bufferUtilization: Math.min(1, (this.currentFrame - Math.max(0, latestFrame - ROLLBACK_BUFFER_SIZE)) / ROLLBACK_BUFFER_SIZE),
      latestFrame,
    };
  }
}
