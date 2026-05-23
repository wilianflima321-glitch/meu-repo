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
