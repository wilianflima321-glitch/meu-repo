// @aethel-heavy-async-boundary
import * as THREE from 'three';
import { Component, SceneNode } from './scene-graph-node';
import { Scene } from './scene-graph';
import { CameraComponent } from './scene-graph-components';

export interface LODLevelData {
  distance: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/**
 * Manages InstancedMeshes for a specific Model to render thousands of identical LOD meshes
 * with a single draw call per LOD level.
 */
export class InstancedLODManager {
  private instances: Map<string, InstancedLODComponent> = new Map();
  private instancedMeshes: THREE.InstancedMesh[] = [];
  private maxInstances: number;
  private scene: Scene;
  private levels: LODLevelData[];
  
  // Track which instance belongs to which LOD level to avoid unnecessary matrix swaps
  private currentLODLevels: Map<string, number> = new Map();
  private dirtyInstances: Set<string> = new Set();
  private _dummyMatrix = new THREE.Matrix4();

  constructor(scene: Scene, levels: LODLevelData[], maxInstances: number = 10000) {
    this.scene = scene;
    this.levels = levels.sort((a, b) => a.distance - b.distance);
    this.maxInstances = maxInstances;

    // Create one InstancedMesh per LOD level
    for (let i = 0; i < this.levels.length; i++) {
      const mesh = new THREE.InstancedMesh(
        this.levels[i].geometry,
        this.levels[i].material,
        this.maxInstances
      );
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // We do frustum culling manually or let it draw all
      this.instancedMeshes.push(mesh);
      this.scene.threeScene.add(mesh);
    }
  }

  public registerInstance(component: InstancedLODComponent): void {
    this.instances.set(component.node.id, component);
    this.currentLODLevels.set(component.node.id, 0); // Default LOD0
    this.dirtyInstances.add(component.node.id);
  }

  public unregisterInstance(component: InstancedLODComponent): void {
    this.instances.delete(component.node.id);
    this.currentLODLevels.delete(component.node.id);
    this.dirtyInstances.delete(component.node.id);
    this.rebuildMatrices(); // Heavy, but necessary when removing
  }

  public markDirty(nodeId: string): void {
    if (this.instances.has(nodeId)) {
      this.dirtyInstances.add(nodeId);
    }
  }

  public update(cameraPosition: THREE.Vector3): void {
    let needsRebuild = false;

    // Check distances and change LOD levels if necessary
    for (const [id, component] of this.instances) {
      const dist = component.transform.worldPosition.distanceTo(cameraPosition);
      let targetLevel = this.levels.length - 1;

      for (let i = 0; i < this.levels.length; i++) {
        if (dist < this.levels[i].distance) {
          targetLevel = i;
          break;
        }
      }

      const currentLevel = this.currentLODLevels.get(id);
      if (currentLevel !== targetLevel) {
        this.currentLODLevels.set(id, targetLevel);
        needsRebuild = true;
      }
    }

    if (needsRebuild) {
      this.rebuildMatrices();
      this.dirtyInstances.clear();
    } else if (this.dirtyInstances.size > 0) {
      // Only update dirty matrices for the current LOD level mappings
      this.updateDirtyMatrices();
    }
  }

  private rebuildMatrices(): void {
    // Reset counters
    for (const mesh of this.instancedMeshes) {
      mesh.count = 0;
    }

    // Assign matrices sequentially
    for (const [id, component] of this.instances) {
      const level = this.currentLODLevels.get(id);
      if (level !== undefined && level < this.instancedMeshes.length) {
        const mesh = this.instancedMeshes[level];
        const index = mesh.count;
        mesh.setMatrixAt(index, component.transform.worldMatrix);
        
        // Store the index back in the component so we can update it efficiently later
        component.setInstancedIndex(index);
        
        mesh.count++;
      }
    }

    for (const mesh of this.instancedMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateDirtyMatrices(): void {
    for (const id of this.dirtyInstances) {
      const component = this.instances.get(id);
      if (!component) continue;

      const level = this.currentLODLevels.get(id);
      const index = component.getInstancedIndex();

      if (level !== undefined && index !== -1) {
        const mesh = this.instancedMeshes[level];
        mesh.setMatrixAt(index, component.transform.worldMatrix);
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    this.dirtyInstances.clear();
  }

  public dispose(): void {
    for (const mesh of this.instancedMeshes) {
      this.scene.threeScene.remove(mesh);
      mesh.dispose();
    }
    this.instances.clear();
    this.currentLODLevels.clear();
    this.dirtyInstances.clear();
  }
}

export class InstancedLODComponent extends Component {
  private manager: InstancedLODManager | null = null;
  private instancedIndex: number = -1;
  private lastMatrixUpdate: number = 0;

  // We need to inject the manager here. In a real ECS we'd fetch it from the Scene.
  public bindManager(manager: InstancedLODManager): void {
    this.manager = manager;
    this.manager.registerInstance(this);
  }

  public setInstancedIndex(index: number): void {
    this.instancedIndex = index;
  }

  public getInstancedIndex(): number {
    return this.instancedIndex;
  }

  onUpdate(): void {
    if (this.manager) {
      // Very cheap dirty check: if transform version/timestamp changed
      // Here we assume transform updates manually or via dirty flags.
      // For simplicity, we just mark dirty if matrix actually changed.
      this.manager.markDirty(this.node.id);
    }
  }

  onDestroy(): void {
    if (this.manager) {
      this.manager.unregisterInstance(this);
    }
  }
}
