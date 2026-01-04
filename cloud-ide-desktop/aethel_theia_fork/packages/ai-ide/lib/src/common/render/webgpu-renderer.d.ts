import { Event } from '@theia/core/lib/common';
/**
 * WebGPU Shader source
 */
export interface ShaderSource {
    vertex: string;
    fragment: string;
    compute?: string;
}
/**
 * Texture format types
 */
export type TextureFormat = 'rgba8unorm' | 'rgba8unorm-srgb' | 'rgba16float' | 'rgba32float' | 'bgra8unorm' | 'bgra8unorm-srgb' | 'depth24plus' | 'depth32float' | 'depth24plus-stencil8' | 'r8unorm' | 'rg8unorm' | 'r16float' | 'rg16float';
/**
 * Buffer usage flags
 */
export type BufferUsage = 'vertex' | 'index' | 'uniform' | 'storage' | 'copy-src' | 'copy-dst' | 'indirect' | 'query-resolve';
/**
 * Primitive topology
 */
export type PrimitiveTopology = 'point-list' | 'line-list' | 'line-strip' | 'triangle-list' | 'triangle-strip';
/**
 * Cull mode
 */
export type CullMode = 'none' | 'front' | 'back';
/**
 * Blend mode presets
 */
export type BlendMode = 'none' | 'alpha' | 'additive' | 'multiply' | 'screen' | 'overlay';
/**
 * Vertex attribute
 */
export interface VertexAttribute {
    name: string;
    format: GPUVertexFormat;
    offset: number;
    shaderLocation: number;
}
/**
 * Vertex buffer layout
 */
export interface VertexBufferLayout {
    arrayStride: number;
    stepMode: 'vertex' | 'instance';
    attributes: VertexAttribute[];
}
/**
 * GPU Buffer handle
 */
export interface GPUBufferHandle {
    id: string;
    buffer: GPUBuffer;
    size: number;
    usage: BufferUsage[];
}
/**
 * GPU Texture handle
 */
export interface GPUTextureHandle {
    id: string;
    texture: GPUTexture;
    view: GPUTextureView;
    sampler: GPUSampler;
    width: number;
    height: number;
    depth: number;
    format: TextureFormat;
    mipLevelCount: number;
}
/**
 * Render pipeline configuration
 */
export interface RenderPipelineConfig {
    id: string;
    shader: ShaderSource;
    vertexBuffers: VertexBufferLayout[];
    colorTargets: Array<{
        format: TextureFormat;
        blend?: BlendMode;
        writeMask?: GPUColorWriteFlags;
    }>;
    depthStencil?: {
        format: TextureFormat;
        depthWriteEnabled: boolean;
        depthCompare: GPUCompareFunction;
    };
    primitive?: {
        topology: PrimitiveTopology;
        cullMode: CullMode;
        frontFace: 'ccw' | 'cw';
    };
    multisample?: {
        count: 1 | 4;
        alphaToCoverageEnabled?: boolean;
    };
}
/**
 * Render pass descriptor
 */
export interface RenderPassConfig {
    colorAttachments: Array<{
        texture: GPUTextureHandle;
        clearValue?: {
            r: number;
            g: number;
            b: number;
            a: number;
        };
        loadOp: 'load' | 'clear';
        storeOp: 'store' | 'discard';
    }>;
    depthStencilAttachment?: {
        texture: GPUTextureHandle;
        depthClearValue?: number;
        depthLoadOp: 'load' | 'clear';
        depthStoreOp: 'store' | 'discard';
    };
}
/**
 * Draw command
 */
export interface DrawCommand {
    pipeline: string;
    vertexBuffers: Array<{
        buffer: string;
        offset?: number;
    }>;
    indexBuffer?: {
        buffer: string;
        format: 'uint16' | 'uint32';
        offset?: number;
    };
    bindGroups: Array<{
        group: number;
        bindGroup: GPUBindGroup;
    }>;
    vertexCount?: number;
    indexCount?: number;
    instanceCount?: number;
    firstVertex?: number;
    firstIndex?: number;
    firstInstance?: number;
}
/**
 * Compute dispatch command
 */
export interface ComputeCommand {
    pipeline: string;
    bindGroups: Array<{
        group: number;
        bindGroup: GPUBindGroup;
    }>;
    workgroupCountX: number;
    workgroupCountY?: number;
    workgroupCountZ?: number;
}
/**
 * Material definition
 */
export interface MaterialDefinition {
    id: string;
    name: string;
    pipeline: string;
    uniforms: Record<string, unknown>;
    textures: Record<string, string>;
    renderState: {
        blendMode: BlendMode;
        cullMode: CullMode;
        depthWrite: boolean;
        depthTest: boolean;
    };
}
/**
 * Mesh geometry data
 */
export interface MeshGeometry {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    colors?: Float32Array;
    tangents?: Float32Array;
    indices?: Uint16Array | Uint32Array;
    boundingBox?: {
        min: {
            x: number;
            y: number;
            z: number;
        };
        max: {
            x: number;
            y: number;
            z: number;
        };
    };
}
/**
 * Render statistics
 */
export interface RenderStats {
    drawCalls: number;
    triangles: number;
    vertices: number;
    textureBindings: number;
    bufferUploads: number;
    pipelineSwitches: number;
    frameTime: number;
    gpuTime?: number;
}
/**
 * WebGPU Renderer - Main rendering system
 */
export declare class WebGPURenderer {
    private device;
    private adapter;
    private context;
    private canvas;
    private initialized;
    private readonly buffers;
    private readonly textures;
    private readonly pipelines;
    private readonly computePipelines;
    private readonly shaderModules;
    private readonly materials;
    private readonly bindGroupLayouts;
    private preferredFormat;
    private currentStats;
    private frameIndex;
    private readonly onInitializedEmitter;
    private readonly onFrameStartEmitter;
    private readonly onFrameEndEmitter;
    private readonly onErrorEmitter;
    private readonly onDeviceLostEmitter;
    readonly onInitialized: Event<void>;
    readonly onFrameStart: Event<number>;
    readonly onFrameEnd: Event<RenderStats>;
    readonly onError: Event<Error>;
    readonly onDeviceLost: Event<void>;
    /**
     * Check if WebGPU is supported
     */
    static isSupported(): boolean;
    /**
     * Initialize the renderer with a canvas
     */
    initialize(canvas: HTMLCanvasElement): Promise<boolean>;
    /**
     * Get required WebGPU features
     */
    private getRequiredFeatures;
    /**
     * Get required limits
     */
    private getRequiredLimits;
    /**
     * Check if renderer is ready
     */
    isReady(): boolean;
    /**
     * Resize the canvas and update context
     */
    resize(width: number, height: number): void;
    /**
     * Get canvas dimensions
     */
    getSize(): {
        width: number;
        height: number;
    };
    /**
     * Create a GPU buffer
     */
    createBuffer(id: string, data: ArrayBuffer | ArrayBufferView, usage: BufferUsage[]): GPUBufferHandle | null;
    /**
     * Update buffer data
     */
    updateBuffer(id: string, data: ArrayBuffer | ArrayBufferView, offset?: number): void;
    /**
     * Delete a buffer
     */
    deleteBuffer(id: string): void;
    /**
     * Convert buffer usage to WebGPU flags
     */
    private convertBufferUsage;
    /**
     * Create a texture
     */
    createTexture(id: string, width: number, height: number, format?: TextureFormat, options?: {
        depth?: number;
        mipLevelCount?: number;
        sampleCount?: number;
        usage?: GPUTextureUsageFlags;
    }): GPUTextureHandle | null;
    /**
     * Create texture from image data
     */
    createTextureFromImage(id: string, source: ImageBitmap | HTMLCanvasElement | HTMLImageElement | OffscreenCanvas, options?: {
        generateMipmaps?: boolean;
        format?: TextureFormat;
    }): Promise<GPUTextureHandle | null>;
    /**
     * Generate mipmaps for a texture using blit operations
     */
    private generateMipmaps;
    /**
     * Update texture data
     */
    updateTexture(id: string, data: ArrayBuffer | ArrayBufferView, options?: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        mipLevel?: number;
    }): void;
    /**
     * Delete a texture
     */
    deleteTexture(id: string): void;
    /**
     * Create a shader module
     */
    createShaderModule(id: string, code: string): GPUShaderModule | null;
    /**
     * Create a render pipeline
     */
    createRenderPipeline(config: RenderPipelineConfig): GPURenderPipeline | null;
    /**
     * Create a compute pipeline
     */
    createComputePipeline(id: string, shaderCode: string, entryPoint?: string): GPUComputePipeline | null;
    /**
     * Get or create shader module
     */
    private getOrCreateShaderModule;
    /**
     * Get blend state for blend mode
     */
    private getBlendState;
    /**
     * Begin a new frame
     */
    beginFrame(): GPUCommandEncoder | null;
    /**
     * End the current frame
     */
    endFrame(encoder: GPUCommandEncoder): void;
    /**
     * Get current canvas texture view
     */
    getCurrentTextureView(): GPUTextureView | null;
    /**
     * Begin a render pass
     */
    beginRenderPass(encoder: GPUCommandEncoder, config: RenderPassConfig): GPURenderPassEncoder;
    /**
     * Execute draw commands
     */
    draw(pass: GPURenderPassEncoder, command: DrawCommand): void;
    /**
     * Execute compute dispatch
     */
    dispatch(encoder: GPUCommandEncoder, command: ComputeCommand): void;
    /**
     * Create mesh buffers from geometry
     */
    createMeshBuffers(id: string, geometry: MeshGeometry): {
        positions: GPUBufferHandle | null;
        normals: GPUBufferHandle | null;
        uvs: GPUBufferHandle | null;
        colors: GPUBufferHandle | null;
        indices: GPUBufferHandle | null;
    };
    /**
     * Create primitive geometry - Box
     */
    createBoxGeometry(width?: number, height?: number, depth?: number): MeshGeometry;
    /**
     * Create primitive geometry - Sphere
     */
    createSphereGeometry(radius?: number, segments?: number, rings?: number): MeshGeometry;
    /**
     * Create primitive geometry - Plane
     */
    createPlaneGeometry(width?: number, height?: number, widthSegments?: number, heightSegments?: number): MeshGeometry;
    /**
     * Create bind group
     */
    createBindGroup(pipeline: GPURenderPipeline | GPUComputePipeline, groupIndex: number, entries: Array<{
        binding: number;
        resource: GPUBindingResource;
    }>): GPUBindGroup | null;
    /**
     * Create uniform buffer with data
     */
    createUniformBuffer(id: string, data: ArrayBuffer | ArrayBufferView): GPUBufferHandle | null;
    /**
     * Get device limits
     */
    getLimits(): GPUSupportedLimits | null;
    /**
     * Get device features
     */
    getFeatures(): GPUSupportedFeatures | null;
    /**
     * Get render statistics
     */
    getStats(): RenderStats;
    /**
     * Create empty stats object
     */
    private createEmptyStats;
    /**
     * Dispose all resources
     */
    dispose(): void;
}
export declare const BuiltinShaders: {
    /**
     * Basic unlit shader
     */
    unlit: {
        vertex: string;
        fragment: string;
    };
    /**
     * PBR shader
     */
    pbr: {
        vertex: string;
        fragment: string;
    };
    /**
     * Post-process full-screen quad shader
     */
    fullscreenQuad: {
        vertex: string;
        fragment: string;
    };
};
export default WebGPURenderer;
