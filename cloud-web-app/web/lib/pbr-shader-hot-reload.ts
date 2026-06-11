// @aethel-heavy-async-boundary

import { THREE } from './pbr-three-namespace';

export class ShaderHotReload {
  private materials: Set<THREE.ShaderMaterial> = new Set();
  private shaderSources: Map<string, { vertex: string; fragment: string }> = new Map();
  private watchers: Map<string, () => void> = new Map();
  register(name: string, material: THREE.ShaderMaterial): void {
    this.materials.add(material);
    this.shaderSources.set(name, {
      vertex: material.vertexShader,
      fragment: material.fragmentShader,
    });
  }
  update(name: string, vertex?: string, fragment?: string): void {
    const source = this.shaderSources.get(name);
    if (!source) return;
    if (vertex) source.vertex = vertex;
    if (fragment) source.fragment = fragment;
    for (const material of this.materials) {
      if (material.vertexShader === source.vertex || material.fragmentShader === source.fragment) {
        if (vertex) material.vertexShader = vertex;
        if (fragment) material.fragmentShader = fragment;
        material.needsUpdate = true;
      }
    }
    const watcher = this.watchers.get(name);
    if (watcher) watcher();
  }
  onUpdate(name: string, callback: () => void): void {
    this.watchers.set(name, callback);
  }
  dispose(): void {
    this.materials.clear();
    this.shaderSources.clear();
    this.watchers.clear();
  }
}

