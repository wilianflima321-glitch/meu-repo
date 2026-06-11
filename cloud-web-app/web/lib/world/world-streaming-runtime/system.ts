/**
 * World Streaming - split runtime modules.
 *
 * World streaming stays behind Studio/game runtime boundaries; public route
 * shells should consume only summaries or manifests, never this runtime barrel.
 */

import { logger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';
import { Octree } from './octree';
import { PriorityQueue } from './priority-queue';
import type { BoundingBox, ChunkLoader, EntityLOD, LODLevel, LODConfig, StreamingConfig, StreamingStats, Vector3, WorldChunk } from './types';

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
    
    this.config = createDefaultStreamingConfig(config);
    
    this.octree = new Octree(WORLD_STREAMING_BOUNDS);
    
    this.stats = createEmptyStreamingStats(this.config.memoryBudgetMB);
  }
  
  static getInstance(): WorldStreamingSystem {
    if (!WorldStreamingSystem.instance) {
      WorldStreamingSystem.instance = new WorldStreamingSystem();
    }
    return WorldStreamingSystem.instance;
  }
  
  
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
  
  
  registerChunk(position: Vector3, data?: unknown): WorldChunk {
    const id = getChunkId(position, this.config.chunkSize);
    
    if (this.chunks.has(id)) {
      return this.chunks.get(id)!;
    }
    
    const chunk = createRegisteredWorldChunk(position, this.config, data);
    
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
      logger.warn(`WorldStreaming update took ${elapsed.toFixed(2)}ms`);
    }
    
    this.emit('update', this.stats);
  }
  
  private updateChunkPriorities(): void {
    for (const chunk of this.chunks.values()) {
      const distance = getChunkDistance(chunk, this.viewerPosition);
      const viewAngle = getChunkViewAngle(chunk, this.viewerPosition, this.viewerDirection);
      
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
      chunk.lodLevel = this.calculateLODLevel(entityDistance);
    }
  }
  
  private queueChunkOperations(): void {
    for (const chunk of this.chunks.values()) {
      const distance = getChunkDistance(chunk, this.viewerPosition);
      
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
      logger.error(`Failed to load chunk ${chunk.id}:`, error);
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
  
  
  private calculateLODLevel(distance: number): LODLevel {
    for (const lod of this.config.lodLevels) {
      if (distance <= lod.distance) {
        return lod.level;
      }
    }
    return 4;
  }
  
  registerEntity(entityId: string, position: Vector3): void {
    const entityDistance = vectorDistance(position, this.viewerPosition);
    const lodLevel = this.calculateLODLevel(entityDistance);
    
    this.entityLODs.set(entityId, {
      entityId,
      currentLOD: lodLevel,
      targetLOD: lodLevel,
      distance: entityDistance,
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
    
    entity.distance = vectorDistance(position, this.viewerPosition);
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
  
  
  isChunkVisible(chunk: WorldChunk): boolean {
    if (!this.config.enableOcclusionCulling) return true;
    
    // Simple frustum check
    const viewAngle = getChunkViewAngle(chunk, this.viewerPosition, this.viewerDirection);
    if (viewAngle > Math.PI * 0.6) return false; // Behind viewer
    
    // Distance check
    const distance = getChunkDistance(chunk, this.viewerPosition);
    if (distance > this.config.viewDistance) return false;
    
    return true;
  }
  
  getVisibleChunks(): WorldChunk[] {
    return Array.from(this.chunks.values())
      .filter(c => c.state === 'loaded' && this.isChunkVisible(c));
  }
  
  
  getChunkAtPosition(position: Vector3): WorldChunk | undefined {
    const id = getChunkId(position, this.config.chunkSize);
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
