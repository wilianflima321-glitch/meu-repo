/** Runtime profiler entrypoint. Heavy export helpers live in sibling modules. */

import { EventEmitter } from 'events';
import type {
  BudgetViolation,
  FrameMetrics,
  MemorySnapshot,
  PerformanceBudget,
  ProfilerConfig,
  ProfilerFrame,
  ProfilerMarker,
  ProfilerSample,
} from './profiler-contracts';
import { collectBudgetViolations } from './profiler-budget';
import { createDefaultProfilerConfig, createEmptyFrameMetrics } from './profiler-defaults';
import { buildChromeTraceEvents, buildFlameGraph, type FlameGraphNode } from './profiler-exporters';
import { getMemoryTrend } from './profiler-memory';
import { Profile, ProfileAsync } from './profiler-decorators';
import { TimelineBase } from './profiler-timeline';
import {
  ProfilerProvider,
  useBudgetViolations,
  useFrameMetrics,
  useProfileScope,
  useProfiler,
  useProfilerRecording,
  useTimeline,
} from './profiler-system-react';

export type { FlameGraphNode } from './profiler-exporters';

export type {
  BudgetViolation,
  FrameMetrics,
  MemorySnapshot,
  PerformanceBudget,
  ProfilerConfig,
  ProfilerFrame,
  ProfilerMarker,
  ProfilerSample,
} from './profiler-contracts';

export class Profiler extends EventEmitter {
  private static instance: Profiler | null = null;

  private config: ProfilerConfig;
  private frames: ProfilerFrame[] = [];
  private currentFrame: ProfilerFrame | null = null;
  private sampleStack: ProfilerSample[] = [];
  private sampleIdCounter = 0;
  private frameCounter = 0;
  private markers: ProfilerMarker[] = [];
  private budgetViolations: BudgetViolation[] = [];
  private isRecording = false;
  private isPaused = false;
  private recordingStartTime = 0;

  // GPU timing
  private gl: WebGL2RenderingContext | null = null;
  private gpuTimerExt: { TIME_ELAPSED_EXT: number } | null = null;
  private gpuQueries: Map<string, WebGLQuery> = new Map();
  private gpuQueryResults: Map<string, number> = new Map();

  // Memory tracking
  private memorySnapshots: MemorySnapshot[] = [];
  private lastMemorySnapshot = 0;

  constructor(config: Partial<ProfilerConfig> = {}) {
    super();

    this.config = createDefaultProfilerConfig(config);
  }

  static getInstance(): Profiler {
    if (!Profiler.instance) {
      Profiler.instance = new Profiler();
    }
    return Profiler.instance;
  }

  startRecording(): void {
    this.frames = [];
    this.markers = [];
    this.budgetViolations = [];
    this.frameCounter = 0;
    this.isRecording = true;
    this.isPaused = false;
    this.recordingStartTime = performance.now();
    this.emit('recordingStarted');
  }

  stopRecording(): ProfilerFrame[] {
    this.isRecording = false;
    this.emit('recordingStopped', this.frames);
    return [...this.frames];
  }

  pauseRecording(): void {
    this.isPaused = true;
    this.emit('recordingPaused');
  }

  resumeRecording(): void {
    this.isPaused = false;
    this.emit('recordingResumed');
  }

  isActive(): boolean {
    return this.isRecording && !this.isPaused;
  }

  beginFrame(): void {
    if (!this.isActive()) return;

    this.currentFrame = {
      frameNumber: this.frameCounter++,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      samples: [],
      metrics: createEmptyFrameMetrics(),
    };

    this.sampleStack = [];
  }

  endFrame(): void {
    if (!this.isActive() || !this.currentFrame) return;

    this.currentFrame.endTime = performance.now();
    this.currentFrame.duration = this.currentFrame.endTime - this.currentFrame.startTime;

    // Check budgets
    this.checkBudgets(this.currentFrame);

    // Store frame
    this.frames.push(this.currentFrame);

    // Trim old frames
    while (this.frames.length > this.config.maxFrames) {
      this.frames.shift();
    }

    this.emit('frameEnded', this.currentFrame);
    this.currentFrame = null;
  }

  beginSample(name: string, category = 'default'): string {
    if (!this.isActive() || !this.currentFrame) return '';

    const id = `sample_${++this.sampleIdCounter}`;
    const parent = this.sampleStack[this.sampleStack.length - 1];

    const sample: ProfilerSample = {
      id,
      name,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      category,
      parent: parent?.id,
      children: [],
      depth: this.sampleStack.length,
    };

    if (parent) {
      parent.children.push(id);
    }

    this.sampleStack.push(sample);
    this.currentFrame.samples.push(sample);

    return id;
  }

  endSample(id?: string): void {
    if (!this.isActive() || !this.currentFrame) return;

    const sample = id
      ? this.currentFrame.samples.find(s => s.id === id)
      : this.sampleStack.pop();

    if (!sample) return;

    sample.endTime = performance.now();
    sample.duration = sample.endTime - sample.startTime;

    // Update metrics
    this.updateMetricsFromSample(sample);

    if (id) {
      // Remove from stack if ended by id
      const stackIndex = this.sampleStack.findIndex(s => s.id === id);
      if (stackIndex !== -1) {
        this.sampleStack.splice(stackIndex, 1);
      }
    }
  }

  private updateMetricsFromSample(sample: ProfilerSample): void {
    if (!this.currentFrame) return;

    const metrics = this.currentFrame.metrics;

    switch (sample.category) {
      case 'script':
        metrics.scriptTime += sample.duration;
        break;
      case 'render':
        metrics.renderTime += sample.duration;
        break;
      case 'physics':
        metrics.physicsTime += sample.duration;
        break;
      case 'animation':
        metrics.animationTime += sample.duration;
        break;
      default:
        metrics.cpuTime += sample.duration;
    }
  }

  scope<T>(name: string, fn: () => T, category = 'default'): T {
    const id = this.beginSample(name, category);
    try {
      return fn();
    } finally {
      this.endSample(id);
    }
  }

  async scopeAsync<T>(name: string, fn: () => Promise<T>, category = 'default'): Promise<T> {
    const id = this.beginSample(name, category);
    try {
      return await fn();
    } finally {
      this.endSample(id);
    }
  }

  addMarker(name: string, color?: string, data?: Record<string, unknown>): void {
    if (!this.isActive()) return;

    const marker: ProfilerMarker = {
      id: `marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      timestamp: performance.now(),
      color,
      data,
    };

    this.markers.push(marker);
    this.emit('markerAdded', marker);
  }

  getMarkers(): ProfilerMarker[] {
    return [...this.markers];
  }

  setMetric(metric: keyof FrameMetrics, value: number): void {
    if (!this.currentFrame) return;
    this.currentFrame.metrics[metric] = value;
  }

  incrementMetric(metric: keyof FrameMetrics, delta = 1): void {
    if (!this.currentFrame) return;
    (this.currentFrame.metrics[metric] as number) += delta;
  }

  setGLContext(gl: WebGL2RenderingContext): void {
    this.gl = gl;
    // Get GPU timer extension
    this.gpuTimerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number } | null;
  }

  beginGPUQuery(name: string): void {
    if (!this.gl || !this.gpuTimerExt) return;

    const query = this.gl.createQuery();
    if (!query) return;

    this.gl.beginQuery(this.gpuTimerExt.TIME_ELAPSED_EXT, query);
    this.gpuQueries.set(name, query);
  }

  endGPUQuery(name: string): void {
    if (!this.gl || !this.gpuTimerExt) return;

    const query = this.gpuQueries.get(name);
    if (!query) return;

    this.gl.endQuery(this.gpuTimerExt.TIME_ELAPSED_EXT);
    this.checkGPUQueryResult(name, query);
  }

  private checkGPUQueryResult(name: string, query: WebGLQuery): void {
    if (!this.gl) return;

    const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);

    if (available) {
      const elapsed = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
      this.gpuQueryResults.set(name, elapsed / 1000000); // ns to ms
      this.gl.deleteQuery(query);
      this.gpuQueries.delete(name);
    } else {
      // Check again next frame
      requestAnimationFrame(() => this.checkGPUQueryResult(name, query));
    }
  }

  getGPUTime(name: string): number {
    return this.gpuQueryResults.get(name) || 0;
  }

  captureMemorySnapshot(): MemorySnapshot | null {
    const now = performance.now();

    // Rate limit snapshots
    if (now - this.lastMemorySnapshot < 100) return null;
    this.lastMemorySnapshot = now;

    const perf = window.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
      };
    };

    if (!perf.memory) return null;

    const snapshot: MemorySnapshot = {
      timestamp: now,
      heapUsed: perf.memory.usedJSHeapSize,
      heapTotal: perf.memory.totalJSHeapSize,
      external: 0,
      arrayBuffers: 0,
      objectCounts: new Map(),
    };

    this.memorySnapshots.push(snapshot);

    // Keep only last 100 snapshots
    while (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }

    return snapshot;
  }

  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  getMemoryTrend(): { growing: boolean; rate: number } {
    return getMemoryTrend(this.memorySnapshots);
  }

  addBudget(budget: PerformanceBudget): void {
    this.config.budgets.push(budget);
  }

  removeBudget(name: string): void {
    const index = this.config.budgets.findIndex(b => b.name === name);
    if (index !== -1) {
      this.config.budgets.splice(index, 1);
    }
  }

  private checkBudgets(frame: ProfilerFrame): void {
    for (const violation of collectBudgetViolations(frame, this.config.budgets)) {
      this.budgetViolations.push(violation);
      this.emit('budgetViolation', violation);
    }
  }

  getBudgetViolations(): BudgetViolation[] {
    return [...this.budgetViolations];
  }

  getFrames(): ProfilerFrame[] {
    return [...this.frames];
  }

  getLastFrame(): ProfilerFrame | null {
    return this.frames[this.frames.length - 1] || null;
  }

  getAverageMetrics(frameCount = 60): FrameMetrics {
    const recent = this.frames.slice(-frameCount);
    if (recent.length === 0) return createEmptyFrameMetrics();

    const sum = createEmptyFrameMetrics();

    for (const frame of recent) {
      for (const key of Object.keys(sum) as (keyof FrameMetrics)[]) {
        (sum[key] as number) += frame.metrics[key] as number;
      }
    }

    for (const key of Object.keys(sum) as (keyof FrameMetrics)[]) {
      (sum[key] as number) /= recent.length;
    }

    return sum;
  }

  getAverageFrameTime(frameCount = 60): number {
    const recent = this.frames.slice(-frameCount);
    if (recent.length === 0) return 0;

    const sum = recent.reduce((a, f) => a + f.duration, 0);
    return sum / recent.length;
  }

  getFlameGraphData(frameNumber?: number): FlameGraphNode {
    const frame = frameNumber !== undefined
      ? this.frames.find(f => f.frameNumber === frameNumber)
      : this.getLastFrame();

    if (!frame) {
      return { name: 'root', value: 0, children: [] };
    }

    return buildFlameGraph(frame);
  }

  exportToJSON(): string {
    return JSON.stringify({
      frames: this.frames,
      markers: this.markers,
      violations: this.budgetViolations,
      config: this.config,
    }, null, 2);
  }

  exportToChrome(): object {
    return { traceEvents: buildChromeTraceEvents(this.frames) };
  }

  clear(): void {
    this.frames = [];
    this.markers = [];
    this.budgetViolations = [];
    this.memorySnapshots = [];
    this.frameCounter = 0;
  }

  dispose(): void {
    this.stopRecording();
    this.clear();

    // Cleanup GPU queries
    if (this.gl) {
      for (const query of this.gpuQueries.values()) {
        this.gl.deleteQuery(query);
      }
    }

    this.gpuQueries.clear();
    this.gpuQueryResults.clear();
    this.removeAllListeners();
  }
}

export class Timeline extends TimelineBase {
  constructor(profiler?: Profiler) {
    super(profiler || Profiler.getInstance());
  }
}

export { Profile, ProfileAsync } from './profiler-decorators';

export {
  ProfilerProvider,
  useBudgetViolations,
  useFrameMetrics,
  useProfileScope,
  useProfiler,
  useProfilerRecording,
  useTimeline,
} from './profiler-system-react';

const __defaultExport = {
  Profiler,
  Timeline,
  Profile,
  ProfileAsync,
  ProfilerProvider,
  useProfiler,
  useTimeline,
  useProfilerRecording,
  useFrameMetrics,
  useBudgetViolations,
  useProfileScope,
};

export default __defaultExport;
