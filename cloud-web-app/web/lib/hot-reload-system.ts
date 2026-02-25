/**
 * Hot Reload System - Sistema de Recarga ao Vivo
 * 
 * Sistema profissional de hot reload para desenvolvimento:
 * - Watch de arquivos com WebSocket
 * - Hot Module Replacement (HMR)
 * - State preservation
 * - Script hot reload
 * - Asset hot reload (texturas, modelos, sons)
 * - Shader hot reload
 * - Scene state snapshot/restore
 * - Error recovery
 * - Live editing preview
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface HotReloadConfig {
  enabled: boolean;
  watchPaths: string[];
  debounceMs: number;
  preserveState: boolean;
  autoReconnect: boolean;
  reconnectIntervalMs: number;
  maxReconnectAttempts: number;
}

export interface FileChange {
  type: 'add' | 'change' | 'remove';
  path: string;
  timestamp: number;
  content?: string;
  hash?: string;
}

export interface ModuleState {
  id: string;
  state: unknown;
  version: number;
  timestamp: number;
}

export interface HotReloadEvent {
  type: 'reload' | 'update' | 'error' | 'connected' | 'disconnected';
  modules?: string[];
  error?: Error;
  timestamp: number;
}

type HotReloadCallback = (event: HotReloadEvent) => void;

// ============================================================================
// FILE WATCHER (WebSocket client)
// ============================================================================

export class FileWatcher {
  private ws: WebSocket | null = null;
  private config: HotReloadConfig;
  private callbacks: Map<string, ((change: FileChange) => void)[]> = new Map();
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges: FileChange[] = [];
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;
  
  constructor(config: Partial<HotReloadConfig> = {}) {
    this.config = {
      enabled: true,
      watchPaths: ['./src', './public', './assets'],
      debounceMs: 100,
      preserveState: true,
      autoReconnect: true,
      reconnectIntervalMs: 2000,
      maxReconnectAttempts: 10,
      ...config,
    };
  }
  
  connect(serverUrl: string = 'ws://localhost:3001'): void {
    if (!this.config.enabled) return;
    
    try {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        console.log('[HotReload] Connected to dev server');
        this.reconnectAttempts = 0;
        
        // Send watch paths
        this.ws?.send(JSON.stringify({
          type: 'watch',
          paths: this.config.watchPaths,
        }));
        
        this.emit('**', {
          type: 'change',
          path: '',
          timestamp: Date.now(),
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error('[HotReload] Failed to parse message:', e);
        }
      };
      
      this.ws.onclose = () => {
        console.log('[HotReload] Disconnected from dev server');
        this.attemptReconnect(serverUrl);
      };
      
      this.ws.onerror = (error) => {
        console.error('[HotReload] WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('[HotReload] Failed to connect:', error);
      this.attemptReconnect(serverUrl);
    }
  }
  
  private attemptReconnect(serverUrl: string): void {
    if (!this.config.autoReconnect) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[HotReload] Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`[HotReload] Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(serverUrl);
    }, this.config.reconnectIntervalMs);
  }
  
  private handleServerMessage(data: any): void {
    if (data.type === 'change') {
      const change: FileChange = {
        type: data.changeType || 'change',
        path: data.path,
        timestamp: Date.now(),
        content: data.content,
        hash: data.hash,
      };
      
      this.pendingChanges.push(change);
      this.scheduleEmit();
    }
  }
  
  private scheduleEmit(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      const changes = [...this.pendingChanges];
      this.pendingChanges = [];
      
      for (const change of changes) {
        this.emit(change.path, change);
        this.emit('**', change);
      }
    }, this.config.debounceMs);
  }
  
  watch(pattern: string, callback: (change: FileChange) => void): () => void {
    if (!this.callbacks.has(pattern)) {
      this.callbacks.set(pattern, []);
    }
    this.callbacks.get(pattern)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(pattern);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  private emit(pattern: string, change: FileChange): void {
    // Match exact pattern
    const exactCallbacks = this.callbacks.get(pattern);
    if (exactCallbacks) {
      for (const cb of exactCallbacks) {
        cb(change);
      }
    }
    
    // Match glob patterns
    for (const [p, callbacks] of this.callbacks) {
      if (this.matchGlob(change.path, p)) {
        for (const cb of callbacks) {
          cb(change);
        }
      }
    }
  }
  
  private matchGlob(path: string, pattern: string): boolean {
    if (pattern === '**') return true;
    if (pattern === path) return true;
    
    // Simple glob matching
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    
    return new RegExp(`^${regexPattern}$`).test(path);
  }
  
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============================================================================
// STATE MANAGER
// ============================================================================

export class StateManager {
  private states: Map<string, ModuleState> = new Map();
  private snapshots: Map<string, unknown> = new Map();
  private version: number = 0;
  
  saveState(moduleId: string, state: unknown): void {
    this.states.set(moduleId, {
      id: moduleId,
      state: this.deepClone(state),
      version: ++this.version,
      timestamp: Date.now(),
    });
  }
  
  restoreState(moduleId: string): unknown | null {
    const saved = this.states.get(moduleId);
    return saved ? this.deepClone(saved.state) : null;
  }
  
  createSnapshot(name: string = 'default'): void {
    const snapshot: Record<string, unknown> = {};
    for (const [id, moduleState] of this.states) {
      snapshot[id] = this.deepClone(moduleState.state);
    }
    this.snapshots.set(name, snapshot);
  }
  
  restoreSnapshot(name: string = 'default'): boolean {
    const snapshot = this.snapshots.get(name);
    if (!snapshot) return false;
    
    const states = snapshot as Record<string, unknown>;
    for (const [id, state] of Object.entries(states)) {
      this.states.set(id, {
        id,
        state: this.deepClone(state),
        version: ++this.version,
        timestamp: Date.now(),
      });
    }
    
    return true;
  }
  
  clear(moduleId?: string): void {
    if (moduleId) {
      this.states.delete(moduleId);
    } else {
      this.states.clear();
    }
  }
  
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    
    // Handle special types
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (obj instanceof Map) return new Map(obj) as unknown as T;
    if (obj instanceof Set) return new Set(obj) as unknown as T;
    if (ArrayBuffer.isView(obj)) return (obj as any).slice() as T;
    
    // Use structured clone if available
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(obj);
      } catch {
        // Fall through to JSON method
      }
    }
    
    // Fallback to JSON
    return JSON.parse(JSON.stringify(obj));
  }
  
  getModuleStates(): Map<string, ModuleState> {
    return new Map(this.states);
  }
}

// ============================================================================
// MODULE REGISTRY
// ============================================================================

interface HotModule {
  id: string;
  path: string;
  exports: unknown;
  accept?: (callback: () => void) => void;
  dispose?: (callback: (data: unknown) => void) => void;
  invalidate?: () => void;
  hot?: {
    accept: (deps?: string | string[], callback?: () => void) => void;
    dispose: (callback: (data: unknown) => void) => void;
    data: unknown;
  };
}

export class ModuleRegistry {
  private modules: Map<string, HotModule> = new Map();
  private disposeCallbacks: Map<string, ((data: unknown) => void)[]> = new Map();
  private acceptCallbacks: Map<string, (() => void)[]> = new Map();
  private moduleData: Map<string, unknown> = new Map();
  
  register(id: string, path: string, exports: unknown): HotModule {
    const hotModule: HotModule = {
      id,
      path,
      exports,
      hot: {
        accept: (deps, callback) => this.accept(id, deps, callback),
        dispose: (callback) => this.dispose(id, callback),
        data: this.moduleData.get(id),
      },
    };
    
    this.modules.set(id, hotModule);
    return hotModule;
  }
  
  private accept(id: string, deps?: string | string[], callback?: () => void): void {
    if (typeof deps === 'function') {
      callback = deps as () => void;
      deps = undefined;
    }
    
    if (callback) {
      if (!this.acceptCallbacks.has(id)) {
        this.acceptCallbacks.set(id, []);
      }
      this.acceptCallbacks.get(id)!.push(callback);
    }
  }
  
  private dispose(id: string, callback: (data: unknown) => void): void {
    if (!this.disposeCallbacks.has(id)) {
      this.disposeCallbacks.set(id, []);
    }
    this.disposeCallbacks.get(id)!.push(callback);
  }
  
  async reload(id: string, newExports: unknown): Promise<boolean> {
    const hotModule = this.modules.get(id);
    if (!hotModule) return false;
    
    // Run dispose callbacks
    const disposeCallbacks = this.disposeCallbacks.get(id) || [];
    const data: unknown = {};
    for (const cb of disposeCallbacks) {
      cb(data);
    }
    this.moduleData.set(id, data);
    
    // Update exports
    hotModule.exports = newExports;
    
    // Run accept callbacks
    const acceptCallbacks = this.acceptCallbacks.get(id) || [];
    for (const cb of acceptCallbacks) {
      cb();
    }
    
    return true;
  }
  
  get(id: string): HotModule | undefined {
    return this.modules.get(id);
  }
  
  has(id: string): boolean {
    return this.modules.has(id);
  }
  
  getAll(): Map<string, HotModule> {
    return new Map(this.modules);
  }
  
  clear(): void {
    this.modules.clear();
    this.disposeCallbacks.clear();
    this.acceptCallbacks.clear();
    this.moduleData.clear();
  }
}

// ============================================================================
// SCRIPT RELOADER
// ============================================================================

export class ScriptReloader {
  private scriptCache: Map<string, { script: HTMLScriptElement; hash: string }> = new Map();
  private registry: ModuleRegistry;
  
  constructor(registry: ModuleRegistry) {
    this.registry = registry;
  }
  
  async reloadScript(path: string, content?: string): Promise<boolean> {
    try {
      // Remove old script
      const cached = this.scriptCache.get(path);
      if (cached) {
        cached.script.remove();
      }
      
      // Create new script
      const script = document.createElement('script');
      script.type = 'module';
      
      if (content) {
        // Inline script with content
        const blob = new Blob([content], { type: 'text/javascript' });
        script.src = URL.createObjectURL(blob);
      } else {
        // External script with cache bust
        script.src = `${path}?t=${Date.now()}`;
      }
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          const hash = this.hashCode(content || path);
          this.scriptCache.set(path, { script, hash: hash.toString() });
          resolve(true);
        };
        script.onerror = (e) => {
          console.error(`[HotReload] Failed to reload script: ${path}`, e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error(`[HotReload] Script reload error:`, error);
      return false;
    }
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
  
  isLoaded(path: string): boolean {
    return this.scriptCache.has(path);
  }
}

// ============================================================================
// ASSET RELOADER
// ============================================================================

export class AssetReloader {
  private assetCache: Map<string, { data: unknown; hash: string; timestamp: number }> = new Map();
  private reloadHandlers: Map<string, ((path: string, newAsset: unknown) => void)[]> = new Map();
  
  registerHandler(extension: string, handler: (path: string, newAsset: unknown) => void): void {
    if (!this.reloadHandlers.has(extension)) {
      this.reloadHandlers.set(extension, []);
    }
    this.reloadHandlers.get(extension)!.push(handler);
  }
  
  async reloadTexture(path: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.assetCache.set(path, {
          data: img,
          hash: Date.now().toString(),
          timestamp: Date.now(),
        });
        this.notifyHandlers('texture', path, img);
        resolve(img);
      };
      img.onerror = () => {
        console.error(`[HotReload] Failed to reload texture: ${path}`);
        resolve(null);
      };
      img.src = `${path}?t=${Date.now()}`;
    });
  }
  
  async reloadJSON(path: string): Promise<unknown> {
    try {
      const response = await fetch(`${path}?t=${Date.now()}`);
      const data = await response.json();
      
      this.assetCache.set(path, {
        data,
        hash: Date.now().toString(),
        timestamp: Date.now(),
      });
      
      this.notifyHandlers('json', path, data);
      return data;
    } catch (error) {
      console.error(`[HotReload] Failed to reload JSON: ${path}`, error);
      return null;
    }
  }
  
  async reloadAudio(path: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(`${path}?t=${Date.now()}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      this.assetCache.set(path, {
        data: audioBuffer,
        hash: Date.now().toString(),
        timestamp: Date.now(),
      });
      
      this.notifyHandlers('audio', path, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`[HotReload] Failed to reload audio: ${path}`, error);
      return null;
    }
  }
  
  async reloadGLTF(path: string): Promise<unknown> {
    // This would integrate with Three.js GLTFLoader
    try {
      const response = await fetch(`${path}?t=${Date.now()}`);
      const data = await response.arrayBuffer();
      
      this.assetCache.set(path, {
        data,
        hash: Date.now().toString(),
        timestamp: Date.now(),
      });
      
      this.notifyHandlers('gltf', path, data);
      return data;
    } catch (error) {
      console.error(`[HotReload] Failed to reload GLTF: ${path}`, error);
      return null;
    }
  }
  
  private notifyHandlers(type: string, path: string, asset: unknown): void {
    const handlers = this.reloadHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler(path, asset);
      }
    }
  }
  
  getAsset(path: string): unknown {
    return this.assetCache.get(path)?.data;
  }
  
  clearCache(): void {
    this.assetCache.clear();
  }
}

// ============================================================================
// SHADER RELOADER
// ============================================================================

export class ShaderReloader {
  private shaderCache: Map<string, string> = new Map();
  private shaderMaterials: Map<string, WeakSet<any>> = new Map(); // WeakSet of materials using this shader
  private reloadCallbacks: ((path: string, source: string) => void)[] = [];
  
  registerMaterial(shaderPath: string, material: any): void {
    if (!this.shaderMaterials.has(shaderPath)) {
      this.shaderMaterials.set(shaderPath, new WeakSet());
    }
    this.shaderMaterials.get(shaderPath)!.add(material);
  }
  
  onReload(callback: (path: string, source: string) => void): () => void {
    this.reloadCallbacks.push(callback);
    return () => {
      const index = this.reloadCallbacks.indexOf(callback);
      if (index !== -1) {
        this.reloadCallbacks.splice(index, 1);
      }
    };
  }
  
  async reloadShader(path: string, content?: string): Promise<boolean> {
    try {
      let source = content;
      
      if (!source) {
        const response = await fetch(`${path}?t=${Date.now()}`);
        source = await response.text();
      }
      
      // Validate shader syntax (basic check)
      if (!this.validateShader(source)) {
        console.error(`[HotReload] Invalid shader syntax: ${path}`);
        return false;
      }
      
      // Update cache
      this.shaderCache.set(path, source);
      
      // Notify callbacks
      for (const cb of this.reloadCallbacks) {
        cb(path, source);
      }
      
      console.log(`[HotReload] Shader reloaded: ${path}`);
      return true;
    } catch (error) {
      console.error(`[HotReload] Failed to reload shader:`, error);
      return false;
    }
  }
  
  private validateShader(source: string): boolean {
    // Basic validation - check for common shader structures
    const hasMain = /void\s+main\s*\(/.test(source);
    const hasVersion = /#version\s+\d+/.test(source) || !source.includes('#version'); // Optional version
    
    return hasMain || hasVersion;
  }
  
  getShader(path: string): string | undefined {
    return this.shaderCache.get(path);
  }
}

// ============================================================================
// HOT RELOAD MANAGER
// ============================================================================

export class HotReloadManager {
  private static instance: HotReloadManager | null = null;
  
  private config: HotReloadConfig;
  private fileWatcher: FileWatcher;
  private stateManager: StateManager;
  private moduleRegistry: ModuleRegistry;
  private scriptReloader: ScriptReloader;
  private assetReloader: AssetReloader;
  private shaderReloader: ShaderReloader;
  
  private eventCallbacks: HotReloadCallback[] = [];
  private connected: boolean = false;
  
  private constructor(config: Partial<HotReloadConfig> = {}) {
    this.config = {
      enabled: true,
      watchPaths: ['./src', './lib', './components', './assets'],
      debounceMs: 100,
      preserveState: true,
      autoReconnect: true,
      reconnectIntervalMs: 2000,
      maxReconnectAttempts: 10,
      ...config,
    };
    
    this.fileWatcher = new FileWatcher(this.config);
    this.stateManager = new StateManager();
    this.moduleRegistry = new ModuleRegistry();
    this.scriptReloader = new ScriptReloader(this.moduleRegistry);
    this.assetReloader = new AssetReloader();
    this.shaderReloader = new ShaderReloader();
    
    this.setupWatchers();
  }
  
  static getInstance(config?: Partial<HotReloadConfig>): HotReloadManager {
    if (!HotReloadManager.instance) {
      HotReloadManager.instance = new HotReloadManager(config);
    }
    return HotReloadManager.instance;
  }
  
  private setupWatchers(): void {
    // Watch TypeScript/JavaScript
    this.fileWatcher.watch('**/*.{ts,tsx,js,jsx}', async (change) => {
      if (change.type === 'remove') return;
      
      console.log(`[HotReload] Script changed: ${change.path}`);
      
      // Save state before reload
      if (this.config.preserveState) {
        this.stateManager.createSnapshot('pre-reload');
      }
      
      const success = await this.scriptReloader.reloadScript(change.path, change.content);
      
      this.emitEvent({
        type: success ? 'reload' : 'error',
        modules: [change.path],
        timestamp: Date.now(),
      });
    });
    
    // Watch GLSL shaders
    this.fileWatcher.watch('**/*.{glsl,vert,frag,vs,fs}', async (change) => {
      if (change.type === 'remove') return;
      
      console.log(`[HotReload] Shader changed: ${change.path}`);
      const success = await this.shaderReloader.reloadShader(change.path, change.content);
      
      this.emitEvent({
        type: success ? 'update' : 'error',
        modules: [change.path],
        timestamp: Date.now(),
      });
    });
    
    // Watch textures
    this.fileWatcher.watch('**/*.{png,jpg,jpeg,webp,gif}', async (change) => {
      if (change.type === 'remove') return;
      
      console.log(`[HotReload] Texture changed: ${change.path}`);
      await this.assetReloader.reloadTexture(change.path);
      
      this.emitEvent({
        type: 'update',
        modules: [change.path],
        timestamp: Date.now(),
      });
    });
    
    // Watch JSON/config
    this.fileWatcher.watch('**/*.json', async (change) => {
      if (change.type === 'remove') return;
      
      console.log(`[HotReload] JSON changed: ${change.path}`);
      await this.assetReloader.reloadJSON(change.path);
      
      this.emitEvent({
        type: 'update',
        modules: [change.path],
        timestamp: Date.now(),
      });
    });
    
    // Watch audio
    this.fileWatcher.watch('**/*.{mp3,wav,ogg}', async (change) => {
      if (change.type === 'remove') return;
      
      console.log(`[HotReload] Audio changed: ${change.path}`);
      await this.assetReloader.reloadAudio(change.path);
      
      this.emitEvent({
        type: 'update',
        modules: [change.path],
        timestamp: Date.now(),
      });
    });
    
    // Watch 3D models
    this.fileWatcher.watch('**/*.{gltf,glb,fbx,obj}', async (change) => {
      if (change.type === 'remove') return;
      
      console.log(`[HotReload] Model changed: ${change.path}`);
      await this.assetReloader.reloadGLTF(change.path);
      
      this.emitEvent({
        type: 'update',
        modules: [change.path],
        timestamp: Date.now(),
      });
    });
  }
  
  connect(serverUrl?: string): void {
    if (!this.config.enabled) {
      console.log('[HotReload] Hot reload is disabled');
      return;
    }
    
    this.fileWatcher.connect(serverUrl);
    this.connected = true;
    
    this.emitEvent({
      type: 'connected',
      timestamp: Date.now(),
    });
  }
  
  disconnect(): void {
    this.fileWatcher.disconnect();
    this.connected = false;
    
    this.emitEvent({
      type: 'disconnected',
      timestamp: Date.now(),
    });
  }
  
  // Event handling
  on(callback: HotReloadCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index !== -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }
  
  private emitEvent(event: HotReloadEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
  
  // State management
  saveModuleState(moduleId: string, state: unknown): void {
    this.stateManager.saveState(moduleId, state);
  }
  
  getModuleState(moduleId: string): unknown | null {
    return this.stateManager.restoreState(moduleId);
  }
  
  createSnapshot(name?: string): void {
    this.stateManager.createSnapshot(name);
  }
  
  restoreSnapshot(name?: string): boolean {
    return this.stateManager.restoreSnapshot(name);
  }
  
  // Module registration
  registerModule(id: string, path: string, exports: unknown): void {
    this.moduleRegistry.register(id, path, exports);
  }
  
  // Asset reloader access
  onTextureReload(handler: (path: string, texture: unknown) => void): void {
    this.assetReloader.registerHandler('texture', handler);
  }
  
  onShaderReload(callback: (path: string, source: string) => void): () => void {
    return this.shaderReloader.onReload(callback);
  }
  
  registerShaderMaterial(shaderPath: string, material: unknown): void {
    this.shaderReloader.registerMaterial(shaderPath, material);
  }
  
  // Getters
  isConnected(): boolean {
    return this.connected;
  }
  
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  getConfig(): HotReloadConfig {
    return { ...this.config };
  }
  
  // Cleanup
  dispose(): void {
    this.disconnect();
    this.moduleRegistry.clear();
    this.stateManager.clear();
    this.assetReloader.clearCache();
    HotReloadManager.instance = null;
  }
}

// ============================================================================
// HOT RELOAD OVERLAY UI
// ============================================================================

export { HotReloadOverlay } from './hot-reload-overlay';

// ============================================================================
// EXPORTS
// ============================================================================

export const hotReload = HotReloadManager.getInstance();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).hotReload = {
    manager: hotReload,
    connect: (url?: string) => hotReload.connect(url),
    disconnect: () => hotReload.disconnect(),
    createSnapshot: (name?: string) => hotReload.createSnapshot(name),
    restoreSnapshot: (name?: string) => hotReload.restoreSnapshot(name),
  };
}
