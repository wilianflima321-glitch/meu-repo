/**
 * AETHEL ENGINE - Meshlet Worker Manager
 * =======================================
 * 
 * Manager for the Meshlet Builder Web Worker.
 * Provides a clean async API for offloading geometry processing.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Sphere {
  center: Vec3;
  radius: number;
}

export interface BoundingCone {
  apex: Vec3;
  axis: Vec3;
  cutoff: number;
}

export interface MeshletData {
  id: number;
  vertexOffset: number;
  vertexCount: number;
  triangleOffset: number;
  triangleCount: number;
  boundingSphere: Sphere;
  boundingCone: BoundingCone;
  lodLevel: number;
  parentCluster: number;
  childClusters: number[];
  error: number;
}

export interface ClusterData {
  id: number;
  meshletIds: number[];
  boundingSphere: Sphere;
  lodLevel: number;
  parentCluster: number | null;
  childClusters: number[];
  screenSpaceError: number;
}

export interface BuildConfig {
  maxMeshletsPerCluster?: number;
  targetTrianglesPerMeshlet?: number;
  lodBias?: number;
  screenSpaceErrorThreshold?: number;
}

export interface BuildResult {
  meshlets: MeshletData[];
  clusters: ClusterData[];
  stats: {
    totalMeshlets: number;
    totalClusters: number;
    lodLevels: number;
    buildTimeMs: number;
  };
}

export interface BuildProgress {
  stage: string;
  percent: number;
}

// ============================================================================
// WORKER MANAGER
// ============================================================================

export class MeshletWorkerManager extends EventEmitter {
  private worker: Worker | null = null;
  private pendingTasks = new Map<string, {
    resolve: (result: BuildResult) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: BuildProgress) => void;
  }>();
  private taskIdCounter = 0;
  private isReady = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  
  constructor() {
    super();
    
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    
    this.initWorker();
  }
  
  private initWorker(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported');
      return;
    }
    
    // Create worker from blob URL (for bundler compatibility)
    const workerUrl = new URL('./meshlet-builder.worker.ts', import.meta.url);
    this.worker = new Worker(workerUrl, { type: 'module' });
    
    this.worker.onmessage = (event) => {
      const { type, id, data, progress, error } = event.data;
      
      if (type === 'ready') {
        this.isReady = true;
        this.readyResolve();
        this.emit('ready');
        return;
      }
      
      const task = this.pendingTasks.get(id);
      if (!task) return;
      
      if (type === 'progress') {
        task.onProgress?.(progress);
        this.emit('progress', { id, ...progress });
        return;
      }
      
      if (type === 'result') {
        this.pendingTasks.delete(id);
        task.resolve(data);
        this.emit('complete', { id, stats: data.stats });
        return;
      }
      
      if (type === 'error') {
        this.pendingTasks.delete(id);
        task.reject(new Error(error));
        this.emit('error', { id, error });
      }
    };
    
    this.worker.onerror = (error) => {
      console.error('Meshlet worker error:', error);
      this.emit('error', { error: error.message });
    };
  }
  
  /**
   * Wait for worker to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.isReady) return;
    return this.readyPromise;
  }
  
  /**
   * Build meshlets from geometry data
   */
  async build(
    vertices: Float32Array,
    indices: Uint32Array,
    config?: BuildConfig,
    onProgress?: (progress: BuildProgress) => void
  ): Promise<BuildResult> {
    if (!this.worker) {
      throw new Error('Web Workers not supported');
    }
    
    await this.waitForReady();
    
    const id = `task_${this.taskIdCounter++}`;
    
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject, onProgress });
      
      // Transfer buffers for zero-copy
      this.worker!.postMessage(
        {
          type: 'build',
          id,
          data: {
            vertices,
            indices,
            config,
          },
        },
        [vertices.buffer, indices.buffer]
      );
    });
  }
  
  /**
   * Build meshlets from THREE.js BufferGeometry
   */
  async buildFromGeometry(
    geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } | null; getIndex: () => { array: ArrayLike<number> } | null },
    config?: BuildConfig,
    onProgress?: (progress: BuildProgress) => void
  ): Promise<BuildResult> {
    const posAttr = geometry.getAttribute('position');
    const indexAttr = geometry.getIndex();
    
    if (!posAttr || !indexAttr) {
      throw new Error('Geometry must have position and index attributes');
    }
    
    const vertices = new Float32Array(posAttr.array);
    const indices = new Uint32Array(indexAttr.array);
    
    return this.build(vertices, indices, config, onProgress);
  }
  
  /**
   * Get number of pending tasks
   */
  getPendingCount(): number {
    return this.pendingTasks.size;
  }
  
  /**
   * Check if worker is ready
   */
  getIsReady(): boolean {
    return this.isReady;
  }
  
  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending tasks
    for (const [id, task] of this.pendingTasks) {
      task.reject(new Error('Worker terminated'));
    }
    this.pendingTasks.clear();
    
    this.emit('terminated');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: MeshletWorkerManager | null = null;

/**
 * Get the singleton MeshletWorkerManager instance
 */
export function getMeshletWorker(): MeshletWorkerManager {
  if (!instance) {
    instance = new MeshletWorkerManager();
  }
  return instance;
}

/**
 * Create a new MeshletWorkerManager (for parallel processing)
 */
export function createMeshletWorker(): MeshletWorkerManager {
  return new MeshletWorkerManager();
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UseMeshletWorkerResult {
  /** Build meshlets from raw data */
  build: (
    vertices: Float32Array,
    indices: Uint32Array,
    config?: BuildConfig
  ) => Promise<BuildResult>;
  /** Build meshlets from THREE.js geometry */
  buildFromGeometry: (
    geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } | null; getIndex: () => { array: ArrayLike<number> } | null },
    config?: BuildConfig
  ) => Promise<BuildResult>;
  /** Current build progress */
  progress: BuildProgress | null;
  /** Is currently building */
  isBuilding: boolean;
  /** Is worker ready */
  isReady: boolean;
  /** Last error */
  error: Error | null;
}

// Note: React hook implementation would go in a separate file with 'use client' directive
