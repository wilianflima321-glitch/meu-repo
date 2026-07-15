/**
 * @aethel-heavy-async-boundary
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
import { AssetCache } from './level-streaming-cache';
import { LevelLoader } from './level-streaming-loader';
import { StreamingProvider, useLevelState, useLevelStreaming } from './level-streaming-react';
import {
  calculateStreamingPriority,
  DEFAULT_STREAMING_CONFIG,
  disposeStreamingObject,
  getDistanceToLevelDefinition,
  sortStreamingLoadQueue,
} from './level-streaming-runtime';
import type {
  LevelDefinition,
  LevelInstance,
  LevelState,
  StreamingConfig,
  StreamingMetrics,
  StreamingPriority,
  TransitionConfig,
} from './level-streaming-types';

export type {
  LevelBounds,
  LevelDefinition,
  LevelInstance,
  LevelLoaderFn,
  LevelLoaderResult,
  LevelState,
  StreamingConfig,
  StreamingMetrics,
  StreamingPriority,
  TransitionConfig,
} from './level-streaming-types';

// ============================================================================
// ASSET CACHE
// ============================================================================

export { AssetCache } from './level-streaming-cache';

export { LevelLoader } from './level-streaming-loader';

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

    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };

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
    return getDistanceToLevelDefinition(definition, this.playerPosition);
  }

  private calculatePriority(distance: number): StreamingPriority {
    return calculateStreamingPriority(this.config, distance);
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
    sortStreamingLoadQueue(this.loadQueue);
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
      disposeStreamingObject(instance.scene);
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

export { StreamingProvider, useLevelState, useLevelStreaming } from './level-streaming-react';

const __defaultExport = {
  LevelStreamingManager,
  LevelLoader,
  AssetCache,
  StreamingProvider,
  useLevelStreaming,
  useLevelState,
};

export default __defaultExport;
