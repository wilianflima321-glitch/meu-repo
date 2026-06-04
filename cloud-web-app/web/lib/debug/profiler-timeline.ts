import { EventEmitter } from 'events';
import type { ProfilerFrame, ProfilerSample } from './profiler-contracts';

export interface TimelineProfilerSource {
  getFrames(): ProfilerFrame[];
}

export class TimelineBase extends EventEmitter {
  private profiler: TimelineProfilerSource;
  private viewStart = 0;
  private viewEnd = 1000;
  private selectedFrame: number | null = null;
  private selectedSample: string | null = null;

  constructor(profiler: TimelineProfilerSource) {
    super();
    this.profiler = profiler;
  }

  setViewRange(start: number, end: number): void {
    this.viewStart = start;
    this.viewEnd = end;
    this.emit('viewChanged', { start, end });
  }

  getViewRange(): { start: number; end: number } {
    return { start: this.viewStart, end: this.viewEnd };
  }

  zoom(factor: number, centerTime: number): void {
    const range = this.viewEnd - this.viewStart;
    const newRange = range / factor;

    const centerRatio = (centerTime - this.viewStart) / range;
    this.viewStart = centerTime - newRange * centerRatio;
    this.viewEnd = centerTime + newRange * (1 - centerRatio);

    this.emit('viewChanged', { start: this.viewStart, end: this.viewEnd });
  }

  pan(deltaTime: number): void {
    this.viewStart += deltaTime;
    this.viewEnd += deltaTime;
    this.emit('viewChanged', { start: this.viewStart, end: this.viewEnd });
  }

  selectFrame(frameNumber: number | null): void {
    this.selectedFrame = frameNumber;
    this.emit('frameSelected', frameNumber);
  }

  selectSample(sampleId: string | null): void {
    this.selectedSample = sampleId;
    this.emit('sampleSelected', sampleId);
  }

  getSelectedFrame(): ProfilerFrame | null {
    if (this.selectedFrame === null) return null;
    return this.profiler.getFrames().find((frame) => frame.frameNumber === this.selectedFrame) || null;
  }

  getSelectedSample(): ProfilerSample | null {
    if (this.selectedSample === null) return null;
    const frame = this.getSelectedFrame();
    return frame?.samples.find((sample) => sample.id === this.selectedSample) || null;
  }

  getVisibleFrames(): ProfilerFrame[] {
    return this.profiler.getFrames().filter((frame) => {
      return frame.endTime >= this.viewStart && frame.startTime <= this.viewEnd;
    });
  }
}
