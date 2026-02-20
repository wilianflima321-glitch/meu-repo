/**
 * Shared contracts for the integrated profiler runtime.
 */

export interface ProfilerConfig {
  enabled: boolean;
  sampleRate: number; // Hz
  maxFrames: number; // History size
  autoStart: boolean;
  captureGPU: boolean;
  captureMemory: boolean;
  captureNetwork: boolean;
}

export interface FrameData {
  frameNumber: number;
  timestamp: number;
  deltaTime: number;
  fps: number;
  cpu: CPUData;
  gpu: GPUData;
  memory: MemoryData;
  drawCalls: DrawCallData;
  network: NetworkData;
  markers: MarkerData[];
  spans: SpanData[];
}

export interface CPUData {
  totalTime: number;
  scriptTime: number;
  physicsTime: number;
  animationTime: number;
  audioTime: number;
  networkTime: number;
  renderPrepTime: number;
  idleTime: number;
}

export interface GPUData {
  available: boolean;
  frameTime: number;
  drawTime: number;
  computeTime: number;
  memoryUsed: number;
  memoryTotal: number;
  triangles: number;
  vertices: number;
  shaderSwitches: number;
  textureSwitches: number;
}

export interface MemoryData {
  jsHeapSize: number;
  jsHeapSizeLimit: number;
  jsHeapUsed: number;
  arrayBuffers: number;
  textures: number;
  geometries: number;
  programs: number;
}

export interface DrawCallData {
  total: number;
  triangles: number;
  points: number;
  lines: number;
  indexed: number;
  instanced: number;
  batched: number;
}

export interface NetworkData {
  bytesSent: number;
  bytesReceived: number;
  packetsOut: number;
  packetsIn: number;
  latency: number;
  jitter: number;
}

export interface MarkerData {
  name: string;
  timestamp: number;
  color?: string;
  data?: Record<string, unknown>;
}

export interface SpanData {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  category: string;
  color?: string;
  data?: Record<string, unknown>;
}

export interface ProfilerStats {
  avgFps: number;
  minFps: number;
  maxFps: number;
  avgFrameTime: number;
  p99FrameTime: number;
  stutterCount: number;
  avgCpuTime: number;
  avgGpuTime: number;
  avgDrawCalls: number;
  avgMemory: number;
  hotPaths: HotPath[];
}

export interface HotPath {
  name: string;
  totalTime: number;
  avgTime: number;
  callCount: number;
  percentage: number;
}
