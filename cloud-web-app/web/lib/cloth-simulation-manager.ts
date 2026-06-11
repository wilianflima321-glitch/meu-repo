import type { Scene } from '@/lib/three';

import { ClothSimulation } from './cloth-simulation';
import type { ClothConfig } from './cloth-simulation-contracts';

export class ClothManager {
  private cloths: Map<string, ClothSimulation> = new Map();
  private scene: Scene;
  constructor(scene: Scene) {
    this.scene = scene;
  }
  create(id: string, config: Partial<ClothConfig> = {}): ClothSimulation {
    const cloth = new ClothSimulation(config);
    this.cloths.set(id, cloth);
    this.scene.add(cloth.getMesh());
    return cloth;
  }
  get(id: string): ClothSimulation | undefined {
    return this.cloths.get(id);
  }
  remove(id: string): void {
    const cloth = this.cloths.get(id);
    if (cloth) {
      this.scene.remove(cloth.getMesh());
      cloth.dispose();
      this.cloths.delete(id);
    }
  }
  update(dt: number): void {
    for (const cloth of this.cloths.values()) {
      cloth.update(dt);
    }
  }
  dispose(): void {
    for (const cloth of this.cloths.values()) {
      this.scene.remove(cloth.getMesh());
      cloth.dispose();
    }
    this.cloths.clear();
  }
}
