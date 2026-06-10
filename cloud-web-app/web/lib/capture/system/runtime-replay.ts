import {
  canvasToBlob,
  createMediaEntry,
  generateCaptureFilename,
} from './canvas-utils';
import type { CapturedMedia, ReplayBufferOptions } from './types';

export class ReplayBufferRuntime {
  private frames: Blob[] = [];
  private interval: ReturnType<typeof setInterval> | null = null;
  private frameRate = 30;

  start(canvas: HTMLCanvasElement, options: ReplayBufferOptions): void {
    this.stop();
    const { duration, frameRate = 30 } = options;
    const maxFrames = duration * frameRate;
    this.frameRate = frameRate;
    this.frames = [];

    this.interval = setInterval(async () => {
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);
      this.frames.push(blob);
      while (this.frames.length > maxFrames) this.frames.shift();
    }, 1000 / frameRate);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.frames = [];
  }

  save(canvas: HTMLCanvasElement | null): CapturedMedia | null {
    if (this.frames.length === 0) return null;

    const blob = new Blob(this.frames, { type: 'video/webm' });
    return createMediaEntry('video', blob, {
      width: canvas?.width ?? 0,
      height: canvas?.height ?? 0,
      format: 'webm',
      filename: generateCaptureFilename('replay', 'webm'),
      duration: this.frames.length / this.frameRate,
    });
  }
}
