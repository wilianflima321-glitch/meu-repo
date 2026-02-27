/** Replay runtime classes (recorder/player). */

import { EventEmitter } from 'events';
import type {
  InputState,
  PlaybackState,
  Recording,
  RecordingMetadata,
  ReplayConfig,
  ReplayEvent,
  ReplayFrame,
} from './replay-types';
import { InputSerializer } from './replay-input-serializer';
import { StateSerializer } from './replay-state-serializer';

export class ReplayRecorder extends EventEmitter {
  private config: ReplayConfig;
  private recording: Recording | null = null;
  private isRecording = false;
  private frameNumber = 0;
  private startTime = 0;
  
  private inputSerializer = new InputSerializer();
  private stateSerializer = new StateSerializer();
  private currentInputs: Map<string, InputState> = new Map();
  private pendingEvents: ReplayEvent[] = [];
  
  constructor(config: Partial<ReplayConfig> = {}) {
    super();
    
    this.config = {
      snapshotInterval: 60, // Snapshot every 60 frames (1 second at 60fps)
      maxFrames: 36000, // 10 minutes at 60fps
      compressOnSave: true,
      interpolate: true,
      recordInputs: true,
      recordEvents: true,
      ...config,
    };
  }
  
  // ============================================================================
  // RECORDING CONTROL
  // ============================================================================
  
  startRecording(metadata?: Partial<RecordingMetadata>): void {
    this.recording = {
      id: this.generateId(),
      name: `Recording ${new Date().toISOString()}`,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      frameCount: 0,
      frames: [],
      keyframes: [],
      metadata: {
        version: '1.0.0',
        gameName: 'Aethel Engine',
        mapName: 'Unknown',
        players: [],
        customData: {},
        ...metadata,
      },
    };
    
    this.isRecording = true;
    this.frameNumber = 0;
    this.startTime = performance.now();
    
    this.emit('recordingStarted', this.recording);
  }
  
  stopRecording(): Recording | null {
    if (!this.recording) return null;
    
    this.isRecording = false;
    this.recording.endTime = Date.now();
    this.recording.duration = this.recording.endTime - this.recording.startTime;
    this.recording.frameCount = this.frameNumber;
    
    const result = this.recording;
    this.emit('recordingStopped', result);
    
    return result;
  }
  
  isActive(): boolean {
    return this.isRecording;
  }
  
  // ============================================================================
  // FRAME RECORDING
  // ============================================================================
  
  recordFrame(world: { entities: Map<string, unknown>; globals?: Map<string, unknown> }, deltaTime: number): void {
    if (!this.isRecording || !this.recording) return;
    
    if (this.frameNumber >= this.config.maxFrames) {
      this.stopRecording();
      return;
    }
    
    const timestamp = performance.now() - this.startTime;
    const isKeyframe = this.frameNumber % this.config.snapshotInterval === 0;
    
    const frame: ReplayFrame = {
      frameNumber: this.frameNumber,
      timestamp,
      deltaTime,
      inputs: this.config.recordInputs 
        ? this.inputSerializer.serializeInputs(this.currentInputs)
        : [],
      events: this.config.recordEvents 
        ? [...this.pendingEvents]
        : [],
    };
    
    // Add snapshot for keyframes
    if (isKeyframe) {
      frame.snapshot = this.stateSerializer.serializeState(world);
      this.recording.keyframes.push(this.frameNumber);
    }
    
    this.recording.frames.push(frame);
    this.frameNumber++;
    this.pendingEvents = [];
    
    this.emit('frameRecorded', frame);
  }
  
  // ============================================================================
  // INPUT RECORDING
  // ============================================================================
  
  recordInput(playerId: string, input: Partial<InputState>): void {
    if (!this.isRecording) return;
    
    const existing = this.currentInputs.get(playerId) || {
      playerId,
      keys: new Set<string>(),
      mousePosition: { x: 0, y: 0 },
      mouseButtons: new Set<number>(),
      axes: new Map<string, number>(),
    };
    
    this.currentInputs.set(playerId, {
      ...existing,
      ...input,
      playerId,
    });
  }
  
  // ============================================================================
  // EVENT RECORDING
  // ============================================================================
  
  recordEvent(type: string, data: unknown): void {
    if (!this.isRecording) return;
    
    this.pendingEvents.push({
      type,
      timestamp: performance.now() - this.startTime,
      data,
    });
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getRecording(): Recording | null {
    return this.recording;
  }
  
  getCurrentFrame(): number {
    return this.frameNumber;
  }
}

// ============================================================================
// REPLAY PLAYER
// ============================================================================

export class ReplayPlayer extends EventEmitter {
  private config: ReplayConfig;
  private recording: Recording | null = null;
  private state: PlaybackState;
  private animationFrame: number | null = null;
  private lastFrameTime = 0;
  
  private stateSerializer = new StateSerializer();
  
  constructor(config: Partial<ReplayConfig> = {}) {
    super();
    
    this.config = {
      snapshotInterval: 60,
      maxFrames: 36000,
      compressOnSave: true,
      interpolate: true,
      recordInputs: true,
      recordEvents: true,
      ...config,
    };
    
    this.state = {
      isPlaying: false,
      isPaused: false,
      currentFrame: 0,
      currentTime: 0,
      speed: 1.0,
      loop: false,
    };
  }
  
  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================
  
  load(recording: Recording): void {
    this.recording = recording;
    this.state.currentFrame = 0;
    this.state.currentTime = 0;
    this.emit('recordingLoaded', recording);
  }
  
  play(): void {
    if (!this.recording) return;
    
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.lastFrameTime = performance.now();
    
    this.tick();
    this.emit('playbackStarted');
  }
  
  pause(): void {
    this.state.isPaused = true;
    this.emit('playbackPaused');
  }
  
  resume(): void {
    if (!this.state.isPlaying) return;
    
    this.state.isPaused = false;
    this.lastFrameTime = performance.now();
    this.tick();
    this.emit('playbackResumed');
  }
  
  stop(): void {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentFrame = 0;
    this.state.currentTime = 0;
    
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    this.emit('playbackStopped');
  }
  
  // ============================================================================
  // SEEKING
  // ============================================================================
  
  seek(frame: number): void {
    if (!this.recording) return;
    
    frame = Math.max(0, Math.min(frame, this.recording.frameCount - 1));
    this.state.currentFrame = frame;
    
    const frameData = this.recording.frames[frame];
    if (frameData) {
      this.state.currentTime = frameData.timestamp;
    }
    
    this.emit('seeked', frame);
  }
  
  seekToTime(time: number): void {
    if (!this.recording) return;
    
    // Find frame at time
    let targetFrame = 0;
    for (let i = 0; i < this.recording.frames.length; i++) {
      if (this.recording.frames[i].timestamp >= time) {
        targetFrame = i;
        break;
      }
      targetFrame = i;
    }
    
    this.seek(targetFrame);
  }
  
  seekToKeyframe(index: number): void {
    if (!this.recording) return;
    
    index = Math.max(0, Math.min(index, this.recording.keyframes.length - 1));
    const frame = this.recording.keyframes[index];
    this.seek(frame);
  }
  
  nextFrame(): void {
    this.seek(this.state.currentFrame + 1);
  }
  
  previousFrame(): void {
    this.seek(this.state.currentFrame - 1);
  }
  
  nextKeyframe(): void {
    if (!this.recording) return;
    
    const nextKeyframe = this.recording.keyframes.find(k => k > this.state.currentFrame);
    if (nextKeyframe !== undefined) {
      this.seek(nextKeyframe);
    }
  }
  
  previousKeyframe(): void {
    if (!this.recording) return;
    
    const prevKeyframe = [...this.recording.keyframes]
      .reverse()
      .find(k => k < this.state.currentFrame);
    
    if (prevKeyframe !== undefined) {
      this.seek(prevKeyframe);
    }
  }
  
  // ============================================================================
  // SPEED CONTROL
  // ============================================================================
  
  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.1, Math.min(speed, 10));
    this.emit('speedChanged', this.state.speed);
  }
  
  setLoop(loop: boolean): void {
    this.state.loop = loop;
  }
  
  // ============================================================================
  // FRAME PLAYBACK
  // ============================================================================
  
  private tick = (): void => {
    if (!this.state.isPlaying || this.state.isPaused || !this.recording) {
      return;
    }
    
    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) * this.state.speed;
    this.lastFrameTime = now;
    
    this.state.currentTime += deltaTime;
    
    // Find current frame
    while (
      this.state.currentFrame < this.recording.frameCount - 1 &&
      this.recording.frames[this.state.currentFrame + 1].timestamp <= this.state.currentTime
    ) {
      this.state.currentFrame++;
      this.processFrame(this.recording.frames[this.state.currentFrame]);
    }
    
    // Check if at end
    if (this.state.currentFrame >= this.recording.frameCount - 1) {
      if (this.state.loop) {
        this.seek(0);
        this.state.currentTime = 0;
      } else {
        this.stop();
        this.emit('playbackEnded');
        return;
      }
    }
    
    this.emit('frameUpdated', this.state.currentFrame);
    
    this.animationFrame = requestAnimationFrame(this.tick);
  };
  
  private processFrame(frame: ReplayFrame): void {
    // Emit inputs
    for (const input of frame.inputs) {
      this.emit('input', input);
    }
    
    // Emit events
    for (const event of frame.events) {
      this.emit('event', event);
    }
    
    // Emit snapshot if present
    if (frame.snapshot) {
      this.emit('snapshot', frame.snapshot);
    }
  }
  
  // ============================================================================
  // STATE RESTORATION
  // ============================================================================
  
  getStateAtFrame(frame: number): StateSnapshot | null {
    if (!this.recording) return null;
    
    // Find nearest keyframe before target frame
    let keyframeIndex = 0;
    for (let i = this.recording.keyframes.length - 1; i >= 0; i--) {
      if (this.recording.keyframes[i] <= frame) {
        keyframeIndex = this.recording.keyframes[i];
        break;
      }
    }
    
    const keyframeData = this.recording.frames[keyframeIndex];
    if (!keyframeData?.snapshot) return null;
    
    // For exact keyframes, return directly
    if (keyframeIndex === frame) {
      return this.cloneSnapshot(keyframeData.snapshot);
    }

    const state = this.cloneSnapshot(keyframeData.snapshot);
    this.applyFrameDelta(state, keyframeIndex + 1, frame);
    return state;
  }
  
  getInputsAtFrame(frame: number): InputState[] {
    if (!this.recording) return [];
    
    const frameData = this.recording.frames[frame];
    return frameData?.inputs || [];
  }
  
  getEventsAtFrame(frame: number): ReplayEvent[] {
    if (!this.recording) return [];
    
    const frameData = this.recording.frames[frame];
    return frameData?.events || [];
  }
  
  // ============================================================================
  // INTERPOLATION
  // ============================================================================
  
  getInterpolatedState(t: number): StateSnapshot | null {
    if (!this.recording || !this.config.interpolate) return null;
    
    // Find surrounding keyframes
    const timeInMs = t * this.recording.duration;
    
    let prevKeyframe = 0;
    let nextKeyframe = this.recording.keyframes[0] || 0;
    
    for (let i = 0; i < this.recording.keyframes.length - 1; i++) {
      if (this.recording.frames[this.recording.keyframes[i]].timestamp <= timeInMs) {
        prevKeyframe = this.recording.keyframes[i];
        nextKeyframe = this.recording.keyframes[i + 1];
      }
    }
    
    const prevFrame = this.recording.frames[prevKeyframe];
    const nextFrame = this.recording.frames[nextKeyframe];
    
    if (!prevFrame?.snapshot || !nextFrame?.snapshot) {
      return prevFrame?.snapshot || null;
    }
    
    // Calculate interpolation factor
    const alpha = 
      (timeInMs - prevFrame.timestamp) / 
      (nextFrame.timestamp - prevFrame.timestamp);
    
    return this.interpolateSnapshots(prevFrame.snapshot, nextFrame.snapshot, alpha);
  }

  private cloneSnapshot(snapshot: StateSnapshot): StateSnapshot {
    const entities = snapshot.entities.map((entity) => ({
      ...entity,
      components: new Map(entity.components),
      children: entity.children ? [...entity.children] : undefined,
    }));

    return {
      entities,
      globals: new Map(snapshot.globals),
      random: snapshot.random,
    };
  }

  private applyFrameDelta(state: StateSnapshot, startFrame: number, endFrame: number): void {
    if (!this.recording) return;

    const boundedStart = Math.max(0, startFrame);
    const boundedEnd = Math.min(endFrame, this.recording.frames.length - 1);
    if (boundedStart > boundedEnd) return;

    let inputCount = 0;
    let eventCount = 0;

    for (let frameIndex = boundedStart; frameIndex <= boundedEnd; frameIndex++) {
      const frameData = this.recording.frames[frameIndex];
      if (!frameData) continue;

      inputCount += frameData.inputs.length;
      eventCount += frameData.events.length;

      for (const event of frameData.events) {
        this.applyReplayEvent(state, event);
      }
    }

    state.globals.set('__replay.resolvedFromKeyframe', boundedStart - 1);
    state.globals.set('__replay.resolvedToFrame', boundedEnd);
    state.globals.set('__replay.appliedInputCount', inputCount);
    state.globals.set('__replay.appliedEventCount', eventCount);
  }

  private applyReplayEvent(state: StateSnapshot, event: ReplayEvent): void {
    if (!event || typeof event.type !== 'string') return;

    if (event.type === 'state.setGlobal') {
      const data = event.data as { key?: string; value?: unknown } | null;
      if (data?.key) {
        state.globals.set(data.key, data.value);
      }
      return;
    }

    if (event.type === 'entity.patch') {
      const data = event.data as {
        id?: string;
        component?: string;
        value?: unknown;
      } | null;
      if (!data?.id || !data.component) return;

      const entity = state.entities.find((candidate) => candidate.id === data.id);
      if (!entity) return;
      entity.components.set(data.component, data.value);
      return;
    }

    const replayLog = (state.globals.get('__replay.unhandledEvents') as string[]) || [];
    replayLog.push(event.type);
    state.globals.set('__replay.unhandledEvents', replayLog.slice(-25));
  }
  
  private interpolateSnapshots(a: StateSnapshot, b: StateSnapshot, alpha: number): StateSnapshot {
    const entities: EntitySnapshot[] = [];
    
    // Create entity map for quick lookup
    const bEntities = new Map<string, EntitySnapshot>();
    for (const entity of b.entities) {
      bEntities.set(entity.id, entity);
    }
    
    // Interpolate matching entities
    for (const entityA of a.entities) {
      const entityB = bEntities.get(entityA.id);
      
      if (entityB) {
        entities.push(this.interpolateEntities(entityA, entityB, alpha));
      } else {
        // Entity exists only in A
        entities.push(entityA);
      }
    }
    
    // Add entities only in B
    for (const entityB of b.entities) {
      if (!a.entities.find(e => e.id === entityB.id)) {
        entities.push(entityB);
      }
    }
    
    return {
      entities,
      globals: new Map(b.globals),
      random: a.random + (b.random - a.random) * alpha,
    };
  }
  
  private interpolateEntities(a: EntitySnapshot, b: EntitySnapshot, alpha: number): EntitySnapshot {
    const components = new Map<string, unknown>();
    
    for (const [key, valueA] of a.components) {
      const valueB = b.components.get(key);
      
      if (valueB !== undefined) {
        components.set(key, this.interpolateValue(valueA, valueB, alpha));
      } else {
        components.set(key, valueA);
      }
    }
    
    return {
      id: a.id,
      type: a.type,
      components,
    };
  }
  
  private interpolateValue(a: unknown, b: unknown, alpha: number): unknown {
    if (typeof a === 'number' && typeof b === 'number') {
      return a + (b - a) * alpha;
    }
    
    if (this.isVector(a) && this.isVector(b)) {
      return this.interpolateVector(a, b, alpha);
    }
    
    // Return b for non-numeric values
    return alpha < 0.5 ? a : b;
  }
  
  private isVector(value: unknown): value is { x: number; y: number; z?: number } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'x' in value &&
      'y' in value
    );
  }
  
  private interpolateVector(
    a: { x: number; y: number; z?: number },
    b: { x: number; y: number; z?: number },
    alpha: number
  ): { x: number; y: number; z?: number } {
    const result: { x: number; y: number; z?: number } = {
      x: a.x + (b.x - a.x) * alpha,
      y: a.y + (b.y - a.y) * alpha,
    };
    
    if (a.z !== undefined && b.z !== undefined) {
      result.z = a.z + (b.z - a.z) * alpha;
    }
    
    return result;
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getState(): PlaybackState {
    return { ...this.state };
  }
  
  getRecording(): Recording | null {
    return this.recording;
  }
  
  getDuration(): number {
    return this.recording?.duration || 0;
  }
  
  getProgress(): number {
    if (!this.recording || this.recording.frameCount === 0) return 0;
    return this.state.currentFrame / (this.recording.frameCount - 1);
  }
}

// ============================================================================
// REPLAY MANAGER
// ============================================================================
