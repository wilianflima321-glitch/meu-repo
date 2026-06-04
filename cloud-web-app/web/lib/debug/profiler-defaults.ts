import type { FrameMetrics, PerformanceBudget, ProfilerConfig } from './profiler-contracts';

export const DEFAULT_PROFILER_BUDGETS: PerformanceBudget[] = [
  { name: 'Frame Time', metric: 'frameTime', limit: 16.67, critical: 33.33 },
  { name: 'CPU Time', metric: 'cpuTime', limit: 10, critical: 16 },
  { name: 'Draw Calls', metric: 'drawCalls', limit: 500, critical: 1000 },
  { name: 'Triangles', metric: 'triangles', limit: 1_000_000, critical: 2_000_000 },
];

export function createDefaultProfilerConfig(config: Partial<ProfilerConfig> = {}): ProfilerConfig {
  const budgets = config.budgets && config.budgets.length > 0 ? config.budgets : [...DEFAULT_PROFILER_BUDGETS];

  return {
    enabled: true,
    maxFrames: 300,
    sampleRate: 1,
    captureCallStacks: false,
    ...config,
    budgets,
  };
}

export function createEmptyFrameMetrics(): FrameMetrics {
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
