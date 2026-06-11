import type { BoundingBox, StreamingConfig, StreamingStats } from './types';

export function createDefaultStreamingConfig(config: Partial<StreamingConfig> = {}): StreamingConfig {
  return {
    chunkSize: { x: 64, y: 64, z: 64 },
    viewDistance: 500,
    loadDistance: 600,
    unloadDistance: 800,
    maxLoadedChunks: 100,
    maxConcurrentLoads: 4,
    lodLevels: [
      { level: 0, distance: 50, vertexReduction: 1, textureScale: 1, shadowsEnabled: true, animationsEnabled: true, updateFrequency: 60 },
      { level: 1, distance: 100, vertexReduction: 0.5, textureScale: 0.5, shadowsEnabled: true, animationsEnabled: true, updateFrequency: 30 },
      { level: 2, distance: 200, vertexReduction: 0.25, textureScale: 0.25, shadowsEnabled: false, animationsEnabled: true, updateFrequency: 15 },
      { level: 3, distance: 400, vertexReduction: 0.1, textureScale: 0.125, shadowsEnabled: false, animationsEnabled: false, updateFrequency: 10 },
      { level: 4, distance: 600, vertexReduction: 0.05, textureScale: 0.0625, shadowsEnabled: false, animationsEnabled: false, updateFrequency: 5 },
    ],
    prefetchEnabled: true,
    prefetchDistance: 200,
    memoryBudgetMB: 512,
    enableOcclusionCulling: true,
    updateInterval: 100,
    priorityBoostForVisible: 2.0,
    ...config,
  };
}

export const WORLD_STREAMING_BOUNDS: BoundingBox = {
  min: { x: -10000, y: -1000, z: -10000 },
  max: { x: 10000, y: 1000, z: 10000 },
};

export function createEmptyStreamingStats(memoryBudgetMB: number): StreamingStats {
  return {
    loadedChunks: 0,
    loadingChunks: 0,
    totalChunks: 0,
    memoryUsedMB: 0,
    memoryBudgetMB,
    chunksLoadedThisFrame: 0,
    chunksUnloadedThisFrame: 0,
    averageLoadTime: 0,
    visibleChunks: 0,
    culledChunks: 0,
  };
}
