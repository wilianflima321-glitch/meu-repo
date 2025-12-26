/// <reference path="../types/webgpu.d.ts" />
import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL WEBGPU RENDERER - High-Performance GPU Rendering
// Production-ready WebGPU implementation for 3D/2D rendering
// ============================================================================

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
export type TextureFormat = 
  | 'rgba8unorm'
  | 'rgba8unorm-srgb'
  | 'rgba16float'
  | 'rgba32float'
  | 'bgra8unorm'
  | 'bgra8unorm-srgb'
  | 'depth24plus'
  | 'depth32float'
  | 'depth24plus-stencil8'
  | 'r8unorm'
  | 'rg8unorm'
  | 'r16float'
  | 'rg16float';

/**
 * Buffer usage flags
 */
export type BufferUsage = 
  | 'vertex'
  | 'index'
  | 'uniform'
  | 'storage'
  | 'copy-src'
  | 'copy-dst'
  | 'indirect'
  | 'query-resolve';

/**
 * Primitive topology
 */
export type PrimitiveTopology = 
  | 'point-list'
  | 'line-list'
  | 'line-strip'
  | 'triangle-list'
  | 'triangle-strip';

/**
 * Cull mode
 */
export type CullMode = 'none' | 'front' | 'back';

/**
 * Blend mode presets
 */
export type BlendMode = 
  | 'none'
  | 'alpha'
  | 'additive'
  | 'multiply'
  | 'screen'
  | 'overlay';

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
    clearValue?: { r: number; g: number; b: number; a: number };
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
  vertexBuffers: Array<{ buffer: string; offset?: number }>;
  indexBuffer?: { buffer: string; format: 'uint16' | 'uint32'; offset?: number };
  bindGroups: Array<{ group: number; bindGroup: GPUBindGroup }>;
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
  bindGroups: Array<{ group: number; bindGroup: GPUBindGroup }>;
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
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
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
@injectable()
export class WebGPURenderer {
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private context: GPUCanvasContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private initialized = false;

  private readonly buffers = new Map<string, GPUBufferHandle>();
  private readonly textures = new Map<string, GPUTextureHandle>();
  private readonly pipelines = new Map<string, GPURenderPipeline>();
  private readonly computePipelines = new Map<string, GPUComputePipeline>();
  private readonly shaderModules = new Map<string, GPUShaderModule>();
  private readonly materials = new Map<string, MaterialDefinition>();
  private readonly bindGroupLayouts = new Map<string, GPUBindGroupLayout>();

  private preferredFormat: GPUTextureFormat = 'bgra8unorm';
  private currentStats: RenderStats = this.createEmptyStats();
  private frameIndex = 0;

  // Events
  private readonly onInitializedEmitter = new Emitter<void>();
  private readonly onFrameStartEmitter = new Emitter<number>();
  private readonly onFrameEndEmitter = new Emitter<RenderStats>();
  private readonly onErrorEmitter = new Emitter<Error>();
  private readonly onDeviceLostEmitter = new Emitter<void>();

  readonly onInitialized: Event<void> = this.onInitializedEmitter.event;
  readonly onFrameStart: Event<number> = this.onFrameStartEmitter.event;
  readonly onFrameEnd: Event<RenderStats> = this.onFrameEndEmitter.event;
  readonly onError: Event<Error> = this.onErrorEmitter.event;
  readonly onDeviceLost: Event<void> = this.onDeviceLostEmitter.event;

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Check if WebGPU is supported
   */
  static isSupported(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * Initialize the renderer with a canvas
   */
  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    if (this.initialized) return true;

    if (!WebGPURenderer.isSupported()) {
      this.onErrorEmitter.fire(new Error('WebGPU is not supported in this browser'));
      return false;
    }

    try {
      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!this.adapter) {
        throw new Error('No WebGPU adapter found');
      }

      // Request device
      this.device = await this.adapter.requestDevice({
        requiredFeatures: this.getRequiredFeatures(),
        requiredLimits: this.getRequiredLimits(),
      });

      // Handle device loss
      this.device.lost.then((info) => {
        console.error('WebGPU device lost:', info.message);
        this.onDeviceLostEmitter.fire();
        this.initialized = false;
      });

      // Configure canvas context
      this.canvas = canvas;
      this.context = canvas.getContext('webgpu');

      if (!this.context) {
        throw new Error('Failed to get WebGPU context');
      }

      this.preferredFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.preferredFormat,
        alphaMode: 'premultiplied',
      });

      this.initialized = true;
      this.onInitializedEmitter.fire();

      return true;
    } catch (error) {
      this.onErrorEmitter.fire(error as Error);
      return false;
    }
  }

  /**
   * Get required WebGPU features
   */
  private getRequiredFeatures(): GPUFeatureName[] {
    const features: GPUFeatureName[] = [];

    // Add features if supported by adapter
    if (this.adapter?.features.has('depth-clip-control')) {
      features.push('depth-clip-control');
    }

    return features;
  }

  /**
   * Get required limits
   */
  private getRequiredLimits(): Record<string, number> {
    return {
      maxBindGroups: 4,
      maxBindingsPerBindGroup: 16,
      maxDynamicUniformBuffersPerPipelineLayout: 8,
      maxDynamicStorageBuffersPerPipelineLayout: 4,
      maxSampledTexturesPerShaderStage: 16,
      maxStorageBuffersPerShaderStage: 8,
      maxStorageTexturesPerShaderStage: 4,
      maxUniformBuffersPerShaderStage: 12,
    };
  }

  /**
   * Check if renderer is ready
   */
  isReady(): boolean {
    return this.initialized && this.device !== null;
  }

  /**
   * Resize the canvas and update context
   */
  resize(width: number, height: number): void {
    if (!this.canvas) return;

    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Get canvas dimensions
   */
  getSize(): { width: number; height: number } {
    return {
      width: this.canvas?.width || 0,
      height: this.canvas?.height || 0,
    };
  }

  // ========================================================================
  // BUFFER MANAGEMENT
  // ========================================================================

  /**
   * Create a GPU buffer
   */
  createBuffer(
    id: string,
    data: ArrayBuffer | ArrayBufferView,
    usage: BufferUsage[]
  ): GPUBufferHandle | null {
    if (!this.device) return null;

    const usageFlags = this.convertBufferUsage(usage);
    const size = data.byteLength;

    const buffer = this.device.createBuffer({
      size,
      usage: usageFlags | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    // Copy data to buffer
    const mappedRange = buffer.getMappedRange();
    new Uint8Array(mappedRange).set(
      new Uint8Array(ArrayBuffer.isView(data) ? data.buffer : data)
    );
    buffer.unmap();

    const handle: GPUBufferHandle = {
      id,
      buffer,
      size,
      usage,
    };

    this.buffers.set(id, handle);
    return handle;
  }

  /**
   * Update buffer data
   */
  updateBuffer(id: string, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    if (!this.device) return;

    const handle = this.buffers.get(id);
    if (!handle) return;

    this.device.queue.writeBuffer(
      handle.buffer,
      offset,
      ArrayBuffer.isView(data) ? data.buffer : data,
      ArrayBuffer.isView(data) ? data.byteOffset : 0,
      data.byteLength
    );

    this.currentStats.bufferUploads++;
  }

  /**
   * Delete a buffer
   */
  deleteBuffer(id: string): void {
    const handle = this.buffers.get(id);
    if (handle) {
      handle.buffer.destroy();
      this.buffers.delete(id);
    }
  }

  /**
   * Convert buffer usage to WebGPU flags
   */
  private convertBufferUsage(usage: BufferUsage[]): GPUBufferUsageFlags {
    let flags = 0;
    for (const u of usage) {
      switch (u) {
        case 'vertex': flags |= GPUBufferUsage.VERTEX; break;
        case 'index': flags |= GPUBufferUsage.INDEX; break;
        case 'uniform': flags |= GPUBufferUsage.UNIFORM; break;
        case 'storage': flags |= GPUBufferUsage.STORAGE; break;
        case 'copy-src': flags |= GPUBufferUsage.COPY_SRC; break;
        case 'copy-dst': flags |= GPUBufferUsage.COPY_DST; break;
        case 'indirect': flags |= GPUBufferUsage.INDIRECT; break;
        case 'query-resolve': flags |= GPUBufferUsage.QUERY_RESOLVE; break;
      }
    }
    return flags;
  }

  // ========================================================================
  // TEXTURE MANAGEMENT
  // ========================================================================

  /**
   * Create a texture
   */
  createTexture(
    id: string,
    width: number,
    height: number,
    format: TextureFormat = 'rgba8unorm',
    options: {
      depth?: number;
      mipLevelCount?: number;
      sampleCount?: number;
      usage?: GPUTextureUsageFlags;
    } = {}
  ): GPUTextureHandle | null {
    if (!this.device) return null;

    const depth = options.depth || 1;
    const mipLevelCount = options.mipLevelCount || 1;
    const sampleCount = options.sampleCount || 1;
    const usage = options.usage || 
      (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT);

    const texture = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: depth },
      format: format as GPUTextureFormat,
      usage,
      mipLevelCount,
      sampleCount,
    });

    const view = texture.createView();

    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      addressModeW: 'repeat',
    });

    const handle: GPUTextureHandle = {
      id,
      texture,
      view,
      sampler,
      width,
      height,
      depth,
      format,
      mipLevelCount,
    };

    this.textures.set(id, handle);
    return handle;
  }

  /**
   * Create texture from image data
   */
  async createTextureFromImage(
    id: string,
    source: ImageBitmap | HTMLCanvasElement | HTMLImageElement | OffscreenCanvas,
    options: {
      generateMipmaps?: boolean;
      format?: TextureFormat;
    } = {}
  ): Promise<GPUTextureHandle | null> {
    if (!this.device) return null;

    const imageBitmap = source instanceof ImageBitmap 
      ? source 
      : await createImageBitmap(source);

    const { width, height } = imageBitmap;
    const format = options.format || 'rgba8unorm';
    const mipLevelCount = options.generateMipmaps 
      ? Math.floor(Math.log2(Math.max(width, height))) + 1 
      : 1;

    const handle = this.createTexture(id, width, height, format, {
      mipLevelCount,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    if (!handle) return null;

    // Copy image to texture
    this.device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: handle.texture },
      { width, height }
    );

    // Generate mipmaps if requested
    if (options.generateMipmaps && mipLevelCount > 1) {
      this.generateMipmaps(handle);
    }

    return handle;
  }

  /**
   * Generate mipmaps for a texture using blit operations
   */
  private generateMipmaps(texture: GPUTextureHandle): void {
    if (!this.device) return;

    const mipLevelCount = Math.floor(Math.log2(Math.max(texture.width, texture.height))) + 1;
    if (mipLevelCount <= 1) return;

    // Create a sampler for mipmap generation
    const sampler = this.device.createSampler({
      minFilter: 'linear',
      magFilter: 'linear',
    });

    // Create shader for downsampling
    const mipmapShaderCode = `
      @group(0) @binding(0) var srcTexture: texture_2d<f32>;
      @group(0) @binding(1) var srcSampler: sampler;

      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) texCoord: vec2<f32>,
      };

      @vertex
      fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
        var pos = array<vec2<f32>, 6>(
          vec2<f32>(-1.0, -1.0),
          vec2<f32>(1.0, -1.0),
          vec2<f32>(-1.0, 1.0),
          vec2<f32>(-1.0, 1.0),
          vec2<f32>(1.0, -1.0),
          vec2<f32>(1.0, 1.0)
        );

        var uv = array<vec2<f32>, 6>(
          vec2<f32>(0.0, 1.0),
          vec2<f32>(1.0, 1.0),
          vec2<f32>(0.0, 0.0),
          vec2<f32>(0.0, 0.0),
          vec2<f32>(1.0, 1.0),
          vec2<f32>(1.0, 0.0)
        );

        var output: VertexOutput;
        output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
        output.texCoord = uv[vertexIndex];
        return output;
      }

      @fragment
      fn fragmentMain(@location(0) texCoord: vec2<f32>) -> @location(0) vec4<f32> {
        return textureSample(srcTexture, srcSampler, texCoord);
      }
    `;

    const mipmapShader = this.device.createShaderModule({ code: mipmapShaderCode });

    const mipmapPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: mipmapShader,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: mipmapShader,
        entryPoint: 'fragmentMain',
        targets: [{ format: texture.format as GPUTextureFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });

    const commandEncoder = this.device.createCommandEncoder();

    let srcMipLevel = 0;
    let srcWidth = texture.width;
    let srcHeight = texture.height;

    for (let mipLevel = 1; mipLevel < mipLevelCount; mipLevel++) {
      const dstWidth = Math.max(1, srcWidth >> 1);
      const dstHeight = Math.max(1, srcHeight >> 1);

      // Create view for source mip level
      const srcView = texture.texture.createView({
        baseMipLevel: srcMipLevel,
        mipLevelCount: 1,
      });

      // Create view for destination mip level
      const dstView = texture.texture.createView({
        baseMipLevel: mipLevel,
        mipLevelCount: 1,
      });

      // Create bind group
      const bindGroup = this.device.createBindGroup({
        layout: mipmapPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: srcView },
          { binding: 1, resource: sampler },
        ],
      });

      // Render pass to generate this mip level
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: dstView,
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });

      passEncoder.setPipeline(mipmapPipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(6);
      passEncoder.end();

      // Update for next iteration
      srcMipLevel = mipLevel;
      srcWidth = dstWidth;
      srcHeight = dstHeight;
    }

    this.device.queue.submit([commandEncoder.finish()]);
  }

  /**
   * Update texture data
   */
  updateTexture(
    id: string,
    data: ArrayBuffer | ArrayBufferView,
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      mipLevel?: number;
    } = {}
  ): void {
    if (!this.device) return;

    const handle = this.textures.get(id);
    if (!handle) return;

    const x = options.x || 0;
    const y = options.y || 0;
    const width = options.width || handle.width;
    const height = options.height || handle.height;
    const mipLevel = options.mipLevel || 0;

    this.device.queue.writeTexture(
      { texture: handle.texture, mipLevel, origin: { x, y } },
      ArrayBuffer.isView(data) ? data.buffer : data,
      { bytesPerRow: width * 4, rowsPerImage: height },
      { width, height }
    );

    this.currentStats.textureBindings++;
  }

  /**
   * Delete a texture
   */
  deleteTexture(id: string): void {
    const handle = this.textures.get(id);
    if (handle) {
      handle.texture.destroy();
      this.textures.delete(id);
    }
  }

  // ========================================================================
  // SHADER & PIPELINE MANAGEMENT
  // ========================================================================

  /**
   * Create a shader module
   */
  createShaderModule(id: string, code: string): GPUShaderModule | null {
    if (!this.device) return null;

    const module = this.device.createShaderModule({ code });
    this.shaderModules.set(id, module);
    return module;
  }

  /**
   * Create a render pipeline
   */
  createRenderPipeline(config: RenderPipelineConfig): GPURenderPipeline | null {
    if (!this.device) return null;

    // Get or create shader module
    const vertexModule = this.getOrCreateShaderModule(`${config.id}_vertex`, config.shader.vertex);
    const fragmentModule = this.getOrCreateShaderModule(`${config.id}_fragment`, config.shader.fragment);

    if (!vertexModule || !fragmentModule) return null;

    // Create vertex buffer layouts
    const buffers: GPUVertexBufferLayout[] = config.vertexBuffers.map(layout => ({
      arrayStride: layout.arrayStride,
      stepMode: layout.stepMode,
      attributes: layout.attributes.map(attr => ({
        format: attr.format,
        offset: attr.offset,
        shaderLocation: attr.shaderLocation,
      })),
    }));

    // Create color targets
    const targets: GPUColorTargetState[] = config.colorTargets.map(target => ({
      format: target.format as GPUTextureFormat,
      blend: this.getBlendState(target.blend || 'none'),
      writeMask: target.writeMask || GPUColorWrite.ALL,
    }));

    const descriptor: GPURenderPipelineDescriptor = {
      layout: 'auto',
      vertex: {
        module: vertexModule,
        entryPoint: 'main',
        buffers,
      },
      fragment: {
        module: fragmentModule,
        entryPoint: 'main',
        targets,
      },
      primitive: {
        topology: (config.primitive?.topology || 'triangle-list') as GPUPrimitiveTopology,
        cullMode: (config.primitive?.cullMode || 'back') as 'none' | 'front' | 'back',
        frontFace: config.primitive?.frontFace || 'ccw',
      },
    };

    // Add depth stencil if configured
    if (config.depthStencil) {
      descriptor.depthStencil = {
        format: config.depthStencil.format as GPUTextureFormat,
        depthWriteEnabled: config.depthStencil.depthWriteEnabled,
        depthCompare: config.depthStencil.depthCompare,
      };
    }

    // Add multisample if configured
    if (config.multisample) {
      descriptor.multisample = {
        count: config.multisample.count,
        alphaToCoverageEnabled: config.multisample.alphaToCoverageEnabled,
      };
    }

    const pipeline = this.device.createRenderPipeline(descriptor);
    this.pipelines.set(config.id, pipeline);
    return pipeline;
  }

  /**
   * Create a compute pipeline
   */
  createComputePipeline(id: string, shaderCode: string, entryPoint = 'main'): GPUComputePipeline | null {
    if (!this.device) return null;

    const module = this.getOrCreateShaderModule(`${id}_compute`, shaderCode);
    if (!module) return null;

    const pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module,
        entryPoint,
      },
    });

    this.computePipelines.set(id, pipeline);
    return pipeline;
  }

  /**
   * Get or create shader module
   */
  private getOrCreateShaderModule(id: string, code: string): GPUShaderModule | null {
    const existing = this.shaderModules.get(id);
    if (existing) return existing;
    return this.createShaderModule(id, code);
  }

  /**
   * Get blend state for blend mode
   */
  private getBlendState(mode: BlendMode): GPUBlendState | undefined {
    switch (mode) {
      case 'none':
        return undefined;
      case 'alpha':
        return {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
        };
      case 'additive':
        return {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one',
            operation: 'add',
          },
        };
      case 'multiply':
        return {
          color: {
            srcFactor: 'dst',
            dstFactor: 'zero',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'dst-alpha',
            dstFactor: 'zero',
            operation: 'add',
          },
        };
      default:
        return undefined;
    }
  }

  // ========================================================================
  // RENDERING
  // ========================================================================

  /**
   * Begin a new frame
   */
  beginFrame(): GPUCommandEncoder | null {
    if (!this.device) return null;

    this.currentStats = this.createEmptyStats();
    this.frameIndex++;
    this.onFrameStartEmitter.fire(this.frameIndex);

    return this.device.createCommandEncoder();
  }

  /**
   * End the current frame
   */
  endFrame(encoder: GPUCommandEncoder): void {
    if (!this.device) return;

    this.device.queue.submit([encoder.finish()]);
    this.onFrameEndEmitter.fire(this.currentStats);
  }

  /**
   * Get current canvas texture view
   */
  getCurrentTextureView(): GPUTextureView | null {
    if (!this.context) return null;
    return this.context.getCurrentTexture().createView();
  }

  /**
   * Begin a render pass
   */
  beginRenderPass(
    encoder: GPUCommandEncoder,
    config: RenderPassConfig
  ): GPURenderPassEncoder {
    const colorAttachments: GPURenderPassColorAttachment[] = config.colorAttachments.map(att => ({
      view: att.texture.view,
      clearValue: att.clearValue,
      loadOp: att.loadOp,
      storeOp: att.storeOp,
    }));

    const descriptor: GPURenderPassDescriptor = {
      colorAttachments,
    };

    if (config.depthStencilAttachment) {
      descriptor.depthStencilAttachment = {
        view: config.depthStencilAttachment.texture.view,
        depthClearValue: config.depthStencilAttachment.depthClearValue,
        depthLoadOp: config.depthStencilAttachment.depthLoadOp,
        depthStoreOp: config.depthStencilAttachment.depthStoreOp,
      };
    }

    return encoder.beginRenderPass(descriptor);
  }

  /**
   * Execute draw commands
   */
  draw(pass: GPURenderPassEncoder, command: DrawCommand): void {
    const pipeline = this.pipelines.get(command.pipeline);
    if (!pipeline) {
      console.warn(`Pipeline not found: ${command.pipeline}`);
      return;
    }

    pass.setPipeline(pipeline);
    this.currentStats.pipelineSwitches++;

    // Set vertex buffers
    for (let i = 0; i < command.vertexBuffers.length; i++) {
      const vb = command.vertexBuffers[i];
      const handle = this.buffers.get(vb.buffer);
      if (handle) {
        pass.setVertexBuffer(i, handle.buffer, vb.offset);
      }
    }

    // Set bind groups
    for (const bg of command.bindGroups) {
      pass.setBindGroup(bg.group, bg.bindGroup);
    }

    // Draw
    if (command.indexBuffer) {
      const handle = this.buffers.get(command.indexBuffer.buffer);
      if (handle) {
        pass.setIndexBuffer(handle.buffer, command.indexBuffer.format, command.indexBuffer.offset);
        pass.drawIndexed(
          command.indexCount || 0,
          command.instanceCount || 1,
          command.firstIndex || 0,
          0,
          command.firstInstance || 0
        );
        this.currentStats.triangles += Math.floor((command.indexCount || 0) / 3);
      }
    } else {
      pass.draw(
        command.vertexCount || 0,
        command.instanceCount || 1,
        command.firstVertex || 0,
        command.firstInstance || 0
      );
      this.currentStats.triangles += Math.floor((command.vertexCount || 0) / 3);
    }

    this.currentStats.drawCalls++;
    this.currentStats.vertices += command.vertexCount || command.indexCount || 0;
  }

  /**
   * Execute compute dispatch
   */
  dispatch(encoder: GPUCommandEncoder, command: ComputeCommand): void {
    const pipeline = this.computePipelines.get(command.pipeline);
    if (!pipeline) {
      console.warn(`Compute pipeline not found: ${command.pipeline}`);
      return;
    }

    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);

    for (const bg of command.bindGroups) {
      pass.setBindGroup(bg.group, bg.bindGroup);
    }

    pass.dispatchWorkgroups(
      command.workgroupCountX,
      command.workgroupCountY || 1,
      command.workgroupCountZ || 1
    );

    pass.end();
  }

  // ========================================================================
  // MESH HELPERS
  // ========================================================================

  /**
   * Create mesh buffers from geometry
   */
  createMeshBuffers(id: string, geometry: MeshGeometry): {
    positions: GPUBufferHandle | null;
    normals: GPUBufferHandle | null;
    uvs: GPUBufferHandle | null;
    colors: GPUBufferHandle | null;
    indices: GPUBufferHandle | null;
  } {
    return {
      positions: this.createBuffer(`${id}_positions`, geometry.positions, ['vertex']),
      normals: geometry.normals ? this.createBuffer(`${id}_normals`, geometry.normals, ['vertex']) : null,
      uvs: geometry.uvs ? this.createBuffer(`${id}_uvs`, geometry.uvs, ['vertex']) : null,
      colors: geometry.colors ? this.createBuffer(`${id}_colors`, geometry.colors, ['vertex']) : null,
      indices: geometry.indices ? this.createBuffer(`${id}_indices`, geometry.indices, ['index']) : null,
    };
  }

  /**
   * Create primitive geometry - Box
   */
  createBoxGeometry(width = 1, height = 1, depth = 1): MeshGeometry {
    const w = width / 2, h = height / 2, d = depth / 2;
    
    const positions = new Float32Array([
      // Front
      -w, -h, d, w, -h, d, w, h, d, -w, h, d,
      // Back
      w, -h, -d, -w, -h, -d, -w, h, -d, w, h, -d,
      // Top
      -w, h, d, w, h, d, w, h, -d, -w, h, -d,
      // Bottom
      -w, -h, -d, w, -h, -d, w, -h, d, -w, -h, d,
      // Right
      w, -h, d, w, -h, -d, w, h, -d, w, h, d,
      // Left
      -w, -h, -d, -w, -h, d, -w, h, d, -w, h, -d,
    ]);

    const normals = new Float32Array([
      // Front
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      // Back
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      // Top
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      // Bottom
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      // Right
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      // Left
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]);

    const uvs = new Float32Array([
      // Front
      0, 1, 1, 1, 1, 0, 0, 0,
      // Back
      0, 1, 1, 1, 1, 0, 0, 0,
      // Top
      0, 1, 1, 1, 1, 0, 0, 0,
      // Bottom
      0, 1, 1, 1, 1, 0, 0, 0,
      // Right
      0, 1, 1, 1, 1, 0, 0, 0,
      // Left
      0, 1, 1, 1, 1, 0, 0, 0,
    ]);

    const indices = new Uint16Array([
      0, 1, 2, 0, 2, 3,       // Front
      4, 5, 6, 4, 6, 7,       // Back
      8, 9, 10, 8, 10, 11,    // Top
      12, 13, 14, 12, 14, 15, // Bottom
      16, 17, 18, 16, 18, 19, // Right
      20, 21, 22, 20, 22, 23, // Left
    ]);

    return { positions, normals, uvs, indices };
  }

  /**
   * Create primitive geometry - Sphere
   */
  createSphereGeometry(radius = 0.5, segments = 32, rings = 16): MeshGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let ring = 0; ring <= rings; ring++) {
      const theta = (ring * Math.PI) / rings;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let segment = 0; segment <= segments; segment++) {
        const phi = (segment * 2 * Math.PI) / segments;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;

        positions.push(radius * x, radius * y, radius * z);
        normals.push(x, y, z);
        uvs.push(segment / segments, ring / rings);
      }
    }

    for (let ring = 0; ring < rings; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const first = ring * (segments + 1) + segment;
        const second = first + segments + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices),
    };
  }

  /**
   * Create primitive geometry - Plane
   */
  createPlaneGeometry(width = 1, height = 1, widthSegments = 1, heightSegments = 1): MeshGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const widthHalf = width / 2;
    const heightHalf = height / 2;
    const segmentWidth = width / widthSegments;
    const segmentHeight = height / heightSegments;

    for (let iy = 0; iy <= heightSegments; iy++) {
      const y = iy * segmentHeight - heightHalf;

      for (let ix = 0; ix <= widthSegments; ix++) {
        const x = ix * segmentWidth - widthHalf;

        positions.push(x, 0, y);
        normals.push(0, 1, 0);
        uvs.push(ix / widthSegments, 1 - iy / heightSegments);
      }
    }

    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = ix + (widthSegments + 1) * iy;
        const b = ix + (widthSegments + 1) * (iy + 1);
        const c = ix + 1 + (widthSegments + 1) * (iy + 1);
        const d = ix + 1 + (widthSegments + 1) * iy;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices),
    };
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Create bind group
   */
  createBindGroup(
    pipeline: GPURenderPipeline | GPUComputePipeline,
    groupIndex: number,
    entries: Array<{
      binding: number;
      resource: GPUBindingResource;
    }>
  ): GPUBindGroup | null {
    if (!this.device) return null;

    return this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(groupIndex),
      entries: entries.map(e => ({
        binding: e.binding,
        resource: e.resource,
      })),
    });
  }

  /**
   * Create uniform buffer with data
   */
  createUniformBuffer(id: string, data: ArrayBuffer | ArrayBufferView): GPUBufferHandle | null {
    return this.createBuffer(id, data, ['uniform', 'copy-dst']);
  }

  /**
   * Get device limits
   */
  getLimits(): GPUSupportedLimits | null {
    return this.device?.limits || null;
  }

  /**
   * Get device features
   */
  getFeatures(): GPUSupportedFeatures | null {
    return this.device?.features || null;
  }

  /**
   * Get render statistics
   */
  getStats(): RenderStats {
    return { ...this.currentStats };
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): RenderStats {
    return {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      textureBindings: 0,
      bufferUploads: 0,
      pipelineSwitches: 0,
      frameTime: 0,
    };
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Destroy all buffers
    for (const handle of this.buffers.values()) {
      handle.buffer.destroy();
    }
    this.buffers.clear();

    // Destroy all textures
    for (const handle of this.textures.values()) {
      handle.texture.destroy();
    }
    this.textures.clear();

    // Clear other caches
    this.pipelines.clear();
    this.computePipelines.clear();
    this.shaderModules.clear();
    this.materials.clear();
    this.bindGroupLayouts.clear();

    // Release device
    this.device = null;
    this.adapter = null;
    this.context = null;
    this.canvas = null;
    this.initialized = false;
  }
}

// ============================================================================
// BUILT-IN SHADERS
// ============================================================================

export const BuiltinShaders = {
  /**
   * Basic unlit shader
   */
  unlit: {
    vertex: `
      struct VertexInput {
        @location(0) position: vec3f,
        @location(1) uv: vec2f,
      }

      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      }

      struct Uniforms {
        mvp: mat4x4f,
      }

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      @vertex
      fn main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        output.position = uniforms.mvp * vec4f(input.position, 1.0);
        output.uv = input.uv;
        return output;
      }
    `,
    fragment: `
      struct FragmentInput {
        @location(0) uv: vec2f,
      }

      @group(0) @binding(1) var textureSampler: sampler;
      @group(0) @binding(2) var diffuseTexture: texture_2d<f32>;

      @fragment
      fn main(input: FragmentInput) -> @location(0) vec4f {
        return textureSample(diffuseTexture, textureSampler, input.uv);
      }
    `,
  },

  /**
   * PBR shader
   */
  pbr: {
    vertex: `
      struct VertexInput {
        @location(0) position: vec3f,
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
      }

      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) worldPos: vec3f,
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
      }

      struct Uniforms {
        model: mat4x4f,
        view: mat4x4f,
        projection: mat4x4f,
        normalMatrix: mat3x3f,
      }

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      @vertex
      fn main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        let worldPos = uniforms.model * vec4f(input.position, 1.0);
        output.position = uniforms.projection * uniforms.view * worldPos;
        output.worldPos = worldPos.xyz;
        output.normal = uniforms.normalMatrix * input.normal;
        output.uv = input.uv;
        return output;
      }
    `,
    fragment: `
      struct FragmentInput {
        @location(0) worldPos: vec3f,
        @location(1) normal: vec3f,
        @location(2) uv: vec2f,
      }

      struct Material {
        albedo: vec4f,
        metallic: f32,
        roughness: f32,
        ao: f32,
        emissive: f32,
      }

      struct Light {
        position: vec3f,
        color: vec3f,
        intensity: f32,
      }

      @group(0) @binding(1) var<uniform> material: Material;
      @group(0) @binding(2) var<uniform> cameraPos: vec3f;
      @group(0) @binding(3) var<storage, read> lights: array<Light>;

      const PI: f32 = 3.14159265359;

      fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {
        return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
      }

      fn distributionGGX(N: vec3f, H: vec3f, roughness: f32) -> f32 {
        let a = roughness * roughness;
        let a2 = a * a;
        let NdotH = max(dot(N, H), 0.0);
        let NdotH2 = NdotH * NdotH;
        let num = a2;
        var denom = (NdotH2 * (a2 - 1.0) + 1.0);
        denom = PI * denom * denom;
        return num / denom;
      }

      fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
        let r = (roughness + 1.0);
        let k = (r * r) / 8.0;
        let num = NdotV;
        let denom = NdotV * (1.0 - k) + k;
        return num / denom;
      }

      fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {
        let NdotV = max(dot(N, V), 0.0);
        let NdotL = max(dot(N, L), 0.0);
        let ggx2 = geometrySchlickGGX(NdotV, roughness);
        let ggx1 = geometrySchlickGGX(NdotL, roughness);
        return ggx1 * ggx2;
      }

      @fragment
      fn main(input: FragmentInput) -> @location(0) vec4f {
        let N = normalize(input.normal);
        let V = normalize(cameraPos - input.worldPos);
        
        let albedo = material.albedo.rgb;
        let metallic = material.metallic;
        let roughness = material.roughness;
        let ao = material.ao;

        var F0 = vec3f(0.04);
        F0 = mix(F0, albedo, metallic);

        var Lo = vec3f(0.0);

        // For simplicity, using a single directional light
        let L = normalize(vec3f(1.0, 1.0, 1.0));
        let H = normalize(V + L);
        let radiance = vec3f(1.0) * 3.0;

        let NDF = distributionGGX(N, H, roughness);
        let G = geometrySmith(N, V, L, roughness);
        let F = fresnelSchlick(max(dot(H, V), 0.0), F0);

        let kS = F;
        var kD = vec3f(1.0) - kS;
        kD *= 1.0 - metallic;

        let numerator = NDF * G * F;
        let denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
        let specular = numerator / denominator;

        let NdotL = max(dot(N, L), 0.0);
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;

        let ambient = vec3f(0.03) * albedo * ao;
        var color = ambient + Lo;

        // Tone mapping
        color = color / (color + vec3f(1.0));
        // Gamma correction
        color = pow(color, vec3f(1.0 / 2.2));

        return vec4f(color, material.albedo.a);
      }
    `,
  },

  /**
   * Post-process full-screen quad shader
   */
  fullscreenQuad: {
    vertex: `
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
      }

      @vertex
      fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
        var output: VertexOutput;
        
        // Full screen triangle
        let x = f32(i32(vertexIndex) - 1);
        let y = f32(i32(vertexIndex & 1u) * 2 - 1);
        
        output.position = vec4f(x, y, 0.0, 1.0);
        output.uv = vec2f((x + 1.0) * 0.5, (1.0 - y) * 0.5);
        
        return output;
      }
    `,
    fragment: `
      @group(0) @binding(0) var textureSampler: sampler;
      @group(0) @binding(1) var inputTexture: texture_2d<f32>;

      @fragment
      fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
        return textureSample(inputTexture, textureSampler, uv);
      }
    `,
  },
};

export default WebGPURenderer;
