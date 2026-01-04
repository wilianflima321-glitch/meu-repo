import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * AETHEL ADVANCED RENDERING SYSTEM
 * ============================================================================
 *
 * Sistema de renderização AAA com features modernas:
 * - Lumen-like Global Illumination (Software ray tracing)
 * - Screen Space Reflections (SSR)
 * - Screen Space Ambient Occlusion (SSAO/GTAO)
 * - Temporal Anti-Aliasing (TAA)
 * - Volumetric Lighting/Fog
 * - Virtual Shadow Maps
 * - Deferred/Forward+ rendering
 * - Post-processing pipeline
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface Matrix4x4 {
    m: Float32Array;
}
export interface Camera {
    position: Vector3;
    target: Vector3;
    up: Vector3;
    fov: number;
    near: number;
    far: number;
    aspectRatio: number;
}
export interface LumenSettings {
    enabled: boolean;
    /** Screen traces quality */
    screenTracesQuality: 'low' | 'medium' | 'high' | 'epic';
    /** Enable hardware ray tracing if available */
    preferHardwareRT: boolean;
    /** Software voxel tracing resolution */
    voxelResolution: number;
    /** Number of diffuse bounces */
    maxBounces: number;
    /** GI intensity */
    intensity: number;
    /** Temporal stability */
    temporalStability: number;
    /** Spatial filter radius */
    spatialFilterRadius: number;
    /** Enable final gather */
    enableFinalGather: boolean;
    /** Surface cache update rate */
    surfaceCacheUpdateRate: 'every_frame' | 'adaptive' | 'on_demand';
}
export interface SurfaceCache {
    /** Voxel grid for scene representation */
    voxelGrid: VoxelGrid;
    /** Surface cards (simplified geometry) */
    surfaceCards: SurfaceCard[];
    /** Radiance cache */
    radianceProbes: RadianceProbe[];
    /** Last update time */
    lastUpdateTime: number;
    /** Dirty regions */
    dirtyRegions: BoundingBox[];
}
export interface VoxelGrid {
    resolution: number;
    bounds: BoundingBox;
    voxels: Uint32Array;
    mipmaps: Uint32Array[];
}
export interface SurfaceCard {
    id: string;
    position: Vector3;
    normal: Vector3;
    size: {
        width: number;
        height: number;
    };
    radiance: {
        r: number;
        g: number;
        b: number;
    };
    orientation: number;
}
export interface RadianceProbe {
    position: Vector3;
    irradianceSH: Float32Array;
    distance: number;
}
export interface BoundingBox {
    min: Vector3;
    max: Vector3;
}
export interface SSRSettings {
    enabled: boolean;
    quality: 'low' | 'medium' | 'high' | 'ultra';
    maxRaySteps: number;
    maxRayDistance: number;
    stepSize: number;
    thickness: number;
    falloffDistance: number;
    jitterAmount: number;
    temporalFiltering: boolean;
}
export interface AOSettings {
    enabled: boolean;
    type: 'ssao' | 'hbao' | 'gtao' | 'rtao';
    /** Sampling radius */
    radius: number;
    /** Number of samples */
    sampleCount: number;
    /** Intensity */
    intensity: number;
    /** Bias */
    bias: number;
    /** Blur radius */
    blurRadius: number;
    /** Temporal filtering */
    temporalFiltering: boolean;
}
export interface TAASettings {
    enabled: boolean;
    /** Jitter pattern */
    jitterPattern: 'halton' | 'r2' | 'uniform';
    /** Feedback factor */
    feedbackMin: number;
    feedbackMax: number;
    /** Motion blur intensity */
    motionBlurIntensity: number;
    /** Sharpness */
    sharpness: number;
    /** Enable variance clipping */
    varianceClipping: boolean;
}
export interface VolumetricSettings {
    enabled: boolean;
    /** Volume texture resolution */
    resolutionX: number;
    resolutionY: number;
    resolutionZ: number;
    /** Near/far plane for volume */
    near: number;
    far: number;
    /** Scattering intensity */
    scatteringIntensity: number;
    /** Extinction coefficient */
    extinction: number;
    /** Number of raymarch steps */
    raymarchSteps: number;
    /** Temporal filtering */
    temporalFiltering: boolean;
    /** Density noise */
    densityNoise: {
        enabled: boolean;
        scale: number;
        intensity: number;
    };
}
export interface VSMSettings {
    enabled: boolean;
    /** Virtual page size */
    pageSize: number;
    /** Physical page pool size */
    physicalPagePoolSize: number;
    /** Clipmap levels for directional lights */
    clipmapLevels: number;
    /** Enable contact hardening */
    contactHardening: boolean;
    /** Bias */
    bias: number;
    /** Slope bias */
    slopeBias: number;
}
export declare enum RenderingPath {
    Forward = "forward",
    ForwardPlus = "forward_plus",
    Deferred = "deferred",
    ClusteredDeferred = "clustered_deferred"
}
export interface RenderPipelineSettings {
    path: RenderingPath;
    /** GBuffer format (deferred) */
    gbufferFormat: {
        albedo: GPUTextureFormat;
        normalRoughness: GPUTextureFormat;
        metallicAO: GPUTextureFormat;
        emissive: GPUTextureFormat;
        depth: GPUTextureFormat;
    };
    /** HDR format */
    hdrFormat: GPUTextureFormat;
    /** MSAA samples */
    msaaSamples: number;
    /** Render resolution scale */
    resolutionScale: number;
}
export interface PostProcessSettings {
    /** Tone mapping */
    toneMapping: {
        enabled: boolean;
        type: 'reinhard' | 'aces' | 'filmic' | 'uncharted2';
        exposure: number;
        whitePoint: number;
    };
    /** Bloom */
    bloom: {
        enabled: boolean;
        threshold: number;
        intensity: number;
        radius: number;
        iterations: number;
    };
    /** Depth of Field */
    depthOfField: {
        enabled: boolean;
        focusDistance: number;
        focalLength: number;
        aperture: number;
        bokehShape: 'circle' | 'hexagon' | 'octagon';
        maxBlurSize: number;
    };
    /** Motion Blur */
    motionBlur: {
        enabled: boolean;
        samples: number;
        intensity: number;
        maxVelocity: number;
    };
    /** Color Grading */
    colorGrading: {
        enabled: boolean;
        lutTexture?: string;
        saturation: number;
        contrast: number;
        gamma: number;
        temperature: number;
        tint: number;
    };
    /** Chromatic Aberration */
    chromaticAberration: {
        enabled: boolean;
        intensity: number;
    };
    /** Vignette */
    vignette: {
        enabled: boolean;
        intensity: number;
        smoothness: number;
    };
    /** Film Grain */
    filmGrain: {
        enabled: boolean;
        intensity: number;
        response: number;
    };
}
export interface Light {
    id: string;
    type: 'directional' | 'point' | 'spot' | 'rect' | 'sky';
    position: Vector3;
    direction: Vector3;
    color: {
        r: number;
        g: number;
        b: number;
    };
    intensity: number;
    /** Cast shadows */
    castShadows: boolean;
    /** Shadow settings */
    shadowSettings?: {
        resolution: number;
        bias: number;
        normalBias: number;
        cascades?: number;
    };
    /** Volumetric scattering */
    volumetricScattering: boolean;
    /** Specific light params */
    params: PointLightParams | SpotLightParams | RectLightParams | SkyLightParams;
}
export interface PointLightParams {
    radius: number;
    falloff: number;
    sourceRadius: number;
}
export interface SpotLightParams {
    innerConeAngle: number;
    outerConeAngle: number;
    range: number;
    sourceRadius: number;
}
export interface RectLightParams {
    width: number;
    height: number;
    barnDoors: boolean;
}
export interface SkyLightParams {
    cubemapTexture?: string;
    proceduralSky: {
        enabled: boolean;
        sunDirection: Vector3;
        turbidity: number;
        rayleighCoefficient: number;
        mieCoefficient: number;
    };
}
export declare class AdvancedRenderingEngine {
    private device?;
    private context?;
    private lumenSettings;
    private ssrSettings;
    private aoSettings;
    private taaSettings;
    private volumetricSettings;
    private vsmSettings;
    private pipelineSettings;
    private postProcessSettings;
    private lights;
    private surfaceCache?;
    private gbufferTextures;
    private hdrTexture?;
    private historyTextures;
    private volumetricTexture?;
    private gbufferPipeline?;
    private lightingPipeline?;
    private ssrPipeline?;
    private aoPipeline?;
    private taaPipeline?;
    private volumetricPipeline?;
    private postProcessPipelines;
    private frameIndex;
    private haltonSequence;
    private readonly onRenderCompleteEmitter;
    readonly onRenderComplete: Event<{
        frameTime: number;
    }>;
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    private initializeRenderTargets;
    private initializePipelines;
    private createGBufferPipeline;
    private createLightingPipeline;
    private createSSRPipeline;
    private createAOPipeline;
    private createTAAPipeline;
    private createVolumetricPipeline;
    private createPostProcessPipelines;
    private initializeLumenSystem;
    private generateHaltonSequence;
    private halton;
    render(camera: Camera, deltaTime: number): void;
    private renderGBufferPass;
    private updateLumenGI;
    private renderVolumetricPass;
    private renderLightingPass;
    private renderSSRPass;
    private renderAOPass;
    private renderTAAPass;
    private renderPostProcessPass;
    private presentToScreen;
    addLight(light: Light): void;
    removeLight(lightId: string): void;
    getLight(lightId: string): Light | undefined;
    setLumenSettings(settings: Partial<LumenSettings>): void;
    setSSRSettings(settings: Partial<SSRSettings>): void;
    setAOSettings(settings: Partial<AOSettings>): void;
    setTAASettings(settings: Partial<TAASettings>): void;
    setVolumetricSettings(settings: Partial<VolumetricSettings>): void;
    setPostProcessSettings(settings: Partial<PostProcessSettings>): void;
    getLumenSettings(): LumenSettings;
    getSSRSettings(): SSRSettings;
    getStatistics(): RenderStatistics;
}
export interface RenderStatistics {
    frameIndex: number;
    activeLights: number;
    voxelResolution: number;
    surfaceCards: number;
    radianceProbes: number;
}
