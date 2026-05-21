/**
 * Terrain Engine - split runtime modules.
 *
 * Procedural terrain generation, chunk meshes, materials, and sculpting stay
 * behind Studio/runtime boundaries instead of public route imports.
 */

// @aethel-heavy-async-boundary Studio/terrain mesh runtime; do not import from public route shells.
import * as THREE from 'three';
import type { TerrainChunk, TerrainConfig } from './types';

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
