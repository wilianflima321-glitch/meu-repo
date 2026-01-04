import { IEngineSubsystem, SubsystemPriority, EngineState, EngineMode } from '../aethel-engine-runtime';
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
export type RenderPassType = 'shadow' | 'depth' | 'gbuffer' | 'lighting' | 'forward' | 'transparent' | 'postprocess' | 'ui';
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
    transform: number[];
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
export declare class RenderSubsystem implements IEngineSubsystem {
    readonly name = "RenderSubsystem";
    readonly priority: SubsystemPriority;
    private _isInitialized;
    private _isEnabled;
    lastTickTime: number;
    private config;
    private cameras;
    private renderables;
    private lights;
    private activeCamera;
    private drawCalls;
    private triangleCount;
    private frameNumber;
    private gl;
    private canvas;
    get isInitialized(): boolean;
    get isEnabled(): boolean;
    initialize(): Promise<void>;
    private initializeGL;
    shutdown(): Promise<void>;
    tick(_deltaTime: number): void;
    onEngineStateChange(state: EngineState): void;
    onEngineModeChange(mode: EngineMode): void;
    setConfig(config: Partial<RenderConfig>): void;
    resize(width: number, height: number): void;
    getCanvas(): HTMLCanvasElement | null;
    createCamera(id: string, options?: Partial<Camera>): Camera;
    setActiveCamera(id: string): void;
    updateCameraMatrices(camera: Camera): void;
    private createViewMatrix;
    addRenderable(entityId: string, options?: Partial<Renderable>): Renderable;
    removeRenderable(entityId: string): void;
    updateTransform(entityId: string, transform: number[]): void;
    addLight(id: string, options?: Partial<Light>): Light;
    removeLight(id: string): void;
    private renderFrame;
    private softwareRender;
    private renderShadows;
    private renderObject;
    getStats(): Record<string, number>;
}
