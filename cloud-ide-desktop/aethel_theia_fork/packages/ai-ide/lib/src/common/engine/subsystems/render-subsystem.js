"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderSubsystem = void 0;
const inversify_1 = require("inversify");
let RenderSubsystem = class RenderSubsystem {
    constructor() {
        this.name = 'RenderSubsystem';
        this.priority = 'core';
        this._isInitialized = false;
        this._isEnabled = true;
        // Performance tracking
        this.lastTickTime = 0;
        // Render state
        this.config = {
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
        this.cameras = new Map();
        this.renderables = new Map();
        this.lights = new Map();
        this.activeCamera = null;
        // Stats
        this.drawCalls = 0;
        this.triangleCount = 0;
        this.frameNumber = 0;
        // WebGL context (would be actual WebGL2RenderingContext in production)
        this.gl = null;
        this.canvas = null;
    }
    get isInitialized() {
        return this._isInitialized;
    }
    get isEnabled() {
        return this._isEnabled;
    }
    // ========================================================================
    // LIFECYCLE
    // ========================================================================
    async initialize() {
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
            }
            catch (error) {
                console.warn('[RenderSubsystem] WebGL2 not available:', error);
            }
        }
        this._isInitialized = true;
        console.log('[RenderSubsystem] Initialized');
    }
    initializeGL() {
        if (!this.gl)
            return;
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
    async shutdown() {
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
    tick(_deltaTime) {
        if (!this._isEnabled || !this._isInitialized)
            return;
        const startTime = performance.now();
        // Reset stats
        this.drawCalls = 0;
        this.triangleCount = 0;
        // Render frame
        this.renderFrame();
        this.frameNumber++;
        this.lastTickTime = performance.now() - startTime;
    }
    onEngineStateChange(state) {
        if (state === 'paused') {
            // Keep rendering but at lower rate
        }
        else if (state === 'running') {
            this._isEnabled = true;
        }
    }
    onEngineModeChange(mode) {
        // Adjust rendering based on mode
        if (mode === 'editor') {
            // Enable editor-specific rendering (gizmos, grid, etc.)
        }
        else if (mode === 'play-in-editor' || mode === 'standalone') {
            // Game rendering mode
        }
    }
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    setConfig(config) {
        this.config = { ...this.config, ...config };
        if (this.canvas) {
            this.canvas.width = this.config.width;
            this.canvas.height = this.config.height;
        }
        if (this.gl) {
            this.gl.viewport(0, 0, this.config.width, this.config.height);
        }
    }
    resize(width, height) {
        this.setConfig({ width, height });
        // Update camera aspect ratios
        const aspectRatio = width / height;
        for (const camera of this.cameras.values()) {
            camera.aspectRatio = aspectRatio;
            this.updateCameraMatrices(camera);
        }
    }
    getCanvas() {
        return this.canvas;
    }
    // ========================================================================
    // CAMERA MANAGEMENT
    // ========================================================================
    createCamera(id, options = {}) {
        const camera = {
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
    setActiveCamera(id) {
        if (this.cameras.has(id)) {
            this.activeCamera = id;
        }
    }
    updateCameraMatrices(camera) {
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
    createViewMatrix(position, _rotation) {
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
    addRenderable(entityId, options = {}) {
        const renderable = {
            entityId,
            meshId: options.meshId || 'default',
            materialId: options.materialId || 'default',
            transform: options.transform || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            visible: options.visible ?? true,
            castShadow: options.castShadow ?? true,
            receiveShadow: options.receiveShadow ?? true,
            layer: options.layer ?? 0,
        };
        this.renderables.set(entityId, renderable);
        return renderable;
    }
    removeRenderable(entityId) {
        this.renderables.delete(entityId);
    }
    updateTransform(entityId, transform) {
        const renderable = this.renderables.get(entityId);
        if (renderable) {
            renderable.transform = transform;
        }
    }
    // ========================================================================
    // LIGHT MANAGEMENT
    // ========================================================================
    addLight(id, options = {}) {
        const light = {
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
    removeLight(id) {
        this.lights.delete(id);
    }
    // ========================================================================
    // RENDERING
    // ========================================================================
    renderFrame() {
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
        if (!camera)
            return;
        // Shadow pass (if enabled)
        if (this.config.shadowMapEnabled) {
            this.renderShadows();
        }
        // Main pass - render all visible objects
        for (const renderable of this.renderables.values()) {
            if (!renderable.visible)
                continue;
            this.renderObject(renderable, camera);
        }
    }
    softwareRender() {
        // Headless rendering - just update stats
        for (const renderable of this.renderables.values()) {
            if (renderable.visible) {
                this.drawCalls++;
                this.triangleCount += 100; // Placeholder
            }
        }
    }
    renderShadows() {
        // Shadow mapping pass
        for (const light of this.lights.values()) {
            if (!light.castShadow)
                continue;
            // Would render shadow map here
            this.drawCalls++;
        }
    }
    renderObject(renderable, _camera) {
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
    getStats() {
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
};
exports.RenderSubsystem = RenderSubsystem;
exports.RenderSubsystem = RenderSubsystem = __decorate([
    (0, inversify_1.injectable)()
], RenderSubsystem);
