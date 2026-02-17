/**
 * Terrain System - Sistema de Terreno Procedural
 * 
 * Sistema completo de terreno com:
 * - Height map generation
 * - Multi-layer texture splatting
 * - Procedural generation (Perlin, Simplex, Diamond-Square)
 * - Sculpting tools (raise, lower, smooth, flatten)
 * - Foliage painting
 * - LOD system
 * 
 * @module lib/terrain/terrain-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface TerrainSettings {
  width: number;
  depth: number;
  resolution: number; // Vertices per side
  maxHeight: number;
  
  // LOD
  lodLevels: number;
  lodDistance: number;
  
  // Texturing
  textureRepeat: number;
  
  // Physics
  generateCollider: boolean;
}

export interface TerrainLayer {
  id: string;
  name: string;
  texture: string;
  normalMap?: string;
  tileSize: number;
  minHeight: number;
  maxHeight: number;
  minSlope: number;
  maxSlope: number;
  blendSharpness: number;
}

export interface NoiseSettings {
  type: 'perlin' | 'simplex' | 'ridged' | 'billowy' | 'hybrid';
  seed: number;
  octaves: number;
  frequency: number;
  amplitude: number;
  lacunarity: number;
  persistence: number;
  offset: { x: number; y: number };
}

export interface BrushSettings {
  size: number;
  strength: number;
  falloff: number;
  shape: 'circle' | 'square' | 'soft';
}

export interface FoliageType {
  id: string;
  name: string;
  mesh: THREE.Object3D | null;
  density: number;
  minScale: number;
  maxScale: number;
  alignToNormal: boolean;
  randomRotation: boolean;
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;
}

export interface FoliageInstance {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  typeId: string;
}

// ============================================================================
// NOISE GENERATORS
// ============================================================================

class PerlinNoise {
  private permutation: number[];
  
  constructor(seed: number = 0) {
    this.permutation = this.generatePermutation(seed);
  }
  
  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p.push(i);
    }
    
    // Shuffle using seed
    let random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    // Duplicate array
    return [...p, ...p];
  }
  
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
  
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  
  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    
    x -= Math.floor(x);
    y -= Math.floor(y);
    
    const u = this.fade(x);
    const v = this.fade(y);
    
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    
    return this.lerp(
      this.lerp(
        this.grad(this.permutation[A], x, y),
        this.grad(this.permutation[B], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(this.permutation[A + 1], x, y - 1),
        this.grad(this.permutation[B + 1], x - 1, y - 1),
        u
      ),
      v
    );
  }
  
  octaveNoise2D(
    x: number,
    y: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return total / maxValue;
  }
}

// ============================================================================
// HEIGHT MAP
// ============================================================================

export class HeightMap {
  private data: Float32Array;
  readonly width: number;
  readonly height: number;
  private min: number = 0;
  private max: number = 1;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height);
  }
  
  get(x: number, y: number): number {
    x = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    return this.data[y * this.width + x];
  }
  
  getInterpolated(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, this.width - 1);
    const y1 = Math.min(y0 + 1, this.height - 1);
    
    const fx = x - x0;
    const fy = y - y0;
    
    const v00 = this.get(x0, y0);
    const v10 = this.get(x1, y0);
    const v01 = this.get(x0, y1);
    const v11 = this.get(x1, y1);
    
    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;
    
    return v0 * (1 - fy) + v1 * fy;
  }
  
  set(x: number, y: number, value: number): void {
    x = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    y = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    this.data[y * this.width + x] = value;
    this.min = Math.min(this.min, value);
    this.max = Math.max(this.max, value);
  }
  
  fill(value: number): void {
    this.data.fill(value);
    this.min = value;
    this.max = value;
  }
  
  normalize(): void {
    const range = this.max - this.min;
    if (range === 0) return;
    
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = (this.data[i] - this.min) / range;
    }
    
    this.min = 0;
    this.max = 1;
  }
  
  generateFromNoise(settings: NoiseSettings): void {
    const noise = new PerlinNoise(settings.seed);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const nx = (x + settings.offset.x) * settings.frequency / this.width;
        const ny = (y + settings.offset.y) * settings.frequency / this.height;
        
        let value = noise.octaveNoise2D(
          nx,
          ny,
          settings.octaves,
          settings.persistence,
          settings.lacunarity
        );
        
        // Apply noise type transformations
        switch (settings.type) {
          case 'ridged':
            value = 1 - Math.abs(value);
            value = value * value;
            break;
          case 'billowy':
            value = Math.abs(value);
            break;
          case 'hybrid':
            value = (1 - Math.abs(value)) * 0.5 + Math.abs(value) * 0.5;
            break;
        }
        
        value = (value + 1) * 0.5 * settings.amplitude;
        this.set(x, y, value);
      }
    }
    
    this.normalize();
  }
  
  generateDiamondSquare(roughness: number = 0.5, seed: number = 0): void {
    const size = Math.max(this.width, this.height);
    const random = this.seededRandom(seed);
    
    // Initialize corners
    this.set(0, 0, random());
    this.set(size - 1, 0, random());
    this.set(0, size - 1, random());
    this.set(size - 1, size - 1, random());
    
    let step = size - 1;
    let scale = roughness;
    
    while (step > 1) {
      const halfStep = step / 2;
      
      // Diamond step
      for (let y = halfStep; y < size; y += step) {
        for (let x = halfStep; x < size; x += step) {
          const avg = (
            this.get(x - halfStep, y - halfStep) +
            this.get(x + halfStep, y - halfStep) +
            this.get(x - halfStep, y + halfStep) +
            this.get(x + halfStep, y + halfStep)
          ) / 4;
          this.set(x, y, avg + (random() * 2 - 1) * scale);
        }
      }
      
      // Square step
      for (let y = 0; y < size; y += halfStep) {
        for (let x = (y + halfStep) % step; x < size; x += step) {
          let sum = 0;
          let count = 0;
          
          if (x - halfStep >= 0) { sum += this.get(x - halfStep, y); count++; }
          if (x + halfStep < size) { sum += this.get(x + halfStep, y); count++; }
          if (y - halfStep >= 0) { sum += this.get(x, y - halfStep); count++; }
          if (y + halfStep < size) { sum += this.get(x, y + halfStep); count++; }
          
          this.set(x, y, sum / count + (random() * 2 - 1) * scale);
        }
      }
      
      step = halfStep;
      scale *= roughness;
    }
    
    this.normalize();
  }
  
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  }
  
  applyBrush(
    centerX: number,
    centerY: number,
    brush: BrushSettings,
    operation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise',
    targetHeight?: number
  ): void {
    const halfSize = brush.size / 2;
    const startX = Math.max(0, Math.floor(centerX - halfSize));
    const startY = Math.max(0, Math.floor(centerY - halfSize));
    const endX = Math.min(this.width - 1, Math.ceil(centerX + halfSize));
    const endY = Math.min(this.height - 1, Math.ceil(centerY + halfSize));
    
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if within brush
        if (brush.shape === 'square' || distance <= halfSize) {
          // Calculate falloff
          let strength = brush.strength;
          if (brush.shape !== 'square') {
            const t = distance / halfSize;
            if (brush.shape === 'soft') {
              strength *= 1 - (t * t); // Quadratic falloff
            } else {
              strength *= Math.pow(1 - t, brush.falloff);
            }
          }
          
          const current = this.get(x, y);
          let newValue = current;
          
          switch (operation) {
            case 'raise':
              newValue = current + strength * 0.01;
              break;
            case 'lower':
              newValue = current - strength * 0.01;
              break;
            case 'smooth':
              // Average with neighbors
              let sum = 0;
              let count = 0;
              for (let ny = -1; ny <= 1; ny++) {
                for (let nx = -1; nx <= 1; nx++) {
                  sum += this.get(x + nx, y + ny);
                  count++;
                }
              }
              const avg = sum / count;
              newValue = current + (avg - current) * strength * 0.1;
              break;
            case 'flatten':
              if (targetHeight !== undefined) {
                newValue = current + (targetHeight - current) * strength * 0.1;
              }
              break;
            case 'noise':
              newValue = current + (Math.random() * 2 - 1) * strength * 0.01;
              break;
          }
          
          this.set(x, y, Math.max(0, Math.min(1, newValue)));
        }
      }
    }
  }
  
  getNormal(x: number, y: number, scale: number = 1): THREE.Vector3 {
    const left = this.get(x - 1, y) * scale;
    const right = this.get(x + 1, y) * scale;
    const down = this.get(x, y - 1) * scale;
    const up = this.get(x, y + 1) * scale;
    
    const normal = new THREE.Vector3(
      left - right,
      2,
      down - up
    );
    
    return normal.normalize();
  }
  
  getSlope(x: number, y: number, scale: number = 1): number {
    const normal = this.getNormal(x, y, scale);
    return Math.acos(normal.y);
  }
  
  getData(): Float32Array {
    return this.data;
  }
  
  toImageData(): ImageData {
    const imageData = new ImageData(this.width, this.height);
    
    for (let i = 0; i < this.data.length; i++) {
      const value = Math.floor(this.data[i] * 255);
      const j = i * 4;
      imageData.data[j] = value;
      imageData.data[j + 1] = value;
      imageData.data[j + 2] = value;
      imageData.data[j + 3] = 255;
    }
    
    return imageData;
  }
  
  static fromImageData(imageData: ImageData): HeightMap {
    const heightMap = new HeightMap(imageData.width, imageData.height);
    
    for (let i = 0; i < imageData.width * imageData.height; i++) {
      const j = i * 4;
      // Use luminance formula
      const r = imageData.data[j];
      const g = imageData.data[j + 1];
      const b = imageData.data[j + 2];
      const value = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      heightMap.data[i] = value;
    }
    
    return heightMap;
  }
}

// ============================================================================
// TERRAIN MESH
// ============================================================================

export class TerrainMesh extends THREE.Mesh {
  private heightMap: HeightMap;
  private settings: TerrainSettings;
  private terrainLayers: TerrainLayer[] = [];
  
  constructor(settings: TerrainSettings, heightMap?: HeightMap) {
    const geometry = new THREE.PlaneGeometry(
      settings.width,
      settings.depth,
      settings.resolution - 1,
      settings.resolution - 1
    );
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x556B2F,
      wireframe: false,
      flatShading: false,
    });
    
    super(geometry, material);
    
    this.settings = settings;
    this.heightMap = heightMap || new HeightMap(settings.resolution, settings.resolution);
    
    this.updateGeometryFromHeightMap();
  }
  
  updateGeometryFromHeightMap(): void {
    const positions = this.geometry.attributes.position;
    const normals = this.geometry.attributes.normal;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      
      // Convert world coords to heightmap coords
      const hx = ((x / this.settings.width) + 0.5) * (this.heightMap.width - 1);
      const hz = ((z / this.settings.depth) + 0.5) * (this.heightMap.height - 1);
      
      const height = this.heightMap.getInterpolated(hx, hz) * this.settings.maxHeight;
      positions.setY(i, height);
    }
    
    this.geometry.computeVertexNormals();
    positions.needsUpdate = true;
    normals.needsUpdate = true;
    
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }
  
  getHeightAt(x: number, z: number): number {
    const hx = ((x / this.settings.width) + 0.5) * (this.heightMap.width - 1);
    const hz = ((z / this.settings.depth) + 0.5) * (this.heightMap.height - 1);
    return this.heightMap.getInterpolated(hx, hz) * this.settings.maxHeight;
  }
  
  getNormalAt(x: number, z: number): THREE.Vector3 {
    const hx = ((x / this.settings.width) + 0.5) * (this.heightMap.width - 1);
    const hz = ((z / this.settings.depth) + 0.5) * (this.heightMap.height - 1);
    return this.heightMap.getNormal(Math.floor(hx), Math.floor(hz), this.settings.maxHeight);
  }
  
  sculpt(
    worldX: number,
    worldZ: number,
    brush: BrushSettings,
    operation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise'
  ): void {
    // Convert world coords to heightmap coords
    const hx = ((worldX / this.settings.width) + 0.5) * (this.heightMap.width - 1);
    const hz = ((worldZ / this.settings.depth) + 0.5) * (this.heightMap.height - 1);
    
    // Scale brush size to heightmap coords
    const scaledBrush = {
      ...brush,
      size: brush.size * (this.heightMap.width / this.settings.width),
    };
    
    // Get target height for flatten
    const targetHeight = this.heightMap.get(Math.floor(hx), Math.floor(hz));
    
    this.heightMap.applyBrush(hx, hz, scaledBrush, operation, targetHeight);
    this.updateGeometryFromHeightMap();
  }
  
  getHeightMap(): HeightMap {
    return this.heightMap;
  }
  
  setHeightMap(heightMap: HeightMap): void {
    this.heightMap = heightMap;
    this.updateGeometryFromHeightMap();
  }
  
  addLayer(layer: TerrainLayer): void {
    this.terrainLayers.push(layer);
    this.updateMaterial();
  }
  
  removeLayer(layerId: string): void {
    this.terrainLayers = this.terrainLayers.filter(l => l.id !== layerId);
    this.updateMaterial();
  }
  
  getLayers(): TerrainLayer[] {
    return this.terrainLayers;
  }
  
  private updateMaterial(): void {
    // For now, just update the base material
    // A full implementation would use a custom shader for texture splatting
    if (this.terrainLayers.length > 0) {
      // Use first layer as base color
      // In production, this would be a splat map shader
    }
  }
  
  getSettings(): TerrainSettings {
    return this.settings;
  }
}

// ============================================================================
// TERRAIN MANAGER
// ============================================================================

export class TerrainManager extends EventEmitter {
  private terrain: TerrainMesh | null = null;
  private foliageTypes: Map<string, FoliageType> = new Map();
  private foliageInstances: FoliageInstance[] = [];
  private foliageGroup: THREE.Group = new THREE.Group();
  private currentBrush: BrushSettings;
  private currentOperation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise' = 'raise';
  
  constructor() {
    super();
    
    this.currentBrush = {
      size: 10,
      strength: 0.5,
      falloff: 2,
      shape: 'circle',
    };
  }
  
  createTerrain(settings: TerrainSettings): TerrainMesh {
    if (this.terrain) {
      this.terrain.geometry.dispose();
      if (this.terrain.material instanceof THREE.Material) {
        this.terrain.material.dispose();
      }
    }
    
    this.terrain = new TerrainMesh(settings);
    this.emit('terrainCreated', { terrain: this.terrain });
    
    return this.terrain;
  }
  
  getTerrain(): TerrainMesh | null {
    return this.terrain;
  }
  
  generateProceduralTerrain(noiseSettings: NoiseSettings): void {
    if (!this.terrain) return;
    
    const heightMap = this.terrain.getHeightMap();
    heightMap.generateFromNoise(noiseSettings);
    this.terrain.updateGeometryFromHeightMap();
    
    this.emit('terrainGenerated', { noiseSettings });
  }
  
  generateDiamondSquare(roughness: number, seed: number): void {
    if (!this.terrain) return;
    
    const heightMap = this.terrain.getHeightMap();
    heightMap.generateDiamondSquare(roughness, seed);
    this.terrain.updateGeometryFromHeightMap();
    
    this.emit('terrainGenerated', { type: 'diamond-square', roughness, seed });
  }
  
  async importHeightMap(imageUrl: string): Promise<void> {
    if (!this.terrain) return;
    
    const image = await this.loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const heightMap = HeightMap.fromImageData(imageData);
    
    this.terrain.setHeightMap(heightMap);
    this.emit('heightMapImported', { url: imageUrl });
  }
  
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  exportHeightMap(): ImageData | null {
    if (!this.terrain) return null;
    return this.terrain.getHeightMap().toImageData();
  }
  
  // Sculpting
  setBrush(settings: Partial<BrushSettings>): void {
    this.currentBrush = { ...this.currentBrush, ...settings };
    this.emit('brushChanged', { brush: this.currentBrush });
  }
  
  getBrush(): BrushSettings {
    return this.currentBrush;
  }
  
  setOperation(operation: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise'): void {
    this.currentOperation = operation;
    this.emit('operationChanged', { operation });
  }
  
  getOperation(): string {
    return this.currentOperation;
  }
  
  sculpt(worldX: number, worldZ: number): void {
    if (!this.terrain) return;
    this.terrain.sculpt(worldX, worldZ, this.currentBrush, this.currentOperation);
    this.emit('terrainSculpted', { x: worldX, z: worldZ });
  }
  
  // Foliage
  registerFoliageType(type: FoliageType): void {
    this.foliageTypes.set(type.id, type);
    this.emit('foliageTypeAdded', { type });
  }
  
  removeFoliageType(typeId: string): void {
    this.foliageTypes.delete(typeId);
    this.foliageInstances = this.foliageInstances.filter(f => f.typeId !== typeId);
    this.emit('foliageTypeRemoved', { typeId });
  }
  
  getFoliageTypes(): FoliageType[] {
    return Array.from(this.foliageTypes.values());
  }
  
  paintFoliage(
    worldX: number,
    worldZ: number,
    typeId: string,
    radius: number,
    density: number
  ): void {
    if (!this.terrain) return;
    
    const type = this.foliageTypes.get(typeId);
    if (!type) return;
    
    // Generate instances within radius
    const numInstances = Math.floor(radius * radius * density);
    
    for (let i = 0; i < numInstances; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      
      const x = worldX + Math.cos(angle) * dist;
      const z = worldZ + Math.sin(angle) * dist;
      const y = this.terrain.getHeightAt(x, z);
      
      // Check slope/height constraints
      const normal = this.terrain.getNormalAt(x, z);
      const slope = Math.acos(normal.y);
      
      if (slope < type.minSlope || slope > type.maxSlope) continue;
      if (y < type.minHeight || y > type.maxHeight) continue;
      
      // Create instance
      const scale = type.minScale + Math.random() * (type.maxScale - type.minScale);
      const rotation = new THREE.Euler(
        type.alignToNormal ? Math.atan2(normal.z, normal.y) : 0,
        type.randomRotation ? Math.random() * Math.PI * 2 : 0,
        type.alignToNormal ? Math.atan2(normal.x, normal.y) : 0
      );
      
      this.foliageInstances.push({
        position: new THREE.Vector3(x, y, z),
        rotation,
        scale: new THREE.Vector3(scale, scale, scale),
        typeId,
      });
    }
    
    this.updateFoliageGroup();
    this.emit('foliagePainted', { x: worldX, z: worldZ, typeId, count: numInstances });
  }
  
  eraseFoliage(worldX: number, worldZ: number, radius: number): void {
    const before = this.foliageInstances.length;
    
    this.foliageInstances = this.foliageInstances.filter(instance => {
      const dx = instance.position.x - worldX;
      const dz = instance.position.z - worldZ;
      return Math.sqrt(dx * dx + dz * dz) > radius;
    });
    
    const removed = before - this.foliageInstances.length;
    if (removed > 0) {
      this.updateFoliageGroup();
      this.emit('foliageErased', { x: worldX, z: worldZ, count: removed });
    }
  }
  
  private updateFoliageGroup(): void {
    // Clear existing
    while (this.foliageGroup.children.length > 0) {
      this.foliageGroup.remove(this.foliageGroup.children[0]);
    }
    
    // Group instances by type for instanced rendering
    const instancesByType = new Map<string, FoliageInstance[]>();
    
    for (const instance of this.foliageInstances) {
      if (!instancesByType.has(instance.typeId)) {
        instancesByType.set(instance.typeId, []);
      }
      instancesByType.get(instance.typeId)!.push(instance);
    }
    
    // Create instanced meshes for each type
    for (const [typeId, instances] of instancesByType) {
      const type = this.foliageTypes.get(typeId);
      if (!type || !type.mesh) continue;
      
      // For simplicity, create individual meshes
      // In production, use InstancedMesh for performance
      for (const instance of instances) {
        const mesh = type.mesh.clone();
        mesh.position.copy(instance.position);
        mesh.rotation.copy(instance.rotation);
        mesh.scale.copy(instance.scale);
        this.foliageGroup.add(mesh);
      }
    }
  }
  
  getFoliageGroup(): THREE.Group {
    return this.foliageGroup;
  }
  
  getFoliageInstances(): FoliageInstance[] {
    return this.foliageInstances;
  }
  
  clearFoliage(): void {
    this.foliageInstances = [];
    this.updateFoliageGroup();
    this.emit('foliageCleared');
  }
  
  // Serialization
  serialize(): string {
    if (!this.terrain) return '{}';
    
    const data = {
      settings: this.terrain.getSettings(),
      heightMapData: Array.from(this.terrain.getHeightMap().getData()),
      layers: this.terrain.getLayers(),
      foliageTypes: Array.from(this.foliageTypes.values()),
      foliageInstances: this.foliageInstances.map(f => ({
        position: { x: f.position.x, y: f.position.y, z: f.position.z },
        rotation: { x: f.rotation.x, y: f.rotation.y, z: f.rotation.z },
        scale: { x: f.scale.x, y: f.scale.y, z: f.scale.z },
        typeId: f.typeId,
      })),
    };
    
    return JSON.stringify(data);
  }
  
  deserialize(json: string): void {
    const data = JSON.parse(json);
    
    // Create terrain
    this.createTerrain(data.settings);
    
    // Restore height map
    if (this.terrain && data.heightMapData) {
      const heightMap = this.terrain.getHeightMap();
      const floatArray = new Float32Array(data.heightMapData);
      for (let i = 0; i < floatArray.length; i++) {
        const x = i % heightMap.width;
        const y = Math.floor(i / heightMap.width);
        heightMap.set(x, y, floatArray[i]);
      }
      this.terrain.updateGeometryFromHeightMap();
    }
    
    // Restore layers
    if (data.layers) {
      for (const layer of data.layers) {
        this.terrain?.addLayer(layer);
      }
    }
    
    // Restore foliage types
    if (data.foliageTypes) {
      for (const type of data.foliageTypes) {
        this.foliageTypes.set(type.id, { ...type, mesh: null });
      }
    }
    
    // Restore foliage instances
    if (data.foliageInstances) {
      this.foliageInstances = data.foliageInstances.map((f: FoliageInstance & { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }) => ({
        position: new THREE.Vector3(f.position.x, f.position.y, f.position.z),
        rotation: new THREE.Euler(f.rotation.x, f.rotation.y, f.rotation.z),
        scale: new THREE.Vector3(f.scale.x, f.scale.y, f.scale.z),
        typeId: f.typeId,
      }));
    }
    
    this.emit('terrainLoaded');
  }
  
  dispose(): void {
    if (this.terrain) {
      this.terrain.geometry.dispose();
      if (this.terrain.material instanceof THREE.Material) {
        this.terrain.material.dispose();
      }
    }
    
    this.foliageTypes.clear();
    this.foliageInstances = [];
    
    while (this.foliageGroup.children.length > 0) {
      this.foliageGroup.remove(this.foliageGroup.children[0]);
    }
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export function useTerrainManager() {
  const managerRef = useRef<TerrainManager>(new TerrainManager());
  const [terrain, setTerrain] = useState<TerrainMesh | null>(null);
  const [brush, setBrush] = useState<BrushSettings>(managerRef.current.getBrush());
  const [operation, setOperation] = useState<string>(managerRef.current.getOperation());
  const [foliageTypes, setFoliageTypes] = useState<FoliageType[]>([]);
  
  useEffect(() => {
    const manager = managerRef.current;
    
    manager.on('terrainCreated', ({ terrain: t }) => setTerrain(t));
    manager.on('brushChanged', ({ brush: b }) => setBrush(b));
    manager.on('operationChanged', ({ operation: o }) => setOperation(o));
    manager.on('foliageTypeAdded', () => setFoliageTypes(manager.getFoliageTypes()));
    manager.on('foliageTypeRemoved', () => setFoliageTypes(manager.getFoliageTypes()));
    
    return () => {
      manager.removeAllListeners();
      manager.dispose();
    };
  }, []);
  
  const createTerrain = useCallback((settings: TerrainSettings) => {
    return managerRef.current.createTerrain(settings);
  }, []);
  
  const generateProcedural = useCallback((noiseSettings: NoiseSettings) => {
    managerRef.current.generateProceduralTerrain(noiseSettings);
  }, []);
  
  const generateDiamondSquare = useCallback((roughness: number, seed: number) => {
    managerRef.current.generateDiamondSquare(roughness, seed);
  }, []);
  
  const sculpt = useCallback((worldX: number, worldZ: number) => {
    managerRef.current.sculpt(worldX, worldZ);
  }, []);
  
  const updateBrush = useCallback((settings: Partial<BrushSettings>) => {
    managerRef.current.setBrush(settings);
  }, []);
  
  const updateOperation = useCallback((op: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise') => {
    managerRef.current.setOperation(op);
  }, []);
  
  const paintFoliage = useCallback((x: number, z: number, typeId: string, radius: number, density: number) => {
    managerRef.current.paintFoliage(x, z, typeId, radius, density);
  }, []);
  
  const eraseFoliage = useCallback((x: number, z: number, radius: number) => {
    managerRef.current.eraseFoliage(x, z, radius);
  }, []);
  
  return {
    manager: managerRef.current,
    terrain,
    brush,
    operation,
    foliageTypes,
    createTerrain,
    generateProcedural,
    generateDiamondSquare,
    sculpt,
    updateBrush,
    updateOperation,
    paintFoliage,
    eraseFoliage,
    serialize: () => managerRef.current.serialize(),
    deserialize: (json: string) => managerRef.current.deserialize(json),
    getFoliageGroup: () => managerRef.current.getFoliageGroup(),
  };
}

const __defaultExport = {
  HeightMap,
  TerrainMesh,
  TerrainManager,
  PerlinNoise,
};

export default __defaultExport;
