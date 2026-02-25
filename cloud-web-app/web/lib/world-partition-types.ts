/**
 * World Partition shared contracts.
 */

import * as THREE from 'three';

export interface WorldBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface PartitionCell {
  id: string;
  x: number;
  y: number;
  z: number;
  bounds: WorldBounds;
  state: 'unloaded' | 'loading' | 'loaded' | 'unloading';
  entities: string[];
  lodLevel: number;
  priority: number;
  lastAccessTime: number;
  memorySize: number;
  data?: ArrayBuffer;
}

export interface StreamingVolume {
  id: string;
  bounds: WorldBounds;
  priority: number;
  preloadDistance: number;
  levels: string[];
  alwaysLoaded: boolean;
}

export interface LODLevel {
  distance: number;
  meshReduction: number;
  textureScale: number;
  shadowCasting: boolean;
  collisionEnabled: boolean;
}

export interface StreamingConfig {
  cellSize: THREE.Vector3;
  viewDistance: number;
  loadRadius: number;
  unloadRadius: number;
  memoryBudgetMB: number;
  maxConcurrentLoads: number;
  lodLevels: LODLevel[];
  preloadEnabled: boolean;
  priorityByDistance: boolean;
}

export interface LoadRequest {
  cellId: string;
  priority: number;
  timestamp: number;
  resolve: (data: ArrayBuffer) => void;
  reject: (error: Error) => void;
}
