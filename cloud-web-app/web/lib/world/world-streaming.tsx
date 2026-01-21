/**
 * World Streaming & LOD System - Sistema de Streaming de Mundo e Níveis de Detalhe
 * 
 * Sistema completo com:
 * - Streaming de chunks baseado em distância
 * - Level of Detail (LOD) dinâmico
 * - Occlusion culling
 * - Spatial partitioning (Octree/Grid)
 * - Async loading/unloading
 * - Memory management
 * - Priority queue para loading
 * - Prefetching inteligente
 * 
 * @module lib/world/world-streaming
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface Sphere {
  center: Vector3;
  radius: number;
}

export type ChunkState = 'unloaded' | 'loading' | 'loaded' | 'unloading' | 'error';
export type LODLevel = 0 | 1 | 2 | 3 | 4; // 0 = highest detail

export interface WorldChunk {
  id: string;
  position: Vector3;
  size: Vector3;
  bounds: BoundingBox;
  state: ChunkState;
  lodLevel: LODLevel;
  priority: number;
  data: any | null;
  neighbors: string[];
  lastAccessTime: number;
  loadTime: number;
  memorySize: number;
  entities: string[];
  terrainMesh: any | null;
  collisionMesh: any | null;
}

export interface LODConfig {
  level: LODLevel;
  distance: number;
  vertexReduction: number;
  textureScale: number;
  shadowsEnabled: boolean;
  animationsEnabled: boolean;
  updateFrequency: number; // updates per second
}

export interface StreamingConfig {
  chunkSize: Vector3;
  viewDistance: number;
  loadDistance: number;
  unloadDistance: number;
  maxLoadedChunks: number;
  maxConcurrentLoads: number;
  lodLevels: LODConfig[];
  prefetchEnabled: boolean;
  prefetchDistance: number;
  memoryBudgetMB: number;
  enableOcclusionCulling: boolean;
  updateInterval: number; // ms
  priorityBoostForVisible: number;
}

export interface StreamingStats {
  loadedChunks: number;
  loadingChunks: number;
  totalChunks: number;
  memoryUsedMB: number;
  memoryBudgetMB: number;
  chunksLoadedThisFrame: number;
  chunksUnloadedThisFrame: number;
  averageLoadTime: number;
  visibleChunks: number;
  culledChunks: number;
}

export interface EntityLOD {
  entityId: string;
  currentLOD: LODLevel;
  targetLOD: LODLevel;
  distance: number;
  isVisible: boolean;
  lastUpdate: number;
}

// ============================================================================
// OCTREE FOR SPATIAL PARTITIONING
// ============================================================================

interface OctreeNode<T> {
  bounds: BoundingBox;
  items: T[];
  children: OctreeNode<T>[] | null;
  depth: number;
}

export class Octree<T extends { bounds: BoundingBox }> {
  private root: OctreeNode<T>;
  private maxDepth: number;
  private maxItemsPerNode: number;
  
  constructor(bounds: BoundingBox, maxDepth = 8, maxItemsPerNode = 8) {
    this.maxDepth = maxDepth;
    this.maxItemsPerNode = maxItemsPerNode;
    this.root = this.createNode(bounds, 0);
  }
  
  private createNode(bounds: BoundingBox, depth: number): OctreeNode<T> {
    return {
      bounds,
      items: [],
      children: null,
      depth,
    };
  }
  
  insert(item: T): boolean {
    return this.insertIntoNode(this.root, item);
  }
  
  private insertIntoNode(node: OctreeNode<T>, item: T): boolean {
    if (!this.boundsIntersect(node.bounds, item.bounds)) {
      return false;
    }
    
    // If node has children, try inserting into them
    if (node.children) {
      for (const child of node.children) {
        if (this.boundsContains(child.bounds, item.bounds)) {
          return this.insertIntoNode(child, item);
        }
      }
      // Item spans multiple children, store in this node
      node.items.push(item);
      return true;
    }
    
    // Add to this node
    node.items.push(item);
    
    // Subdivide if needed
    if (node.items.length > this.maxItemsPerNode && node.depth < this.maxDepth) {
      this.subdivide(node);
    }
    
    return true;
  }
  
  private subdivide(node: OctreeNode<T>): void {
    const { min, max } = node.bounds;
    const mid = {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2,
    };
    
    node.children = [
      this.createNode({ min: { x: min.x, y: min.y, z: min.z }, max: { x: mid.x, y: mid.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: min.y, z: min.z }, max: { x: max.x, y: mid.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: min.x, y: mid.y, z: min.z }, max: { x: mid.x, y: max.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: mid.y, z: min.z }, max: { x: max.x, y: max.y, z: mid.z } }, node.depth + 1),
      this.createNode({ min: { x: min.x, y: min.y, z: mid.z }, max: { x: mid.x, y: mid.y, z: max.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: min.y, z: mid.z }, max: { x: max.x, y: mid.y, z: max.z } }, node.depth + 1),
      this.createNode({ min: { x: min.x, y: mid.y, z: mid.z }, max: { x: mid.x, y: max.y, z: max.z } }, node.depth + 1),
      this.createNode({ min: { x: mid.x, y: mid.y, z: mid.z }, max: { x: max.x, y: max.y, z: max.z } }, node.depth + 1),
    ];
    
    // Redistribute items
    const items = node.items;
    node.items = [];
    
    for (const item of items) {
      this.insertIntoNode(node, item);
    }
  }
  
  query(bounds: BoundingBox): T[] {
    const results: T[] = [];
    this.queryNode(this.root, bounds, results);
    return results;
  }
  
  private queryNode(node: OctreeNode<T>, bounds: BoundingBox, results: T[]): void {
    if (!this.boundsIntersect(node.bounds, bounds)) {
      return;
    }
    
    for (const item of node.items) {
      if (this.boundsIntersect(item.bounds, bounds)) {
        results.push(item);
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.queryNode(child, bounds, results);
      }
    }
  }
  
  queryRadius(center: Vector3, radius: number): T[] {
    const bounds: BoundingBox = {
      min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
      max: { x: center.x + radius, y: center.y + radius, z: center.z + radius },
    };
    
    return this.query(bounds).filter(item => {
      const itemCenter = this.getBoundsCenter(item.bounds);
      return this.distance(center, itemCenter) <= radius;
    });
  }
  
  remove(item: T): boolean {
    return this.removeFromNode(this.root, item);
  }
  
  private removeFromNode(node: OctreeNode<T>, item: T): boolean {
    const index = node.items.indexOf(item);
    if (index !== -1) {
      node.items.splice(index, 1);
      return true;
    }
    
    if (node.children) {
      for (const child of node.children) {
        if (this.removeFromNode(child, item)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  clear(): void {
    this.root = this.createNode(this.root.bounds, 0);
  }
  
  private boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }
  
  private boundsContains(outer: BoundingBox, inner: BoundingBox): boolean {
    return (
      outer.min.x <= inner.min.x && outer.max.x >= inner.max.x &&
      outer.min.y <= inner.min.y && outer.max.y >= inner.max.y &&
      outer.min.z <= inner.min.z && outer.max.z >= inner.max.z
    );
  }
  
  private getBoundsCenter(bounds: BoundingBox): Vector3 {
    return {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2,
    };
  }
  
  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

// ============================================================================
// PRIORITY QUEUE
// ============================================================================

class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];
  
  enqueue(item: T, priority: number): void {
    const newItem = { item, priority };
    let added = false;
    
    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, newItem);
        added = true;
        break;
      }
    }
    
    if (!added) {
      this.items.push(newItem);
    }
  }
  
  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }
  
  peek(): T | undefined {
    return this.items[0]?.item;
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  size(): number {
    return this.items.length;
  }
  
  clear(): void {
    this.items = [];
  }
  
  has(predicate: (item: T) => boolean): boolean {
    return this.items.some(i => predicate(i.item));
  }
  
  remove(predicate: (item: T) => boolean): boolean {
    const index = this.items.findIndex(i => predicate(i.item));
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }
}

// ============================================================================
// WORLD STREAMING SYSTEM
// ============================================================================

export class WorldStreamingSystem extends EventEmitter {
  private static instance: WorldStreamingSystem | null = null;
  
  private config: StreamingConfig;
  private chunks: Map<string, WorldChunk> = new Map();
  private octree: Octree<WorldChunk>;
  private loadQueue: PriorityQueue<WorldChunk> = new PriorityQueue();
  private unloadQueue: Set<string> = new Set();
  private entityLODs: Map<string, EntityLOD> = new Map();
  private viewerPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private viewerDirection: Vector3 = { x: 0, y: 0, z: 1 };
  private stats: StreamingStats;
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private currentLoads = 0;
  private loadTimes: number[] = [];
  private chunkLoader: ChunkLoader | null = null;
  
  constructor(config: Partial<StreamingConfig> = {}) {
    super();
    
    this.config = {
      chunkSize: { x: 64, y: 64, z: 64 },
      viewDistance: 500,
      loadDistance: 600,
      unloadDistance: 800,
      maxLoadedChunks: 100,
      maxConcurrentLoads: 4,
      lodLevels: [
        { level: 0, distance: 50, vertexReduction: 1, textureScale: 1, shadowsEnabled: true, animationsEnabled: true, updateFrequency: 60 },
        { level: 1, distance: 100, vertexReduction: 0.5, textureScale: 0.5, shadowsEnabled: true, animationsEnabled: true, updateFrequency: 30 },
        { level: 2, distance: 200, vertexReduction: 0.25, textureScale: 0.25, shadowsEnabled: false, animationsEnabled: true, updateFrequency: 15 },
        { level: 3, distance: 400, vertexReduction: 0.1, textureScale: 0.125, shadowsEnabled: false, animationsEnabled: false, updateFrequency: 10 },
        { level: 4, distance: 600, vertexReduction: 0.05, textureScale: 0.0625, shadowsEnabled: false, animationsEnabled: false, updateFrequency: 5 },
      ],
      prefetchEnabled: true,
      prefetchDistance: 200,
      memoryBudgetMB: 512,
      enableOcclusionCulling: true,
      updateInterval: 100,
      priorityBoostForVisible: 2.0,
      ...config,
    };
    
    // Initialize octree with world bounds
    const worldBounds: BoundingBox = {
      min: { x: -10000, y: -1000, z: -10000 },
      max: { x: 10000, y: 1000, z: 10000 },
    };
    this.octree = new Octree(worldBounds);
    
    this.stats = this.createEmptyStats();
  }
  
  static getInstance(): WorldStreamingSystem {
    if (!WorldStreamingSystem.instance) {
      WorldStreamingSystem.instance = new WorldStreamingSystem();
    }
    return WorldStreamingSystem.instance;
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  setChunkLoader(loader: ChunkLoader): void {
    this.chunkLoader = loader;
  }
  
  start(): void {
    if (this.updateTimer) return;
    
    this.updateTimer = setInterval(() => {
      this.update();
    }, this.config.updateInterval);
    
    this.emit('started');
  }
  
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.emit('stopped');
  }
  
  // ============================================================================
  // CHUNK MANAGEMENT
  // ============================================================================
  
  registerChunk(position: Vector3, data?: any): WorldChunk {
    const id = this.getChunkId(position);
    
    if (this.chunks.has(id)) {
      return this.chunks.get(id)!;
    }
    
    const chunk: WorldChunk = {
      id,
      position,
      size: { ...this.config.chunkSize },
      bounds: this.calculateChunkBounds(position),
      state: 'unloaded',
      lodLevel: 4,
      priority: 0,
      data,
      neighbors: this.findNeighborIds(position),
      lastAccessTime: Date.now(),
      loadTime: 0,
      memorySize: 0,
      entities: [],
      terrainMesh: null,
      collisionMesh: null,
    };
    
    this.chunks.set(id, chunk);
    this.octree.insert(chunk);
    
    this.emit('chunkRegistered', chunk);
    return chunk;
  }
  
  unregisterChunk(id: string): boolean {
    const chunk = this.chunks.get(id);
    if (!chunk) return false;
    
    if (chunk.state === 'loaded') {
      this.unloadChunk(chunk);
    }
    
    this.octree.remove(chunk);
    this.chunks.delete(id);
    
    this.emit('chunkUnregistered', id);
    return true;
  }
  
  private getChunkId(position: Vector3): string {
    const cx = Math.floor(position.x / this.config.chunkSize.x);
    const cy = Math.floor(position.y / this.config.chunkSize.y);
    const cz = Math.floor(position.z / this.config.chunkSize.z);
    return `chunk_${cx}_${cy}_${cz}`;
  }
  
  private calculateChunkBounds(position: Vector3): BoundingBox {
    const { chunkSize } = this.config;
    const cx = Math.floor(position.x / chunkSize.x) * chunkSize.x;
    const cy = Math.floor(position.y / chunkSize.y) * chunkSize.y;
    const cz = Math.floor(position.z / chunkSize.z) * chunkSize.z;
    
    return {
      min: { x: cx, y: cy, z: cz },
      max: { x: cx + chunkSize.x, y: cy + chunkSize.y, z: cz + chunkSize.z },
    };
  }
  
  private findNeighborIds(position: Vector3): string[] {
    const { chunkSize } = this.config;
    const neighbors: string[] = [];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          
          neighbors.push(this.getChunkId({
            x: position.x + dx * chunkSize.x,
            y: position.y + dy * chunkSize.y,
            z: position.z + dz * chunkSize.z,
          }));
        }
      }
    }
    
    return neighbors;
  }
  
  // ============================================================================
  // STREAMING UPDATE
  // ============================================================================
  
  setViewerPosition(position: Vector3, direction?: Vector3): void {
    this.viewerPosition = position;
    if (direction) {
      this.viewerDirection = direction;
    }
  }
  
  private update(): void {
    const startTime = performance.now();
    
    // Reset frame stats
    this.stats.chunksLoadedThisFrame = 0;
    this.stats.chunksUnloadedThisFrame = 0;
    
    // 1. Update chunk priorities based on distance
    this.updateChunkPriorities();
    
    // 2. Queue chunks for loading/unloading
    this.queueChunkOperations();
    
    // 3. Process load queue
    this.processLoadQueue();
    
    // 4. Process unload queue
    this.processUnloadQueue();
    
    // 5. Update LOD levels for entities
    this.updateEntityLODs();
    
    // 6. Update stats
    this.updateStats();
    
    const elapsed = performance.now() - startTime;
    if (elapsed > this.config.updateInterval * 0.5) {
      console.warn(`WorldStreaming update took ${elapsed.toFixed(2)}ms`);
    }
    
    this.emit('update', this.stats);
  }
  
  private updateChunkPriorities(): void {
    for (const chunk of this.chunks.values()) {
      const distance = this.getChunkDistance(chunk);
      const viewAngle = this.getChunkViewAngle(chunk);
      
      // Base priority is inverse of distance
      let priority = 1 / (distance + 1);
      
      // Boost for chunks in view direction
      if (viewAngle < Math.PI / 2) {
        priority *= this.config.priorityBoostForVisible;
      }
      
      // Boost for chunks player is moving towards
      // (would need velocity tracking)
      
      chunk.priority = priority;
      
      // Update LOD level
      chunk.lodLevel = this.calculateLODLevel(distance);
    }
  }
  
  private queueChunkOperations(): void {
    for (const chunk of this.chunks.values()) {
      const distance = this.getChunkDistance(chunk);
      
      // Queue for loading
      if (distance <= this.config.loadDistance && chunk.state === 'unloaded') {
        if (!this.loadQueue.has(c => c.id === chunk.id)) {
          this.loadQueue.enqueue(chunk, chunk.priority);
        }
      }
      
      // Queue for unloading
      if (distance > this.config.unloadDistance && chunk.state === 'loaded') {
        this.unloadQueue.add(chunk.id);
      }
    }
    
    // Prefetch
    if (this.config.prefetchEnabled) {
      this.queuePrefetch();
    }
  }
  
  private queuePrefetch(): void {
    // Get chunks near view direction for prefetching
    const prefetchPos = {
      x: this.viewerPosition.x + this.viewerDirection.x * this.config.prefetchDistance,
      y: this.viewerPosition.y + this.viewerDirection.y * this.config.prefetchDistance,
      z: this.viewerPosition.z + this.viewerDirection.z * this.config.prefetchDistance,
    };
    
    const prefetchBounds: BoundingBox = {
      min: {
        x: prefetchPos.x - this.config.chunkSize.x * 2,
        y: prefetchPos.y - this.config.chunkSize.y * 2,
        z: prefetchPos.z - this.config.chunkSize.z * 2,
      },
      max: {
        x: prefetchPos.x + this.config.chunkSize.x * 2,
        y: prefetchPos.y + this.config.chunkSize.y * 2,
        z: prefetchPos.z + this.config.chunkSize.z * 2,
      },
    };
    
    const prefetchChunks = this.octree.query(prefetchBounds);
    
    for (const chunk of prefetchChunks) {
      if (chunk.state === 'unloaded' && !this.loadQueue.has(c => c.id === chunk.id)) {
        this.loadQueue.enqueue(chunk, chunk.priority * 0.5); // Lower priority for prefetch
      }
    }
  }
  
  private async processLoadQueue(): Promise<void> {
    while (!this.loadQueue.isEmpty() && this.currentLoads < this.config.maxConcurrentLoads) {
      const chunk = this.loadQueue.dequeue();
      if (!chunk || chunk.state !== 'unloaded') continue;
      
      // Memory check
      if (this.stats.memoryUsedMB >= this.config.memoryBudgetMB) {
        // Force unload some chunks
        this.forceUnloadLowPriority();
        
        if (this.stats.memoryUsedMB >= this.config.memoryBudgetMB) {
          break; // Still over budget
        }
      }
      
      this.loadChunk(chunk);
    }
  }
  
  private processUnloadQueue(): void {
    for (const id of this.unloadQueue) {
      const chunk = this.chunks.get(id);
      if (chunk && chunk.state === 'loaded') {
        this.unloadChunk(chunk);
        this.stats.chunksUnloadedThisFrame++;
      }
    }
    
    this.unloadQueue.clear();
  }
  
  private forceUnloadLowPriority(): void {
    // Sort chunks by priority (lowest first)
    const loaded = Array.from(this.chunks.values())
      .filter(c => c.state === 'loaded')
      .sort((a, b) => a.priority - b.priority);
    
    // Unload lowest priority chunks until under budget
    for (const chunk of loaded) {
      if (this.stats.memoryUsedMB < this.config.memoryBudgetMB * 0.9) break;
      
      this.unloadChunk(chunk);
    }
  }
  
  // ============================================================================
  // CHUNK LOADING/UNLOADING
  // ============================================================================
  
  private async loadChunk(chunk: WorldChunk): Promise<void> {
    if (chunk.state !== 'unloaded') return;
    
    chunk.state = 'loading';
    this.currentLoads++;
    
    const loadStart = performance.now();
    
    try {
      if (this.chunkLoader) {
        const result = await this.chunkLoader.loadChunk(chunk.id, chunk.lodLevel);
        chunk.data = result.data;
        chunk.terrainMesh = result.terrainMesh;
        chunk.collisionMesh = result.collisionMesh;
        chunk.memorySize = result.memorySize;
        chunk.entities = result.entities || [];
      }
      
      chunk.state = 'loaded';
      chunk.loadTime = performance.now() - loadStart;
      chunk.lastAccessTime = Date.now();
      
      this.loadTimes.push(chunk.loadTime);
      if (this.loadTimes.length > 50) {
        this.loadTimes.shift();
      }
      
      this.stats.chunksLoadedThisFrame++;
      this.emit('chunkLoaded', chunk);
      
    } catch (error) {
      chunk.state = 'error';
      console.error(`Failed to load chunk ${chunk.id}:`, error);
      this.emit('chunkLoadError', { chunk, error });
    }
    
    this.currentLoads--;
  }
  
  private unloadChunk(chunk: WorldChunk): void {
    if (chunk.state !== 'loaded') return;
    
    chunk.state = 'unloading';
    
    if (this.chunkLoader) {
      this.chunkLoader.unloadChunk(chunk.id);
    }
    
    // Clear references
    chunk.data = null;
    chunk.terrainMesh = null;
    chunk.collisionMesh = null;
    chunk.memorySize = 0;
    
    chunk.state = 'unloaded';
    this.emit('chunkUnloaded', chunk);
  }
  
  // ============================================================================
  // LOD MANAGEMENT
  // ============================================================================
  
  private calculateLODLevel(distance: number): LODLevel {
    for (const lod of this.config.lodLevels) {
      if (distance <= lod.distance) {
        return lod.level;
      }
    }
    return 4;
  }
  
  registerEntity(entityId: string, position: Vector3): void {
    const distance = this.distance(position, this.viewerPosition);
    const lodLevel = this.calculateLODLevel(distance);
    
    this.entityLODs.set(entityId, {
      entityId,
      currentLOD: lodLevel,
      targetLOD: lodLevel,
      distance,
      isVisible: true,
      lastUpdate: Date.now(),
    });
  }
  
  unregisterEntity(entityId: string): void {
    this.entityLODs.delete(entityId);
  }
  
  updateEntityPosition(entityId: string, position: Vector3): void {
    const entity = this.entityLODs.get(entityId);
    if (!entity) return;
    
    entity.distance = this.distance(position, this.viewerPosition);
    entity.targetLOD = this.calculateLODLevel(entity.distance);
  }
  
  private updateEntityLODs(): void {
    const now = Date.now();
    
    for (const entity of this.entityLODs.values()) {
      // Gradual LOD transition
      if (entity.currentLOD !== entity.targetLOD) {
        const lodConfig = this.config.lodLevels[entity.currentLOD];
        const updateInterval = 1000 / lodConfig.updateFrequency;
        
        if (now - entity.lastUpdate >= updateInterval) {
          if (entity.currentLOD < entity.targetLOD) {
            entity.currentLOD = Math.min(entity.currentLOD + 1, entity.targetLOD) as LODLevel;
          } else {
            entity.currentLOD = Math.max(entity.currentLOD - 1, entity.targetLOD) as LODLevel;
          }
          
          entity.lastUpdate = now;
          this.emit('entityLODChanged', entity);
        }
      }
    }
  }
  
  getEntityLOD(entityId: string): LODLevel {
    return this.entityLODs.get(entityId)?.currentLOD ?? 4;
  }
  
  getLODConfig(level: LODLevel): LODConfig {
    return this.config.lodLevels[level];
  }
  
  // ============================================================================
  // OCCLUSION CULLING
  // ============================================================================
  
  isChunkVisible(chunk: WorldChunk): boolean {
    if (!this.config.enableOcclusionCulling) return true;
    
    // Simple frustum check
    const viewAngle = this.getChunkViewAngle(chunk);
    if (viewAngle > Math.PI * 0.6) return false; // Behind viewer
    
    // Distance check
    const distance = this.getChunkDistance(chunk);
    if (distance > this.config.viewDistance) return false;
    
    return true;
  }
  
  getVisibleChunks(): WorldChunk[] {
    return Array.from(this.chunks.values())
      .filter(c => c.state === 'loaded' && this.isChunkVisible(c));
  }
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  getChunkAtPosition(position: Vector3): WorldChunk | undefined {
    const id = this.getChunkId(position);
    return this.chunks.get(id);
  }
  
  getChunksInRadius(center: Vector3, radius: number): WorldChunk[] {
    return this.octree.queryRadius(center, radius);
  }
  
  getLoadedChunks(): WorldChunk[] {
    return Array.from(this.chunks.values()).filter(c => c.state === 'loaded');
  }
  
  getChunk(id: string): WorldChunk | undefined {
    return this.chunks.get(id);
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private getChunkDistance(chunk: WorldChunk): number {
    const center = this.getChunkCenter(chunk);
    return this.distance(center, this.viewerPosition);
  }
  
  private getChunkCenter(chunk: WorldChunk): Vector3 {
    return {
      x: (chunk.bounds.min.x + chunk.bounds.max.x) / 2,
      y: (chunk.bounds.min.y + chunk.bounds.max.y) / 2,
      z: (chunk.bounds.min.z + chunk.bounds.max.z) / 2,
    };
  }
  
  private getChunkViewAngle(chunk: WorldChunk): number {
    const center = this.getChunkCenter(chunk);
    const toChunk = {
      x: center.x - this.viewerPosition.x,
      y: center.y - this.viewerPosition.y,
      z: center.z - this.viewerPosition.z,
    };
    
    const dot = this.dot(this.normalize(toChunk), this.viewerDirection);
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  }
  
  private distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }
  
  private dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  
  private createEmptyStats(): StreamingStats {
    return {
      loadedChunks: 0,
      loadingChunks: 0,
      totalChunks: 0,
      memoryUsedMB: 0,
      memoryBudgetMB: this.config.memoryBudgetMB,
      chunksLoadedThisFrame: 0,
      chunksUnloadedThisFrame: 0,
      averageLoadTime: 0,
      visibleChunks: 0,
      culledChunks: 0,
    };
  }
  
  private updateStats(): void {
    const loaded = Array.from(this.chunks.values()).filter(c => c.state === 'loaded');
    const loading = Array.from(this.chunks.values()).filter(c => c.state === 'loading');
    const visible = loaded.filter(c => this.isChunkVisible(c));
    
    this.stats.loadedChunks = loaded.length;
    this.stats.loadingChunks = loading.length;
    this.stats.totalChunks = this.chunks.size;
    this.stats.memoryUsedMB = loaded.reduce((sum, c) => sum + c.memorySize, 0) / (1024 * 1024);
    this.stats.visibleChunks = visible.length;
    this.stats.culledChunks = loaded.length - visible.length;
    this.stats.averageLoadTime = this.loadTimes.length > 0
      ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length
      : 0;
  }
  
  getStats(): StreamingStats {
    return { ...this.stats };
  }
  
  setConfig(config: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }
  
  getConfig(): StreamingConfig {
    return { ...this.config };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stop();
    
    for (const chunk of this.chunks.values()) {
      if (chunk.state === 'loaded') {
        this.unloadChunk(chunk);
      }
    }
    
    this.chunks.clear();
    this.octree.clear();
    this.loadQueue.clear();
    this.unloadQueue.clear();
    this.entityLODs.clear();
    this.removeAllListeners();
    
    WorldStreamingSystem.instance = null;
  }
}

// ============================================================================
// CHUNK LOADER INTERFACE
// ============================================================================

export interface ChunkLoadResult {
  data: any;
  terrainMesh: any;
  collisionMesh: any;
  memorySize: number;
  entities?: string[];
}

export interface ChunkLoader {
  loadChunk(id: string, lodLevel: LODLevel): Promise<ChunkLoadResult>;
  unloadChunk(id: string): void;
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from 'react';

interface WorldStreamingContextValue {
  system: WorldStreamingSystem;
}

const WorldStreamingContext = createContext<WorldStreamingContextValue | null>(null);

export function WorldStreamingProvider({ 
  children,
  config,
  chunkLoader,
}: { 
  children: React.ReactNode;
  config?: Partial<StreamingConfig>;
  chunkLoader?: ChunkLoader;
}) {
  const value = useMemo(() => ({
    system: new WorldStreamingSystem(config),
  }), []);
  
  useEffect(() => {
    if (chunkLoader) {
      value.system.setChunkLoader(chunkLoader);
    }
    value.system.start();
    
    return () => {
      value.system.dispose();
    };
  }, [value, chunkLoader]);
  
  return (
    <WorldStreamingContext.Provider value={value}>
      {children}
    </WorldStreamingContext.Provider>
  );
}

export function useWorldStreaming() {
  const context = useContext(WorldStreamingContext);
  if (!context) {
    return WorldStreamingSystem.getInstance();
  }
  return context.system;
}

export function useStreamingStats() {
  const system = useWorldStreaming();
  const [stats, setStats] = useState<StreamingStats>(system.getStats());
  
  useEffect(() => {
    const onUpdate = (newStats: StreamingStats) => setStats(newStats);
    system.on('update', onUpdate);
    
    return () => {
      system.off('update', onUpdate);
    };
  }, [system]);
  
  return stats;
}

export function useViewerPosition() {
  const system = useWorldStreaming();
  
  return useCallback((position: Vector3, direction?: Vector3) => {
    system.setViewerPosition(position, direction);
  }, [system]);
}

export function useVisibleChunks() {
  const system = useWorldStreaming();
  const [visible, setVisible] = useState<WorldChunk[]>([]);
  
  useEffect(() => {
    const update = () => setVisible(system.getVisibleChunks());
    
    system.on('update', update);
    system.on('chunkLoaded', update);
    system.on('chunkUnloaded', update);
    
    return () => {
      system.off('update', update);
      system.off('chunkLoaded', update);
      system.off('chunkUnloaded', update);
    };
  }, [system]);
  
  return visible;
}

export function useChunkState(position: Vector3) {
  const system = useWorldStreaming();
  const [chunk, setChunk] = useState<WorldChunk | undefined>();
  
  useEffect(() => {
    const update = () => setChunk(system.getChunkAtPosition(position));
    
    update();
    system.on('update', update);
    
    return () => {
      system.off('update', update);
    };
  }, [system, position.x, position.y, position.z]);
  
  return chunk;
}

export function useEntityLOD(entityId: string, initialPosition: Vector3) {
  const system = useWorldStreaming();
  const [lod, setLod] = useState<LODLevel>(4);
  
  useEffect(() => {
    system.registerEntity(entityId, initialPosition);
    
    const onLodChange = (entity: EntityLOD) => {
      if (entity.entityId === entityId) {
        setLod(entity.currentLOD);
      }
    };
    
    system.on('entityLODChanged', onLodChange);
    
    return () => {
      system.unregisterEntity(entityId);
      system.off('entityLODChanged', onLodChange);
    };
  }, [system, entityId]);
  
  const updatePosition = useCallback((position: Vector3) => {
    system.updateEntityPosition(entityId, position);
  }, [system, entityId]);
  
  return { lod, updatePosition };
}

export default {
  WorldStreamingSystem,
  Octree,
  WorldStreamingProvider,
  useWorldStreaming,
  useStreamingStats,
  useViewerPosition,
  useVisibleChunks,
  useChunkState,
  useEntityLOD,
};
