// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';
import type { PhysicalTile, TileAddress, TileRequest } from './virtual-texture-system';

// ============================================================================
// PAGE TABLE
// ============================================================================

export class PageTable {
  private data: Float32Array<ArrayBuffer>;
  private width: number;
  private height: number;
  private texture: THREE.DataTexture;

  constructor(virtualSize: number, tileSize: number, mipLevels: number) {
    // Calculate page table size (one entry per tile)
    this.width = Math.ceil(virtualSize / tileSize);
    this.height = this.width * mipLevels;

    // RGBA: x, y (physical coords), mip, valid
    this.data = new Float32Array(new ArrayBuffer(this.width * this.height * 4 * 4));

    // Initialize as invalid
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i + 3] = 0; // Invalid
    }

    this.texture = new THREE.DataTexture(
      this.data,
      this.width,
      this.height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;
  }

  setEntry(tileX: number, tileY: number, mip: number, physicalX: number, physicalY: number): void {
    const index = this.getIndex(tileX, tileY, mip);
    if (index < 0) return;

    this.data[index * 4 + 0] = physicalX;
    this.data[index * 4 + 1] = physicalY;
    this.data[index * 4 + 2] = mip;
    this.data[index * 4 + 3] = 1; // Valid

    this.texture.needsUpdate = true;
  }

  invalidateEntry(tileX: number, tileY: number, mip: number): void {
    const index = this.getIndex(tileX, tileY, mip);
    if (index < 0) return;

    this.data[index * 4 + 3] = 0; // Invalid
    this.texture.needsUpdate = true;
  }

  isValid(tileX: number, tileY: number, mip: number): boolean {
    const index = this.getIndex(tileX, tileY, mip);
    if (index < 0) return false;
    return this.data[index * 4 + 3] > 0;
  }

  private getIndex(tileX: number, tileY: number, mip: number): number {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.width) {
      return -1;
    }
    return (mip * this.width + tileY) * this.width + tileX;
  }

  getTexture(): THREE.DataTexture {
    return this.texture;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

// ============================================================================
// PHYSICAL TEXTURE ATLAS
// ============================================================================

export class PhysicalTextureAtlas {
  private texture: THREE.DataTexture;
  private data: Uint8Array<ArrayBuffer>;
  private size: number;
  private tileSize: number;
  private borderSize: number;
  private tilesPerSide: number;

  constructor(size: number, tileSize: number, borderSize: number) {
    this.size = size;
    this.tileSize = tileSize;
    this.borderSize = borderSize;
    this.tilesPerSide = Math.floor(size / (tileSize + borderSize * 2));

    this.data = new Uint8Array(new ArrayBuffer(size * size * 4));

    this.texture = new THREE.DataTexture(
      this.data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = true;
    this.texture.needsUpdate = true;
  }

  uploadTile(physicalX: number, physicalY: number, imageData: ImageData | Uint8Array): void {
    const tileSizeWithBorder = this.tileSize + this.borderSize * 2;
    const startX = physicalX * tileSizeWithBorder;
    const startY = physicalY * tileSizeWithBorder;

    const srcData = imageData instanceof ImageData ? imageData.data : imageData;

    // Copy tile data
    for (let y = 0; y < tileSizeWithBorder; y++) {
      for (let x = 0; x < tileSizeWithBorder; x++) {
        const destX = startX + x;
        const destY = startY + y;

        if (destX >= this.size || destY >= this.size) continue;

        const srcX = Math.min(x, this.tileSize - 1);
        const srcY = Math.min(y, this.tileSize - 1);

        const srcIndex = (srcY * this.tileSize + srcX) * 4;
        const destIndex = (destY * this.size + destX) * 4;

        this.data[destIndex + 0] = srcData[srcIndex + 0];
        this.data[destIndex + 1] = srcData[srcIndex + 1];
        this.data[destIndex + 2] = srcData[srcIndex + 2];
        this.data[destIndex + 3] = srcData[srcIndex + 3] ?? 255;
      }
    }

    this.texture.needsUpdate = true;
  }

  getTexture(): THREE.DataTexture {
    return this.texture;
  }

  getTilesPerSide(): number {
    return this.tilesPerSide;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

// ============================================================================
// TILE CACHE (LRU)
// ============================================================================

export class TileCache {
  private cache: Map<string, PhysicalTile> = new Map();
  private freeList: Array<{ x: number; y: number }> = [];
  private maxTiles: number;
  private tilesPerSide: number;

  constructor(tilesPerSide: number) {
    this.tilesPerSide = tilesPerSide;
    this.maxTiles = tilesPerSide * tilesPerSide;

    // Initialize free list
    for (let y = 0; y < tilesPerSide; y++) {
      for (let x = 0; x < tilesPerSide; x++) {
        this.freeList.push({ x, y });
      }
    }
  }

  private getTileKey(address: TileAddress): string {
    return `${address.x}_${address.y}_${address.mip}`;
  }

  get(address: TileAddress): PhysicalTile | undefined {
    return this.cache.get(this.getTileKey(address));
  }

  has(address: TileAddress): boolean {
    return this.cache.has(this.getTileKey(address));
  }

  allocate(address: TileAddress, currentFrame: number): { x: number; y: number } | null {
    const key = this.getTileKey(address);

    // Check if already cached
    const existing = this.cache.get(key);
    if (existing) {
      existing.lastUsedFrame = currentFrame;
      return { x: existing.physicalX, y: existing.physicalY };
    }

    // Get free slot
    let slot: { x: number; y: number } | undefined = this.freeList.pop();

    if (!slot) {
      // Need to evict
      slot = this.evictLRU(currentFrame);
      if (!slot) return null;
    }

    // Create new entry
    const tile: PhysicalTile = {
      address,
      physicalX: slot.x,
      physicalY: slot.y,
      lastUsedFrame: currentFrame,
      loading: true
    };

    this.cache.set(key, tile);

    return slot;
  }

  markLoaded(address: TileAddress): void {
    const tile = this.cache.get(this.getTileKey(address));
    if (tile) {
      tile.loading = false;
    }
  }

  touch(address: TileAddress, currentFrame: number): void {
    const tile = this.cache.get(this.getTileKey(address));
    if (tile) {
      tile.lastUsedFrame = currentFrame;
    }
  }

  private evictLRU(currentFrame: number): { x: number; y: number } | undefined {
    let oldestKey: string | null = null;
    let oldestFrame = currentFrame;
    let oldestTile: PhysicalTile | null = null;

    for (const [key, tile] of this.cache) {
      // Don't evict loading tiles
      if (tile.loading) continue;

      if (tile.lastUsedFrame < oldestFrame) {
        oldestFrame = tile.lastUsedFrame;
        oldestKey = key;
        oldestTile = tile;
      }
    }

    if (oldestKey && oldestTile) {
      this.cache.delete(oldestKey);
      return { x: oldestTile.physicalX, y: oldestTile.physicalY };
    }

    return undefined;
  }

  clear(): void {
    this.cache.clear();
    this.freeList = [];
    for (let y = 0; y < this.tilesPerSide; y++) {
      for (let x = 0; x < this.tilesPerSide; x++) {
        this.freeList.push({ x, y });
      }
    }
  }
}

// ============================================================================
// FEEDBACK BUFFER
// ============================================================================

export class FeedbackBuffer {
  private renderTarget: THREE.WebGLRenderTarget;
  private readBuffer: Uint8Array<ArrayBuffer>;
  private width: number;
  private height: number;
  private requests: Map<string, TileRequest> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    });

    this.readBuffer = new Uint8Array(new ArrayBuffer(width * height * 4));
  }

  getRenderTarget(): THREE.WebGLRenderTarget {
    return this.renderTarget;
  }

  analyze(renderer: THREE.WebGLRenderer): TileRequest[] {
    // Read feedback buffer
    renderer.readRenderTargetPixels(
      this.renderTarget,
      0, 0,
      this.width, this.height,
      this.readBuffer
    );

    this.requests.clear();

    // Parse feedback pixels
    for (let i = 0; i < this.readBuffer.length; i += 4) {
      const r = this.readBuffer[i];
      const g = this.readBuffer[i + 1];
      const b = this.readBuffer[i + 2];
      const a = this.readBuffer[i + 3];

      // Skip empty pixels
      if (a === 0) continue;

      // Decode tile address from pixel
      const tileX = r | ((a & 0x0F) << 8);
      const tileY = g | ((a & 0xF0) << 4);
      const mip = b;

      const key = `${tileX}_${tileY}_${mip}`;

      if (!this.requests.has(key)) {
        this.requests.set(key, {
          address: { x: tileX, y: tileY, mip },
          priority: 1
        });
      } else {
        const req = this.requests.get(key)!;
        req.priority++;
      }
    }

    // Sort by priority
    return Array.from(this.requests.values())
      .sort((a, b) => b.priority - a.priority);
  }

  dispose(): void {
    this.renderTarget.dispose();
  }
}
