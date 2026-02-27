/**
 * World streaming shared contracts.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface Sphere {
  center: Vector3;
  radius: number;
}

export type ChunkState = 'unloaded' | 'loading' | 'loaded' | 'unloading' | 'error';
export type LODLevel = 0 | 1 | 2 | 3 | 4; // 0 = highest detail

export interface WorldChunk {
  id: string;
  position: Vector3;
  size: Vector3;
  bounds: BoundingBox;
  state: ChunkState;
  lodLevel: LODLevel;
  priority: number;
  data: any | null;
  neighbors: string[];
  lastAccessTime: number;
  loadTime: number;
  memorySize: number;
  entities: string[];
  terrainMesh: any | null;
  collisionMesh: any | null;
}

export interface LODConfig {
  level: LODLevel;
  distance: number;
  vertexReduction: number;
  textureScale: number;
  shadowsEnabled: boolean;
  animationsEnabled: boolean;
  updateFrequency: number; // updates per second
}

export interface StreamingConfig {
  chunkSize: Vector3;
  viewDistance: number;
  loadDistance: number;
  unloadDistance: number;
  maxLoadedChunks: number;
  maxConcurrentLoads: number;
  lodLevels: LODConfig[];
  prefetchEnabled: boolean;
  prefetchDistance: number;
  memoryBudgetMB: number;
  enableOcclusionCulling: boolean;
  updateInterval: number; // ms
  priorityBoostForVisible: number;
}

export interface StreamingStats {
  loadedChunks: number;
  loadingChunks: number;
  totalChunks: number;
  memoryUsedMB: number;
  memoryBudgetMB: number;
  chunksLoadedThisFrame: number;
  chunksUnloadedThisFrame: number;
  averageLoadTime: number;
  visibleChunks: number;
  culledChunks: number;
}

export interface EntityLOD {
  entityId: string;
  currentLOD: LODLevel;
  targetLOD: LODLevel;
  distance: number;
  isVisible: boolean;
  lastUpdate: number;
}
