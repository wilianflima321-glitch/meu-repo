/**
 * Profiler Integrado - Sistema de Performance Profiling Completo
 * 
 * Sistema profissional de análise de performance:
 * - CPU profiling
 * - GPU profiling (WebGL)
 * - Memory profiling
 * - Frame time analysis
 * - Draw call tracking
 * - Network profiling
 * - Custom markers/spans
 * - Timeline visualization
 * - Hot path detection
 * - Bottleneck identification
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

import type {
  CPUData,
  DrawCallData,
  FrameData,
  GPUData,
  HotPath,
  MarkerData,
  MemoryData,
  NetworkData,
  ProfilerConfig,
  ProfilerStats,
  SpanData,
} from './profiler-integrated-types';

export type {
  CPUData,
  DrawCallData,
  FrameData,
  GPUData,
  HotPath,
  MarkerData,
  MemoryData,
  NetworkData,
  ProfilerConfig,
  ProfilerStats,
  SpanData,
} from './profiler-integrated-types';

import {
  DrawCallTracker,
  GPUProfiler,
  HighResTimer,
  MemoryProfiler,
  SpanRecorder,
} from './profiler-integrated-runtime-helpers';
export {
  DrawCallTracker,
  GPUProfiler,
  HighResTimer,
  MemoryProfiler,
  SpanRecorder,
} from './profiler-integrated-runtime-helpers';

// ============================================================================
// MAIN PROFILER CLASS
// ============================================================================

export class Profiler {
  private static instance: Profiler | null = null;
  
  private config: ProfilerConfig;
  private frames: FrameData[] = [];
  private frameNumber: number = 0;
  private lastFrameTime: number = 0;
  private recording: boolean = false;
  
  private gpuProfiler: GPUProfiler;
  private memoryProfiler: MemoryProfiler;
  private drawCallTracker: DrawCallTracker;
  private spanRecorder: SpanRecorder;
  
  private cpuTimings: Map<string, number> = new Map();
  private markers: MarkerData[] = [];
  private callbacks: Map<string, ((data: FrameData) => void)[]> = new Map();
  
  // Current frame CPU timing categories
  private currentFrameCPU: CPUData = this.createEmptyCPU();
  
  private constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 60,
      maxFrames: 300,
      autoStart: true,
      captureGPU: true,
      captureMemory: true,
      captureNetwork: true,
      ...config,
    };
    
    this.gpuProfiler = new GPUProfiler();
    this.memoryProfiler = new MemoryProfiler();
    this.drawCallTracker = new DrawCallTracker();
    this.spanRecorder = new SpanRecorder();
    
    if (this.config.autoStart) {
      this.start();
    }
  }
  
  static getInstance(config?: Partial<ProfilerConfig>): Profiler {
    if (!Profiler.instance) {
      Profiler.instance = new Profiler(config);
    }
    return Profiler.instance;
  }
  
  private createEmptyCPU(): CPUData {
    return {
      totalTime: 0,
      scriptTime: 0,
      physicsTime: 0,
      animationTime: 0,
      audioTime: 0,
      networkTime: 0,
      renderPrepTime: 0,
      idleTime: 0,
    };
  }
  
  // Lifecycle
  start(): void {
    this.recording = true;
    this.lastFrameTime = HighResTimer.now();
  }
  
  stop(): void {
    this.recording = false;
  }
  
  reset(): void {
    this.frames = [];
    this.frameNumber = 0;
    this.markers = [];
    this.cpuTimings.clear();
    this.spanRecorder.clear();
  }
  
  // Frame management
  beginFrame(): void {
    if (!this.recording) return;
    
    this.currentFrameCPU = this.createEmptyCPU();
    this.markers = [];
    this.drawCallTracker.beginFrame();
    
    if (this.config.captureGPU) {
      this.gpuProfiler.beginQuery('frame');
    }
    
    HighResTimer.mark('frame_start');
  }
  
  endFrame(): void {
    if (!this.recording) return;
    
    HighResTimer.mark('frame_end');
    const now = HighResTimer.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    // End GPU query
    if (this.config.captureGPU) {
      this.gpuProfiler.endQuery();
    }
    
    // Collect data
    const frameData: FrameData = {
      frameNumber: this.frameNumber++,
      timestamp: now,
      deltaTime,
      fps: 1000 / deltaTime,
      cpu: { ...this.currentFrameCPU, totalTime: deltaTime },
      gpu: this.collectGPUData(),
      memory: this.config.captureMemory ? this.memoryProfiler.capture() : this.createEmptyMemory(),
      drawCalls: this.drawCallTracker.endFrame(),
      network: this.createEmptyNetwork(),
      markers: [...this.markers],
      spans: this.spanRecorder.getCompleted(),
    };
    
    // Calculate idle time
    frameData.cpu.idleTime = deltaTime - (
      frameData.cpu.scriptTime +
      frameData.cpu.physicsTime +
      frameData.cpu.animationTime +
      frameData.cpu.audioTime +
      frameData.cpu.networkTime +
      frameData.cpu.renderPrepTime
    );
    
    // Store frame
    this.frames.push(frameData);
    if (this.frames.length > this.config.maxFrames) {
      this.frames.shift();
    }
    
    // Notify callbacks
    this.notifyCallbacks('frame', frameData);
  }
  
  private collectGPUData(): GPUData {
    if (!this.config.captureGPU) {
      return this.createEmptyGPU();
    }
    
    const results = this.gpuProfiler.collectResults();
    
    return {
      available: this.gpuProfiler.isAvailable(),
      frameTime: results.get('frame') || 0,
      drawTime: results.get('draw') || 0,
      computeTime: results.get('compute') || 0,
      memoryUsed: 0,
      memoryTotal: 0,
      triangles: 0,
      vertices: 0,
      shaderSwitches: 0,
      textureSwitches: 0,
    };
  }
  
  private createEmptyGPU(): GPUData {
    return {
      available: false,
      frameTime: 0,
      drawTime: 0,
      computeTime: 0,
      memoryUsed: 0,
      memoryTotal: 0,
      triangles: 0,
      vertices: 0,
      shaderSwitches: 0,
      textureSwitches: 0,
    };
  }
  
  private createEmptyMemory(): MemoryData {
    return {
      jsHeapSize: 0,
      jsHeapSizeLimit: 0,
      jsHeapUsed: 0,
      arrayBuffers: 0,
      textures: 0,
      geometries: 0,
      programs: 0,
    };
  }
  
  private createEmptyNetwork(): NetworkData {
    return {
      bytesSent: 0,
      bytesReceived: 0,
      packetsOut: 0,
      packetsIn: 0,
      latency: 0,
      jitter: 0,
    };
  }
  
  // CPU Timing
  beginCPU(category: keyof CPUData): void {
    HighResTimer.mark(`cpu_${category}_start`);
  }
  
  endCPU(category: keyof CPUData): void {
    HighResTimer.mark(`cpu_${category}_end`);
    const duration = HighResTimer.measure(
      `cpu_${category}`,
      `cpu_${category}_start`,
      `cpu_${category}_end`
    );
    (this.currentFrameCPU as any)[category] = duration;
  }
  
  // Spans
  beginSpan(name: string, category: string = 'default', color?: string): void {
    this.spanRecorder.begin(name, category, color);
  }
  
  endSpan(name: string): void {
    this.spanRecorder.end(name);
  }
  
  span<T>(name: string, category: string, fn: () => T): T {
    this.beginSpan(name, category);
    const result = fn();
    this.endSpan(name);
    return result;
  }
  
  async spanAsync<T>(name: string, category: string, fn: () => Promise<T>): Promise<T> {
    this.beginSpan(name, category);
    const result = await fn();
    this.endSpan(name);
    return result;
  }
  
  // Markers
  mark(name: string, color?: string, data?: Record<string, unknown>): void {
    this.markers.push({
      name,
      timestamp: HighResTimer.now(),
      color,
      data,
    });
  }
  
  // Draw call tracking
  recordDrawCall(mode: number, count: number, indexed: boolean = false): void {
    if (indexed) {
      this.drawCallTracker.recordDrawElements(mode, count);
    } else {
      this.drawCallTracker.recordDrawArrays(mode, count);
    }
  }
  
  // Statistics
  getStats(): ProfilerStats {
    if (this.frames.length === 0) {
      return this.createEmptyStats();
    }
    
    const fps = this.frames.map(f => f.fps);
    const frameTimes = this.frames.map(f => f.deltaTime);
    const cpuTimes = this.frames.map(f => f.cpu.totalTime);
    const gpuTimes = this.frames.map(f => f.gpu.frameTime);
    const drawCalls = this.frames.map(f => f.drawCalls.total);
    const memory = this.frames.map(f => f.memory.jsHeapUsed);
    
    // Calculate percentiles
    const sortedFrameTimes = [...frameTimes].sort((a, b) => a - b);
    const p99Index = Math.floor(sortedFrameTimes.length * 0.99);
    
    // Count stutters (frames > 33ms)
    const stutterCount = frameTimes.filter(t => t > 33).length;
    
    // Calculate hot paths from spans
    const hotPaths = this.calculateHotPaths();
    
    return {
      avgFps: this.average(fps),
      minFps: Math.min(...fps),
      maxFps: Math.max(...fps),
      avgFrameTime: this.average(frameTimes),
      p99FrameTime: sortedFrameTimes[p99Index] || 0,
      stutterCount,
      avgCpuTime: this.average(cpuTimes),
      avgGpuTime: this.average(gpuTimes),
      avgDrawCalls: this.average(drawCalls),
      avgMemory: this.average(memory),
      hotPaths,
    };
  }
  
  private createEmptyStats(): ProfilerStats {
    return {
      avgFps: 0,
      minFps: 0,
      maxFps: 0,
      avgFrameTime: 0,
      p99FrameTime: 0,
      stutterCount: 0,
      avgCpuTime: 0,
      avgGpuTime: 0,
      avgDrawCalls: 0,
      avgMemory: 0,
      hotPaths: [],
    };
  }
  
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  private calculateHotPaths(): HotPath[] {
    const spanTotals = new Map<string, { total: number; count: number }>();
    let totalTime = 0;
    
    for (const frame of this.frames) {
      for (const span of frame.spans) {
        const existing = spanTotals.get(span.name) || { total: 0, count: 0 };
        existing.total += span.duration;
        existing.count++;
        spanTotals.set(span.name, existing);
        totalTime += span.duration;
      }
    }
    
    const hotPaths: HotPath[] = [];
    for (const [name, data] of spanTotals) {
      hotPaths.push({
        name,
        totalTime: data.total,
        avgTime: data.total / data.count,
        callCount: data.count,
        percentage: totalTime > 0 ? (data.total / totalTime) * 100 : 0,
      });
    }
    
    // Sort by total time descending
    hotPaths.sort((a, b) => b.totalTime - a.totalTime);
    
    return hotPaths.slice(0, 10);
  }
  
  // Frame data access
  getFrames(): FrameData[] {
    return [...this.frames];
  }
  
  getLastFrame(): FrameData | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }
  
  getFrameRange(start: number, end: number): FrameData[] {
    return this.frames.filter(f => f.frameNumber >= start && f.frameNumber <= end);
  }
  
  // Callbacks
  onFrame(callback: (data: FrameData) => void): () => void {
    if (!this.callbacks.has('frame')) {
      this.callbacks.set('frame', []);
    }
    this.callbacks.get('frame')!.push(callback);
    
    return () => {
      const callbacks = this.callbacks.get('frame');
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  private notifyCallbacks(event: string, data: unknown): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data as FrameData);
      }
    }
  }
  
  // Export
  exportJSON(): string {
    return JSON.stringify({
      config: this.config,
      stats: this.getStats(),
      frames: this.frames,
    }, null, 2);
  }
  
  exportCSV(): string {
    const headers = ['frame', 'timestamp', 'fps', 'deltaTime', 'cpuTotal', 'gpuFrame', 'drawCalls', 'memory'];
    const rows = this.frames.map(f => [
      f.frameNumber,
      f.timestamp,
      f.fps.toFixed(2),
      f.deltaTime.toFixed(2),
      f.cpu.totalTime.toFixed(2),
      f.gpu.frameTime.toFixed(2),
      f.drawCalls.total,
      f.memory.jsHeapUsed,
    ].join(','));
    
    return [headers.join(','), ...rows].join('\n');
  }
  
  // Cleanup
  dispose(): void {
    this.stop();
    this.reset();
    this.gpuProfiler.dispose();
    Profiler.instance = null;
  }
}

// ============================================================================
// PROFILER UI COMPONENT
// ============================================================================

export class ProfilerOverlay {
  private container: HTMLDivElement | null = null;
  private profiler: Profiler;
  private visible: boolean = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor(profiler: Profiler) {
    this.profiler = profiler;
  }
  
  show(parent: HTMLElement = document.body): void {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.id = 'profiler-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      padding: 15px;
      border-radius: 8px;
      z-index: 99999;
      min-width: 300px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    parent.appendChild(this.container);
    this.visible = true;
    
    this.updateInterval = setInterval(() => this.update(), 100);
  }
  
  hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.visible = false;
  }
  
  toggle(parent?: HTMLElement): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show(parent);
    }
  }
  
  private update(): void {
    if (!this.container) return;
    
    const stats = this.profiler.getStats();
    const lastFrame = this.profiler.getLastFrame();
    
    const fpsColor = stats.avgFps >= 55 ? '#4CAF50' : stats.avgFps >= 30 ? '#FFC107' : '#F44336';
    const cpuColor = stats.avgCpuTime <= 8 ? '#4CAF50' : stats.avgCpuTime <= 16 ? '#FFC107' : '#F44336';
    
    this.container.innerHTML = `
      <div style="border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 10px;">
        <strong style="font-size: 14px;">⚡ AETHEL PROFILER</strong>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <div style="color: #888; font-size: 10px;">FPS</div>
          <div style="color: ${fpsColor}; font-size: 24px; font-weight: bold;">
            ${stats.avgFps.toFixed(0)}
          </div>
          <div style="color: #666; font-size: 10px;">
            min: ${stats.minFps.toFixed(0)} / max: ${stats.maxFps.toFixed(0)}
          </div>
        </div>
        
        <div>
          <div style="color: #888; font-size: 10px;">FRAME TIME</div>
          <div style="color: ${cpuColor}; font-size: 24px; font-weight: bold;">
            ${stats.avgFrameTime.toFixed(1)}ms
          </div>
          <div style="color: #666; font-size: 10px;">
            p99: ${stats.p99FrameTime.toFixed(1)}ms
          </div>
        </div>
      </div>
      
      <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #888;">CPU Time:</span>
          <span>${stats.avgCpuTime.toFixed(2)}ms</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #888;">GPU Time:</span>
          <span>${stats.avgGpuTime.toFixed(2)}ms</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #888;">Draw Calls:</span>
          <span>${stats.avgDrawCalls.toFixed(0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: #888;">Memory:</span>
          <span>${(stats.avgMemory / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Stutters:</span>
          <span style="color: ${stats.stutterCount > 0 ? '#F44336' : '#4CAF50'};">
            ${stats.stutterCount}
          </span>
        </div>
      </div>
      
      ${lastFrame ? this.renderCPUBreakdown(lastFrame) : ''}
      
      ${stats.hotPaths.length > 0 ? this.renderHotPaths(stats.hotPaths) : ''}
      
      <div style="margin-top: 10px; border-top: 1px solid #444; padding-top: 10px; text-align: center;">
        <button onclick="window.aethelProfiler.exportData()" style="
          background: #2196F3;
          border: none;
          color: white;
          padding: 5px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">Export Data</button>
      </div>
    `;
  }
  
  private renderCPUBreakdown(frame: FrameData): string {
    const categories = [
      { name: 'Script', value: frame.cpu.scriptTime, color: '#2196F3' },
      { name: 'Physics', value: frame.cpu.physicsTime, color: '#4CAF50' },
      { name: 'Animation', value: frame.cpu.animationTime, color: '#FF9800' },
      { name: 'Audio', value: frame.cpu.audioTime, color: '#9C27B0' },
      { name: 'Network', value: frame.cpu.networkTime, color: '#00BCD4' },
      { name: 'Render', value: frame.cpu.renderPrepTime, color: '#F44336' },
    ].filter(c => c.value > 0.01);
    
    if (categories.length === 0) return '';
    
    const total = categories.reduce((sum, c) => sum + c.value, 0);
    
    return `
      <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
        <div style="color: #888; font-size: 10px; margin-bottom: 5px;">CPU BREAKDOWN</div>
        <div style="height: 8px; display: flex; border-radius: 4px; overflow: hidden;">
          ${categories.map(c => `
            <div style="
              width: ${(c.value / total) * 100}%;
              background: ${c.color};
            " title="${c.name}: ${c.value.toFixed(2)}ms"></div>
          `).join('')}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; font-size: 10px;">
          ${categories.map(c => `
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 8px; height: 8px; background: ${c.color}; border-radius: 2px;"></div>
              <span>${c.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  private renderHotPaths(hotPaths: HotPath[]): string {
    const top3 = hotPaths.slice(0, 3);
    
    return `
      <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
        <div style="color: #888; font-size: 10px; margin-bottom: 5px;">HOT PATHS</div>
        ${top3.map(hp => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px;">
            <span style="color: #FFC107; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
              ${hp.name}
            </span>
            <span>
              ${hp.avgTime.toFixed(2)}ms (${hp.percentage.toFixed(1)}%)
            </span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  isVisible(): boolean {
    return this.visible;
  }
}

// ============================================================================
// GRAPH RENDERER
// ============================================================================

export class ProfilerGraph {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private profiler: Profiler;
  private width: number;
  private height: number;
  private dataPoints: number = 120;
  
  constructor(profiler: Profiler, width: number = 300, height: number = 100) {
    this.profiler = profiler;
    this.width = width;
    this.height = height;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.cssText = 'background: #1a1a1a; border-radius: 4px;';
    
    this.ctx = this.canvas.getContext('2d')!;
  }
  
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
  
  render(metric: 'fps' | 'frameTime' | 'memory' | 'drawCalls' = 'fps'): void {
    const frames = this.profiler.getFrames().slice(-this.dataPoints);
    if (frames.length === 0) return;
    
    // Clear
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Get data
    let data: number[];
    let maxValue: number;
    let label: string;
    let color: string;
    
    switch (metric) {
      case 'fps':
        data = frames.map(f => f.fps);
        maxValue = 120;
        label = 'FPS';
        color = '#4CAF50';
        break;
      case 'frameTime':
        data = frames.map(f => f.deltaTime);
        maxValue = 50;
        label = 'Frame Time (ms)';
        color = '#2196F3';
        break;
      case 'memory':
        data = frames.map(f => f.memory.jsHeapUsed / 1024 / 1024);
        maxValue = Math.max(...data) * 1.2;
        label = 'Memory (MB)';
        color = '#FF9800';
        break;
      case 'drawCalls':
        data = frames.map(f => f.drawCalls.total);
        maxValue = Math.max(...data, 100);
        label = 'Draw Calls';
        color = '#9C27B0';
        break;
    }
    
    // Draw reference lines
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * this.height;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    
    // Draw data
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    const stepX = this.width / (this.dataPoints - 1);
    
    for (let i = 0; i < data.length; i++) {
      const x = i * stepX;
      const y = this.height - (data[i] / maxValue) * this.height;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.stroke();
    
    // Draw fill
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fillStyle = color + '33';
    this.ctx.fill();
    
    // Draw label
    this.ctx.fillStyle = '#888';
    this.ctx.font = '10px Monaco';
    this.ctx.fillText(label, 5, 12);
    
    // Draw current value
    const currentValue = data[data.length - 1];
    this.ctx.fillStyle = color;
    this.ctx.fillText(currentValue.toFixed(1), this.width - 40, 12);
  }
}

// ============================================================================
// GLOBAL INSTANCE & EXPORTS
// ============================================================================

export const profiler = Profiler.getInstance();

// Expose to window for debug
if (typeof window !== 'undefined') {
  (window as any).aethelProfiler = {
    instance: profiler,
    show: () => new ProfilerOverlay(profiler).show(),
    stats: () => profiler.getStats(),
    exportData: () => {
      const data = profiler.exportJSON();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profiler_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}

// Helper decorators
export function profile(category: string = 'default') {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      profiler.beginSpan(propertyKey, category);
      const result = originalMethod.apply(this, args);
      profiler.endSpan(propertyKey);
      return result;
    };
    
    return descriptor;
  };
}

export function profileAsync(category: string = 'default') {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      profiler.beginSpan(propertyKey, category);
      const result = await originalMethod.apply(this, args);
      profiler.endSpan(propertyKey);
      return result;
    };
    
    return descriptor;
  };
}
