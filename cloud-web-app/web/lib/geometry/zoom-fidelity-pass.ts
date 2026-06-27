/**
 * zoom-fidelity-pass.ts
 *
 * Micro-displacement and detail rendering passes that preserve structural
 * density at close camera distances.
 *
 * Systems:
 *   1. Distance-Based LOD Selector — switches between LOD levels based on screen-space error
 *   2. Micro-Displacement Evaluator — applies detail texture offsets at close range
 *   3. Detail Normal Compositor — blends macro + micro normal maps
 *   4. Virtual Texture Streamer — streams high-res texture tiles on demand
 */

// ─────────────────────────────────────────────────────────────────────────────
// LOD Selection
// ─────────────────────────────────────────────────────────────────────────────

export interface LODDescriptor {
  level: number;
  screenSizeThreshold: number; // pixel height of object when this LOD activates
  meshUri: string;
  normalMapUri?: string;
  displacementMapUri?: string;
  textureSuffix: '512' | '1K' | '2K' | '4K' | '8K';
}

export interface LODSelectResult {
  selectedLevel: number;
  screenSizePx: number;
  shouldLoadHighResTexture: boolean;
  displacementEnabled: boolean;
}

export function selectLOD(
  objectWorldRadius: number,
  cameraDistance: number,
  viewportHeight: number,
  fovRad: number,
  lods: LODDescriptor[]
): LODSelectResult {
  // Projected screen size (pixels)
  const projectedHeight = (objectWorldRadius * 2 * viewportHeight) / (2 * Math.tan(fovRad / 2) * cameraDistance);

  // Find the highest quality LOD whose threshold is met
  let selected = lods[lods.length - 1]!; // lowest quality default
  for (const lod of lods) {
    if (projectedHeight >= lod.screenSizeThreshold) {
      selected = lod;
      break;
    }
  }

  const displacementEnabled = projectedHeight > 200;
  const shouldLoadHighResTexture = projectedHeight > 150;

  return {
    selectedLevel: selected.level,
    screenSizePx: projectedHeight,
    shouldLoadHighResTexture,
    displacementEnabled,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-Displacement Evaluator
// ─────────────────────────────────────────────────────────────────────────────

export interface DisplacementConfig {
  /** Scale of the displacement in world units */
  displacementScale: number;
  /** UV tile repeat for detail texture */
  detailTiling: number;
  /** Distance at which displacement fully fades out */
  fadeStartDistance: number;
  fadeEndDistance: number;
  /** Tessellation subdivision count */
  tessellationLevel: number;
}

export interface DisplacementResult {
  /** Tessellation factor for the GPU (1 = no tessellation) */
  tessellationFactor: number;
  /** Effective displacement scale after distance fade */
  effectiveDisplacementScale: number;
  /** Detail tiling multiplier */
  detailTiling: number;
}

export function evaluateDisplacement(
  cameraDistance: number,
  config: DisplacementConfig
): DisplacementResult {
  // Linear fade
  const fadeFactor = Math.max(0, Math.min(1,
    1 - (cameraDistance - config.fadeStartDistance) /
        (config.fadeEndDistance - config.fadeStartDistance)
  ));

  // Tessellation level scales with proximity
  const tessLevel = fadeFactor > 0.1
    ? Math.min(config.tessellationLevel, Math.ceil(config.tessellationLevel * fadeFactor))
    : 1;

  return {
    tessellationFactor: tessLevel,
    effectiveDisplacementScale: config.displacementScale * fadeFactor,
    detailTiling: config.detailTiling,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Normal Compositor
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalCompositeConfig {
  macroNormalWeight: number;  // 0..1
  microNormalWeight: number;  // 0..1
  microNormalTiling: number;  // UV repeat
  detailStrength: number;     // overall detail strength
}

/**
 * Returns a WGSL snippet for blending macro + micro normal maps.
 * This snippet is embedded into the material shader at compile time.
 */
export function generateNormalCompositeWGSL(config: NormalCompositeConfig): string {
  return `
// ── Detail Normal Compositor ──────────────────────────────────────────────
fn compositeDetailNormal(macro_n: vec3f, micro_n: vec3f, detail_uv: vec2f) -> vec3f {
  let macro_weight = ${config.macroNormalWeight.toFixed(4)};
  let micro_weight = ${config.microNormalWeight.toFixed(4)};
  let detail_strength = ${config.detailStrength.toFixed(4)};

  // Reorient Normal Map (RNM) blending
  let t = macro_n + vec3f(0.0, 0.0, 1.0);
  let u = micro_n * vec3f(-1.0, -1.0, 1.0);
  let result = normalize(t * dot(t, u) - u * t.z);

  return mix(macro_n, result, detail_strength);
}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Virtual Texture Tile Streamer
// ─────────────────────────────────────────────────────────────────────────────

export interface TextureTile {
  tileX: number;
  tileY: number;
  mipLevel: number;
  uri: string;
  priority: number;
  loaded: boolean;
}

export class VirtualTextureStreamer {
  private tiles = new Map<string, TextureTile>();
  private loadQueue: TextureTile[] = [];
  private maxConcurrentLoads = 4;
  private activeLoads = 0;

  /**
   * Request tiles that fall within the camera frustum at the given distance.
   */
  requestTiles(
    uvCenterX: number,
    uvCenterY: number,
    mipLevel: number,
    textureBasePath: string
  ): void {
    const tileSize = 1 / Math.pow(2, mipLevel);
    const halfSize = tileSize * 2; // Prefetch 2x2 tile region around center

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tileX = Math.floor((uvCenterX + dx * halfSize) / tileSize);
        const tileY = Math.floor((uvCenterY + dy * halfSize) / tileSize);
        const key = `${tileX}:${tileY}:${mipLevel}`;

        if (!this.tiles.has(key)) {
          const tile: TextureTile = {
            tileX, tileY, mipLevel,
            uri: `${textureBasePath}/mip${mipLevel}/tile_${tileX}_${tileY}.ktx2`,
            priority: 10 - mipLevel - Math.abs(dx) - Math.abs(dy),
            loaded: false,
          };
          this.tiles.set(key, tile);
          this.loadQueue.push(tile);
        }
      }
    }

    // Sort queue by priority
    this.loadQueue.sort((a, b) => b.priority - a.priority);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.activeLoads < this.maxConcurrentLoads && this.loadQueue.length > 0) {
      const tile = this.loadQueue.shift()!;
      if (tile.loaded) continue;
      this.activeLoads++;
      this.loadTile(tile);
    }
  }

  private loadTile(tile: TextureTile): void {
    // In production: use GPU texture upload via fetch + createImageBitmap
    const img = new Image();
    img.onload = () => {
      tile.loaded = true;
      this.activeLoads--;
      this.processQueue();
    };
    img.onerror = () => {
      this.activeLoads--;
      this.processQueue();
    };
    img.src = tile.uri;
  }

  evictDistantTiles(uvCenterX: number, uvCenterY: number, maxDistance: number): void {
    for (const [key, tile] of this.tiles.entries()) {
      const tileSize = 1 / Math.pow(2, tile.mipLevel);
      const tileCX = (tile.tileX + 0.5) * tileSize;
      const tileCY = (tile.tileY + 0.5) * tileSize;
      const dist = Math.sqrt(Math.pow(tileCX - uvCenterX, 2) + Math.pow(tileCY - uvCenterY, 2));
      if (dist > maxDistance) this.tiles.delete(key);
    }
  }

  getLoadedTileCount(): number {
    return Array.from(this.tiles.values()).filter(t => t.loaded).length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default LOD Descriptor Set
// ─────────────────────────────────────────────────────────────────────────────

export function createDefaultLODs(baseUri: string): LODDescriptor[] {
  return [
    { level: 0, screenSizeThreshold: 400, meshUri: `${baseUri}_lod0.glb`, normalMapUri: `${baseUri}_normal_8k.ktx2`, textureSuffix: '8K', displacementMapUri: `${baseUri}_disp_8k.ktx2` },
    { level: 1, screenSizeThreshold: 200, meshUri: `${baseUri}_lod1.glb`, normalMapUri: `${baseUri}_normal_4k.ktx2`, textureSuffix: '4K' },
    { level: 2, screenSizeThreshold: 80, meshUri: `${baseUri}_lod2.glb`, normalMapUri: `${baseUri}_normal_2k.ktx2`, textureSuffix: '2K' },
    { level: 3, screenSizeThreshold: 30, meshUri: `${baseUri}_lod3.glb`, textureSuffix: '1K' },
    { level: 4, screenSizeThreshold: 0, meshUri: `${baseUri}_lod4.glb`, textureSuffix: '512' },
  ];
}
