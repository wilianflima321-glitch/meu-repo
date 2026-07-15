// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * Pre-fractured destruction mesh generator.
 */

import * as THREE from 'three';
import { VoronoiFractureGenerator } from './destruction-system';

// ============================================================================
// PRE-FRACTURED MESH GENERATOR
// ============================================================================

export class PreFracturedMesh {
  private levels: THREE.Group[] = [];
  private currentLevel: number = 0;
  private bounds: THREE.Box3;

  constructor(
    originalGeometry: THREE.BufferGeometry,
    originalMaterial: THREE.Material,
    fractureCount: number = 8,
    levels: number = 3
  ) {
    originalGeometry.computeBoundingBox();
    this.bounds = originalGeometry.boundingBox!.clone();

    const generator = new VoronoiFractureGenerator();

    for (let level = 0; level < levels; level++) {
      const group = new THREE.Group();
      const count = fractureCount * Math.pow(2, level);
      const points = generator.generatePoints(this.bounds, count);
      const cells = generator.generateCells(points, this.bounds);

      for (const cell of cells) {
        const geometry = generator.cellToGeometry(cell);
        const material = originalMaterial.clone();
        const mesh = new THREE.Mesh(geometry, material);

        // Center
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox!.getCenter(center);
        mesh.position.copy(center);

        group.add(mesh);
      }

      group.visible = level === 0;
      this.levels.push(group);
    }
  }

  setLevel(level: number): void {
    if (level >= 0 && level < this.levels.length) {
      for (let i = 0; i < this.levels.length; i++) {
        this.levels[i].visible = i === level;
      }
      this.currentLevel = level;
    }
  }

  getLevel(level: number): THREE.Group | undefined {
    return this.levels[level];
  }

  getAllLevels(): THREE.Group[] {
    return [...this.levels];
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  addToScene(scene: THREE.Scene): void {
    for (const level of this.levels) {
      scene.add(level);
    }
  }

  removeFromScene(scene: THREE.Scene): void {
    for (const level of this.levels) {
      scene.remove(level);
    }
  }

  dispose(): void {
    for (const level of this.levels) {
      level.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          (obj.material as THREE.Material)?.dispose();
        }
      });
    }
    this.levels = [];
  }
}
