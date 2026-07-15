// Deterministic multiplayer helpers: input buffering, interpolation, prediction and rollback.
import { logger } from '@/lib/observability/logger';
import type { AnomalyCorrection, NetworkInput, PlayerState } from './networking-multiplayer.types';
export type { AnomalyCorrection } from './networking-multiplayer.types';

export class InputBuffer {
  private inputs: Map<number, NetworkInput> = new Map();
  private confirmedFrame: number = 0;
  private maxBufferSize: number;
  constructor(maxSize: number = 120) {
    this.maxBufferSize = maxSize;
  }
  add(frame: number, input: NetworkInput): void {
    this.inputs.set(frame, input);
    const oldestFrame = frame - this.maxBufferSize;
    for (const [f] of this.inputs) {
      if (f < oldestFrame) {
        this.inputs.delete(f);
      }
    }
  }
  get(frame: number): NetworkInput | undefined {
    return this.inputs.get(frame);
  }
  confirm(frame: number): void {
    this.confirmedFrame = frame;
  }
  getConfirmedFrame(): number {
    return this.confirmedFrame;
  }
  getInputRange(startFrame: number, endFrame: number): NetworkInput[] {
    const result: NetworkInput[] = [];
    for (let f = startFrame; f <= endFrame; f++) {
      const input = this.inputs.get(f);
      if (input) result.push(input);
    }
    return result;
  }
  clear(): void {
    this.inputs.clear();
    this.confirmedFrame = 0;
  }
}
export class StateInterpolator {
  private stateBuffer: { timestamp: number; state: PlayerState }[] = [];
  private maxBufferSize: number;
  private interpolationDelay: number;
  constructor(interpolationDelay: number = 100, maxSize: number = 20) {
    this.interpolationDelay = interpolationDelay;
    this.maxBufferSize = maxSize;
  }
  addState(timestamp: number, state: PlayerState): void {
    this.stateBuffer.push({ timestamp, state });
    this.stateBuffer.sort((a, b) => a.timestamp - b.timestamp);
    while (this.stateBuffer.length > this.maxBufferSize) {
      this.stateBuffer.shift();
    }
  }
  getInterpolatedState(currentTime: number): PlayerState | null {
    const renderTime = currentTime - this.interpolationDelay;
    let before: { timestamp: number; state: PlayerState } | null = null;
    let after: { timestamp: number; state: PlayerState } | null = null;
    for (let i = 0; i < this.stateBuffer.length - 1; i++) {
      if (this.stateBuffer[i].timestamp <= renderTime &&
          this.stateBuffer[i + 1].timestamp >= renderTime) {
        before = this.stateBuffer[i];
        after = this.stateBuffer[i + 1];
        break;
      }
    }
    if (!before || !after) {
      if (this.stateBuffer.length > 0) {
        return this.stateBuffer[this.stateBuffer.length - 1].state;
      }
      return null;
    }
    const range = after.timestamp - before.timestamp;
    const t = range > 0 ? (renderTime - before.timestamp) / range : 0;
    return this.interpolateStates(before.state, after.state, t);
  }
  private interpolateStates(a: PlayerState, b: PlayerState, t: number): PlayerState {
    return {
      position: {
        x: a.position.x + (b.position.x - a.position.x) * t,
        y: a.position.y + (b.position.y - a.position.y) * t,
        z: a.position.z + (b.position.z - a.position.z) * t,
      },
      rotation: this.slerpQuaternion(a.rotation, b.rotation, t),
      velocity: {
        x: a.velocity.x + (b.velocity.x - a.velocity.x) * t,
        y: a.velocity.y + (b.velocity.y - a.velocity.y) * t,
        z: a.velocity.z + (b.velocity.z - a.velocity.z) * t,
      },
      animation: t < 0.5 ? a.animation : b.animation,
      health: a.health + (b.health - a.health) * t,
      customData: { ...a.customData, ...b.customData },
    };
  }
  private slerpQuaternion(
    a: { x: number; y: number; z: number; w: number },
    b: { x: number; y: number; z: number; w: number },
    t: number
  ): { x: number; y: number; z: number; w: number } {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    if (dot < 0) {
      b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
      dot = -dot;
    }
    if (dot > 0.9995) {
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        w: a.w + (b.w - a.w) * t,
      };
    }
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;
    return {
      x: a.x * wa + b.x * wb,
      y: a.y * wa + b.y * wb,
      z: a.z * wa + b.z * wb,
      w: a.w * wa + b.w * wb,
    };
  }
  clear(): void {
    this.stateBuffer = [];
  }
}
export class ClientPrediction {
  private pendingInputs: NetworkInput[] = [];
  private lastConfirmedSequence: number = 0;
  private simulateFunc: (state: PlayerState, input: NetworkInput) => PlayerState;
  constructor(simulateFunc: (state: PlayerState, input: NetworkInput) => PlayerState) {
    this.simulateFunc = simulateFunc;
  }
  addInput(input: NetworkInput): void {
    this.pendingInputs.push(input);
  }
  reconcile(confirmedState: PlayerState, confirmedSequence: number): PlayerState {
    this.pendingInputs = this.pendingInputs.filter(
      input => input.sequence > confirmedSequence
    );
    this.lastConfirmedSequence = confirmedSequence;
    let state = confirmedState;
    for (const input of this.pendingInputs) {
      state = this.simulateFunc(state, input);
    }
    return state;
  }
  predict(currentState: PlayerState, input: NetworkInput): PlayerState {
    return this.simulateFunc(currentState, input);
  }
  getPendingInputCount(): number {
    return this.pendingInputs.length;
  }
  clear(): void {
    this.pendingInputs = [];
    this.lastConfirmedSequence = 0;
  }
}
export interface RollbackState {
  frame: number;
  state: Map<string, PlayerState>;
  inputs: Map<string, NetworkInput>;
}
export class RollbackNetcode {
  private stateHistory: RollbackState[] = [];
  private maxRollbackFrames: number;
  private currentFrame: number = 0;
  private confirmedFrame: number = 0;
  private playerInputBuffers: Map<string, InputBuffer> = new Map();
  private simulateFunc: (states: Map<string, PlayerState>, inputs: Map<string, NetworkInput>) => Map<string, PlayerState>;
  constructor(
    maxRollbackFrames: number,
    simulateFunc: (states: Map<string, PlayerState>, inputs: Map<string, NetworkInput>) => Map<string, PlayerState>
  ) {
    this.maxRollbackFrames = maxRollbackFrames;
    this.simulateFunc = simulateFunc;
  }
  addPlayer(playerId: string): void {
    this.playerInputBuffers.set(playerId, new InputBuffer(this.maxRollbackFrames * 2));
  }
  removePlayer(playerId: string): void {
    this.playerInputBuffers.delete(playerId);
  }
  addInput(playerId: string, frame: number, input: NetworkInput): void {
    const buffer = this.playerInputBuffers.get(playerId);
    if (buffer) {
      buffer.add(frame, input);
    }
  }
  confirmFrame(frame: number): void {
    this.confirmedFrame = frame;
    const oldestFrame = frame - this.maxRollbackFrames;
    this.stateHistory = this.stateHistory.filter(s => s.frame >= oldestFrame);
    for (const buffer of this.playerInputBuffers.values()) {
      buffer.confirm(frame);
    }
  }
  saveState(frame: number, states: Map<string, PlayerState>, inputs: Map<string, NetworkInput>): void {
    const stateCopy = new Map<string, PlayerState>();
    for (const [id, state] of states) {
      stateCopy.set(id, {
        position: { x: state.position.x, y: state.position.y, z: state.position.z },
        rotation: { x: state.rotation.x, y: state.rotation.y, z: state.rotation.z, w: state.rotation.w },
        velocity: { x: state.velocity.x, y: state.velocity.y, z: state.velocity.z },
        animation: state.animation,
        health: state.health,
        customData: Object.assign({}, state.customData) // Fast shallow clone for hot path
      });
    }
    const inputCopy = new Map<string, NetworkInput>();
    for (const [id, input] of inputs) {
      inputCopy.set(id, {
        ...input,
        keys: new Set(input.keys),
        actions: [...input.actions],
      });
    }
    this.stateHistory.push({
      frame,
      state: stateCopy,
      inputs: inputCopy,
    });
    while (this.stateHistory.length > this.maxRollbackFrames) {
      this.stateHistory.shift();
    }
  }
  rollback(toFrame: number): Map<string, PlayerState> | null {
    let targetState: RollbackState | undefined;
    for (let i = this.stateHistory.length - 1; i >= 0; i--) {
      if (this.stateHistory[i].frame === toFrame) {
        targetState = this.stateHistory[i];
        break;
      }
    }
    if (!targetState) {
      logger.warn(`Cannot rollback to frame ${toFrame}: state not found`);
      return null;
    }
    let currentStates = new Map(targetState.state);
    for (let frame = toFrame + 1; frame <= this.currentFrame; frame++) {
      const inputs = new Map<string, NetworkInput>();
      for (const [playerId, buffer] of this.playerInputBuffers) {
        const input = buffer.get(frame);
        if (input) {
          inputs.set(playerId, input);
        }
      }
      currentStates = this.simulateFunc(currentStates, inputs);
    }
    return currentStates;
  }
  advanceFrame(): void {
    this.currentFrame++;
  }
  getCurrentFrame(): number {
    return this.currentFrame;
  }
  getConfirmedFrame(): number {
    return this.confirmedFrame;
  }
  reset(): void {
    this.stateHistory = [];
    this.currentFrame = 0;
    this.confirmedFrame = 0;
    this.playerInputBuffers.clear();
    this.anomalyLog = [];
  }

  // ==========================================================================
  // OMNI-PLAN PILAR 2 — Rubberbanding Anti-Cheat
  // ==========================================================================

  private anomalyLog: AnomalyCorrection[] = [];

  /**
   * Applies a server-authoritative correction pushed via
   * `MessageType.ANOMALY_CORRECTION` (see `NetworkManager.enableRollback`).
   * This is the "forçar a tela a rebobinar" requirement: unlike a normal
   * rollback (triggered locally by a late input packet), this one is
   * triggered by the server's Headless Rust anomaly detector
   * (`physics_kernel.rs`'s client-consensus plausibility check) rejecting a
   * client's self-reported transform outright. The offending player's state
   * at `correction.frame` is force-overwritten with the server's
   * authoritative value, then every frame after it is resimulated forward —
   * exactly the same mechanism `rollback()` already uses for latency, reused
   * here for trust instead of time. Every application is retained in
   * `getAnomalyLog()` for anti-cheat telemetry/dashboards.
   */
  applyAnomalyCorrection(correction: AnomalyCorrection): Map<string, PlayerState> | null {
    this.anomalyLog.push(correction);
    logger.warn(
      `RollbackNetcode: anti-cheat correction for player=${correction.playerId} frame=${correction.frame} reason=${correction.reason}` +
        (correction.deviationMagnitude !== undefined ? ` deviation=${correction.deviationMagnitude.toFixed(3)}` : '')
    );

    const targetIndex = this.stateHistory.findIndex((s) => s.frame === correction.frame);
    if (targetIndex === -1) {
      // The anomalous frame already aged out of `maxRollbackFrames` history —
      // can't resimulate from it, but we can still hard-snap the player's
      // *current* rendered state to authoritative as a last resort so the
      // exploit doesn't keep compounding every frame it goes uncorrected.
      logger.warn(`RollbackNetcode: anomaly frame ${correction.frame} outside history window, hard-snapping current frame instead`);
      const latest = this.stateHistory[this.stateHistory.length - 1];
      if (!latest) return null;
      latest.state.set(correction.playerId, correction.authoritativeState);
      return new Map(latest.state);
    }

    this.stateHistory[targetIndex].state.set(correction.playerId, correction.authoritativeState);
    return this.rollback(correction.frame);
  }

  /** Anti-cheat telemetry: every anomaly correction applied this session, oldest first. */
  getAnomalyLog(): AnomalyCorrection[] {
    return [...this.anomalyLog];
  }
}
