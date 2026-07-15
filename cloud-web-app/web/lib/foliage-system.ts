// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
/**
 * Foliage System - Sistema de Vegetação
 *
 * Sistema profissional de vegetação:
 * - GPU instancing for millions of instances
 * - Procedural placement
 * - Wind animation
 * - LOD management
 * - Grass, trees, bushes
 * - Interactive foliage
 * - Culling optimization
 * - Painting tools
 */

import * as THREE from 'three';

import { FoliageMaterial, InstancedFoliageMesh } from './foliage-instancing';
import type { FoliageBrush, FoliageCluster, FoliageConfig, FoliageInstance, FoliageType } from './foliage-system.types';

export { GrassGenerator, TreeGenerator } from './foliage-generators';
export { FoliageMaterial, InstancedFoliageMesh } from './foliage-instancing';
export type { FoliageBrush, FoliageCluster, FoliageConfig, FoliageInstance, FoliageType } from './foliage-system.types';

// ============================================================================
// PROCEDURAL PLACEMENT
// ============================================================================

export class FoliagePlacer {
  private noise: {
    sample: (x: number, y: number, scale: number) => number;
  };

  constructor(seed: number = 12345) {
    // Simple noise implementation
    this.noise = {
      sample: (x: number, y: number, scale: number) => {
        const nx = x * scale + seed;
        const ny = y * scale + seed * 1.5;
        return (Math.sin(nx) * Math.cos(ny) + 1) * 0.5;
      },
    };
  }

  placeFoliage(
    foliageType: FoliageType,
    terrain: { getHeightAt: (x: number, z: number) => number; getNormalAt?: (x: number, z: number) => THREE.Vector3 },
    bounds: THREE.Box3,
    density: number
  ): FoliageInstance[] {
    const instances: FoliageInstance[] = [];

    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const area = width * depth;
    const count = Math.floor(area * density * foliageType.density);

    for (let i = 0; i < count; i++) {
      // Random position
      const x = bounds.min.x + Math.random() * width;
      const z = bounds.min.z + Math.random() * depth;

      // Get terrain height
      const y = terrain.getHeightAt(x, z);

      // Check height constraints
      if (y < foliageType.minHeight || y > foliageType.maxHeight) {
        continue;
      }

      // Check slope constraints
      if (terrain.getNormalAt) {
        const normal = terrain.getNormalAt(x, z);
        const slope = Math.acos(normal.y) * (180 / Math.PI);
        if (slope < foliageType.minSlope || slope > foliageType.maxSlope) {
          continue;
        }
      }

      // Use noise for natural clustering
      const noiseValue = this.noise.sample(x, z, 0.1);
      if (noiseValue < 0.3) continue;

      // Generate instance
      const position = new THREE.Vector3(x, y, z);

      // Scale
      const scaleValue = THREE.MathUtils.lerp(
        foliageType.minScale,
        foliageType.maxScale,
        Math.random()
      );
      const scale = new THREE.Vector3(scaleValue, scaleValue, scaleValue);

      // Rotation
      const rotation = new THREE.Euler();
      if (foliageType.randomRotation) {
        rotation.y = Math.random() * Math.PI * 2;
      }
      if (foliageType.alignToNormal && terrain.getNormalAt) {
        const normal = terrain.getNormalAt(x, z);
        const up = new THREE.Vector3(0, 1, 0);
        const axis = new THREE.Vector3().crossVectors(up, normal).normalize();
        const angle = Math.acos(up.dot(normal));

        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        rotation.setFromQuaternion(quaternion);
        rotation.y += Math.random() * Math.PI * 2;
      }

      instances.push({
        position,
        rotation,
        scale,
        typeId: foliageType.id,
      });
    }

    return instances;
  }

  placeInCircle(
    foliageType: FoliageType,
    terrain: { getHeightAt: (x: number, z: number) => number },
    center: THREE.Vector3,
    radius: number,
    density: number
  ): FoliageInstance[] {
    const instances: FoliageInstance[] = [];
    const area = Math.PI * radius * radius;
    const count = Math.floor(area * density * foliageType.density);

    for (let i = 0; i < count; i++) {
      // Random point in circle
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius; // Uniform distribution

      const x = center.x + Math.cos(angle) * r;
      const z = center.z + Math.sin(angle) * r;
      const y = terrain.getHeightAt(x, z);

      // Check height constraints
      if (y < foliageType.minHeight || y > foliageType.maxHeight) {
        continue;
      }

      const position = new THREE.Vector3(x, y, z);

      const scaleValue = THREE.MathUtils.lerp(
        foliageType.minScale,
        foliageType.maxScale,
        Math.random()
      );

      const rotation = new THREE.Euler(
        0,
        foliageType.randomRotation ? Math.random() * Math.PI * 2 : 0,
        0
      );

      instances.push({
        position,
        rotation,
        scale: new THREE.Vector3(scaleValue, scaleValue, scaleValue),
        typeId: foliageType.id,
      });
    }

    return instances;
  }
}

// ============================================================================
// FOLIAGE CLUSTER
// ============================================================================

export class FoliageClusterManager {
  private clusters: Map<string, FoliageCluster> = new Map();
  private foliageTypes: Map<string, FoliageType> = new Map();
  private instancedMeshes: Map<string, InstancedFoliageMesh> = new Map();
  private scene: THREE.Scene;
  private config: FoliageConfig;

  constructor(scene: THREE.Scene, config: Partial<FoliageConfig> = {}) {
    this.scene = scene;
    this.config = {
      maxInstancesPerCluster: 10000,
      clusterSize: 100,
      lodDistances: [50, 100, 200, 400],
      windSpeed: 1,
      windDirection: new THREE.Vector2(1, 0),
      shadowsEnabled: true,
      ...config,
    };
  }

  registerFoliageType(type: FoliageType): void {
    this.foliageTypes.set(type.id, type);

    // Create instanced mesh for this type
    const instancedMesh = new InstancedFoliageMesh(
      type.mesh,
      type.material,
      this.config.maxInstancesPerCluster
    );

    instancedMesh.mesh.castShadow = type.castShadow;
    instancedMesh.mesh.receiveShadow = type.receiveShadow;

    this.instancedMeshes.set(type.id, instancedMesh);
    this.scene.add(instancedMesh.mesh);
  }

  addInstances(typeId: string, instances: FoliageInstance[]): string {
    const instancedMesh = this.instancedMeshes.get(typeId);
    if (!instancedMesh) {
      throw new Error(`Unknown foliage type: ${typeId}`);
    }

    // Create cluster
    const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const bounds = new THREE.Box3();
    const clusterInstances: FoliageInstance[] = [];

    const instanceIndices: number[] = [];
    for (const instance of instances) {
      const quaternion = new THREE.Quaternion().setFromEuler(instance.rotation);
      const idx = instancedMesh.addInstance(instance.position, quaternion, instance.scale);

      if (idx >= 0) {
        bounds.expandByPoint(instance.position);
        clusterInstances.push(instance);
        instanceIndices.push(idx);
      }
    }

    const cluster: FoliageCluster = {
      id: clusterId,
      typeId,
      bounds,
      instances: clusterInstances,
      instanceIndices,
      instancedMesh: instancedMesh.mesh,
      lodLevel: 0,
      visible: true,
    };

    this.clusters.set(clusterId, cluster);
    instancedMesh.updateBounds();

    return clusterId;
  }

  removeCluster(clusterId: string): void {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return;

    const instancedMesh = this.instancedMeshes.get(cluster.typeId);
    if (instancedMesh && cluster.instanceIndices.length > 0) {
      // Descending remove so swap-compact does not invalidate pending indices mid-loop.
      const sorted = [...cluster.instanceIndices].sort((a, b) => b - a);
      for (const idx of sorted) {
        const swappedFrom = instancedMesh.removeInstance(idx);
        if (swappedFrom !== null) {
          this.remapInstanceIndex(cluster.typeId, swappedFrom, idx, clusterId);
        }
      }
    }

    this.clusters.delete(clusterId);
  }

  /** After swap-remove, retarget any surviving cluster that still pointed at the old last slot. */
  private remapInstanceIndex(
    typeId: string,
    fromIndex: number,
    toIndex: number,
    excludedClusterId: string,
  ): void {
    for (const other of this.clusters.values()) {
      if (other.id === excludedClusterId || other.typeId !== typeId) continue;
      for (let i = 0; i < other.instanceIndices.length; i++) {
        if (other.instanceIndices[i] === fromIndex) {
          other.instanceIndices[i] = toIndex;
        }
      }
    }
  }

  update(cameraPosition: THREE.Vector3, deltaTime: number): void {
    // Update wind animation
    for (const instancedMesh of this.instancedMeshes.values()) {
      const material = instancedMesh.mesh.material;
      if (material instanceof FoliageMaterial) {
        material.update(deltaTime);
      }
    }

    // Update LODs + apply GPU visibility (zero-scale cull — never a placebo flag)
    for (const cluster of this.clusters.values()) {
      const center = new THREE.Vector3();
      cluster.bounds.getCenter(center);
      const distance = center.distanceTo(cameraPosition);

      let lod = 0;
      for (let i = this.config.lodDistances.length - 1; i >= 0; i--) {
        if (distance >= this.config.lodDistances[i]) {
          lod = i + 1;
          break;
        }
      }

      cluster.lodLevel = lod;

      const cullDistance = this.config.lodDistances[this.config.lodDistances.length - 1] * 1.5;
      const nextVisible = distance < cullDistance;
      if (nextVisible !== cluster.visible) {
        cluster.visible = nextVisible;
        const mesh = this.instancedMeshes.get(cluster.typeId);
        if (mesh) {
          for (const idx of cluster.instanceIndices) {
            mesh.setInstanceVisible(idx, nextVisible);
          }
        }
      }
    }
  }

  setWind(direction: THREE.Vector2, speed: number): void {
    this.config.windDirection.copy(direction);
    this.config.windSpeed = speed;

    for (const instancedMesh of this.instancedMeshes.values()) {
      const material = instancedMesh.mesh.material;
      if (material instanceof FoliageMaterial) {
        const type = Array.from(this.foliageTypes.values()).find(
          t => t.material === material
        );
        const strength = type?.windStrength ?? 0.3;
        material.setWind(direction, speed, strength);
      }
    }
  }

  getInstanceCount(): number {
    let total = 0;
    for (const instancedMesh of this.instancedMeshes.values()) {
      total += instancedMesh.getInstanceCount();
    }
    return total;
  }

  getClusters(): Map<string, FoliageCluster> {
    return new Map(this.clusters);
  }

  dispose(): void {
    for (const instancedMesh of this.instancedMeshes.values()) {
      this.scene.remove(instancedMesh.mesh);
      instancedMesh.dispose();
    }

    this.instancedMeshes.clear();
    this.clusters.clear();
    this.foliageTypes.clear();
  }
}

// ============================================================================
// PROCEDURAL GENERATORS
// ============================================================================

// ============================================================================
// FOLIAGE PAINTER
// ============================================================================

export class FoliagePainter {
  private clusterManager: FoliageClusterManager;
  private placer: FoliagePlacer;
  private brush: FoliageBrush;
  private isActive: boolean = false;

  constructor(clusterManager: FoliageClusterManager) {
    this.clusterManager = clusterManager;
    this.placer = new FoliagePlacer();
    this.brush = {
      type: 'paint',
      size: 10,
      density: 0.5,
      falloff: 0.5,
      foliageTypes: [],
    };
  }

  setBrush(brush: Partial<FoliageBrush>): void {
    Object.assign(this.brush, brush);
  }

  getBrush(): FoliageBrush {
    return { ...this.brush };
  }

  startPainting(): void {
    this.isActive = true;
  }

  stopPainting(): void {
    this.isActive = false;
  }

  paint(
    position: THREE.Vector3,
    terrain: { getHeightAt: (x: number, z: number) => number },
    foliageTypes: Map<string, FoliageType>
  ): void {
    if (!this.isActive || this.brush.foliageTypes.length === 0) return;

    for (const typeId of this.brush.foliageTypes) {
      const type = foliageTypes.get(typeId);
      if (!type) continue;

      const instances = this.placer.placeInCircle(
        type,
        terrain,
        position,
        this.brush.size,
        this.brush.density
      );

      if (instances.length > 0) {
        this.clusterManager.addInstances(typeId, instances);
      }
    }
  }

  erase(position: THREE.Vector3, radius: number): void {
    // Would need to track individual instances and remove those in range
    // Simplified version - remove entire clusters that overlap
    const clusters = this.clusterManager.getClusters();

    for (const [id, cluster] of clusters) {
      const center = new THREE.Vector3();
      cluster.bounds.getCenter(center);

      if (center.distanceTo(position) < radius) {
        this.clusterManager.removeCluster(id);
      }
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
