/**
 * Level Streaming System - Sistema de Streaming de Níveis
 * 
 * Sistema completo de streaming com:
 * - Async level loading/unloading
 * - Distance-based streaming
 * - Level transitions
 * - Asset preloading
 * - Memory management
 * - Loading screens
 * - Sub-levels (additive loading)
 * 
 * @module lib/streaming/level-streaming-system
 */

import { EventEmitter } from 'events';
import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export type LevelState = 'unloaded' | 'loading' | 'loaded' | 'visible' | 'unloading';
export type StreamingPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export interface LevelDefinition {
  id: string;
  name: string;
  path: string;
  persistent?: boolean;
  streamingDistance?: number;
  bounds?: LevelBounds;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface LevelBounds {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface LevelInstance {
  definition: LevelDefinition;
  state: LevelState;
  progress: number;
  scene: THREE.Object3D | null;
  assets: Set<string>;
  loadedAt: number | null;
  lastVisibleAt: number | null;
  error: Error | null;
}

export interface StreamingConfig {
  maxConcurrentLoads: number;
  streamingDistance: number;
  unloadDistance: number;
  preloadDistance: number;
  memoryBudgetMB: number;
  checkInterval: number;
  minLoadTimeMs: number; // Minimum loading time for smooth transitions
}

export interface TransitionConfig {
  type: 'instant' | 'fade' | 'loading_screen' | 'custom';
  duration?: number;
  loadingScreen?: {
    minDisplayTime: number;
    showProgress: boolean;
    backgroundImage?: string;
    tips?: string[];
  };
}

export interface StreamingMetrics {
  loadedLevels: number;
  totalMemoryMB: number;
  currentLoads: number;
  averageLoadTime: number;
  cacheHitRate: number;
}

// ============================================================================
// ASSET CACHE
// ============================================================================

export class AssetCache {
  private cache: Map<string, { data: unknown; size: number; lastAccess: number }> = new Map();
  private totalSize = 0;
  private maxSizeMB: number;
  
  constructor(maxSizeMB = 512) {
    this.maxSizeMB = maxSizeMB;
  }
  
  set(key: string, data: unknown, sizeMB: number): void {
    // Evict if necessary
    while (this.totalSize + sizeMB > this.maxSizeMB && this.cache.size > 0) {
      this.evictOldest();
    }
    
    const existing = this.cache.get(key);
    if (existing) {
      this.totalSize -= existing.size;
    }
    
    this.cache.set(key, {
      data,
      size: sizeMB,
      lastAccess: Date.now(),
    });
    
    this.totalSize += sizeMB;
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    entry.lastAccess = Date.now();
    return entry.data as T;
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.cache.delete(key);
    }
  }
  
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }
  
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
  
  getMemoryUsage(): number {
    return this.totalSize;
  }
  
  getStats(): { count: number; sizeMB: number; maxSizeMB: number } {
    return {
      count: this.cache.size,
      sizeMB: this.totalSize,
      maxSizeMB: this.maxSizeMB,
    };
  }
}

// ============================================================================
// LEVEL LOADER
// ============================================================================

export interface LevelLoaderResult {
  scene: THREE.Object3D;
  assets: string[];
  metadata?: Record<string, unknown>;
}

export type LevelLoaderFn = (
  definition: LevelDefinition,
  onProgress: (progress: number) => void
) => Promise<LevelLoaderResult>;

export class LevelLoader {
  private loaders: Map<string, LevelLoaderFn> = new Map();
  private defaultLoader: LevelLoaderFn;
  
  constructor() {
    this.defaultLoader = this.createDefaultLoader();
  }
  
  registerLoader(extension: string, loader: LevelLoaderFn): void {
    this.loaders.set(extension.toLowerCase(), loader);
  }
  
  setDefaultLoader(loader: LevelLoaderFn): void {
    this.defaultLoader = loader;
  }
  
  async load(
    definition: LevelDefinition,
    onProgress: (progress: number) => void
  ): Promise<LevelLoaderResult> {
    const extension = definition.path.split('.').pop()?.toLowerCase() || '';
    const loader = this.loaders.get(extension) || this.defaultLoader;
    
    return loader(definition, onProgress);
  }
  
  private createDefaultLoader(): LevelLoaderFn {
    return async (definition, onProgress) => {
      // Simulated loading for demonstration
      // In production, this would load actual level data
      
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        onProgress(i / steps);
      }
      
      // Create a placeholder scene
      const scene = new THREE.Group();
      scene.name = definition.name;
      
      // Add some placeholder geometry based on bounds
      if (definition.bounds) {
        const size = new THREE.Vector3(
          definition.bounds.max.x - definition.bounds.min.x,
          definition.bounds.max.y - definition.bounds.min.y,
          definition.bounds.max.z - definition.bounds.min.z
        );
        
        const center = new THREE.Vector3(
          (definition.bounds.min.x + definition.bounds.max.x) / 2,
          (definition.bounds.min.y + definition.bounds.max.y) / 2,
          (definition.bounds.min.z + definition.bounds.max.z) / 2
        );
        
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(size.x, size.z),
          new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.copy(center);
        ground.position.y = definition.bounds.min.y;
        scene.add(ground);
      }
      
      return {
        scene,
        assets: [],
        metadata: definition.metadata,
      };
    };
  }
}

// ============================================================================
// STREAMING MANAGER
// ============================================================================

export class LevelStreamingManager extends EventEmitter {
  private config: StreamingConfig;
  private levels: Map<string, LevelInstance> = new Map();
  private definitions: Map<string, LevelDefinition> = new Map();
  private currentLevel: string | null = null;
  private loadQueue: { levelId: string; priority: StreamingPriority }[] = [];
  private activeLoads = 0;
  private assetCache: AssetCache;
  private levelLoader: LevelLoader;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private rootScene: THREE.Scene | null = null;
  private loadTimes: number[] = [];
  
  constructor(config: Partial<StreamingConfig> = {}) {
    super();
    
    this.config = {
      maxConcurrentLoads: 2,
      streamingDistance: 100,
      unloadDistance: 150,
      preloadDistance: 200,
      memoryBudgetMB: 1024,
      checkInterval: 500,
      minLoadTimeMs: 500,
      ...config,
    };
    
    this.assetCache = new AssetCache(this.config.memoryBudgetMB);
    this.levelLoader = new LevelLoader();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  setRootScene(scene: THREE.Scene): void {
    this.rootScene = scene;
  }
  
  registerLevel(definition: LevelDefinition): void {
    this.definitions.set(definition.id, definition);
    
    this.levels.set(definition.id, {
      definition,
      state: 'unloaded',
      progress: 0,
      scene: null,
      assets: new Set(),
      loadedAt: null,
      lastVisibleAt: null,
      error: null,
    });
    
    this.emit('levelRegistered', { levelId: definition.id, definition });
  }
  
  registerLevels(definitions: LevelDefinition[]): void {
    for (const definition of definitions) {
      this.registerLevel(definition);
    }
  }
  
  // ============================================================================
  // STREAMING CONTROL
  // ============================================================================
  
  startStreaming(): void {
    if (this.checkIntervalId) return;
    
    this.checkIntervalId = setInterval(() => {
      this.updateStreaming();
    }, this.config.checkInterval);
    
    this.emit('streamingStarted');
  }
  
  stopStreaming(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    
    this.emit('streamingStopped');
  }
  
  updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
  }
  
  private updateStreaming(): void {
    for (const [levelId, instance] of this.levels) {
      if (instance.definition.persistent) continue;
      
      const distance = this.getDistanceToLevel(instance.definition);
      
      if (instance.state === 'unloaded' || instance.state === 'loading') {
        // Check if should load
        if (distance <= this.config.preloadDistance) {
          const priority = this.calculatePriority(distance);
          this.queueLoad(levelId, priority);
        }
      } else if (instance.state === 'loaded' || instance.state === 'visible') {
        // Check if should unload
        if (distance > this.config.unloadDistance) {
          this.unloadLevel(levelId);
        } else if (distance <= this.config.streamingDistance) {
          this.showLevel(levelId);
        } else {
          this.hideLevel(levelId);
        }
      }
    }
    
    this.processLoadQueue();
  }
  
  private getDistanceToLevel(definition: LevelDefinition): number {
    if (!definition.bounds) {
      return Infinity;
    }
    
    const bounds = definition.bounds;
    const center = new THREE.Vector3(
      (bounds.min.x + bounds.max.x) / 2,
      (bounds.min.y + bounds.max.y) / 2,
      (bounds.min.z + bounds.max.z) / 2
    );
    
    return this.playerPosition.distanceTo(center);
  }
  
  private calculatePriority(distance: number): StreamingPriority {
    if (distance <= this.config.streamingDistance * 0.5) return 'critical';
    if (distance <= this.config.streamingDistance) return 'high';
    if (distance <= this.config.preloadDistance * 0.75) return 'normal';
    return 'low';
  }
  
  // ============================================================================
  // LOAD QUEUE
  // ============================================================================
  
  private queueLoad(levelId: string, priority: StreamingPriority): void {
    const existing = this.loadQueue.find((q) => q.levelId === levelId);
    if (existing) {
      // Update priority if higher
      const priorities: StreamingPriority[] = ['background', 'low', 'normal', 'high', 'critical'];
      if (priorities.indexOf(priority) > priorities.indexOf(existing.priority)) {
        existing.priority = priority;
      }
      return;
    }
    
    const instance = this.levels.get(levelId);
    if (!instance || instance.state !== 'unloaded') return;
    
    this.loadQueue.push({ levelId, priority });
    this.sortLoadQueue();
  }
  
  private sortLoadQueue(): void {
    const priorityOrder: Record<StreamingPriority, number> = {
      critical: 4,
      high: 3,
      normal: 2,
      low: 1,
      background: 0,
    };
    
    this.loadQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }
  
  private async processLoadQueue(): Promise<void> {
    while (
      this.loadQueue.length > 0 &&
      this.activeLoads < this.config.maxConcurrentLoads
    ) {
      const next = this.loadQueue.shift();
      if (!next) break;
      
      const instance = this.levels.get(next.levelId);
      if (!instance || instance.state !== 'unloaded') continue;
      
      this.loadLevelInternal(next.levelId);
    }
  }
  
  // ============================================================================
  // LEVEL LOADING
  // ============================================================================
  
  async loadLevel(
    levelId: string,
    options: { priority?: StreamingPriority; waitForLoad?: boolean } = {}
  ): Promise<boolean> {
    const instance = this.levels.get(levelId);
    if (!instance) return false;
    
    if (instance.state === 'loaded' || instance.state === 'visible') {
      return true;
    }
    
    const priority = options.priority || 'high';
    
    if (options.waitForLoad) {
      return this.loadLevelInternal(levelId);
    } else {
      this.queueLoad(levelId, priority);
      return true;
    }
  }
  
  private async loadLevelInternal(levelId: string): Promise<boolean> {
    const instance = this.levels.get(levelId);
    if (!instance) return false;
    
    if (instance.state !== 'unloaded') return false;
    
    // Load dependencies first
    if (instance.definition.dependencies) {
      for (const depId of instance.definition.dependencies) {
        await this.loadLevel(depId, { waitForLoad: true });
      }
    }
    
    instance.state = 'loading';
    instance.progress = 0;
    this.activeLoads++;
    
    const startTime = Date.now();
    
    this.emit('levelLoadStarted', { levelId, definition: instance.definition });
    
    try {
      const result = await this.levelLoader.load(
        instance.definition,
        (progress) => {
          instance.progress = progress;
          this.emit('levelLoadProgress', { levelId, progress });
        }
      );
      
      // Ensure minimum load time for smooth transitions
      const elapsed = Date.now() - startTime;
      if (elapsed < this.config.minLoadTimeMs) {
        await new Promise((resolve) => 
          setTimeout(resolve, this.config.minLoadTimeMs - elapsed)
        );
      }
      
      instance.scene = result.scene;
      instance.assets = new Set(result.assets);
      instance.state = 'loaded';
      instance.progress = 1;
      instance.loadedAt = Date.now();
      instance.error = null;
      
      // Track load time
      this.loadTimes.push(Date.now() - startTime);
      if (this.loadTimes.length > 100) {
        this.loadTimes.shift();
      }
      
      this.emit('levelLoaded', { levelId, scene: result.scene });
      
      return true;
    } catch (error) {
      instance.state = 'unloaded';
      instance.progress = 0;
      instance.error = error as Error;
      
      this.emit('levelLoadError', { levelId, error });
      
      return false;
    } finally {
      this.activeLoads--;
    }
  }
  
  // ============================================================================
  // LEVEL VISIBILITY
  // ============================================================================
  
  showLevel(levelId: string): void {
    const instance = this.levels.get(levelId);
    if (!instance || instance.state !== 'loaded') return;
    
    if (this.rootScene && instance.scene) {
      this.rootScene.add(instance.scene);
    }
    
    instance.state = 'visible';
    instance.lastVisibleAt = Date.now();
    
    this.emit('levelShown', { levelId });
  }
  
  hideLevel(levelId: string): void {
    const instance = this.levels.get(levelId);
    if (!instance || instance.state !== 'visible') return;
    
    if (this.rootScene && instance.scene) {
      this.rootScene.remove(instance.scene);
    }
    
    instance.state = 'loaded';
    
    this.emit('levelHidden', { levelId });
  }
  
  // ============================================================================
  // LEVEL UNLOADING
  // ============================================================================
  
  async unloadLevel(levelId: string): Promise<void> {
    const instance = this.levels.get(levelId);
    if (!instance) return;
    
    if (instance.definition.persistent) return;
    if (instance.state === 'unloaded' || instance.state === 'unloading') return;
    
    // Remove from scene first
    if (instance.state === 'visible') {
      this.hideLevel(levelId);
    }
    
    instance.state = 'unloading';
    
    this.emit('levelUnloadStarted', { levelId });
    
    // Dispose of scene resources
    if (instance.scene) {
      this.disposeObject(instance.scene);
      instance.scene = null;
    }
    
    // Remove cached assets
    for (const assetId of instance.assets) {
      this.assetCache.delete(assetId);
    }
    instance.assets.clear();
    
    instance.state = 'unloaded';
    instance.loadedAt = null;
    instance.lastVisibleAt = null;
    
    this.emit('levelUnloaded', { levelId });
  }
  
  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        
        if (Array.isArray(child.material)) {
          for (const material of child.material) {
            this.disposeMaterial(material);
          }
        } else if (child.material) {
          this.disposeMaterial(child.material);
        }
      }
    });
  }
  
  private disposeMaterial(material: THREE.Material): void {
    material.dispose();
    
    // Dispose textures
    const mat = material as THREE.MeshStandardMaterial;
    mat.map?.dispose();
    mat.normalMap?.dispose();
    mat.roughnessMap?.dispose();
    mat.metalnessMap?.dispose();
    mat.aoMap?.dispose();
    mat.emissiveMap?.dispose();
  }
  
  // ============================================================================
  // LEVEL TRANSITIONS
  // ============================================================================
  
  async transitionToLevel(
    levelId: string,
    transition: TransitionConfig = { type: 'instant' }
  ): Promise<boolean> {
    const targetDef = this.definitions.get(levelId);
    if (!targetDef) return false;
    
    this.emit('transitionStarted', { from: this.currentLevel, to: levelId, transition });
    
    if (transition.type === 'fade') {
      await this.fadeTransition(levelId, transition.duration || 500);
    } else if (transition.type === 'loading_screen') {
      await this.loadingScreenTransition(levelId, transition);
    } else {
      await this.instantTransition(levelId);
    }
    
    this.currentLevel = levelId;
    
    this.emit('transitionCompleted', { from: this.currentLevel, to: levelId });
    
    return true;
  }
  
  private async instantTransition(levelId: string): Promise<void> {
    // Unload all non-persistent, non-target levels
    for (const [id, instance] of this.levels) {
      if (id !== levelId && !instance.definition.persistent) {
        await this.unloadLevel(id);
      }
    }
    
    // Load and show target level
    await this.loadLevel(levelId, { waitForLoad: true });
    this.showLevel(levelId);
  }
  
  private async fadeTransition(levelId: string, duration: number): Promise<void> {
    // Fade out
    this.emit('fadeOut', { duration });
    await new Promise((resolve) => setTimeout(resolve, duration));
    
    // Perform instant transition while faded
    await this.instantTransition(levelId);
    
    // Fade in
    this.emit('fadeIn', { duration });
    await new Promise((resolve) => setTimeout(resolve, duration));
  }
  
  private async loadingScreenTransition(
    levelId: string,
    transition: TransitionConfig
  ): Promise<void> {
    const loadingConfig = transition.loadingScreen || {
      minDisplayTime: 1000,
      showProgress: true,
    };
    
    const startTime = Date.now();
    
    // Show loading screen
    this.emit('loadingScreenShow', { config: loadingConfig });
    
    // Unload old levels
    for (const [id, instance] of this.levels) {
      if (id !== levelId && !instance.definition.persistent) {
        await this.unloadLevel(id);
      }
    }
    
    // Load new level
    await this.loadLevel(levelId, { waitForLoad: true });
    
    // Ensure minimum display time
    const elapsed = Date.now() - startTime;
    if (elapsed < loadingConfig.minDisplayTime) {
      await new Promise((resolve) => 
        setTimeout(resolve, loadingConfig.minDisplayTime - elapsed)
      );
    }
    
    // Hide loading screen and show level
    this.emit('loadingScreenHide');
    this.showLevel(levelId);
  }
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  getLevel(levelId: string): LevelInstance | undefined {
    return this.levels.get(levelId);
  }
  
  getLevelState(levelId: string): LevelState | undefined {
    return this.levels.get(levelId)?.state;
  }
  
  getCurrentLevel(): string | null {
    return this.currentLevel;
  }
  
  getLoadedLevels(): LevelInstance[] {
    return Array.from(this.levels.values()).filter(
      (l) => l.state === 'loaded' || l.state === 'visible'
    );
  }
  
  getVisibleLevels(): LevelInstance[] {
    return Array.from(this.levels.values()).filter((l) => l.state === 'visible');
  }
  
  getMetrics(): StreamingMetrics {
    const loaded = this.getLoadedLevels();
    const avgLoadTime = this.loadTimes.length > 0
      ? this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length
      : 0;
    
    return {
      loadedLevels: loaded.length,
      totalMemoryMB: this.assetCache.getMemoryUsage(),
      currentLoads: this.activeLoads,
      averageLoadTime: avgLoadTime,
      cacheHitRate: 0, // Would need to track cache hits/misses
    };
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  getLevelLoader(): LevelLoader {
    return this.levelLoader;
  }
  
  getAssetCache(): AssetCache {
    return this.assetCache;
  }
  
  setConfig(config: Partial<StreamingConfig>): void {
    Object.assign(this.config, config);
  }
  
  getConfig(): StreamingConfig {
    return { ...this.config };
  }
  
  dispose(): void {
    this.stopStreaming();
    
    for (const levelId of this.levels.keys()) {
      this.unloadLevel(levelId);
    }
    
    this.levels.clear();
    this.definitions.clear();
    this.loadQueue = [];
    this.assetCache.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';

const StreamingContext = createContext<LevelStreamingManager | null>(null);

export function StreamingProvider({ 
  children,
  config,
  scene,
}: { 
  children: React.ReactNode;
  config?: Partial<StreamingConfig>;
  scene?: THREE.Scene;
}) {
  const managerRef = useRef<LevelStreamingManager>(new LevelStreamingManager(config));
  
  useEffect(() => {
    if (scene) {
      managerRef.current.setRootScene(scene);
    }
  }, [scene]);
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <StreamingContext.Provider value={managerRef.current}>
      {children}
    </StreamingContext.Provider>
  );
}

export function useLevelStreaming() {
  const manager = useContext(StreamingContext);
  if (!manager) {
    throw new Error('useLevelStreaming must be used within a StreamingProvider');
  }
  
  const [metrics, setMetrics] = useState<StreamingMetrics>(manager.getMetrics());
  const [currentLevel, setCurrentLevel] = useState<string | null>(manager.getCurrentLevel());
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    const updateMetrics = () => setMetrics(manager.getMetrics());
    const handleTransitionStart = () => setIsTransitioning(true);
    const handleTransitionEnd = ({ to }: { to: string }) => {
      setIsTransitioning(false);
      setCurrentLevel(to);
    };
    
    manager.on('levelLoaded', updateMetrics);
    manager.on('levelUnloaded', updateMetrics);
    manager.on('transitionStarted', handleTransitionStart);
    manager.on('transitionCompleted', handleTransitionEnd);
    
    const interval = setInterval(updateMetrics, 1000);
    
    return () => {
      manager.off('levelLoaded', updateMetrics);
      manager.off('levelUnloaded', updateMetrics);
      manager.off('transitionStarted', handleTransitionStart);
      manager.off('transitionCompleted', handleTransitionEnd);
      clearInterval(interval);
    };
  }, [manager]);
  
  const loadLevel = useCallback(async (levelId: string, waitForLoad = true) => {
    return manager.loadLevel(levelId, { waitForLoad });
  }, [manager]);
  
  const unloadLevel = useCallback(async (levelId: string) => {
    return manager.unloadLevel(levelId);
  }, [manager]);
  
  const transitionTo = useCallback(async (levelId: string, transition?: TransitionConfig) => {
    return manager.transitionToLevel(levelId, transition);
  }, [manager]);
  
  const updatePlayerPosition = useCallback((position: THREE.Vector3) => {
    manager.updatePlayerPosition(position);
  }, [manager]);
  
  return {
    manager,
    metrics,
    currentLevel,
    isTransitioning,
    loadLevel,
    unloadLevel,
    transitionTo,
    updatePlayerPosition,
    startStreaming: manager.startStreaming.bind(manager),
    stopStreaming: manager.stopStreaming.bind(manager),
    registerLevel: manager.registerLevel.bind(manager),
    registerLevels: manager.registerLevels.bind(manager),
  };
}

export function useLevelState(levelId: string) {
  const { manager } = useLevelStreaming();
  const [state, setState] = useState<LevelState | undefined>(manager.getLevelState(levelId));
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const handleProgress = ({ levelId: id, progress: p }: { levelId: string; progress: number }) => {
      if (id === levelId) setProgress(p);
    };
    
    const handleStateChange = ({ levelId: id }: { levelId: string }) => {
      if (id === levelId) {
        setState(manager.getLevelState(levelId));
      }
    };
    
    manager.on('levelLoadProgress', handleProgress);
    manager.on('levelLoadStarted', handleStateChange);
    manager.on('levelLoaded', handleStateChange);
    manager.on('levelUnloaded', handleStateChange);
    manager.on('levelShown', handleStateChange);
    manager.on('levelHidden', handleStateChange);
    
    return () => {
      manager.off('levelLoadProgress', handleProgress);
      manager.off('levelLoadStarted', handleStateChange);
      manager.off('levelLoaded', handleStateChange);
      manager.off('levelUnloaded', handleStateChange);
      manager.off('levelShown', handleStateChange);
      manager.off('levelHidden', handleStateChange);
    };
  }, [manager, levelId]);
  
  return { state, progress };
}

const __defaultExport = {
  LevelStreamingManager,
  LevelLoader,
  AssetCache,
  StreamingProvider,
  useLevelStreaming,
  useLevelState,
};

export default __defaultExport;
