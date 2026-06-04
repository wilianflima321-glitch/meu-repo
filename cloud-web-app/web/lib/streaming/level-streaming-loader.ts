// @aethel-heavy-async-boundary Level loading creates Three.js scene objects for Studio/runtime only.
import * as THREE from 'three';

import type { LevelDefinition, LevelLoaderFn, LevelLoaderResult } from './level-streaming-types';

export class LevelLoader {
  private loaders: Map<string, LevelLoaderFn> = new Map();
  private defaultLoader: LevelLoaderFn;

  constructor() {
    this.defaultLoader = this.createDefaultLoader();
  }

  registerLoader(extension: string, loader: LevelLoaderFn): void {
    this.loaders.set(extension.toLowerCase(), loader);
  }

  setDefaultLoader(loader: LevelLoaderFn): void {
    this.defaultLoader = loader;
  }

  async load(
    definition: LevelDefinition,
    onProgress: (progress: number) => void
  ): Promise<LevelLoaderResult> {
    const extension = definition.path.split('.').pop()?.toLowerCase() || '';
    const loader = this.loaders.get(extension) || this.defaultLoader;
    return loader(definition, onProgress);
  }

  private createDefaultLoader(): LevelLoaderFn {
    return async (definition, onProgress) => {
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        onProgress(i / steps);
      }

      const scene = new THREE.Group();
      scene.name = definition.name;

      if (definition.bounds) {
        const size = new THREE.Vector3(
          definition.bounds.max.x - definition.bounds.min.x,
          definition.bounds.max.y - definition.bounds.min.y,
          definition.bounds.max.z - definition.bounds.min.z
        );
        const center = new THREE.Vector3(
          (definition.bounds.min.x + definition.bounds.max.x) / 2,
          (definition.bounds.min.y + definition.bounds.max.y) / 2,
          (definition.bounds.min.z + definition.bounds.max.z) / 2
        );
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(size.x, size.z),
          new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.copy(center);
        ground.position.y = definition.bounds.min.y;
        scene.add(ground);
      }

      return {
        scene,
        assets: [],
        metadata: definition.metadata,
      };
    };
  }
}
