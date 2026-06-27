// @aethel-heavy-async-boundary
import { Vector3 } from 'three';
import { createComponentLogger } from '../../observability/logger';
import { getMeshletSystem } from '../../workers/meshlet-system';

const logger = createComponentLogger('engine.graphics.lod-manager');

/**
 * L5 Dynamic Level of Detail (LOD) Manager
 *
 * This system scans the active entities in the scene (integrated with bitECS eventually),
 * calculates their distance to the active Camera, and forcefully downgrades their
 * render resolution via the Meshlet System to preserve WebGPU/WebGL memory.
 *
 * It prevents the GPU from melting when users zoom out.
 */
export class LodManager {
  private cameraPosition: Vector3;
  private trackedEntities: Map<string, { position: Vector3; currentLod: number }>;
  
  // Distances that trigger a mesh downgrade (in game units/meters)
  private static LOD_THRESHOLDS = {
    LOD0: 10,   // Extreme detail (0-10m)
    LOD1: 30,   // Medium detail (10-30m)
    LOD2: 100,  // Low detail (30-100m)
    LOD3: 300,  // Billboard/Imposter (100m+)
  };

  constructor() {
    this.cameraPosition = new Vector3();
    this.trackedEntities = new Map();
  }

  public updateCameraPosition(x: number, y: number, z: number) {
    this.cameraPosition.set(x, y, z);
  }

  public registerEntity(id: string, initialPosition: Vector3) {
    this.trackedEntities.set(id, { position: initialPosition, currentLod: 0 });
  }

  public removeEntity(id: string) {
    this.trackedEntities.delete(id);
  }

  /**
   * Called every frame (or every N frames) by the main Engine Loop.
   * Calculates the distance and dispatches IPC messages to Rust/wgpu_renderer
   * or the local Three.js Meshlet System to swap geometry.
   */
  public tick() {
    const meshletSystem = getMeshletSystem();

    for (const [id, entity] of this.trackedEntities.entries()) {
      const distance = this.cameraPosition.distanceTo(entity.position);
      let targetLod = 0;

      if (distance > LodManager.LOD_THRESHOLDS.LOD3) {
        targetLod = 3;
      } else if (distance > LodManager.LOD_THRESHOLDS.LOD2) {
        targetLod = 2;
      } else if (distance > LodManager.LOD_THRESHOLDS.LOD1) {
        targetLod = 1;
      } else {
        targetLod = 0;
      }

      // If the LOD changed, we must invoke the engine to swap the mesh buffers
      if (targetLod !== entity.currentLod) {
        logger.debug('LOD transition triggered', { entityId: id, from: entity.currentLod, to: targetLod, distance });
        entity.currentLod = targetLod;
        
        // This invokes the existing Meshlet System we mapped out.
        // It tells the GPU worker to stop rendering High-Res chunks and stream the KTX2 low-res.
        meshletSystem.requestLodSwap(id, targetLod);
      }
    }
  }
}

// Singleton pattern for the engine
let _lodManagerInstance: LodManager | null = null;
export function getLodManager(): LodManager {
  if (!_lodManagerInstance) {
    _lodManagerInstance = new LodManager();
  }
  return _lodManagerInstance;
}
