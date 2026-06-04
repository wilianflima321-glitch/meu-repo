import type * as THREE from 'three';

export type LevelState = 'unloaded' | 'loading' | 'loaded' | 'visible' | 'unloading';
export type StreamingPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export interface LevelDefinition {
  id: string;
  name: string;
  path: string;
  persistent?: boolean;
  streamingDistance?: number;
  bounds?: LevelBounds;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface LevelBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface LevelInstance {
  definition: LevelDefinition;
  state: LevelState;
  progress: number;
  scene: THREE.Object3D | null;
  assets: Set<string>;
  loadedAt: number | null;
  lastVisibleAt: number | null;
  error: Error | null;
}

export interface StreamingConfig {
  maxConcurrentLoads: number;
  streamingDistance: number;
  unloadDistance: number;
  preloadDistance: number;
  memoryBudgetMB: number;
  checkInterval: number;
  minLoadTimeMs: number;
}

export interface TransitionConfig {
  type: 'instant' | 'fade' | 'loading_screen' | 'custom';
  duration?: number;
  loadingScreen?: {
    minDisplayTime: number;
    showProgress: boolean;
    backgroundImage?: string;
    tips?: string[];
  };
}

export interface StreamingMetrics {
  loadedLevels: number;
  totalMemoryMB: number;
  currentLoads: number;
  averageLoadTime: number;
  cacheHitRate: number;
}

export interface LevelLoaderResult {
  scene: THREE.Object3D;
  assets: string[];
  metadata?: Record<string, unknown>;
}

export type LevelLoaderFn = (
  definition: LevelDefinition,
  onProgress: (progress: number) => void
) => Promise<LevelLoaderResult>;
