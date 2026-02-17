/**
 * Profiler & Timeline System - Profiler Avançado
 * 
 * Sistema completo com:
 * - CPU profiling
 * - Memory profiling  
 * - Frame timeline
 * - GPU timing (WebGL)
 * - Call stack analysis
 * - Flame graphs
 * - Sampling profiler
 * - Custom markers
 * - Performance budgets
 * 
 * @module lib/debug/profiler-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface ProfilerSample {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  category: string;
  parent?: string;
  children: string[];
  data?: Record<string, unknown>;
  depth: number;
}

export interface ProfilerFrame {
  frameNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  samples: ProfilerSample[];
  metrics: FrameMetrics;
}

export interface FrameMetrics {
  cpuTime: number;
  gpuTime: number;
  scriptTime: number;
  renderTime: number;
  physicsTime: number;
  animationTime: number;
  drawCalls: number;
  triangles: number;
  textureSwitches: number;
  shaderSwitches: number;
  stateChanges: number;
  memoryAllocations: number;
}

export interface ProfilerMarker {
  id: string;
  name: string;
  timestamp: number;
  color?: string;
  data?: Record<string, unknown>;
}

export interface PerformanceBudget {
  name: string;
  metric: keyof FrameMetrics | 'frameTime';
  limit: number;
  critical: number;
}

export interface BudgetViolation {
  budget: PerformanceBudget;
  actualValue: number;
  frameNumber: number;
  severity: 'warning' | 'critical';
}

export interface ProfilerConfig {
  enabled: boolean;
  maxFrames: number;
  sampleRate: number;
  captureCallStacks: boolean;
  budgets: PerformanceBudget[];
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  objectCounts: Map<string, number>;
}

// ============================================================================
// PROFILER
// ============================================================================

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
    
    this.config = {
      enabled: true,
      maxFrames: 300,
      sampleRate: 1,
      captureCallStacks: false,
      budgets: [],
      ...config,
    };
    
    // Default budgets
    if (this.config.budgets.length === 0) {
      this.config.budgets = [
        { name: 'Frame Time', metric: 'frameTime', limit: 16.67, critical: 33.33 },
        { name: 'CPU Time', metric: 'cpuTime', limit: 10, critical: 16 },
        { name: 'Draw Calls', metric: 'drawCalls', limit: 500, critical: 1000 },
        { name: 'Triangles', metric: 'triangles', limit: 1000000, critical: 2000000 },
      ];
    }
  }
  
  static getInstance(): Profiler {
    if (!Profiler.instance) {
      Profiler.instance = new Profiler();
    }
    return Profiler.instance;
  }
  
  // ============================================================================
  // RECORDING CONTROL
  // ============================================================================
  
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
  
  // ============================================================================
  // FRAME MANAGEMENT
  // ============================================================================
  
  beginFrame(): void {
    if (!this.isActive()) return;
    
    this.currentFrame = {
      frameNumber: this.frameCounter++,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      samples: [],
      metrics: this.createEmptyMetrics(),
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
  
  private createEmptyMetrics(): FrameMetrics {
    return {
      cpuTime: 0,
      gpuTime: 0,
      scriptTime: 0,
      renderTime: 0,
      physicsTime: 0,
      animationTime: 0,
      drawCalls: 0,
      triangles: 0,
      textureSwitches: 0,
      shaderSwitches: 0,
      stateChanges: 0,
      memoryAllocations: 0,
    };
  }
  
  // ============================================================================
  // SAMPLING
  // ============================================================================
  
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
  
  // ============================================================================
  // SCOPED PROFILING
  // ============================================================================
  
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
  
  // ============================================================================
  // MARKERS
  // ============================================================================
  
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
  
  // ============================================================================
  // RENDER METRICS
  // ============================================================================
  
  setMetric(metric: keyof FrameMetrics, value: number): void {
    if (!this.currentFrame) return;
    this.currentFrame.metrics[metric] = value;
  }
  
  incrementMetric(metric: keyof FrameMetrics, delta = 1): void {
    if (!this.currentFrame) return;
    (this.currentFrame.metrics[metric] as number) += delta;
  }
  
  // ============================================================================
  // GPU PROFILING
  // ============================================================================
  
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
  
  // ============================================================================
  // MEMORY PROFILING
  // ============================================================================
  
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
    if (this.memorySnapshots.length < 2) {
      return { growing: false, rate: 0 };
    }
    
    const recent = this.memorySnapshots.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const delta = last.heapUsed - first.heapUsed;
    const timeDelta = last.timestamp - first.timestamp;
    const rate = delta / timeDelta * 1000; // bytes per second
    
    return {
      growing: rate > 1000, // More than 1KB/s
      rate,
    };
  }
  
  // ============================================================================
  // BUDGET CHECKING
  // ============================================================================
  
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
    for (const budget of this.config.budgets) {
      const value = budget.metric === 'frameTime' 
        ? frame.duration
        : frame.metrics[budget.metric];
        
      if (value > budget.critical) {
        const violation: BudgetViolation = {
          budget,
          actualValue: value,
          frameNumber: frame.frameNumber,
          severity: 'critical',
        };
        this.budgetViolations.push(violation);
        this.emit('budgetViolation', violation);
      } else if (value > budget.limit) {
        const violation: BudgetViolation = {
          budget,
          actualValue: value,
          frameNumber: frame.frameNumber,
          severity: 'warning',
        };
        this.budgetViolations.push(violation);
        this.emit('budgetViolation', violation);
      }
    }
  }
  
  getBudgetViolations(): BudgetViolation[] {
    return [...this.budgetViolations];
  }
  
  // ============================================================================
  // DATA ACCESS
  // ============================================================================
  
  getFrames(): ProfilerFrame[] {
    return [...this.frames];
  }
  
  getLastFrame(): ProfilerFrame | null {
    return this.frames[this.frames.length - 1] || null;
  }
  
  getAverageMetrics(frameCount = 60): FrameMetrics {
    const recent = this.frames.slice(-frameCount);
    if (recent.length === 0) return this.createEmptyMetrics();
    
    const sum = this.createEmptyMetrics();
    
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
  
  // ============================================================================
  // FLAME GRAPH DATA
  // ============================================================================
  
  getFlameGraphData(frameNumber?: number): FlameGraphNode {
    const frame = frameNumber !== undefined
      ? this.frames.find(f => f.frameNumber === frameNumber)
      : this.getLastFrame();
      
    if (!frame) {
      return { name: 'root', value: 0, children: [] };
    }
    
    return this.buildFlameGraph(frame);
  }
  
  private buildFlameGraph(frame: ProfilerFrame): FlameGraphNode {
    const root: FlameGraphNode = {
      name: `Frame ${frame.frameNumber}`,
      value: frame.duration,
      children: [],
    };
    
    const nodeMap = new Map<string, FlameGraphNode>();
    nodeMap.set('root', root);
    
    // Sort samples by depth first, then by start time
    const sortedSamples = [...frame.samples].sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.startTime - b.startTime;
    });
    
    for (const sample of sortedSamples) {
      const node: FlameGraphNode = {
        name: sample.name,
        value: sample.duration,
        children: [],
        category: sample.category,
      };
      
      nodeMap.set(sample.id, node);
      
      const parentNode = sample.parent 
        ? nodeMap.get(sample.parent)
        : root;
        
      parentNode?.children.push(node);
    }
    
    return root;
  }
  
  // ============================================================================
  // EXPORT
  // ============================================================================
  
  exportToJSON(): string {
    return JSON.stringify({
      frames: this.frames,
      markers: this.markers,
      violations: this.budgetViolations,
      config: this.config,
    }, null, 2);
  }
  
  exportToChrome(): object {
    // Export in Chrome DevTools trace format
    const events: ChromeTraceEvent[] = [];
    
    for (const frame of this.frames) {
      for (const sample of frame.samples) {
        events.push({
          name: sample.name,
          cat: sample.category,
          ph: 'B', // Begin
          ts: sample.startTime * 1000, // Convert to microseconds
          pid: 1,
          tid: 1,
        });
        
        events.push({
          name: sample.name,
          cat: sample.category,
          ph: 'E', // End
          ts: sample.endTime * 1000,
          pid: 1,
          tid: 1,
        });
      }
    }
    
    return { traceEvents: events };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
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

// ============================================================================
// FLAME GRAPH TYPES
// ============================================================================

export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
  category?: string;
}

interface ChromeTraceEvent {
  name: string;
  cat: string;
  ph: string;
  ts: number;
  pid: number;
  tid: number;
  args?: Record<string, unknown>;
}

// ============================================================================
// TIMELINE
// ============================================================================

export class Timeline extends EventEmitter {
  private profiler: Profiler;
  private viewStart = 0;
  private viewEnd = 1000;
  private selectedFrame: number | null = null;
  private selectedSample: string | null = null;
  
  constructor(profiler?: Profiler) {
    super();
    this.profiler = profiler || Profiler.getInstance();
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
    return this.profiler.getFrames().find(f => f.frameNumber === this.selectedFrame) || null;
  }
  
  getSelectedSample(): ProfilerSample | null {
    if (this.selectedSample === null) return null;
    const frame = this.getSelectedFrame();
    return frame?.samples.find(s => s.id === this.selectedSample) || null;
  }
  
  getVisibleFrames(): ProfilerFrame[] {
    return this.profiler.getFrames().filter(f => {
      return f.endTime >= this.viewStart && f.startTime <= this.viewEnd;
    });
  }
}

// ============================================================================
// PROFILER DECORATORS
// ============================================================================

export function Profile(category = 'default') {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    
    descriptor.value = function (...args: unknown[]) {
      const profiler = Profiler.getInstance();
      const name = `${target.constructor.name}.${propertyKey}`;
      
      return profiler.scope(name, () => original.apply(this, args), category);
    };
    
    return descriptor;
  };
}

export function ProfileAsync(category = 'default') {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const profiler = Profiler.getInstance();
      const name = `${target.constructor.name}.${propertyKey}`;
      
      return profiler.scopeAsync(name, () => original.apply(this, args), category);
    };
    
    return descriptor;
  };
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from 'react';

interface ProfilerContextValue {
  profiler: Profiler;
  timeline: Timeline;
}

const ProfilerContext = createContext<ProfilerContextValue | null>(null);

export function ProfilerProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<ProfilerConfig>;
}) {
  const value = useMemo(() => {
    const profiler = new Profiler(config);
    return {
      profiler,
      timeline: new Timeline(profiler),
    };
  }, [config]);
  
  useEffect(() => {
    return () => {
      value.profiler.dispose();
    };
  }, [value]);
  
  return (
    <ProfilerContext.Provider value={value}>
      {children}
    </ProfilerContext.Provider>
  );
}

export function useProfiler() {
  const context = useContext(ProfilerContext);
  return context?.profiler || Profiler.getInstance();
}

export function useTimeline() {
  const context = useContext(ProfilerContext);
  if (!context) {
    throw new Error('useTimeline must be used within ProfilerProvider');
  }
  return context.timeline;
}

export function useProfilerRecording() {
  const profiler = useProfiler();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const start = useCallback(() => {
    profiler.startRecording();
    setIsRecording(true);
    setIsPaused(false);
  }, [profiler]);
  
  const stop = useCallback(() => {
    profiler.stopRecording();
    setIsRecording(false);
    setIsPaused(false);
  }, [profiler]);
  
  const pause = useCallback(() => {
    profiler.pauseRecording();
    setIsPaused(true);
  }, [profiler]);
  
  const resume = useCallback(() => {
    profiler.resumeRecording();
    setIsPaused(false);
  }, [profiler]);
  
  return { isRecording, isPaused, start, stop, pause, resume };
}

export function useFrameMetrics() {
  const profiler = useProfiler();
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null);
  const [frameTime, setFrameTime] = useState(0);
  
  useEffect(() => {
    const handleFrame = (frame: ProfilerFrame) => {
      setMetrics(frame.metrics);
      setFrameTime(frame.duration);
    };
    
    profiler.on('frameEnded', handleFrame);
    
    return () => {
      profiler.off('frameEnded', handleFrame);
    };
  }, [profiler]);
  
  return { metrics, frameTime, average: profiler.getAverageMetrics() };
}

export function useBudgetViolations() {
  const profiler = useProfiler();
  const [violations, setViolations] = useState<BudgetViolation[]>([]);
  
  useEffect(() => {
    const handleViolation = (violation: BudgetViolation) => {
      setViolations(prev => [...prev.slice(-100), violation]);
    };
    
    profiler.on('budgetViolation', handleViolation);
    
    return () => {
      profiler.off('budgetViolation', handleViolation);
    };
  }, [profiler]);
  
  return violations;
}

export function useProfileScope(name: string, category = 'default') {
  const profiler = useProfiler();
  const sampleIdRef = useRef<string>('');
  
  const begin = useCallback(() => {
    sampleIdRef.current = profiler.beginSample(name, category);
  }, [profiler, name, category]);
  
  const end = useCallback(() => {
    if (sampleIdRef.current) {
      profiler.endSample(sampleIdRef.current);
      sampleIdRef.current = '';
    }
  }, [profiler]);
  
  return { begin, end };
}

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
