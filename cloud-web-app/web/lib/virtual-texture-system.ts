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

export const VirtualTextureShader = {
  uniforms: {
    pageTable: { value: null as THREE.Texture | null },
    physicalTexture: { value: null as THREE.Texture | null },
    virtualTextureSize: { value: 16384 },
    physicalTextureSize: { value: 4096 },
    tileSize: { value: 128 },
    tilesPerSide: { value: 32 },
    mipBias: { value: 0.0 }
  },
  
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform sampler2D pageTable;
    uniform sampler2D physicalTexture;
    uniform float virtualTextureSize;
    uniform float physicalTextureSize;
    uniform float tileSize;
    uniform float tilesPerSide;
    uniform float mipBias;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    float getMipLevel(vec2 uv) {
      vec2 dx = dFdx(uv * virtualTextureSize);
      vec2 dy = dFdy(uv * virtualTextureSize);
      float d = max(dot(dx, dx), dot(dy, dy));
      return 0.5 * log2(d) + mipBias;
    }
    
    vec4 sampleVirtualTexture(vec2 uv) {
      float mip = getMipLevel(uv);
      mip = clamp(floor(mip), 0.0, 10.0);
      
      // Calculate tile coordinates
      float scale = pow(2.0, mip);
      float tilesAtMip = virtualTextureSize / tileSize / scale;
      
      vec2 tileCoord = uv * tilesAtMip;
      vec2 tileIndex = floor(tileCoord);
      vec2 inTileUV = fract(tileCoord);
      
      // Look up page table
      vec2 pageTableUV = vec2(
        (tileIndex.x + 0.5) / tilesAtMip,
        (mip * tilesAtMip + tileIndex.y + 0.5) / (tilesAtMip * 11.0)
      );
      
      vec4 pageEntry = texture2D(pageTable, pageTableUV);
      
      // Check if valid
      if (pageEntry.a < 0.5) {
        // Fall back to lower mip
        return vec4(1.0, 0.0, 1.0, 1.0); // Debug magenta
      }
      
      // Calculate physical texture coordinates
      float tileSizeInAtlas = tileSize / physicalTextureSize;
      vec2 physicalUV = vec2(pageEntry.xy) * tileSizeInAtlas + inTileUV * tileSizeInAtlas;
      
      return texture2D(physicalTexture, physicalUV);
    }
    
    void main() {
      gl_FragColor = sampleVirtualTexture(vUv);
    }
  `,
  
  // Feedback pass shader - encodes required tiles into color
  feedbackFragmentShader: `
    uniform float virtualTextureSize;
    uniform float tileSize;
    uniform float mipBias;
    
    varying vec2 vUv;
    
    float getMipLevel(vec2 uv) {
      vec2 dx = dFdx(uv * virtualTextureSize);
      vec2 dy = dFdy(uv * virtualTextureSize);
      float d = max(dot(dx, dx), dot(dy, dy));
      return 0.5 * log2(d) + mipBias;
    }
    
    void main() {
      float mip = getMipLevel(vUv);
      mip = clamp(floor(mip), 0.0, 10.0);
      
      float scale = pow(2.0, mip);
      float tilesAtMip = virtualTextureSize / tileSize / scale;
      
      vec2 tileCoord = vUv * tilesAtMip;
      vec2 tileIndex = floor(tileCoord);
      
      // Encode tile address into color
      // R: tileX low 8 bits
      // G: tileY low 8 bits
      // B: mip level
      // A: tileX/Y high bits
      
      float tileX = tileIndex.x;
      float tileY = tileIndex.y;
      
      gl_FragColor = vec4(
        mod(tileX, 256.0) / 255.0,
        mod(tileY, 256.0) / 255.0,
        mip / 255.0,
        (floor(tileX / 256.0) + floor(tileY / 256.0) * 16.0) / 255.0
      );
    }
  `
};

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
  
  async update(renderer: THREE.WebGLRenderer): Promise<void> {
    this.frameCount++;
    
    // Analyze feedback buffer
    const requests = this.feedbackBuffer.analyze(renderer);
    
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
      console.error(`Failed to load tile ${key}:`, error);
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
  
  async update(): Promise<void> {
    if (!this.renderer) return;
    
    for (const system of this.systems.values()) {
      await system.update(this.renderer);
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

export function createTerrainVirtualTexture(): ProceduralVirtualTextureSource {
  return new ProceduralVirtualTextureSource(
    16384, 16384, 128,
    (tileX: number, tileY: number, mip: number) => {
      const tileSize = 128;
      const data = new Uint8ClampedArray(tileSize * tileSize * 4);
      const scale = Math.pow(2, mip);
      
      for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
          const worldX = (tileX * tileSize + x) * scale;
          const worldY = (tileY * tileSize + y) * scale;
          
          // Simple noise-based terrain color
          const noise = Math.sin(worldX * 0.01) * Math.cos(worldY * 0.01) * 0.5 + 0.5;
          
          // Grass to dirt gradient
          const grassColor = [34, 139, 34];
          const dirtColor = [139, 90, 43];
          
          const idx = (y * tileSize + x) * 4;
          data[idx + 0] = Math.floor(grassColor[0] * (1 - noise) + dirtColor[0] * noise);
          data[idx + 1] = Math.floor(grassColor[1] * (1 - noise) + dirtColor[1] * noise);
          data[idx + 2] = Math.floor(grassColor[2] * (1 - noise) + dirtColor[2] * noise);
          data[idx + 3] = 255;
        }
      }
      
      return new ImageData(data, tileSize, tileSize);
    }
  );
}

export default VirtualTextureManager;
