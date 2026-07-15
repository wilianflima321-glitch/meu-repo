/**
 * Terrain Engine - split runtime modules.
 *
 * Procedural terrain generation, chunk meshes, materials, and sculpting stay
 * behind Studio/runtime boundaries instead of public route imports.
 */

// @aethel-heavy-async-boundary Studio/terrain engine runtime; do not import from public route shells.
import * as THREE from 'three';
import { HeightmapGenerator } from './heightmap';
import { TerrainChunkMesh } from './chunk-mesh';
import { TerrainSculptor } from './sculptor';
import type { TerrainChunk, TerrainConfig } from './types';

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

  /**
   * Onda A.1 — hydrate TerrainEngine from a durable heightfield document
   * (normalized 0..1 heights × maxHeight). Replaces procedural noise chunks.
   */
  loadFromHeightfield(input: {
    heights: Float32Array;
    resolution: number;
    widthMeters: number;
    depthMeters: number;
    maxHeight: number;
  }): void {
    this.dispose();
    this.config = {
      ...this.config,
      width: input.widthMeters,
      depth: input.depthMeters,
      heightScale: input.maxHeight,
      resolution: Math.max(2, input.resolution - 1),
      chunkSize: Math.max(input.widthMeters, input.depthMeters),
      lodLevels: 1,
      lodDistances: [1e9],
    };
    this.material = new THREE.MeshStandardMaterial({
      color: 0x4a7c4a,
      roughness: 0.8,
      metalness: 0.1,
    });
    const chunkMesh = new TerrainChunkMesh(0, 0, input.heights, this.config, this.material);
    // Center chunk at origin (TerrainChunkMesh places at 0,0 in chunk space)
    chunkMesh.chunk.mesh.position.set(-input.widthMeters / 2, 0, -input.depthMeters / 2);
    this.chunks.set(chunkMesh.chunk.id, chunkMesh);
    this.scene.add(chunkMesh.chunk.mesh);
  }
}
