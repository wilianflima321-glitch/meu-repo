// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import { logger } from '@/lib/observability/logger';
/**
 * VIRTUAL TEXTURE SYSTEM - Aethel Engine
 *
 * Sistema de texturas virtuais (streaming) estilo Unreal/id Tech.
 *
 * FEATURES:
 * - Sparse virtual texturing
 * - Texture streaming
 * - Mipmapped page tables
 * - Feedback buffer analysis
 * - LRU cache management
 * - Tile compression
 * - Atlas management
 * - Transcode support
 */

import * as THREE from 'three';
import { FeedbackBuffer, PageTable, PhysicalTextureAtlas, TileCache } from './virtual-texture-cache';
import { VirtualTextureShader } from './virtual-texture-shader';
export { FeedbackBuffer, PageTable, PhysicalTextureAtlas, TileCache } from './virtual-texture-cache';

// ============================================================================
// TYPES
// ============================================================================

export interface VirtualTextureConfig {
  virtualTextureSize: number;  // Total virtual texture resolution
  physicalTextureSize: number; // Physical (atlas) texture resolution
  tileSize: number;            // Individual tile size (e.g., 128x128)
  borderSize: number;          // Border for filtering
  maxMipLevels: number;
  cacheSize: number;           // Number of cached tiles
  feedbackScale: number;       // Feedback buffer downscale factor
}

export interface TileAddress {
  x: number;
  y: number;
  mip: number;
}

export interface PhysicalTile {
  address: TileAddress;
  physicalX: number;
  physicalY: number;
  lastUsedFrame: number;
  loading: boolean;
}

export interface TileRequest {
  address: TileAddress;
  priority: number;
}

export interface VirtualTextureSource {
  getSize(): { width: number; height: number };
  getMipLevels(): number;
  loadTile(x: number, y: number, mip: number): Promise<ImageData | HTMLImageElement | HTMLCanvasElement>;
}

// ============================================================================
// FILE-BASED TEXTURE SOURCE
// ============================================================================

export class FileVirtualTextureSource implements VirtualTextureSource {
  private baseUrl: string;
  private width: number;
  private height: number;
  private mipLevels: number;
  private tileSize: number;

  constructor(baseUrl: string, width: number, height: number, tileSize: number) {
    this.baseUrl = baseUrl;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.mipLevels = Math.ceil(Math.log2(Math.max(width, height) / tileSize)) + 1;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  getMipLevels(): number {
    return this.mipLevels;
  }

  async loadTile(x: number, y: number, mip: number): Promise<HTMLImageElement> {
    const url = `${this.baseUrl}/mip${mip}/${x}_${y}.jpg`;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
}

// ============================================================================
// PROCEDURAL TEXTURE SOURCE
// ============================================================================

export class ProceduralVirtualTextureSource implements VirtualTextureSource {
  private width: number;
  private height: number;
  private tileSize: number;
  private generator: (x: number, y: number, mip: number) => ImageData;

  constructor(
    width: number,
    height: number,
    tileSize: number,
    generator: (x: number, y: number, mip: number) => ImageData
  ) {
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.generator = generator;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  getMipLevels(): number {
    return Math.ceil(Math.log2(Math.max(this.width, this.height) / this.tileSize)) + 1;
  }

  async loadTile(x: number, y: number, mip: number): Promise<ImageData> {
    return this.generator(x, y, mip);
  }
}

// ============================================================================
// VIRTUAL TEXTURE SHADER
// ============================================================================

export { VirtualTextureShader } from './virtual-texture-shader';

// ============================================================================
// VIRTUAL TEXTURE SYSTEM
// ============================================================================

export class VirtualTextureSystem {
  private config: VirtualTextureConfig;
  private pageTable: PageTable;
  private physicalTexture: PhysicalTextureAtlas;
  private tileCache: TileCache;
  private feedbackBuffer: FeedbackBuffer;
  private source: VirtualTextureSource | null = null;

  private frameCount: number = 0;
  private pendingLoads: Set<string> = new Set();
  private maxLoadsPerFrame: number = 8;

  private material: THREE.ShaderMaterial;
  private feedbackMaterial: THREE.ShaderMaterial;

  private onTileLoadedCallbacks: ((address: TileAddress) => void)[] = [];

  constructor(config: Partial<VirtualTextureConfig> = {}) {
    this.config = {
      virtualTextureSize: config.virtualTextureSize ?? 16384,
      physicalTextureSize: config.physicalTextureSize ?? 4096,
      tileSize: config.tileSize ?? 128,
      borderSize: config.borderSize ?? 4,
      maxMipLevels: config.maxMipLevels ?? 11,
      cacheSize: config.cacheSize ?? 1024,
      feedbackScale: config.feedbackScale ?? 8
    };

    // Initialize page table
    this.pageTable = new PageTable(
      this.config.virtualTextureSize,
      this.config.tileSize,
      this.config.maxMipLevels
    );

    // Initialize physical texture
    this.physicalTexture = new PhysicalTextureAtlas(
      this.config.physicalTextureSize,
      this.config.tileSize,
      this.config.borderSize
    );

    // Initialize tile cache
    this.tileCache = new TileCache(this.physicalTexture.getTilesPerSide());

    // Initialize feedback buffer
    this.feedbackBuffer = new FeedbackBuffer(
      Math.ceil(window.innerWidth / this.config.feedbackScale),
      Math.ceil(window.innerHeight / this.config.feedbackScale)
    );

    // Create materials
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...VirtualTextureShader.uniforms,
        pageTable: { value: this.pageTable.getTexture() },
        physicalTexture: { value: this.physicalTexture.getTexture() },
        virtualTextureSize: { value: this.config.virtualTextureSize },
        physicalTextureSize: { value: this.config.physicalTextureSize },
        tileSize: { value: this.config.tileSize },
        tilesPerSide: { value: this.physicalTexture.getTilesPerSide() }
      },
      vertexShader: VirtualTextureShader.vertexShader,
      fragmentShader: VirtualTextureShader.fragmentShader
    });

    this.feedbackMaterial = new THREE.ShaderMaterial({
      uniforms: {
        virtualTextureSize: { value: this.config.virtualTextureSize },
        tileSize: { value: this.config.tileSize },
        mipBias: { value: 0.0 }
      },
      vertexShader: VirtualTextureShader.vertexShader,
      fragmentShader: VirtualTextureShader.feedbackFragmentShader
    });
  }

  setSource(source: VirtualTextureSource): void {
    this.source = source;
    this.tileCache.clear();
  }

  getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }

  getFeedbackMaterial(): THREE.ShaderMaterial {
    return this.feedbackMaterial;
  }

  getFeedbackRenderTarget(): THREE.WebGLRenderTarget {
    return this.feedbackBuffer.getRenderTarget();
  }

  async update(renderer: THREE.WebGLRenderer, scene?: THREE.Scene, camera?: THREE.Camera): Promise<void> {
    this.frameCount++;

    // Render feedback buffer if scene and camera are provided
    if (scene && camera) {
      const originalRenderTarget = renderer.getRenderTarget();
      const originalOverrideMaterial = scene.overrideMaterial;

      renderer.setRenderTarget(this.feedbackBuffer.getRenderTarget());
      scene.overrideMaterial = this.feedbackMaterial;
      renderer.clear();
      renderer.render(scene, camera);

      scene.overrideMaterial = originalOverrideMaterial;
      renderer.setRenderTarget(originalRenderTarget);
    }

    // Analyze feedback buffer asynchronously
    const requests = await this.feedbackBuffer.analyze(renderer);

    // Process requests
    let loadsThisFrame = 0;

    for (const request of requests) {
      // Skip if already loaded or loading
      if (this.tileCache.has(request.address)) {
        this.tileCache.touch(request.address, this.frameCount);
        continue;
      }

      const key = `${request.address.x}_${request.address.y}_${request.address.mip}`;
      if (this.pendingLoads.has(key)) continue;

      // Limit loads per frame
      if (loadsThisFrame >= this.maxLoadsPerFrame) break;

      // Start loading
      this.loadTile(request.address);
      loadsThisFrame++;
    }
  }

  private async loadTile(address: TileAddress): Promise<void> {
    if (!this.source) return;

    const key = `${address.x}_${address.y}_${address.mip}`;
    this.pendingLoads.add(key);

    // Allocate physical tile
    const slot = this.tileCache.allocate(address, this.frameCount);
    if (!slot) {
      this.pendingLoads.delete(key);
      return;
    }

    try {
      // Load tile data
      const tileData = await this.source.loadTile(address.x, address.y, address.mip);

      // Convert to ImageData if needed
      let imageData: ImageData | Uint8Array;

      if (tileData instanceof ImageData) {
        imageData = tileData;
      } else if (tileData instanceof HTMLImageElement || tileData instanceof HTMLCanvasElement) {
        const canvas = document.createElement('canvas');
        canvas.width = this.config.tileSize;
        canvas.height = this.config.tileSize;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(tileData, 0, 0, this.config.tileSize, this.config.tileSize);
        imageData = ctx.getImageData(0, 0, this.config.tileSize, this.config.tileSize);
      } else {
        throw new Error('Unsupported tile data format');
      }

      // Upload to physical texture
      this.physicalTexture.uploadTile(slot.x, slot.y, imageData);

      // Update page table
      this.pageTable.setEntry(address.x, address.y, address.mip, slot.x, slot.y);

      // Mark as loaded
      this.tileCache.markLoaded(address);

      // Emit callback
      for (const callback of this.onTileLoadedCallbacks) {
        callback(address);
      }

    } catch (error) {
      logger.error(`Failed to load tile ${key}:`, error);
    } finally {
      this.pendingLoads.delete(key);
    }
  }

  // Preload specific tiles
  async preloadTiles(addresses: TileAddress[]): Promise<void> {
    const promises = addresses.map(addr => this.loadTile(addr));
    await Promise.all(promises);
  }

  // Preload mip level
  async preloadMipLevel(mip: number): Promise<void> {
    if (!this.source) return;

    const size = this.source.getSize();
    const scale = Math.pow(2, mip);
    const tilesX = Math.ceil(size.width / this.config.tileSize / scale);
    const tilesY = Math.ceil(size.height / this.config.tileSize / scale);

    const addresses: TileAddress[] = [];
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        addresses.push({ x, y, mip });
      }
    }

    await this.preloadTiles(addresses);
  }

  onTileLoaded(callback: (address: TileAddress) => void): void {
    this.onTileLoadedCallbacks.push(callback);
  }

  setMipBias(bias: number): void {
    this.material.uniforms.mipBias.value = bias;
    this.feedbackMaterial.uniforms.mipBias.value = bias;
  }

  getStats(): { loadedTiles: number; pendingLoads: number; cacheHitRate: number } {
    return {
      loadedTiles: this.tileCache['cache'].size,
      pendingLoads: this.pendingLoads.size,
      cacheHitRate: 0 // Would need to track hits/misses
    };
  }

  dispose(): void {
    this.pageTable.dispose();
    this.physicalTexture.dispose();
    this.feedbackBuffer.dispose();
    this.material.dispose();
    this.feedbackMaterial.dispose();
    this.tileCache.clear();
    this.onTileLoadedCallbacks = [];
  }
}

// ============================================================================
// VIRTUAL TEXTURE MANAGER
// ============================================================================

export class VirtualTextureManager {
  private systems: Map<string, VirtualTextureSystem> = new Map();
  private renderer: THREE.WebGLRenderer | null = null;

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  createVirtualTexture(id: string, config?: Partial<VirtualTextureConfig>): VirtualTextureSystem {
    const system = new VirtualTextureSystem(config);
    this.systems.set(id, system);
    return system;
  }

  getVirtualTexture(id: string): VirtualTextureSystem | undefined {
    return this.systems.get(id);
  }

  deleteVirtualTexture(id: string): void {
    const system = this.systems.get(id);
    if (system) {
      system.dispose();
      this.systems.delete(id);
    }
  }

  async update(scene?: THREE.Scene, camera?: THREE.Camera): Promise<void> {
    if (!this.renderer) return;

    for (const system of this.systems.values()) {
      await system.update(this.renderer, scene, camera);
    }
  }

  dispose(): void {
    for (const system of this.systems.values()) {
      system.dispose();
    }
    this.systems.clear();
  }
}

// ============================================================================
// TERRAIN VIRTUAL TEXTURE (Example)
// ============================================================================

export { createTerrainVirtualTexture } from './virtual-texture-factories';

export default VirtualTextureManager;
