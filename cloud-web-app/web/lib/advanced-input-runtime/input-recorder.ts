/**
 * Advanced Input System - split runtime modules.
 *
 * Keep input runtime isolated from public route shells; Studio/game surfaces can
 * lazy-load the barrel when they need keyboard, mouse, touch, or gamepad input.
 */

import type { RecordedInput } from './types';

export class InputRecorder {
  private recording: boolean = false;
  private playing: boolean = false;
  private recordedInputs: RecordedInput[] = [];
  private playbackIndex: number = 0;
  private playbackStartTime: number = 0;
  private recordStartTime: number = 0;
  
  private onInputCallback: ((input: RecordedInput) => void) | null = null;
  
  startRecording(): void {
    this.recording = true;
    this.recordedInputs = [];
    this.recordStartTime = Date.now();
  }
  
  stopRecording(): RecordedInput[] {
    this.recording = false;
    return [...this.recordedInputs];
  }
  
  recordInput(type: RecordedInput['type'], key?: string, value?: RecordedInput['value']): void {
    if (!this.recording) return;
    
    this.recordedInputs.push({
      timestamp: Date.now() - this.recordStartTime,
      type,
      key,
      value
    });
  }
  
  startPlayback(inputs?: RecordedInput[]): void {
    if (inputs) {
      this.recordedInputs = inputs;
    }
    
    this.playing = true;
    this.playbackIndex = 0;
    this.playbackStartTime = Date.now();
  }
  
  stopPlayback(): void {
    this.playing = false;
    this.playbackIndex = 0;
  }
  
  setInputCallback(callback: (input: RecordedInput) => void): void {
    this.onInputCallback = callback;
  }
  
  update(): void {
    if (!this.playing) return;
    
    const elapsed = Date.now() - this.playbackStartTime;
    
    while (this.playbackIndex < this.recordedInputs.length) {
      const input = this.recordedInputs[this.playbackIndex];
      
      if (input.timestamp > elapsed) break;
      
      if (this.onInputCallback) {
        this.onInputCallback(input);
      }
      
      this.playbackIndex++;
    }
    
    if (this.playbackIndex >= this.recordedInputs.length) {
      this.playing = false;
    }
  }
  
  isRecording(): boolean {
    return this.recording;
  }
  
  isPlaying(): boolean {
    return this.playing;
  }
  
  exportRecording(): string {
    return JSON.stringify(this.recordedInputs);
  }
  
  importRecording(json: string): void {
    this.recordedInputs = JSON.parse(json);
  }
}

// ============================================================================
// MAIN INPUT MANAGER
// ============================================================================
