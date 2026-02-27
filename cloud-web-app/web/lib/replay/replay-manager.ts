/** Replay manager orchestration. */

import { EventEmitter } from 'events';
import type { Recording, ReplayConfig } from './replay-types';
import { ReplayPlayer, ReplayRecorder } from './replay-runtime';

export class ReplayManager extends EventEmitter {
  private recordings: Map<string, Recording> = new Map();
  private recorder: ReplayRecorder;
  private player: ReplayPlayer;
  private config: ReplayConfig;
  
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
    
    this.recorder = new ReplayRecorder(this.config);
    this.player = new ReplayPlayer(this.config);
    
    // Forward events
    this.recorder.on('recordingStarted', (r) => this.emit('recordingStarted', r));
    this.recorder.on('recordingStopped', (r) => {
      this.recordings.set(r.id, r);
      this.emit('recordingStopped', r);
    });
    
    this.player.on('playbackStarted', () => this.emit('playbackStarted'));
    this.player.on('playbackStopped', () => this.emit('playbackStopped'));
    this.player.on('playbackEnded', () => this.emit('playbackEnded'));
  }
  
  getRecorder(): ReplayRecorder {
    return this.recorder;
  }
  
  getPlayer(): ReplayPlayer {
    return this.player;
  }
  
  getRecordings(): Recording[] {
    return Array.from(this.recordings.values());
  }
  
  getRecording(id: string): Recording | undefined {
    return this.recordings.get(id);
  }
  
  deleteRecording(id: string): void {
    this.recordings.delete(id);
  }
  
  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================
  
  async exportRecording(id: string): Promise<ArrayBuffer> {
    const recording = this.recordings.get(id);
    if (!recording) throw new Error('Recording not found');
    
    const json = JSON.stringify(recording, (key, value) => {
      if (value instanceof Map) {
        return { __type: 'Map', data: Array.from(value.entries()) };
      }
      if (value instanceof Set) {
        return { __type: 'Set', data: Array.from(value) };
      }
      return value;
    });
    
    if (this.config.compressOnSave) {
      return this.compress(json);
    }
    
    return new TextEncoder().encode(json).buffer;
  }
  
  async importRecording(data: ArrayBuffer): Promise<Recording> {
    let json: string;
    
    try {
      // Try to decompress
      json = await this.decompress(data);
    } catch {
      // Assume uncompressed
      json = new TextDecoder().decode(data);
    }
    
    const recording = JSON.parse(json, (key, value) => {
      if (value && typeof value === 'object') {
        if (value.__type === 'Map') {
          return new Map(value.data);
        }
        if (value.__type === 'Set') {
          return new Set(value.data);
        }
      }
      return value;
    }) as Recording;
    
    this.recordings.set(recording.id, recording);
    return recording;
  }
  
  private async compress(data: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const inputData = encoder.encode(data);
    
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(inputData);
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = cs.readable.getReader();
    
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    
    return output.buffer;
  }
  
  private async decompress(data: ArrayBuffer): Promise<string> {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(new Uint8Array(data));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    const reader = ds.readable.getReader();
    
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const output = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(output);
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  clear(): void {
    this.recordings.clear();
    this.recorder.stopRecording();
    this.player.stop();
  }
  
  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
