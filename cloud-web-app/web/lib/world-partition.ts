/**
 * World Partition & Streaming System
 * 
 * Sistema profissional de particionamento de mundo e streaming:
 * - Spatial partitioning (grid-based)
 * - Level of Detail (LOD) management
 * - Async level streaming
 * - Dynamic loading/unloading
 * - Memory budget management
 * - Priority-based loading
 * - Distance-based culling
 * - Hierarchical Level of Detail (HLOD)
 * - Streaming volumes
 */

import * as THREE from 'three';

import type {
  LoadRequest,
  LODLevel,
  PartitionCell,
  StreamingConfig,
  StreamingVolume,
  WorldBounds,
} from './world-partition-types';
import {
  CellLoader,
  LODManager,
  SpatialHashGrid,
} from './world-partition-core';
export type {
  LoadRequest,
  LODLevel,
  PartitionCell,
  StreamingConfig,
  StreamingVolume,
  WorldBounds,
} from './world-partition-types';
export {
  CellLoader,
  LODManager,
  SpatialHashGrid,
} from './world-partition-core';

// ============================================================================
// WORLD PARTITION MANAGER
// ============================================================================

export class WorldPartitionManager {
  private config: StreamingConfig;
  private cells: Map<string, PartitionCell> = new Map();
  private spatialGrid: SpatialHashGrid;
  private lodManager: LODManager;
  private cellLoader: CellLoader;
  private streamingVolumes: Map<string, StreamingVolume> = new Map();
  
  private loadQueue: LoadRequest[] = [];
  private activeLoads: number = 0;
  private viewerPosition: THREE.Vector3 = new THREE.Vector3();
  private viewerDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  
  private scene: THREE.Scene;
  private cellMeshes: Map<string, THREE.Object3D> = new Map();
  
  // Memory tracking
  private currentMemoryUsage: number = 0;
  
  // Event callbacks
  private onCellLoaded: ((cell: PartitionCell) => void)[] = [];
  private onCellUnloaded: ((cellId: string) => void)[] = [];
  
  constructor(scene: THREE.Scene, config: Partial<StreamingConfig> = {}) {
    this.scene = scene;
    
    this.config = {
      cellSize: new THREE.Vector3(100, 100, 100),
      viewDistance: 1000,
      loadRadius: 300,
      unloadRadius: 500,
      memoryBudgetMB: 512,
      maxConcurrentLoads: 4,
      lodLevels: [
        { distance: 0, meshReduction: 1.0, textureScale: 1.0, shadowCasting: true, collisionEnabled: true },
        { distance: 100, meshReduction: 0.5, textureScale: 0.5, shadowCasting: true, collisionEnabled: true },
        { distance: 300, meshReduction: 0.25, textureScale: 0.25, shadowCasting: false, collisionEnabled: false },
        { distance: 600, meshReduction: 0.1, textureScale: 0.125, shadowCasting: false, collisionEnabled: false },
      ],
      preloadEnabled: true,
      priorityByDistance: true,
      ...config,
    };
    
    this.spatialGrid = new SpatialHashGrid(this.config.cellSize);
    this.lodManager = new LODManager(this.config.lodLevels);
    this.cellLoader = new CellLoader();
  }
  
  // ============================================================================
  // CELL MANAGEMENT
  // ============================================================================
  
  private getCellId(x: number, y: number, z: number): string {
    return `cell_${x}_${y}_${z}`;
  }
  
  private getCellCoords(cellId: string): { x: number; y: number; z: number } {
    const parts = cellId.split('_');
    return {
      x: parseInt(parts[1], 10),
      y: parseInt(parts[2], 10),
      z: parseInt(parts[3], 10),
    };
  }
  
  private worldPositionToCell(position: THREE.Vector3): { x: number; y: number; z: number } {
    return {
      x: Math.floor(position.x / this.config.cellSize.x),
      y: Math.floor(position.y / this.config.cellSize.y),
      z: Math.floor(position.z / this.config.cellSize.z),
    };
  }
  
  private getCellBounds(x: number, y: number, z: number): WorldBounds {
    return {
      min: new THREE.Vector3(
        x * this.config.cellSize.x,
        y * this.config.cellSize.y,
        z * this.config.cellSize.z
      ),
      max: new THREE.Vector3(
        (x + 1) * this.config.cellSize.x,
        (y + 1) * this.config.cellSize.y,
        (z + 1) * this.config.cellSize.z
      ),
    };
  }
  
  private getCellCenter(x: number, y: number, z: number): THREE.Vector3 {
    const bounds = this.getCellBounds(x, y, z);
    return new THREE.Vector3().addVectors(bounds.min, bounds.max).multiplyScalar(0.5);
  }
  
  // ============================================================================
  // UPDATE LOOP
  // ============================================================================
  
  update(cameraPosition: THREE.Vector3, cameraDirection: THREE.Vector3): void {
    this.viewerPosition.copy(cameraPosition);
    this.viewerDirection.copy(cameraDirection).normalize();
    
    // Update which cells should be loaded/unloaded
    this.updateStreamingState();
    
    // Process load queue
    this.processLoadQueue();
    
    // Update LODs
    this.updateLODs();
    
    // Check memory budget
    this.checkMemoryBudget();
  }
  
  private updateStreamingState(): void {
    const currentCell = this.worldPositionToCell(this.viewerPosition);
    const loadRadiusCells = Math.ceil(this.config.loadRadius / this.config.cellSize.x);
    const unloadRadiusCells = Math.ceil(this.config.unloadRadius / this.config.cellSize.x);
    
    // Find cells that should be loaded
    const cellsToLoad: { id: string; priority: number }[] = [];
    
    for (let dx = -loadRadiusCells; dx <= loadRadiusCells; dx++) {
      for (let dy = -loadRadiusCells; dy <= loadRadiusCells; dy++) {
        for (let dz = -loadRadiusCells; dz <= loadRadiusCells; dz++) {
          const x = currentCell.x + dx;
          const y = currentCell.y + dy;
          const z = currentCell.z + dz;
          const cellId = this.getCellId(x, y, z);
          
          const cellCenter = this.getCellCenter(x, y, z);
          const distance = cellCenter.distanceTo(this.viewerPosition);
          
          if (distance <= this.config.loadRadius) {
            const cell = this.cells.get(cellId);
            
            if (!cell || cell.state === 'unloaded') {
              const priority = this.calculatePriority(cellCenter, distance);
              cellsToLoad.push({ id: cellId, priority });
            }
          }
        }
      }
    }
    
    // Sort by priority and add to queue
    cellsToLoad.sort((a, b) => b.priority - a.priority);
    
    for (const { id, priority } of cellsToLoad) {
      this.queueCellLoad(id, priority);
    }
    
    // Find cells to unload
    for (const [cellId, cell] of this.cells) {
      if (cell.state === 'loaded') {
        const coords = this.getCellCoords(cellId);
        const cellCenter = this.getCellCenter(coords.x, coords.y, coords.z);
        const distance = cellCenter.distanceTo(this.viewerPosition);
        
        // Check if cell is in a streaming volume that should stay loaded
        const inAlwaysLoadedVolume = Array.from(this.streamingVolumes.values())
          .some(vol => vol.alwaysLoaded && this.isInVolume(cellCenter, vol));
        
        if (!inAlwaysLoadedVolume && distance > this.config.unloadRadius) {
          this.unloadCell(cellId);
        }
      }
    }
  }
  
  private calculatePriority(cellCenter: THREE.Vector3, distance: number): number {
    let priority = 1000 - distance; // Base priority by distance
    
    // Bonus for cells in view direction
    const toCell = cellCenter.clone().sub(this.viewerPosition).normalize();
    const dot = toCell.dot(this.viewerDirection);
    if (dot > 0.5) {
      priority += 500 * dot;
    }
    
    // Check streaming volumes
    for (const volume of this.streamingVolumes.values()) {
      if (this.isInVolume(cellCenter, volume)) {
        priority += volume.priority * 100;
      }
    }
    
    return priority;
  }
  
  private isInVolume(position: THREE.Vector3, volume: StreamingVolume): boolean {
    return position.x >= volume.bounds.min.x && position.x <= volume.bounds.max.x &&
           position.y >= volume.bounds.min.y && position.y <= volume.bounds.max.y &&
           position.z >= volume.bounds.min.z && position.z <= volume.bounds.max.z;
  }
  
  // ============================================================================
  // LOADING
  // ============================================================================
  
  private queueCellLoad(cellId: string, priority: number): void {
    // Check if already queued or loading
    const existing = this.loadQueue.find(r => r.cellId === cellId);
    if (existing) {
      existing.priority = Math.max(existing.priority, priority);
      return;
    }
    
    const cell = this.cells.get(cellId);
    if (cell && (cell.state === 'loading' || cell.state === 'loaded')) {
      return;
    }
    
    // Create cell entry
    const coords = this.getCellCoords(cellId);
    const bounds = this.getCellBounds(coords.x, coords.y, coords.z);
    
    this.cells.set(cellId, {
      id: cellId,
      x: coords.x,
      y: coords.y,
      z: coords.z,
      bounds,
      state: 'unloaded',
      entities: [],
      lodLevel: 0,
      priority,
      lastAccessTime: Date.now(),
      memorySize: 0,
    });
    
    // Add to queue
    this.loadQueue.push({
      cellId,
      priority,
      timestamp: Date.now(),
      resolve: () => {},
      reject: () => {},
    });
    
    // Sort queue by priority
    this.loadQueue.sort((a, b) => b.priority - a.priority);
  }
  
  private async processLoadQueue(): Promise<void> {
    while (
      this.loadQueue.length > 0 &&
      this.activeLoads < this.config.maxConcurrentLoads
    ) {
      const request = this.loadQueue.shift();
      if (!request) break;
      
      const cell = this.cells.get(request.cellId);
      if (!cell || cell.state !== 'unloaded') continue;
      
      this.activeLoads++;
      cell.state = 'loading';
      
      try {
        await this.loadCell(request.cellId);
        request.resolve(cell.data!);
      } catch (error) {
        console.error(`Failed to load cell ${request.cellId}:`, error);
        cell.state = 'unloaded';
        request.reject(error as Error);
      } finally {
        this.activeLoads--;
      }
    }
  }
  
  private async loadCell(cellId: string): Promise<void> {
    const cell = this.cells.get(cellId);
    if (!cell) return;
    
    try {
      // Load cell data
      const data = await this.cellLoader.loadCell(cellId);
      cell.data = data;
      cell.memorySize = data.byteLength;
      cell.state = 'loaded';
      cell.lastAccessTime = Date.now();
      
      // Parse and create meshes
      const meshes = await this.parseCellData(cell, data);
      
      // Add to scene
      const container = new THREE.Group();
      container.name = cellId;
      
      for (const mesh of meshes) {
        container.add(mesh);
      }
      
      this.scene.add(container);
      this.cellMeshes.set(cellId, container);
      
      // Update memory tracking
      this.currentMemoryUsage += cell.memorySize;
      
      // Notify listeners
      for (const callback of this.onCellLoaded) {
        callback(cell);
      }
      
      console.log(`[WorldPartition] Loaded cell: ${cellId}`);
      
    } catch (error) {
      cell.state = 'unloaded';
      throw error;
    }
  }
  
  private async parseCellData(cell: PartitionCell, data: ArrayBuffer): Promise<THREE.Object3D[]> {
    // Parse binary cell format
    // Format: [header][entities][meshData][textureRefs]
    
    const view = new DataView(data);
    const meshes: THREE.Object3D[] = [];
    
    let offset = 0;
    
    // Read header
    const magic = view.getUint32(offset, true);
    offset += 4;
    
    if (magic !== 0x43454C4C) { // "CELL"
      // Create placeholder mesh for demo
      const geometry = new THREE.BoxGeometry(
        this.config.cellSize.x * 0.9,
        this.config.cellSize.y * 0.1,
        this.config.cellSize.z * 0.9
      );
      
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(
          (cell.x * 0.1 + cell.z * 0.15) % 1,
          0.5,
          0.5
        ),
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      const center = this.getCellCenter(cell.x, cell.y, cell.z);
      mesh.position.copy(center);
      mesh.position.y = 0;
      meshes.push(mesh);
      
      // Add some random props
      const propCount = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < propCount; i++) {
        const propGeom = new THREE.BoxGeometry(5, 10, 5);
        const propMat = new THREE.MeshStandardMaterial({
          color: 0x808080,
        });
        const prop = new THREE.Mesh(propGeom, propMat);
        prop.position.set(
          center.x + (Math.random() - 0.5) * this.config.cellSize.x * 0.8,
          5,
          center.z + (Math.random() - 0.5) * this.config.cellSize.z * 0.8
        );
        meshes.push(prop);
      }
      
      return meshes;
    }
    
    // Parse actual cell format (would be implemented with real data)
    const entityCount = view.getUint32(offset, true);
    offset += 4;
    
    for (let i = 0; i < entityCount; i++) {
      // Read entity data
      // ... (implement based on your format)
    }
    
    return meshes;
  }
  
  // ============================================================================
  // UNLOADING
  // ============================================================================
  
  private unloadCell(cellId: string): void {
    const cell = this.cells.get(cellId);
    if (!cell || cell.state !== 'loaded') return;
    
    cell.state = 'unloading';
    
    // Remove from scene
    const meshContainer = this.cellMeshes.get(cellId);
    if (meshContainer) {
      this.scene.remove(meshContainer);
      
      // Dispose resources
      meshContainer.traverse((obj) => {
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
      
      this.cellMeshes.delete(cellId);
    }
    
    // Update memory tracking
    this.currentMemoryUsage -= cell.memorySize;
    
    // Unload from loader cache
    this.cellLoader.unload(cellId);
    
    // Update cell state
    cell.state = 'unloaded';
    cell.data = undefined;
    cell.memorySize = 0;
    
    // Notify listeners
    for (const callback of this.onCellUnloaded) {
      callback(cellId);
    }
    
    console.log(`[WorldPartition] Unloaded cell: ${cellId}`);
  }
  
  // ============================================================================
  // LOD UPDATE
  // ============================================================================
  
  private updateLODs(): void {
    for (const [cellId, cell] of this.cells) {
      if (cell.state !== 'loaded') continue;
      
      const container = this.cellMeshes.get(cellId);
      if (!container) continue;
      
      const cellCenter = this.getCellCenter(cell.x, cell.y, cell.z);
      const distance = cellCenter.distanceTo(this.viewerPosition);
      
      // Determine LOD level
      let newLOD = 0;
      for (let i = this.config.lodLevels.length - 1; i >= 0; i--) {
        if (distance >= this.config.lodLevels[i].distance) {
          newLOD = i;
          break;
        }
      }
      
      if (newLOD !== cell.lodLevel) {
        cell.lodLevel = newLOD;
        this.applyLOD(container, newLOD);
      }
    }
  }
  
  private applyLOD(container: THREE.Object3D, lodLevel: number): void {
    const lodConfig = this.config.lodLevels[lodLevel];
    if (!lodConfig) return;
    
    container.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = lodConfig.shadowCasting;
        obj.receiveShadow = lodConfig.shadowCasting;
      }
    });
  }
  
  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================
  
  private checkMemoryBudget(): void {
    const budgetBytes = this.config.memoryBudgetMB * 1024 * 1024;
    
    if (this.currentMemoryUsage > budgetBytes) {
      // Find cells to unload (furthest first)
      const loadedCells = Array.from(this.cells.entries())
        .filter(([_, cell]) => cell.state === 'loaded')
        .map(([id, cell]) => {
          const center = this.getCellCenter(cell.x, cell.y, cell.z);
          return {
            id,
            cell,
            distance: center.distanceTo(this.viewerPosition),
          };
        })
        .sort((a, b) => b.distance - a.distance);
      
      // Unload until under budget
      for (const { id } of loadedCells) {
        if (this.currentMemoryUsage <= budgetBytes * 0.9) break;
        this.unloadCell(id);
      }
    }
  }
  
  // ============================================================================
  // STREAMING VOLUMES
  // ============================================================================
  
  addStreamingVolume(volume: StreamingVolume): void {
    this.streamingVolumes.set(volume.id, volume);
  }
  
  removeStreamingVolume(id: string): void {
    this.streamingVolumes.delete(id);
  }
  
  // ============================================================================
  // EVENT HANDLING
  // ============================================================================
  
  onCellLoad(callback: (cell: PartitionCell) => void): () => void {
    this.onCellLoaded.push(callback);
    return () => {
      const index = this.onCellLoaded.indexOf(callback);
      if (index !== -1) this.onCellLoaded.splice(index, 1);
    };
  }
  
  onCellUnload(callback: (cellId: string) => void): () => void {
    this.onCellUnloaded.push(callback);
    return () => {
      const index = this.onCellUnloaded.indexOf(callback);
      if (index !== -1) this.onCellUnloaded.splice(index, 1);
    };
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getLoadedCells(): PartitionCell[] {
    return Array.from(this.cells.values()).filter(c => c.state === 'loaded');
  }
  
  getCellState(cellId: string): PartitionCell | undefined {
    return this.cells.get(cellId);
  }
  
  getMemoryUsage(): { current: number; budget: number; percentage: number } {
    const budget = this.config.memoryBudgetMB * 1024 * 1024;
    return {
      current: this.currentMemoryUsage,
      budget,
      percentage: (this.currentMemoryUsage / budget) * 100,
    };
  }
  
  getLoadQueueLength(): number {
    return this.loadQueue.length;
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    // Unload all cells
    for (const cellId of this.cells.keys()) {
      this.unloadCell(cellId);
    }
    
    this.cells.clear();
    this.loadQueue.length = 0;
    this.streamingVolumes.clear();
    this.lodManager.clear();
    this.cellLoader.clearCache();
    this.spatialGrid.clear();
  }
}

// ============================================================================
// HLOD (HIERARCHICAL LOD) MANAGER
// ============================================================================

export interface HLODCluster {
  id: string;
  cells: string[];
  combinedMesh?: THREE.Mesh;
  bounds: WorldBounds;
  distance: number;
  active: boolean;
}

export class HLODManager {
  private clusters: Map<string, HLODCluster> = new Map();
  private worldPartition: WorldPartitionManager;
  private scene: THREE.Scene;
  private hlodDistance: number;
  
  constructor(
    worldPartition: WorldPartitionManager,
    scene: THREE.Scene,
    hlodDistance: number = 500
  ) {
    this.worldPartition = worldPartition;
    this.scene = scene;
    this.hlodDistance = hlodDistance;
  }
  
  createCluster(id: string, cellIds: string[]): HLODCluster {
    const cluster: HLODCluster = {
      id,
      cells: cellIds,
      bounds: this.calculateClusterBounds(cellIds),
      distance: this.hlodDistance,
      active: false,
    };
    
    this.clusters.set(id, cluster);
    return cluster;
  }
  
  private calculateClusterBounds(cellIds: string[]): WorldBounds {
    const bounds: WorldBounds = {
      min: new THREE.Vector3(Infinity, Infinity, Infinity),
      max: new THREE.Vector3(-Infinity, -Infinity, -Infinity),
    };
    
    for (const cellId of cellIds) {
      const cell = this.worldPartition.getCellState(cellId);
      if (cell) {
        bounds.min.min(cell.bounds.min);
        bounds.max.max(cell.bounds.max);
      }
    }
    
    return bounds;
  }
  
  async generateHLODMesh(cluster: HLODCluster): Promise<THREE.Mesh> {
    // Combine geometries from all cells in cluster
    const geometries: THREE.BufferGeometry[] = [];
    
    // In a real implementation, this would combine and simplify meshes
    // For now, create a simple proxy box
    const size = new THREE.Vector3().subVectors(cluster.bounds.max, cluster.bounds.min);
    const center = new THREE.Vector3().addVectors(cluster.bounds.min, cluster.bounds.max).multiplyScalar(0.5);
    
    const geometry = new THREE.BoxGeometry(size.x, size.y * 0.1, size.z);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4488aa,
      transparent: true,
      opacity: 0.8,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.name = `hlod_${cluster.id}`;
    
    cluster.combinedMesh = mesh;
    return mesh;
  }
  
  update(viewerPosition: THREE.Vector3): void {
    for (const cluster of this.clusters.values()) {
      const center = new THREE.Vector3()
        .addVectors(cluster.bounds.min, cluster.bounds.max)
        .multiplyScalar(0.5);
      
      const distance = center.distanceTo(viewerPosition);
      const shouldBeActive = distance > cluster.distance;
      
      if (shouldBeActive !== cluster.active) {
        if (shouldBeActive) {
          this.activateCluster(cluster);
        } else {
          this.deactivateCluster(cluster);
        }
      }
    }
  }
  
  private async activateCluster(cluster: HLODCluster): Promise<void> {
    if (!cluster.combinedMesh) {
      await this.generateHLODMesh(cluster);
    }
    
    if (cluster.combinedMesh) {
      this.scene.add(cluster.combinedMesh);
      cluster.active = true;
    }
  }
  
  private deactivateCluster(cluster: HLODCluster): void {
    if (cluster.combinedMesh) {
      this.scene.remove(cluster.combinedMesh);
      cluster.active = false;
    }
  }
  
  dispose(): void {
    for (const cluster of this.clusters.values()) {
      if (cluster.combinedMesh) {
        this.scene.remove(cluster.combinedMesh);
        cluster.combinedMesh.geometry?.dispose();
        if (cluster.combinedMesh.material) {
          if (Array.isArray(cluster.combinedMesh.material)) {
            cluster.combinedMesh.material.forEach(m => m.dispose());
          } else {
            cluster.combinedMesh.material.dispose();
          }
        }
      }
    }
    this.clusters.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createWorldPartition(
  scene: THREE.Scene,
  config?: Partial<StreamingConfig>
): {
  partition: WorldPartitionManager;
  hlod: HLODManager;
} {
  const partition = new WorldPartitionManager(scene, config);
  const hlod = new HLODManager(partition, scene);
  
  return { partition, hlod };
}
