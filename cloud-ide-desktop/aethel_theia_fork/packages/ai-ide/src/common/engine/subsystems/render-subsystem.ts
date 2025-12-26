import { injectable } from 'inversify';
import { IEngineSubsystem, SubsystemPriority, EngineState, EngineMode } from '../aethel-engine-runtime';

// ============================================================================
// RENDER SUBSYSTEM
// Integrates rendering into the Aethel Engine Runtime
// Abstracts WebGL/WebGPU rendering for the engine
// ============================================================================

/**
 * Render configuration
 */
export interface RenderConfig {
  width: number;
  height: number;
  pixelRatio: number;
  antialias: boolean;
  shadowMapEnabled: boolean;
  shadowMapSize: number;
  maxLights: number;
  toneMappingExposure: number;
  gammaCorrection: boolean;
}

/**
 * Render pass types
 */
export type RenderPassType = 
  | 'shadow'
  | 'depth'
  | 'gbuffer'
  | 'lighting'
  | 'forward'
  | 'transparent'
  | 'postprocess'
  | 'ui';

/**
 * Camera definition
 */
export interface Camera {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  fov: number;
  near: number;
  far: number;
  aspectRatio: number;
  projectionMatrix: number[];
  viewMatrix: number[];
}

/**
 * Renderable object
 */
export interface Renderable {
  entityId: string;
  meshId: string;
  materialId: string;
  transform: number[]; // 4x4 matrix
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  layer: number;
}

/**
 * Light types
 */
export type LightType = 'directional' | 'point' | 'spot' | 'area';

/**
 * Light definition
 */
export interface Light {
  id: string;
  type: LightType;
  color: [number, number, number];
  intensity: number;
  position: [number, number, number];
  direction?: [number, number, number];
  range?: number;
  innerAngle?: number;
  outerAngle?: number;
  castShadow: boolean;
}

@injectable()
export class RenderSubsystem implements IEngineSubsystem {
  readonly name = 'RenderSubsystem';
  readonly priority: SubsystemPriority = 'core';
  
  private _isInitialized = false;
  private _isEnabled = true;
  
  // Performance tracking
  public lastTickTime = 0;
  
  // Render state
  private config: RenderConfig = {
    width: 1920,
    height: 1080,
    pixelRatio: 1,
    antialias: true,
    shadowMapEnabled: true,
    shadowMapSize: 2048,
    maxLights: 16,
    toneMappingExposure: 1.0,
    gammaCorrection: true,
  };
  
  // Scene objects
  private cameras: Map<string, Camera> = new Map();
  private renderables: Map<string, Renderable> = new Map();
  private lights: Map<string, Light> = new Map();
  private activeCamera: string | null = null;
  
  // Stats
  private drawCalls = 0;
  private triangleCount = 0;
  private frameNumber = 0;
  
  // WebGL context (would be actual WebGL2RenderingContext in production)
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  get isInitialized(): boolean {
    return this._isInitialized;
  }
  
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  async initialize(): Promise<void> {
    console.log('[RenderSubsystem] Initializing...');
    
    // Try to create WebGL context
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
      
      try {
        this.gl = this.canvas.getContext('webgl2', {
          antialias: this.config.antialias,
          alpha: false,
          depth: true,
          stencil: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
        });
        
        if (this.gl) {
          console.log('[RenderSubsystem] WebGL2 context created');
          this.initializeGL();
        }
      } catch (error) {
        console.warn('[RenderSubsystem] WebGL2 not available:', error);
      }
    }
    
    this._isInitialized = true;
    console.log('[RenderSubsystem] Initialized');
  }

  private initializeGL(): void {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    // Set default state
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    
    // Clear color
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    
    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  async shutdown(): Promise<void> {
    console.log('[RenderSubsystem] Shutting down...');
    
    // Clean up resources
    this.cameras.clear();
    this.renderables.clear();
    this.lights.clear();
    
    if (this.gl) {
      // Would release WebGL resources here
      this.gl = null;
    }
    
    if (this.canvas) {
      this.canvas = null;
    }
    
    this._isInitialized = false;
    console.log('[RenderSubsystem] Shutdown complete');
  }

  tick(_deltaTime: number): void {
    if (!this._isEnabled || !this._isInitialized) return;
    
    const startTime = performance.now();
    
    // Reset stats
    this.drawCalls = 0;
    this.triangleCount = 0;
    
    // Render frame
    this.renderFrame();
    
    this.frameNumber++;
    this.lastTickTime = performance.now() - startTime;
  }

  onEngineStateChange(state: EngineState): void {
    if (state === 'paused') {
      // Keep rendering but at lower rate
    } else if (state === 'running') {
      this._isEnabled = true;
    }
  }

  onEngineModeChange(mode: EngineMode): void {
    // Adjust rendering based on mode
    if (mode === 'editor') {
      // Enable editor-specific rendering (gizmos, grid, etc.)
    } else if (mode === 'play-in-editor' || mode === 'standalone') {
      // Game rendering mode
    }
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  setConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.canvas) {
      this.canvas.width = this.config.width;
      this.canvas.height = this.config.height;
    }
    
    if (this.gl) {
      this.gl.viewport(0, 0, this.config.width, this.config.height);
    }
  }

  resize(width: number, height: number): void {
    this.setConfig({ width, height });
    
    // Update camera aspect ratios
    const aspectRatio = width / height;
    for (const camera of this.cameras.values()) {
      camera.aspectRatio = aspectRatio;
      this.updateCameraMatrices(camera);
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  // ========================================================================
  // CAMERA MANAGEMENT
  // ========================================================================

  createCamera(id: string, options: Partial<Camera> = {}): Camera {
    const camera: Camera = {
      id,
      position: options.position || [0, 0, 5],
      rotation: options.rotation || [0, 0, 0, 1],
      fov: options.fov || 60,
      near: options.near || 0.1,
      far: options.far || 1000,
      aspectRatio: options.aspectRatio || this.config.width / this.config.height,
      projectionMatrix: [],
      viewMatrix: [],
    };
    
    this.updateCameraMatrices(camera);
    this.cameras.set(id, camera);
    
    if (!this.activeCamera) {
      this.activeCamera = id;
    }
    
    return camera;
  }

  setActiveCamera(id: string): void {
    if (this.cameras.has(id)) {
      this.activeCamera = id;
    }
  }

  updateCameraMatrices(camera: Camera): void {
    // Perspective projection matrix
    const f = 1.0 / Math.tan((camera.fov * Math.PI / 180) / 2);
    const rangeInv = 1 / (camera.near - camera.far);
    
    camera.projectionMatrix = [
      f / camera.aspectRatio, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (camera.near + camera.far) * rangeInv, -1,
      0, 0, camera.near * camera.far * rangeInv * 2, 0
    ];
    
    // View matrix (simplified - would use quaternion in production)
    camera.viewMatrix = this.createViewMatrix(camera.position, camera.rotation);
  }

  private createViewMatrix(position: [number, number, number], _rotation: [number, number, number, number]): number[] {
    // Simplified view matrix - in production would use proper quaternion math
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -position[0], -position[1], -position[2], 1
    ];
  }

  // ========================================================================
  // RENDERABLE MANAGEMENT
  // ========================================================================

  addRenderable(entityId: string, options: Partial<Renderable> = {}): Renderable {
    const renderable: Renderable = {
      entityId,
      meshId: options.meshId || 'default',
      materialId: options.materialId || 'default',
      transform: options.transform || [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
      visible: options.visible ?? true,
      castShadow: options.castShadow ?? true,
      receiveShadow: options.receiveShadow ?? true,
      layer: options.layer ?? 0,
    };
    
    this.renderables.set(entityId, renderable);
    return renderable;
  }

  removeRenderable(entityId: string): void {
    this.renderables.delete(entityId);
  }

  updateTransform(entityId: string, transform: number[]): void {
    const renderable = this.renderables.get(entityId);
    if (renderable) {
      renderable.transform = transform;
    }
  }

  // ========================================================================
  // LIGHT MANAGEMENT
  // ========================================================================

  addLight(id: string, options: Partial<Light> = {}): Light {
    const light: Light = {
      id,
      type: options.type || 'point',
      color: options.color || [1, 1, 1],
      intensity: options.intensity ?? 1,
      position: options.position || [0, 5, 0],
      direction: options.direction || [0, -1, 0],
      range: options.range ?? 10,
      innerAngle: options.innerAngle ?? 30,
      outerAngle: options.outerAngle ?? 45,
      castShadow: options.castShadow ?? false,
    };
    
    this.lights.set(id, light);
    return light;
  }

  removeLight(id: string): void {
    this.lights.delete(id);
  }

  // ========================================================================
  // RENDERING
  // ========================================================================

  private renderFrame(): void {
    if (!this.gl) {
      // Software rendering path for headless/server
      this.softwareRender();
      return;
    }
    
    const gl = this.gl;
    
    // Clear buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Get active camera
    const camera = this.activeCamera ? this.cameras.get(this.activeCamera) : null;
    if (!camera) return;
    
    // Shadow pass (if enabled)
    if (this.config.shadowMapEnabled) {
      this.renderShadows();
    }
    
    // Main pass - render all visible objects
    for (const renderable of this.renderables.values()) {
      if (!renderable.visible) continue;
      
      this.renderObject(renderable, camera);
    }
  }

  private softwareRender(): void {
    // Headless rendering - just update stats
    for (const renderable of this.renderables.values()) {
      if (renderable.visible) {
        this.drawCalls++;
        this.triangleCount += 100; // Placeholder
      }
    }
  }

  private renderShadows(): void {
    // Shadow mapping pass
    for (const light of this.lights.values()) {
      if (!light.castShadow) continue;
      
      // Would render shadow map here
      this.drawCalls++;
    }
  }

  private renderObject(renderable: Renderable, _camera: Camera): void {
    // In production, would:
    // 1. Bind shader program
    // 2. Set uniforms (MVP matrices, material properties)
    // 3. Bind mesh VAO
    // 4. Draw call
    
    this.drawCalls++;
    this.triangleCount += 100; // Placeholder
  }

  // ========================================================================
  // STATS
  // ========================================================================

  getStats(): Record<string, number> {
    return {
      drawCalls: this.drawCalls,
      triangles: this.triangleCount,
      renderables: this.renderables.size,
      lights: this.lights.size,
      cameras: this.cameras.size,
      frameNumber: this.frameNumber,
      lastTickTime: this.lastTickTime,
    };
  }
}
