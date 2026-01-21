/**
 * Meshlet System Integration
 * Connects the Web Worker to the main application
 */

export interface MeshletConfig {
  maxVerticesPerMeshlet: number;
  maxTrianglesPerMeshlet: number;
  lodLevels: number;
  errorThreshold: number;
}

export interface MeshletStats {
  totalMeshlets: number;
  visibleMeshlets: number;
  culledMeshlets: number;
  buildTimeMs: number;
  cullTimeMs: number;
}

const DEFAULT_CONFIG: MeshletConfig = {
  maxVerticesPerMeshlet: 64,
  maxTrianglesPerMeshlet: 124,
  lodLevels: 4,
  errorThreshold: 1.0
};

class MeshletSystem {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private requestId = 0;
  private config: MeshletConfig;
  private stats: MeshletStats = {
    totalMeshlets: 0,
    visibleMeshlets: 0,
    culledMeshlets: 0,
    buildTimeMs: 0,
    cullTimeMs: 0
  };

  constructor(config: Partial<MeshletConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Create worker from URL
      const workerUrl = new URL('./meshlet-builder.worker.ts', import.meta.url);
      this.worker = new Worker(workerUrl, { type: 'module' });
      
      this.worker.onmessage = (event) => {
        const data = event.data;
        
        if (data.type === 'build-result') {
          this.stats.totalMeshlets = data.meshlets.length;
          this.stats.buildTimeMs = data.buildTimeMs;
          
          const pending = this.pendingRequests.get(`build-${data.meshId}`);
          if (pending) {
            pending.resolve(data);
            this.pendingRequests.delete(`build-${data.meshId}`);
          }
        }
        else if (data.type === 'cull-result') {
          this.stats.visibleMeshlets = data.visibleMeshletIds.length;
          this.stats.culledMeshlets = data.culledCount;
          this.stats.cullTimeMs = data.cullTimeMs;
          
          const pending = this.pendingRequests.get('cull');
          if (pending) {
            pending.resolve(data);
            this.pendingRequests.delete('cull');
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('[MeshletSystem] Worker error:', error);
        // Reject all pending requests
        for (const [key, pending] of this.pendingRequests) {
          pending.reject(new Error(`Worker error: ${error.message}`));
        }
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.warn('[MeshletSystem] Failed to initialize worker, falling back to main thread');
      this.worker = null;
    }
  }

  /**
   * Build meshlets from geometry data
   */
  async buildMeshlets(
    meshId: string,
    vertices: Float32Array,
    indices: Uint32Array
  ): Promise<{
    meshlets: any[];
    lodTree: number[][];
    buildTimeMs: number;
  }> {
    if (!this.worker) {
      // Fallback: return simple placeholder
      console.warn('[MeshletSystem] Worker not available, using fallback');
      return {
        meshlets: [],
        lodTree: [],
        buildTimeMs: 0
      };
    }

    return new Promise((resolve, reject) => {
      const key = `build-${meshId}`;
      this.pendingRequests.set(key, { resolve, reject });

      this.worker!.postMessage({
        type: 'build',
        meshId,
        vertices,
        indices,
        maxVerticesPerMeshlet: this.config.maxVerticesPerMeshlet,
        maxTrianglesPerMeshlet: this.config.maxTrianglesPerMeshlet,
        lodLevels: this.config.lodLevels
      }, [vertices.buffer, indices.buffer]); // Transfer ownership
    });
  }

  /**
   * Perform view-dependent culling
   */
  async cullMeshlets(
    meshlets: any[],
    viewMatrix: number[],
    projectionMatrix: number[],
    viewportWidth: number,
    viewportHeight: number
  ): Promise<{
    visibleMeshletIds: number[];
    culledCount: number;
    cullTimeMs: number;
  }> {
    if (!this.worker) {
      return {
        visibleMeshletIds: meshlets.map(m => m.id),
        culledCount: 0,
        cullTimeMs: 0
      };
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set('cull', { resolve, reject });

      this.worker!.postMessage({
        type: 'cull',
        meshlets,
        viewMatrix,
        projectionMatrix,
        viewportWidth,
        viewportHeight,
        errorThreshold: this.config.errorThreshold
      });
    });
  }

  /**
   * Get current stats
   */
  getStats(): MeshletStats {
    return { ...this.stats };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MeshletConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Terminate the worker
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Singleton instance
let meshletSystemInstance: MeshletSystem | null = null;

export function getMeshletSystem(config?: Partial<MeshletConfig>): MeshletSystem {
  if (!meshletSystemInstance) {
    meshletSystemInstance = new MeshletSystem(config);
  }
  return meshletSystemInstance;
}

export function disposeMeshletSystem(): void {
  if (meshletSystemInstance) {
    meshletSystemInstance.dispose();
    meshletSystemInstance = null;
  }
}

export default MeshletSystem;
