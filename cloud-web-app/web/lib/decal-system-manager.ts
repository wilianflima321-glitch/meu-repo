// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import THREE from './decal-system-runtime';

import { logger } from '@/lib/observability/logger';

import { DecalGeometry } from './decal-system-geometry';
import { DecalMaterial } from './decal-system-material';
import type { DecalConfig, DecalInstance, DecalPool } from './decal-system.types';

export class DecalManager {
  private scene: THREE.Scene;
  private pools: Map<string, DecalPool> = new Map();
  private activeDecals: Map<string, DecalInstance> = new Map();
  private nextId: number = 0;

  // Default configs
  private defaultConfigs: Map<string, DecalConfig> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initDefaultConfigs();
  }

  private initDefaultConfigs(): void {
    // Bullet hole
    this.defaultConfigs.set('bulletHole', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(0.1, 0.1, 0.2),
      depth: 0.1,
      opacity: 1,
      fadeIn: 0,
      fadeOut: 2,
      lifetime: 30,
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    // Blood splatter
    this.defaultConfigs.set('bloodSplatter', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(0.5, 0.5, 0.3),
      depth: 0.1,
      opacity: 0.9,
      fadeIn: 0.1,
      fadeOut: 5,
      lifetime: 60,
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    // Scorch mark
    this.defaultConfigs.set('scorchMark', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(1, 1, 0.5),
      depth: 0.1,
      opacity: 0.8,
      fadeIn: 0.2,
      fadeOut: 10,
      lifetime: 120,
      blending: THREE.MultiplyBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    // Paint splat
    this.defaultConfigs.set('paintSplat', {
      texture: null,
      normalMap: null,
      size: new THREE.Vector3(0.3, 0.3, 0.2),
      depth: 0.1,
      opacity: 1,
      fadeIn: 0,
      fadeOut: 0,
      lifetime: -1, // Permanent
      blending: THREE.NormalBlending,
      depthTest: true,
      depthWrite: false,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
  }

  registerDecalType(name: string, config: Partial<DecalConfig>, maxPoolSize: number = 100): void {
    const fullConfig: DecalConfig = {
      ...this.defaultConfigs.get('bulletHole')!,
      ...config,
    };

    this.defaultConfigs.set(name, fullConfig);

    this.pools.set(name, {
      type: name,
      config: fullConfig,
      maxInstances: maxPoolSize,
      instances: [],
      activeCount: 0,
    });
  }

  addDecal(
    type: string,
    targetMesh: THREE.Mesh,
    position: THREE.Vector3,
    normal: THREE.Vector3,
    options: Partial<{
      size: THREE.Vector3;
      rotation: number;
      opacity: number;
    }> = {}
  ): DecalInstance | null {
    const config = this.defaultConfigs.get(type);
    if (!config) {
      logger.warn(`Unknown decal type: ${type}`);
      return null;
    }

    const pool = this.pools.get(type);

    // Check pool for reusable instance
    let instance: DecalInstance | null = null;

    if (pool) {
      // Find inactive instance
      instance = pool.instances.find(i => !i.active) || null;

      if (!instance && pool.activeCount >= pool.maxInstances) {
        // Remove oldest active instance
        const oldest = pool.instances
          .filter(i => i.active)
          .sort((a, b) => a.spawnTime - b.spawnTime)[0];

        if (oldest) {
          this.removeDecal(oldest.id);
        }
      }
    }

    // Create orientation from normal
    const orientation = new THREE.Euler();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    orientation.setFromQuaternion(quaternion);
    orientation.z = options.rotation || Math.random() * Math.PI * 2;

    const size = options.size || config.size.clone();

    // Create decal geometry
    const geometry = new DecalGeometry(targetMesh, position, orientation, size);

    // Skip if no geometry was generated
    if (!geometry.getAttribute('position') || geometry.getAttribute('position').count === 0) {
      geometry.dispose();
      return null;
    }

    // Create material
    const material = new DecalMaterial({
      ...config,
      opacity: 0, // Start invisible for fade in
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1; // Render after normal geometry

    // Create instance
    const id = `decal_${this.nextId++}`;
    instance = {
      id,
      position: position.clone(),
      normal: normal.clone(),
      size,
      rotation: options.rotation || 0,
      mesh,
      config: { ...config },
      spawnTime: Date.now() / 1000,
      opacity: options.opacity ?? config.opacity,
      active: true,
    };

    // Add to scene and tracking
    this.scene.add(mesh);
    this.activeDecals.set(id, instance);

    if (pool) {
      pool.instances.push(instance);
      pool.activeCount++;
    }

    return instance;
  }

  addDecalAtRaycast(
    type: string,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    meshes: THREE.Mesh[],
    maxDistance: number = 100,
    options: Partial<{
      size: THREE.Vector3;
      rotation: number;
      opacity: number;
    }> = {}
  ): DecalInstance | null {
    const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const normal = hit.face?.normal || direction.clone().negate();

      // Transform normal to world space
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();

      return this.addDecal(type, hit.object as THREE.Mesh, hit.point, normal, options);
    }

    return null;
  }

  removeDecal(id: string): void {
    const instance = this.activeDecals.get(id);
    if (!instance) return;

    // Remove from scene
    this.scene.remove(instance.mesh);
    instance.mesh.geometry.dispose();
    (instance.mesh.material as THREE.Material).dispose();

    // Mark as inactive
    instance.active = false;

    // Update pool
    const pool = this.pools.get(instance.config.texture?.name || 'unknown');
    if (pool) {
      pool.activeCount--;
    }

    this.activeDecals.delete(id);
  }

  update(deltaTime: number): void {
    const currentTime = Date.now() / 1000;

    for (const [id, instance] of this.activeDecals) {
      if (!instance.active) continue;

      const age = currentTime - instance.spawnTime;
      const config = instance.config;
      const material = instance.mesh.material as DecalMaterial;

      // Handle fade in
      if (config.fadeIn > 0 && age < config.fadeIn) {
        const t = age / config.fadeIn;
        material.setOpacity(instance.opacity * t);
      }
      // Handle fade out
      else if (config.lifetime > 0) {
        const fadeOutStart = config.lifetime - config.fadeOut;

        if (age >= config.lifetime) {
          // Remove decal
          this.removeDecal(id);
        } else if (age > fadeOutStart && config.fadeOut > 0) {
          const t = 1 - (age - fadeOutStart) / config.fadeOut;
          material.setOpacity(instance.opacity * t);
        } else {
          material.setOpacity(instance.opacity);
        }
      } else {
        material.setOpacity(instance.opacity);
      }
    }
  }

  getDecal(id: string): DecalInstance | undefined {
    return this.activeDecals.get(id);
  }

  getActiveCount(): number {
    return this.activeDecals.size;
  }

  getPoolStats(): { type: string; active: number; max: number }[] {
    const stats: { type: string; active: number; max: number }[] = [];

    for (const [type, pool] of this.pools) {
      stats.push({
        type,
        active: pool.activeCount,
        max: pool.maxInstances,
      });
    }

    return stats;
  }

  clearAll(): void {
    for (const id of this.activeDecals.keys()) {
      this.removeDecal(id);
    }
  }

  clearType(type: string): void {
    for (const [id, instance] of this.activeDecals) {
      if (this.defaultConfigs.has(type)) {
        this.removeDecal(id);
      }
    }
  }

  dispose(): void {
    this.clearAll();
    this.pools.clear();
    this.defaultConfigs.clear();
  }
}

// ============================================================================
