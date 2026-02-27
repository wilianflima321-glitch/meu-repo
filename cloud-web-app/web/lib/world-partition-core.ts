/**
 * World Partition core runtime classes.
 */

import * as THREE from 'three';
import type { LODLevel, WorldBounds } from './world-partition-types';

export class SpatialHashGrid {
  private cellSize: THREE.Vector3;
  private cells: Map<string, Set<string>> = new Map();
  private entityPositions: Map<string, THREE.Vector3> = new Map();
  
  constructor(cellSize: THREE.Vector3) {
    this.cellSize = cellSize.clone();
  }
  
  private getCellKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }
  
  private worldToCell(position: THREE.Vector3): { x: number; y: number; z: number } {
    return {
      x: Math.floor(position.x / this.cellSize.x),
      y: Math.floor(position.y / this.cellSize.y),
      z: Math.floor(position.z / this.cellSize.z),
    };
  }
  
  insert(entityId: string, position: THREE.Vector3): void {
    // Remove from old cell if exists
    this.remove(entityId);
    
    // Add to new cell
    const cell = this.worldToCell(position);
    const key = this.getCellKey(cell.x, cell.y, cell.z);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key)!.add(entityId);
    this.entityPositions.set(entityId, position.clone());
  }
  
  remove(entityId: string): void {
    const oldPos = this.entityPositions.get(entityId);
    if (oldPos) {
      const cell = this.worldToCell(oldPos);
      const key = this.getCellKey(cell.x, cell.y, cell.z);
      const entities = this.cells.get(key);
      if (entities) {
        entities.delete(entityId);
        if (entities.size === 0) {
          this.cells.delete(key);
        }
      }
      this.entityPositions.delete(entityId);
    }
  }
  
  update(entityId: string, newPosition: THREE.Vector3): void {
    const oldPos = this.entityPositions.get(entityId);
    if (!oldPos) {
      this.insert(entityId, newPosition);
      return;
    }
    
    const oldCell = this.worldToCell(oldPos);
    const newCell = this.worldToCell(newPosition);
    
    // Only update if cell changed
    if (oldCell.x !== newCell.x || oldCell.y !== newCell.y || oldCell.z !== newCell.z) {
      this.remove(entityId);
      this.insert(entityId, newPosition);
    } else {
      this.entityPositions.set(entityId, newPosition.clone());
    }
  }
  
  queryRadius(center: THREE.Vector3, radius: number): string[] {
    const results: string[] = [];
    const radiusSq = radius * radius;
    
    const minCell = this.worldToCell(
      new THREE.Vector3(center.x - radius, center.y - radius, center.z - radius)
    );
    const maxCell = this.worldToCell(
      new THREE.Vector3(center.x + radius, center.y + radius, center.z + radius)
    );
    
    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let y = minCell.y; y <= maxCell.y; y++) {
        for (let z = minCell.z; z <= maxCell.z; z++) {
          const key = this.getCellKey(x, y, z);
          const entities = this.cells.get(key);
          
          if (entities) {
            for (const entityId of entities) {
              const pos = this.entityPositions.get(entityId);
              if (pos && pos.distanceToSquared(center) <= radiusSq) {
                results.push(entityId);
              }
            }
          }
        }
      }
    }
    
    return results;
  }
  
  queryBox(bounds: WorldBounds): string[] {
    const results: string[] = [];
    
    const minCell = this.worldToCell(bounds.min);
    const maxCell = this.worldToCell(bounds.max);
    
    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let y = minCell.y; y <= maxCell.y; y++) {
        for (let z = minCell.z; z <= maxCell.z; z++) {
          const key = this.getCellKey(x, y, z);
          const entities = this.cells.get(key);
          
          if (entities) {
            for (const entityId of entities) {
              const pos = this.entityPositions.get(entityId);
              if (pos && this.isInBounds(pos, bounds)) {
                results.push(entityId);
              }
            }
          }
        }
      }
    }
    
    return results;
  }
  
  private isInBounds(pos: THREE.Vector3, bounds: WorldBounds): boolean {
    return pos.x >= bounds.min.x && pos.x <= bounds.max.x &&
           pos.y >= bounds.min.y && pos.y <= bounds.max.y &&
           pos.z >= bounds.min.z && pos.z <= bounds.max.z;
  }
  
  getEntitiesInCell(x: number, y: number, z: number): string[] {
    const key = this.getCellKey(x, y, z);
    const entities = this.cells.get(key);
    return entities ? Array.from(entities) : [];
  }
  
  clear(): void {
    this.cells.clear();
    this.entityPositions.clear();
  }
}

// ============================================================================
// LOD MANAGER
// ============================================================================

export class LODManager {
  private lodLevels: LODLevel[];
  private meshLODs: Map<string, THREE.LOD> = new Map();
  private currentLODs: Map<string, number> = new Map();
  
  constructor(lodLevels: LODLevel[]) {
    this.lodLevels = [...lodLevels].sort((a, b) => a.distance - b.distance);
  }
  
  createLOD(id: string, meshes: THREE.Mesh[]): THREE.LOD {
    const lod = new THREE.LOD();
    
    for (let i = 0; i < meshes.length && i < this.lodLevels.length; i++) {
      const mesh = meshes[i];
      const level = this.lodLevels[i];
      
      // Apply LOD settings
      mesh.castShadow = level.shadowCasting;
      mesh.receiveShadow = level.shadowCasting;
      
      lod.addLevel(mesh, level.distance);
    }
    
    this.meshLODs.set(id, lod);
    this.currentLODs.set(id, 0);
    
    return lod;
  }
  
  updateLOD(id: string, cameraPosition: THREE.Vector3): number {
    const lod = this.meshLODs.get(id);
    if (!lod) return -1;
    
    // THREE.LOD handles this automatically, but we track it
    const camera = new THREE.Camera();
    camera.position.copy(cameraPosition);
    lod.update(camera);
    
    // Find current level
    const position = lod.position;
    const distance = position.distanceTo(cameraPosition);
    
    let level = 0;
    for (let i = this.lodLevels.length - 1; i >= 0; i--) {
      if (distance >= this.lodLevels[i].distance) {
        level = i;
        break;
      }
    }
    
    this.currentLODs.set(id, level);
    return level;
  }
  
  getLODLevel(id: string): number {
    return this.currentLODs.get(id) ?? 0;
  }
  
  getLODConfig(level: number): LODLevel | undefined {
    return this.lodLevels[level];
  }
  
  removeLOD(id: string): void {
    const lod = this.meshLODs.get(id);
    if (lod) {
      // Dispose all levels
      lod.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
      
      this.meshLODs.delete(id);
      this.currentLODs.delete(id);
    }
  }
  
  generateReducedMesh(
    originalGeometry: THREE.BufferGeometry,
    reduction: number
  ): THREE.BufferGeometry {
    // Simplified mesh reduction (real implementation would use proper decimation)
    const geometry = originalGeometry.clone();
    
    if (reduction >= 1) return geometry;
    
    const position = geometry.getAttribute('position');
    if (!position) return geometry;
    
    const vertices: number[] = [];
    const targetCount = Math.floor(position.count * reduction);
    const step = Math.max(1, Math.floor(position.count / targetCount));
    
    for (let i = 0; i < position.count; i += step) {
      vertices.push(
        position.getX(i),
        position.getY(i),
        position.getZ(i)
      );
    }
    
    const reducedGeometry = new THREE.BufferGeometry();
    reducedGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    
    // Copy normals if present
    const normal = geometry.getAttribute('normal');
    if (normal) {
      const normals: number[] = [];
      for (let i = 0; i < normal.count; i += step) {
        normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      }
      reducedGeometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(normals, 3)
      );
    }
    
    return reducedGeometry;
  }
  
  clear(): void {
    for (const id of this.meshLODs.keys()) {
      this.removeLOD(id);
    }
  }
}

// ============================================================================
// CELL LOADER
// ============================================================================

export class CellLoader {
  private baseUrl: string;
  private cache: Map<string, ArrayBuffer> = new Map();
  private pending: Map<string, Promise<ArrayBuffer>> = new Map();
  
  constructor(baseUrl: string = '/assets/world') {
    this.baseUrl = baseUrl;
  }
  
  async loadCell(cellId: string): Promise<ArrayBuffer> {
    // Check cache
    if (this.cache.has(cellId)) {
      return this.cache.get(cellId)!;
    }
    
    // Check pending
    if (this.pending.has(cellId)) {
      return this.pending.get(cellId)!;
    }
    
    // Start load
    const promise = this.fetchCell(cellId);
    this.pending.set(cellId, promise);
    
    try {
      const data = await promise;
      this.cache.set(cellId, data);
      return data;
    } finally {
      this.pending.delete(cellId);
    }
  }
  
  private async fetchCell(cellId: string): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}/${cellId}.cell`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load cell: ${cellId}`);
    }
    
    return response.arrayBuffer();
  }
  
  async preload(cellIds: string[]): Promise<void> {
    await Promise.all(cellIds.map(id => this.loadCell(id)));
  }
  
  unload(cellId: string): void {
    this.cache.delete(cellId);
  }
  
  getCachedSize(): number {
    let size = 0;
    for (const data of this.cache.values()) {
      size += data.byteLength;
    }
    return size;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
