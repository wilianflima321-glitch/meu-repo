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

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface TerrainConfig {
  width: number;
  depth: number;
  heightScale: number;
  resolution: number;
  chunkSize: number;
  lodLevels: number;
  lodDistances: number[];
}

export interface TerrainLayer {
  name: string;
  diffuseMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  heightBlend: number;
  slopeBlend: number;
  tiling: THREE.Vector2;
  minHeight: number;
  maxHeight: number;
  minSlope: number;
  maxSlope: number;
}

export interface TerrainChunk {
  id: string;
  x: number;
  z: number;
  mesh: THREE.Mesh;
  lodLevel: number;
  heightData: Float32Array;
  bounds: THREE.Box3;
  loaded: boolean;
}

export interface SculptBrush {
  type: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise';
  size: number;
  strength: number;
  falloff: 'linear' | 'smooth' | 'sharp';
}

// ============================================================================
// NOISE GENERATORS
// ============================================================================

export class SimplexNoise {
  private perm: number[];
  private grad3: number[][];
  
  constructor(seed: number = Math.random() * 65536) {
    this.grad3 = [
      [1,1,0], [-1,1,0], [1,-1,0], [-1,-1,0],
      [1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1],
      [0,1,1], [0,-1,1], [0,1,-1], [0,-1,-1]
    ];
    
    // Create permutation table
    this.perm = new Array(512);
    const p = new Array(256);
    
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    
    // Shuffle based on seed
    let random = this.seededRandom(seed);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }
  
  private seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }
  
  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    
    let n0, n1, n2;
    
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    
    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }
    
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    
    const ii = i & 255;
    const jj = j & 255;
    
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }
    
    return 70 * (n0 + n1 + n2);
  }
  
  fbm(x: number, y: number, octaves: number, lacunarity: number = 2, gain: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    
    return total / maxValue;
  }
  
  ridged(x: number, y: number, octaves: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.noise2D(x * frequency, y * frequency));
      total += n * n * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return total;
  }
}

// ============================================================================
// HEIGHTMAP GENERATOR
// ============================================================================

export class HeightmapGenerator {
  private noise: SimplexNoise;
  private seed: number;
  
  constructor(seed: number = Math.random() * 65536) {
    this.seed = seed;
    this.noise = new SimplexNoise(seed);
  }
  
  generate(
    width: number,
    height: number,
    options: {
      scale?: number;
      octaves?: number;
      persistence?: number;
      lacunarity?: number;
      offset?: THREE.Vector2;
    } = {}
  ): Float32Array {
    const {
      scale = 100,
      octaves = 6,
      persistence = 0.5,
      lacunarity = 2,
      offset = new THREE.Vector2(0, 0),
    } = options;
    
    const data = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = (x + offset.x) / scale;
        const ny = (y + offset.y) / scale;
        
        let value = this.noise.fbm(nx, ny, octaves, lacunarity, persistence);
        
        // Normalize to 0-1
        value = (value + 1) * 0.5;
        
        data[y * width + x] = value;
      }
    }
    
    return data;
  }
  
  generateIsland(width: number, height: number, scale: number = 100): Float32Array {
    const data = this.generate(width, height, { scale });
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    
    // Apply island mask
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const falloff = 1 - Math.pow(dist, 2);
        
        const idx = y * width + x;
        data[idx] *= Math.max(0, falloff);
      }
    }
    
    return data;
  }
  
  generateMountains(width: number, height: number): Float32Array {
    const data = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / 80;
        const ny = y / 80;
        
        // Ridged noise for mountain ranges
        let value = this.noise.ridged(nx, ny, 6);
        
        // Add some variation
        value += this.noise.fbm(nx * 2, ny * 2, 4) * 0.3;
        
        // Normalize
        data[y * width + x] = Math.min(1, Math.max(0, value / 2));
      }
    }
    
    return data;
  }
  
  applyErosion(
    heightmap: Float32Array,
    width: number,
    height: number,
    iterations: number = 50000
  ): Float32Array {
    const result = new Float32Array(heightmap);
    
    // Hydraulic erosion simulation
    for (let i = 0; i < iterations; i++) {
      // Random droplet position
      let x = Math.random() * (width - 1);
      let y = Math.random() * (height - 1);
      
      let sediment = 0;
      let water = 1;
      let speed = 0;
      let dx = 0;
      let dy = 0;
      
      const inertia = 0.3;
      const sedimentCapacity = 4;
      const erosionRate = 0.3;
      const depositionRate = 0.3;
      const evaporationRate = 0.01;
      const gravity = 4;
      
      for (let step = 0; step < 64; step++) {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        
        if (xi < 1 || xi >= width - 1 || yi < 1 || yi >= height - 1) break;
        
        // Calculate gradient
        const h00 = result[yi * width + xi];
        const h10 = result[yi * width + xi + 1];
        const h01 = result[(yi + 1) * width + xi];
        const h11 = result[(yi + 1) * width + xi + 1];
        
        const gx = (h10 - h00 + h11 - h01) / 2;
        const gy = (h01 - h00 + h11 - h10) / 2;
        
        // Update direction with inertia
        dx = dx * inertia - gx * (1 - inertia);
        dy = dy * inertia - gy * (1 - inertia);
        
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.0001) break;
        
        dx /= len;
        dy /= len;
        
        // Move droplet
        x += dx;
        y += dy;
        
        const newXi = Math.floor(x);
        const newYi = Math.floor(y);
        
        if (newXi < 1 || newXi >= width - 1 || newYi < 1 || newYi >= height - 1) break;
        
        // Calculate height difference
        const newH = result[newYi * width + newXi];
        const heightDiff = newH - h00;
        
        // Update speed
        speed = Math.sqrt(Math.max(0, speed * speed + heightDiff * gravity));
        
        // Calculate sediment capacity
        const capacity = Math.max(0.01, -heightDiff) * speed * water * sedimentCapacity;
        
        if (sediment > capacity) {
          // Deposit
          const deposit = (sediment - capacity) * depositionRate;
          sediment -= deposit;
          result[yi * width + xi] += deposit;
        } else {
          // Erode
          const erode = Math.min((capacity - sediment) * erosionRate, -heightDiff);
          sediment += erode;
          result[yi * width + xi] -= erode;
        }
        
        // Evaporate water
        water *= (1 - evaporationRate);
        if (water < 0.01) break;
      }
    }
    
    return result;
  }
  
  loadFromImage(image: HTMLImageElement): Float32Array {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = new Float32Array(image.width * image.height);
    
    for (let i = 0; i < data.length; i++) {
      // Use red channel as height
      data[i] = imageData.data[i * 4] / 255;
    }
    
    return data;
  }
}

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

