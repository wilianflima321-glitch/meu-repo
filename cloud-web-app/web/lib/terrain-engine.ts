/**
 * Terrain Engine - Sistema de Terrenos
 * 
 * Sistema profissional de terrenos:
 * - Heightmap generation (procedural & loaded)
 * - Multi-layer texture splatting
 * - LOD with geomorphing
 * - Chunked streaming
 * - Procedural generation (Perlin, Simplex, FBM)
 * - Terrain sculpting tools
 * - Vegetation placement
 * - Erosion simulation
 * - Real-time editing
 */

import * as THREE from 'three';
import { HeightmapGenerator, SimplexNoise } from './terrain-engine-noise';
import type { SculptBrush, TerrainChunk, TerrainConfig, TerrainLayer } from './terrain-engine.types';

export type { SculptBrush, TerrainChunk, TerrainConfig, TerrainLayer } from './terrain-engine.types';
export { HeightmapGenerator, SimplexNoise } from './terrain-engine-noise';

// ============================================================================
// TERRAIN MATERIAL (SPLAT MAP)
// ============================================================================

export class TerrainMaterial extends THREE.ShaderMaterial {
  constructor(layers: TerrainLayer[]) {
    const uniforms: Record<string, THREE.IUniform> = {
      uHeightScale: { value: 100 },
    };
    
    // Add layer uniforms
    for (let i = 0; i < Math.min(layers.length, 4); i++) {
      const layer = layers[i];
      uniforms[`uLayer${i}Diffuse`] = { value: layer.diffuseMap };
      uniforms[`uLayer${i}Normal`] = { value: layer.normalMap };
      uniforms[`uLayer${i}Tiling`] = { value: layer.tiling };
      uniforms[`uLayer${i}HeightRange`] = { value: new THREE.Vector2(layer.minHeight, layer.maxHeight) };
      uniforms[`uLayer${i}SlopeRange`] = { value: new THREE.Vector2(layer.minSlope, layer.maxSlope) };
    }
    
    super({
      uniforms,
      vertexShader: TERRAIN_VERTEX_SHADER,
      fragmentShader: generateTerrainFragmentShader(layers.length),
      lights: true,
    });

    (this.extensions as unknown as { derivatives?: boolean }).derivatives = true;
  }
  
  setHeightScale(scale: number): void {
    this.uniforms.uHeightScale.value = scale;
  }
}

const TERRAIN_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vHeight;
  varying float vSlope;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vHeight = position.y;
    
    // Calculate slope from normal (1 = flat, 0 = vertical)
    vSlope = dot(vNormal, vec3(0.0, 1.0, 0.0));
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

function generateTerrainFragmentShader(layerCount: number): string {
  let layerUniforms = '';
  let layerSampling = '';
  
  for (let i = 0; i < Math.min(layerCount, 4); i++) {
    layerUniforms += `
      uniform sampler2D uLayer${i}Diffuse;
      uniform sampler2D uLayer${i}Normal;
      uniform vec2 uLayer${i}Tiling;
      uniform vec2 uLayer${i}HeightRange;
      uniform vec2 uLayer${i}SlopeRange;
    `;
    
    layerSampling += `
      {
        vec2 tiledUv = vUv * uLayer${i}Tiling;
        vec4 layerColor = texture2D(uLayer${i}Diffuse, tiledUv);
        
        // Height blend
        float heightBlend = smoothstep(uLayer${i}HeightRange.x, uLayer${i}HeightRange.y, normalizedHeight);
        
        // Slope blend
        float slopeBlend = smoothstep(uLayer${i}SlopeRange.x, uLayer${i}SlopeRange.y, vSlope);
        
        float blend = heightBlend * slopeBlend;
        finalColor = mix(finalColor, layerColor.rgb, blend);
        totalBlend += blend;
      }
    `;
  }
  
  return `
    uniform float uHeightScale;
    
    ${layerUniforms}
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vHeight;
    varying float vSlope;
    
    void main() {
      float normalizedHeight = vHeight / uHeightScale;
      
      vec3 finalColor = vec3(0.3, 0.3, 0.3); // Base color
      float totalBlend = 0.0;
      
      ${layerSampling}
      
      // Basic lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
      float diff = max(dot(vNormal, lightDir), 0.0);
      vec3 ambient = vec3(0.3);
      
      vec3 color = finalColor * (ambient + diff * vec3(0.7));
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;
}

// ============================================================================
// TERRAIN CHUNK
// ============================================================================

export class TerrainChunkMesh {
  readonly chunk: TerrainChunk;
  private geometries: THREE.BufferGeometry[] = [];
  private currentLOD: number = 0;
  
  constructor(
    x: number,
    z: number,
    heightData: Float32Array,
    config: TerrainConfig,
    material: THREE.Material
  ) {
    const chunkId = `chunk_${x}_${z}`;
    
    // Generate LOD geometries
    for (let lod = 0; lod < config.lodLevels; lod++) {
      const resolution = Math.max(2, Math.floor(config.resolution / Math.pow(2, lod)));
      const geometry = this.createGeometry(heightData, config, resolution);
      this.geometries.push(geometry);
    }
    
    const mesh = new THREE.Mesh(this.geometries[0], material);
    mesh.position.set(
      x * config.chunkSize,
      0,
      z * config.chunkSize
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Compute bounds
    this.geometries[0].computeBoundingBox();
    const bounds = this.geometries[0].boundingBox!.clone();
    bounds.translate(mesh.position);
    
    this.chunk = {
      id: chunkId,
      x,
      z,
      mesh,
      lodLevel: 0,
      heightData,
      bounds,
      loaded: true,
    };
  }
  
  private createGeometry(
    heightData: Float32Array,
    config: TerrainConfig,
    resolution: number
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    const heightWidth = Math.sqrt(heightData.length);
    const step = config.chunkSize / resolution;
    const uvStep = 1 / resolution;
    
    // Generate vertices
    for (let z = 0; z <= resolution; z++) {
      for (let x = 0; x <= resolution; x++) {
        const worldX = x * step;
        const worldZ = z * step;
        
        // Sample height
        const hx = Math.floor((x / resolution) * (heightWidth - 1));
        const hz = Math.floor((z / resolution) * (heightWidth - 1));
        const height = heightData[hz * heightWidth + hx] * config.heightScale;
        
        vertices.push(worldX, height, worldZ);
        uvs.push(x * uvStep, z * uvStep);
      }
    }
    
    // Generate indices
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const a = z * (resolution + 1) + x;
        const b = a + 1;
        const c = a + (resolution + 1);
        const d = c + 1;
        
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
    
    // Calculate normals
    const posArray = new Float32Array(vertices);
    const normalArray = new Float32Array(vertices.length);
    
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3;
      const ib = indices[i + 1] * 3;
      const ic = indices[i + 2] * 3;
      
      const v0 = new THREE.Vector3(posArray[ia], posArray[ia + 1], posArray[ia + 2]);
      const v1 = new THREE.Vector3(posArray[ib], posArray[ib + 1], posArray[ib + 2]);
      const v2 = new THREE.Vector3(posArray[ic], posArray[ic + 1], posArray[ic + 2]);
      
      const edge1 = v1.clone().sub(v0);
      const edge2 = v2.clone().sub(v0);
      const normal = edge1.cross(edge2).normalize();
      
      for (const idx of [ia, ib, ic]) {
        normalArray[idx] += normal.x;
        normalArray[idx + 1] += normal.y;
        normalArray[idx + 2] += normal.z;
      }
    }
    
    // Normalize normals
    for (let i = 0; i < normalArray.length; i += 3) {
      const len = Math.sqrt(
        normalArray[i] ** 2 +
        normalArray[i + 1] ** 2 +
        normalArray[i + 2] ** 2
      );
      if (len > 0) {
        normalArray[i] /= len;
        normalArray[i + 1] /= len;
        normalArray[i + 2] /= len;
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geometry.setIndex(indices);
    
    return geometry;
  }
  
  setLOD(level: number): void {
    if (level >= 0 && level < this.geometries.length && level !== this.currentLOD) {
      this.chunk.mesh.geometry = this.geometries[level];
      this.currentLOD = level;
      this.chunk.lodLevel = level;
    }
  }
  
  dispose(): void {
    for (const geometry of this.geometries) {
      geometry.dispose();
    }
    this.geometries = [];
  }
}

// ============================================================================
// TERRAIN SCULPT BRUSH
// ============================================================================

export class TerrainSculptor {
  private terrain: TerrainEngine;
  private brush: SculptBrush;
  private isActive: boolean = false;
  
  constructor(terrain: TerrainEngine) {
    this.terrain = terrain;
    this.brush = {
      type: 'raise',
      size: 10,
      strength: 0.5,
      falloff: 'smooth',
    };
  }
  
  setBrush(brush: Partial<SculptBrush>): void {
    Object.assign(this.brush, brush);
  }
  
  getBrush(): SculptBrush {
    return { ...this.brush };
  }
  
  startSculpting(): void {
    this.isActive = true;
  }
  
  stopSculpting(): void {
    this.isActive = false;
  }
  
  sculpt(position: THREE.Vector3, deltaTime: number): void {
    if (!this.isActive) return;
    
    const config = this.terrain.getConfig();
    const chunks = this.terrain.getChunksNearPosition(position, this.brush.size * 2);
    
    for (const chunk of chunks) {
      this.sculptChunk(chunk, position, deltaTime);
    }
    
    // Update affected chunks
    this.terrain.updateChunks(chunks.map(c => c.id));
  }
  
  private sculptChunk(chunk: TerrainChunk, center: THREE.Vector3, deltaTime: number): void {
    const config = this.terrain.getConfig();
    const heightWidth = Math.sqrt(chunk.heightData.length);
    const cellSize = config.chunkSize / heightWidth;
    
    const chunkWorldX = chunk.x * config.chunkSize;
    const chunkWorldZ = chunk.z * config.chunkSize;
    
    // Find affected vertices
    const minX = Math.max(0, Math.floor((center.x - this.brush.size - chunkWorldX) / cellSize));
    const maxX = Math.min(heightWidth - 1, Math.ceil((center.x + this.brush.size - chunkWorldX) / cellSize));
    const minZ = Math.max(0, Math.floor((center.z - this.brush.size - chunkWorldZ) / cellSize));
    const maxZ = Math.min(heightWidth - 1, Math.ceil((center.z + this.brush.size - chunkWorldZ) / cellSize));
    
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const worldX = chunkWorldX + x * cellSize;
        const worldZ = chunkWorldZ + z * cellSize;
        
        const dx = worldX - center.x;
        const dz = worldZ - center.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance <= this.brush.size) {
          const falloff = this.calculateFalloff(distance / this.brush.size);
          const strength = this.brush.strength * falloff * deltaTime;
          
          const idx = z * heightWidth + x;
          
          switch (this.brush.type) {
            case 'raise':
              chunk.heightData[idx] += strength;
              break;
            case 'lower':
              chunk.heightData[idx] -= strength;
              break;
            case 'smooth':
              chunk.heightData[idx] = this.smoothVertex(chunk.heightData, idx, heightWidth, strength);
              break;
            case 'flatten':
              const targetHeight = center.y / config.heightScale;
              chunk.heightData[idx] = THREE.MathUtils.lerp(
                chunk.heightData[idx],
                targetHeight,
                strength
              );
              break;
            case 'noise':
              chunk.heightData[idx] += (Math.random() - 0.5) * strength;
              break;
          }
          
          // Clamp height
          chunk.heightData[idx] = Math.max(0, Math.min(1, chunk.heightData[idx]));
        }
      }
    }
  }
  
  private calculateFalloff(t: number): number {
    switch (this.brush.falloff) {
      case 'linear':
        return 1 - t;
      case 'smooth':
        return 1 - (3 * t * t - 2 * t * t * t);
      case 'sharp':
        return Math.pow(1 - t, 2);
      default:
        return 1 - t;
    }
  }
  
  private smoothVertex(
    data: Float32Array,
    idx: number,
    width: number,
    strength: number
  ): number {
    const x = idx % width;
    const z = Math.floor(idx / width);
    
    let sum = 0;
    let count = 0;
    
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx >= 0 && nx < width && nz >= 0 && nz < width) {
          sum += data[nz * width + nx];
          count++;
        }
      }
    }
    
    const average = sum / count;
    return THREE.MathUtils.lerp(data[idx], average, strength);
  }
}

// ============================================================================
// TERRAIN ENGINE
// ============================================================================

export class TerrainEngine {
  private scene: THREE.Scene;
  private config: TerrainConfig;
  private heightGenerator: HeightmapGenerator;
  private chunks: Map<string, TerrainChunkMesh> = new Map();
  private material: THREE.Material;
  private sculptor: TerrainSculptor;
  
  constructor(scene: THREE.Scene, config: Partial<TerrainConfig> = {}) {
    this.scene = scene;
    
    this.config = {
      width: 1000,
      depth: 1000,
      heightScale: 100,
      resolution: 64,
      chunkSize: 100,
      lodLevels: 4,
      lodDistances: [100, 200, 400, 800],
      ...config,
    };
    
    this.heightGenerator = new HeightmapGenerator();
    this.sculptor = new TerrainSculptor(this);
    
    // Default material
    this.material = new THREE.MeshStandardMaterial({
      color: 0x4a7c4a,
      roughness: 0.8,
      metalness: 0.1,
    });
  }
  
  generate(seed?: number): void {
    if (seed !== undefined) {
      this.heightGenerator = new HeightmapGenerator(seed);
    }
    
    const chunksX = Math.ceil(this.config.width / this.config.chunkSize);
    const chunksZ = Math.ceil(this.config.depth / this.config.chunkSize);
    const heightPerChunk = this.config.resolution + 1;
    
    for (let z = 0; z < chunksZ; z++) {
      for (let x = 0; x < chunksX; x++) {
        // Generate heightmap for this chunk
        const heightData = this.heightGenerator.generate(
          heightPerChunk,
          heightPerChunk,
          {
            scale: 50,
            octaves: 6,
            offset: new THREE.Vector2(
              x * this.config.resolution,
              z * this.config.resolution
            ),
          }
        );
        
        const chunkMesh = new TerrainChunkMesh(x, z, heightData, this.config, this.material);
        this.chunks.set(chunkMesh.chunk.id, chunkMesh);
        this.scene.add(chunkMesh.chunk.mesh);
      }
    }
  }
  
  setMaterial(material: THREE.Material): void {
    this.material = material;
    for (const chunkMesh of this.chunks.values()) {
      chunkMesh.chunk.mesh.material = material;
    }
  }
  
  updateLODs(cameraPosition: THREE.Vector3): void {
    for (const chunkMesh of this.chunks.values()) {
      const center = new THREE.Vector3();
      chunkMesh.chunk.bounds.getCenter(center);
      
      const distance = center.distanceTo(cameraPosition);
      
      let lod = 0;
      for (let i = this.config.lodDistances.length - 1; i >= 0; i--) {
        if (distance >= this.config.lodDistances[i]) {
          lod = i + 1;
          break;
        }
      }
      
      lod = Math.min(lod, this.config.lodLevels - 1);
      chunkMesh.setLOD(lod);
    }
  }
  
  getHeightAt(x: number, z: number): number {
    // Find chunk
    const chunkX = Math.floor(x / this.config.chunkSize);
    const chunkZ = Math.floor(z / this.config.chunkSize);
    const chunkId = `chunk_${chunkX}_${chunkZ}`;
    
    const chunkMesh = this.chunks.get(chunkId);
    if (!chunkMesh) return 0;
    
    const heightWidth = Math.sqrt(chunkMesh.chunk.heightData.length);
    const localX = (x - chunkX * this.config.chunkSize) / this.config.chunkSize;
    const localZ = (z - chunkZ * this.config.chunkSize) / this.config.chunkSize;
    
    const hx = Math.floor(localX * (heightWidth - 1));
    const hz = Math.floor(localZ * (heightWidth - 1));
    
    const idx = hz * heightWidth + hx;
    if (idx >= 0 && idx < chunkMesh.chunk.heightData.length) {
      return chunkMesh.chunk.heightData[idx] * this.config.heightScale;
    }
    
    return 0;
  }
  
  getSculptor(): TerrainSculptor {
    return this.sculptor;
  }
  
  getConfig(): TerrainConfig {
    return { ...this.config };
  }
  
  getChunksNearPosition(position: THREE.Vector3, radius: number): TerrainChunk[] {
    const results: TerrainChunk[] = [];
    
    for (const chunkMesh of this.chunks.values()) {
      const center = new THREE.Vector3();
      chunkMesh.chunk.bounds.getCenter(center);
      
      if (center.distanceTo(position) <= radius + this.config.chunkSize) {
        results.push(chunkMesh.chunk);
      }
    }
    
    return results;
  }
  
  updateChunks(chunkIds: string[]): void {
    for (const id of chunkIds) {
      const chunkMesh = this.chunks.get(id);
      if (chunkMesh) {
        // Regenerate geometry with updated height data
        const oldMesh = chunkMesh.chunk.mesh;
        const newChunkMesh = new TerrainChunkMesh(
          chunkMesh.chunk.x,
          chunkMesh.chunk.z,
          chunkMesh.chunk.heightData,
          this.config,
          this.material
        );
        
        this.scene.remove(oldMesh);
        this.scene.add(newChunkMesh.chunk.mesh);
        this.chunks.set(id, newChunkMesh);
        
        chunkMesh.dispose();
      }
    }
  }
  
  dispose(): void {
    for (const chunkMesh of this.chunks.values()) {
      this.scene.remove(chunkMesh.chunk.mesh);
      chunkMesh.dispose();
    }
    this.chunks.clear();
    
    if (this.material) {
      this.material.dispose();
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

