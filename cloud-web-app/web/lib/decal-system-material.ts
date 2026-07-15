// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import THREE from './decal-system-runtime';

import type { DecalConfig } from './decal-system.types';

export class DecalMaterial extends THREE.MeshStandardMaterial {
  constructor(config: Partial<DecalConfig> = {}) {
    super({
      map: config.texture || null,
      normalMap: config.normalMap || null,
      transparent: true,
      opacity: config.opacity ?? 1,
      depthTest: config.depthTest ?? true,
      depthWrite: config.depthWrite ?? false,
      polygonOffset: true,
      polygonOffsetFactor: config.polygonOffsetFactor ?? -4,
      polygonOffsetUnits: config.polygonOffsetUnits ?? -4,
      blending: config.blending ?? THREE.NormalBlending,
    });
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
    this.needsUpdate = true;
  }
}

// ============================================================================
