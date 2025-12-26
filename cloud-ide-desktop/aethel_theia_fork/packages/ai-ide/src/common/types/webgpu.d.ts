// ============================================================================
// AETHEL WEBGPU TYPE DECLARATIONS
// Type definitions for WebGPU API
// Based on @webgpu/types
// ============================================================================

/**
 * GPU Feature Names
 */
type GPUFeatureName =
  | 'depth-clip-control'
  | 'depth32float-stencil8'
  | 'texture-compression-bc'
  | 'texture-compression-etc2'
  | 'texture-compression-astc'
  | 'timestamp-query'
  | 'indirect-first-instance'
  | 'shader-f16'
  | 'rg11b10ufloat-renderable'
  | 'bgra8unorm-storage'
  | 'float32-filterable';

/**
 * WebGPU Navigator extension
 */
interface NavigatorGPU {
  readonly gpu: GPU;
}

interface Navigator extends NavigatorGPU {}

/**
 * Main GPU interface
 */
interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  getPreferredCanvasFormat(): GPUTextureFormat;
}

interface GPURequestAdapterOptions {
  powerPreference?: 'low-power' | 'high-performance';
  forceFallbackAdapter?: boolean;
}

/**
 * GPU Adapter
 */
interface GPUAdapter {
  readonly name: string;
  readonly features: GPUSupportedFeatures;
  readonly limits: GPUSupportedLimits;
  readonly isFallbackAdapter: boolean;
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
  requestAdapterInfo(): Promise<GPUAdapterInfo>;
}

interface GPUAdapterInfo {
  readonly vendor: string;
  readonly architecture: string;
  readonly device: string;
  readonly description: string;
}

interface GPUSupportedFeatures extends ReadonlySet<GPUFeatureName> {}

interface GPUSupportedLimits {
  readonly maxTextureDimension1D: number;
  readonly maxTextureDimension2D: number;
  readonly maxTextureDimension3D: number;
  readonly maxTextureArrayLayers: number;
  readonly maxBindGroups: number;
  readonly maxBindingsPerBindGroup: number;
  readonly maxDynamicUniformBuffersPerPipelineLayout: number;
  readonly maxDynamicStorageBuffersPerPipelineLayout: number;
  readonly maxSampledTexturesPerShaderStage: number;
  readonly maxSamplersPerShaderStage: number;
  readonly maxStorageBuffersPerShaderStage: number;
  readonly maxStorageTexturesPerShaderStage: number;
  readonly maxUniformBuffersPerShaderStage: number;
  readonly maxUniformBufferBindingSize: number;
  readonly maxStorageBufferBindingSize: number;
  readonly minUniformBufferOffsetAlignment: number;
  readonly minStorageBufferOffsetAlignment: number;
  readonly maxVertexBuffers: number;
  readonly maxBufferSize: number;
  readonly maxVertexAttributes: number;
  readonly maxVertexBufferArrayStride: number;
  readonly maxInterStageShaderComponents: number;
  readonly maxComputeWorkgroupStorageSize: number;
  readonly maxComputeInvocationsPerWorkgroup: number;
  readonly maxComputeWorkgroupSizeX: number;
  readonly maxComputeWorkgroupSizeY: number;
  readonly maxComputeWorkgroupSizeZ: number;
  readonly maxComputeWorkgroupsPerDimension: number;
}

interface GPUDeviceDescriptor {
  label?: string;
  requiredFeatures?: string[];
  requiredLimits?: Record<string, number>;
}

/**
 * GPU Device
 */
interface GPUDevice extends EventTarget {
  readonly features: GPUSupportedFeatures;
  readonly limits: GPUSupportedLimits;
  readonly queue: GPUQueue;
  readonly lost: Promise<GPUDeviceLostInfo>;
  
  destroy(): void;
  
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
  createSampler(descriptor?: GPUSamplerDescriptor): GPUSampler;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
  createComputePipelineAsync(descriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>;
  createRenderPipelineAsync(descriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  createRenderBundleEncoder(descriptor: GPURenderBundleEncoderDescriptor): GPURenderBundleEncoder;
  createQuerySet(descriptor: GPUQuerySetDescriptor): GPUQuerySet;
  
  pushErrorScope(filter: GPUErrorFilter): void;
  popErrorScope(): Promise<GPUError | null>;
}

interface GPUDeviceLostInfo {
  readonly reason: 'unknown' | 'destroyed';
  readonly message: string;
}

type GPUErrorFilter = 'validation' | 'out-of-memory' | 'internal';

interface GPUError {
  readonly message: string;
}

/**
 * GPU Buffer
 */
interface GPUBufferDescriptor {
  label?: string;
  size: number;
  usage: GPUBufferUsageFlags;
  mappedAtCreation?: boolean;
}

type GPUBufferUsageFlags = number;

interface GPUBuffer {
  readonly size: number;
  readonly usage: GPUBufferUsageFlags;
  readonly mapState: 'unmapped' | 'pending' | 'mapped';
  
  mapAsync(mode: GPUMapModeFlags, offset?: number, size?: number): Promise<void>;
  getMappedRange(offset?: number, size?: number): ArrayBuffer;
  unmap(): void;
  destroy(): void;
}

type GPUMapModeFlags = number;

// Buffer usage flags
declare const GPUBufferUsage: {
  MAP_READ: 0x0001;
  MAP_WRITE: 0x0002;
  COPY_SRC: 0x0004;
  COPY_DST: 0x0008;
  INDEX: 0x0010;
  VERTEX: 0x0020;
  UNIFORM: 0x0040;
  STORAGE: 0x0080;
  INDIRECT: 0x0100;
  QUERY_RESOLVE: 0x0200;
};

declare const GPUMapMode: {
  READ: 0x0001;
  WRITE: 0x0002;
};

/**
 * GPU Texture
 */
interface GPUTextureDescriptor {
  label?: string;
  size: GPUExtent3D;
  mipLevelCount?: number;
  sampleCount?: number;
  dimension?: GPUTextureDimension;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
  viewFormats?: GPUTextureFormat[];
}

type GPUExtent3D = [number, number, number?] | { width: number; height?: number; depthOrArrayLayers?: number };
type GPUTextureDimension = '1d' | '2d' | '3d';
type GPUTextureUsageFlags = number;

type GPUTextureFormat = 
  | 'r8unorm' | 'r8snorm' | 'r8uint' | 'r8sint'
  | 'r16uint' | 'r16sint' | 'r16float'
  | 'rg8unorm' | 'rg8snorm' | 'rg8uint' | 'rg8sint'
  | 'r32uint' | 'r32sint' | 'r32float'
  | 'rg16uint' | 'rg16sint' | 'rg16float'
  | 'rgba8unorm' | 'rgba8unorm-srgb' | 'rgba8snorm' | 'rgba8uint' | 'rgba8sint'
  | 'bgra8unorm' | 'bgra8unorm-srgb'
  | 'rgb9e5ufloat' | 'rgb10a2uint' | 'rgb10a2unorm' | 'rg11b10ufloat'
  | 'rg32uint' | 'rg32sint' | 'rg32float'
  | 'rgba16uint' | 'rgba16sint' | 'rgba16float'
  | 'rgba32uint' | 'rgba32sint' | 'rgba32float'
  | 'stencil8' | 'depth16unorm' | 'depth24plus' | 'depth24plus-stencil8' | 'depth32float' | 'depth32float-stencil8'
  | 'bc1-rgba-unorm' | 'bc1-rgba-unorm-srgb' | 'bc2-rgba-unorm' | 'bc2-rgba-unorm-srgb'
  | 'bc3-rgba-unorm' | 'bc3-rgba-unorm-srgb' | 'bc4-r-unorm' | 'bc4-r-snorm'
  | 'bc5-rg-unorm' | 'bc5-rg-snorm' | 'bc6h-rgb-ufloat' | 'bc6h-rgb-float'
  | 'bc7-rgba-unorm' | 'bc7-rgba-unorm-srgb'
  | 'etc2-rgb8unorm' | 'etc2-rgb8unorm-srgb' | 'etc2-rgb8a1unorm' | 'etc2-rgb8a1unorm-srgb'
  | 'etc2-rgba8unorm' | 'etc2-rgba8unorm-srgb' | 'eac-r11unorm' | 'eac-r11snorm'
  | 'eac-rg11unorm' | 'eac-rg11snorm'
  | 'astc-4x4-unorm' | 'astc-4x4-unorm-srgb' | 'astc-5x4-unorm' | 'astc-5x4-unorm-srgb'
  | 'astc-5x5-unorm' | 'astc-5x5-unorm-srgb' | 'astc-6x5-unorm' | 'astc-6x5-unorm-srgb'
  | 'astc-6x6-unorm' | 'astc-6x6-unorm-srgb' | 'astc-8x5-unorm' | 'astc-8x5-unorm-srgb'
  | 'astc-8x6-unorm' | 'astc-8x6-unorm-srgb' | 'astc-8x8-unorm' | 'astc-8x8-unorm-srgb'
  | 'astc-10x5-unorm' | 'astc-10x5-unorm-srgb' | 'astc-10x6-unorm' | 'astc-10x6-unorm-srgb'
  | 'astc-10x8-unorm' | 'astc-10x8-unorm-srgb' | 'astc-10x10-unorm' | 'astc-10x10-unorm-srgb'
  | 'astc-12x10-unorm' | 'astc-12x10-unorm-srgb' | 'astc-12x12-unorm' | 'astc-12x12-unorm-srgb';

interface GPUTexture {
  readonly width: number;
  readonly height: number;
  readonly depthOrArrayLayers: number;
  readonly mipLevelCount: number;
  readonly sampleCount: number;
  readonly dimension: GPUTextureDimension;
  readonly format: GPUTextureFormat;
  readonly usage: GPUTextureUsageFlags;
  
  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
  destroy(): void;
}

declare const GPUTextureUsage: {
  COPY_SRC: 0x01;
  COPY_DST: 0x02;
  TEXTURE_BINDING: 0x04;
  STORAGE_BINDING: 0x08;
  RENDER_ATTACHMENT: 0x10;
};

interface GPUTextureViewDescriptor {
  label?: string;
  format?: GPUTextureFormat;
  dimension?: GPUTextureViewDimension;
  aspect?: GPUTextureAspect;
  baseMipLevel?: number;
  mipLevelCount?: number;
  baseArrayLayer?: number;
  arrayLayerCount?: number;
}

type GPUTextureViewDimension = '1d' | '2d' | '2d-array' | 'cube' | 'cube-array' | '3d';
type GPUTextureAspect = 'all' | 'stencil-only' | 'depth-only';

interface GPUTextureView {}

/**
 * GPU Sampler
 */
interface GPUSamplerDescriptor {
  label?: string;
  addressModeU?: GPUAddressMode;
  addressModeV?: GPUAddressMode;
  addressModeW?: GPUAddressMode;
  magFilter?: GPUFilterMode;
  minFilter?: GPUFilterMode;
  mipmapFilter?: GPUMipmapFilterMode;
  lodMinClamp?: number;
  lodMaxClamp?: number;
  compare?: GPUCompareFunction;
  maxAnisotropy?: number;
}

type GPUAddressMode = 'clamp-to-edge' | 'repeat' | 'mirror-repeat';
type GPUFilterMode = 'nearest' | 'linear';
type GPUMipmapFilterMode = 'nearest' | 'linear';
type GPUCompareFunction = 'never' | 'less' | 'equal' | 'less-equal' | 'greater' | 'not-equal' | 'greater-equal' | 'always';

interface GPUSampler {}

/**
 * GPU Bind Group Layout
 */
interface GPUBindGroupLayoutDescriptor {
  label?: string;
  entries: GPUBindGroupLayoutEntry[];
}

interface GPUBindGroupLayoutEntry {
  binding: number;
  visibility: GPUShaderStageFlags;
  buffer?: GPUBufferBindingLayout;
  sampler?: GPUSamplerBindingLayout;
  texture?: GPUTextureBindingLayout;
  storageTexture?: GPUStorageTextureBindingLayout;
  externalTexture?: GPUExternalTextureBindingLayout;
}

type GPUShaderStageFlags = number;

declare const GPUShaderStage: {
  VERTEX: 0x1;
  FRAGMENT: 0x2;
  COMPUTE: 0x4;
};

interface GPUBufferBindingLayout {
  type?: 'uniform' | 'storage' | 'read-only-storage';
  hasDynamicOffset?: boolean;
  minBindingSize?: number;
}

interface GPUSamplerBindingLayout {
  type?: 'filtering' | 'non-filtering' | 'comparison';
}

interface GPUTextureBindingLayout {
  sampleType?: 'float' | 'unfilterable-float' | 'depth' | 'sint' | 'uint';
  viewDimension?: GPUTextureViewDimension;
  multisampled?: boolean;
}

interface GPUStorageTextureBindingLayout {
  access?: 'write-only' | 'read-only' | 'read-write';
  format: GPUTextureFormat;
  viewDimension?: GPUTextureViewDimension;
}

interface GPUExternalTextureBindingLayout {}

interface GPUBindGroupLayout {}

/**
 * GPU Pipeline Layout
 */
interface GPUPipelineLayoutDescriptor {
  label?: string;
  bindGroupLayouts: (GPUBindGroupLayout | null)[];
}

interface GPUPipelineLayout {}

/**
 * GPU Bind Group
 */
interface GPUBindGroupDescriptor {
  label?: string;
  layout: GPUBindGroupLayout;
  entries: GPUBindGroupEntry[];
}

interface GPUBindGroupEntry {
  binding: number;
  resource: GPUBindingResource;
}

type GPUBindingResource = GPUSampler | GPUTextureView | GPUBufferBinding | GPUExternalTexture;

interface GPUBufferBinding {
  buffer: GPUBuffer;
  offset?: number;
  size?: number;
}

interface GPUExternalTexture {}

interface GPUBindGroup {}

/**
 * GPU Shader Module
 */
interface GPUShaderModuleDescriptor {
  label?: string;
  code: string;
  sourceMap?: object;
  hints?: Record<string, GPUShaderModuleCompilationHint>;
}

interface GPUShaderModuleCompilationHint {
  layout?: GPUPipelineLayout | 'auto';
}

interface GPUShaderModule {
  getCompilationInfo(): Promise<GPUCompilationInfo>;
}

interface GPUCompilationInfo {
  readonly messages: readonly GPUCompilationMessage[];
}

interface GPUCompilationMessage {
  readonly message: string;
  readonly type: 'error' | 'warning' | 'info';
  readonly lineNum: number;
  readonly linePos: number;
  readonly offset: number;
  readonly length: number;
}

/**
 * GPU Compute Pipeline
 */
interface GPUComputePipelineDescriptor {
  label?: string;
  layout: GPUPipelineLayout | 'auto';
  compute: GPUProgrammableStage;
}

interface GPUProgrammableStage {
  module: GPUShaderModule;
  entryPoint: string;
  constants?: Record<string, number>;
}

interface GPUComputePipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

/**
 * GPU Render Pipeline
 */
interface GPURenderPipelineDescriptor {
  label?: string;
  layout: GPUPipelineLayout | 'auto';
  vertex: GPUVertexState;
  primitive?: GPUPrimitiveState;
  depthStencil?: GPUDepthStencilState;
  multisample?: GPUMultisampleState;
  fragment?: GPUFragmentState;
}

interface GPUVertexState extends GPUProgrammableStage {
  buffers?: (GPUVertexBufferLayout | null)[];
}

interface GPUVertexBufferLayout {
  arrayStride: number;
  stepMode?: 'vertex' | 'instance';
  attributes: GPUVertexAttribute[];
}

interface GPUVertexAttribute {
  format: GPUVertexFormat;
  offset: number;
  shaderLocation: number;
}

type GPUVertexFormat =
  | 'uint8x2' | 'uint8x4' | 'sint8x2' | 'sint8x4' | 'unorm8x2' | 'unorm8x4' | 'snorm8x2' | 'snorm8x4'
  | 'uint16x2' | 'uint16x4' | 'sint16x2' | 'sint16x4' | 'unorm16x2' | 'unorm16x4' | 'snorm16x2' | 'snorm16x4'
  | 'float16x2' | 'float16x4' | 'float32' | 'float32x2' | 'float32x3' | 'float32x4'
  | 'uint32' | 'uint32x2' | 'uint32x3' | 'uint32x4' | 'sint32' | 'sint32x2' | 'sint32x3' | 'sint32x4';

interface GPUPrimitiveState {
  topology?: GPUPrimitiveTopology;
  stripIndexFormat?: GPUIndexFormat;
  frontFace?: 'ccw' | 'cw';
  cullMode?: 'none' | 'front' | 'back';
  unclippedDepth?: boolean;
}

type GPUPrimitiveTopology = 'point-list' | 'line-list' | 'line-strip' | 'triangle-list' | 'triangle-strip';
type GPUIndexFormat = 'uint16' | 'uint32';

interface GPUDepthStencilState {
  format: GPUTextureFormat;
  depthWriteEnabled?: boolean;
  depthCompare?: GPUCompareFunction;
  stencilFront?: GPUStencilFaceState;
  stencilBack?: GPUStencilFaceState;
  stencilReadMask?: number;
  stencilWriteMask?: number;
  depthBias?: number;
  depthBiasSlopeScale?: number;
  depthBiasClamp?: number;
}

interface GPUStencilFaceState {
  compare?: GPUCompareFunction;
  failOp?: GPUStencilOperation;
  depthFailOp?: GPUStencilOperation;
  passOp?: GPUStencilOperation;
}

type GPUStencilOperation = 'keep' | 'zero' | 'replace' | 'invert' | 'increment-clamp' | 'decrement-clamp' | 'increment-wrap' | 'decrement-wrap';

interface GPUMultisampleState {
  count?: number;
  mask?: number;
  alphaToCoverageEnabled?: boolean;
}

interface GPUFragmentState extends GPUProgrammableStage {
  targets: (GPUColorTargetState | null)[];
}

interface GPUColorTargetState {
  format: GPUTextureFormat;
  blend?: GPUBlendState;
  writeMask?: GPUColorWriteFlags;
}

interface GPUBlendState {
  color: GPUBlendComponent;
  alpha: GPUBlendComponent;
}

interface GPUBlendComponent {
  operation?: GPUBlendOperation;
  srcFactor?: GPUBlendFactor;
  dstFactor?: GPUBlendFactor;
}

type GPUBlendOperation = 'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max';
type GPUBlendFactor = 'zero' | 'one' | 'src' | 'one-minus-src' | 'src-alpha' | 'one-minus-src-alpha' | 'dst' | 'one-minus-dst' | 'dst-alpha' | 'one-minus-dst-alpha' | 'src-alpha-saturated' | 'constant' | 'one-minus-constant';

type GPUColorWriteFlags = number;

declare const GPUColorWrite: {
  RED: 0x1;
  GREEN: 0x2;
  BLUE: 0x4;
  ALPHA: 0x8;
  ALL: 0xF;
};

interface GPURenderPipeline {
  getBindGroupLayout(index: number): GPUBindGroupLayout;
}

/**
 * GPU Command Encoder
 */
interface GPUCommandEncoderDescriptor {
  label?: string;
}

interface GPUCommandEncoder {
  beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
  beginComputePass(descriptor?: GPUComputePassDescriptor): GPUComputePassEncoder;
  copyBufferToBuffer(source: GPUBuffer, sourceOffset: number, destination: GPUBuffer, destinationOffset: number, size: number): void;
  copyBufferToTexture(source: GPUImageCopyBuffer, destination: GPUImageCopyTexture, copySize: GPUExtent3D): void;
  copyTextureToBuffer(source: GPUImageCopyTexture, destination: GPUImageCopyBuffer, copySize: GPUExtent3D): void;
  copyTextureToTexture(source: GPUImageCopyTexture, destination: GPUImageCopyTexture, copySize: GPUExtent3D): void;
  clearBuffer(buffer: GPUBuffer, offset?: number, size?: number): void;
  writeTimestamp(querySet: GPUQuerySet, queryIndex: number): void;
  resolveQuerySet(querySet: GPUQuerySet, firstQuery: number, queryCount: number, destination: GPUBuffer, destinationOffset: number): void;
  finish(descriptor?: GPUCommandBufferDescriptor): GPUCommandBuffer;
}

interface GPURenderPassDescriptor {
  label?: string;
  colorAttachments: (GPURenderPassColorAttachment | null)[];
  depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
  occlusionQuerySet?: GPUQuerySet;
  timestampWrites?: GPURenderPassTimestampWrites;
  maxDrawCount?: number;
}

interface GPURenderPassColorAttachment {
  view: GPUTextureView;
  resolveTarget?: GPUTextureView;
  clearValue?: GPUColor;
  loadOp: GPULoadOp;
  storeOp: GPUStoreOp;
}

type GPUColor = [number, number, number, number] | { r: number; g: number; b: number; a: number };
type GPULoadOp = 'load' | 'clear';
type GPUStoreOp = 'store' | 'discard';

interface GPURenderPassDepthStencilAttachment {
  view: GPUTextureView;
  depthClearValue?: number;
  depthLoadOp?: GPULoadOp;
  depthStoreOp?: GPUStoreOp;
  depthReadOnly?: boolean;
  stencilClearValue?: number;
  stencilLoadOp?: GPULoadOp;
  stencilStoreOp?: GPUStoreOp;
  stencilReadOnly?: boolean;
}

interface GPURenderPassTimestampWrites {
  querySet: GPUQuerySet;
  beginningOfPassWriteIndex?: number;
  endOfPassWriteIndex?: number;
}

interface GPUComputePassDescriptor {
  label?: string;
  timestampWrites?: GPUComputePassTimestampWrites;
}

interface GPUComputePassTimestampWrites {
  querySet: GPUQuerySet;
  beginningOfPassWriteIndex?: number;
  endOfPassWriteIndex?: number;
}

interface GPUImageCopyBuffer {
  buffer: GPUBuffer;
  offset?: number;
  bytesPerRow?: number;
  rowsPerImage?: number;
}

interface GPUImageCopyTexture {
  texture: GPUTexture;
  mipLevel?: number;
  origin?: GPUOrigin3D;
  aspect?: GPUTextureAspect;
}

type GPUOrigin3D = [number, number, number?] | { x?: number; y?: number; z?: number };

interface GPUCommandBufferDescriptor {
  label?: string;
}

interface GPUCommandBuffer {}

/**
 * GPU Render Pass Encoder
 */
interface GPURenderPassEncoder {
  setViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): void;
  setScissorRect(x: number, y: number, width: number, height: number): void;
  setBlendConstant(color: GPUColor): void;
  setStencilReference(reference: number): void;
  beginOcclusionQuery(queryIndex: number): void;
  endOcclusionQuery(): void;
  executeBundles(bundles: GPURenderBundle[]): void;
  end(): void;
  
  // Draw commands
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup | null, dynamicOffsets?: number[]): void;
  setVertexBuffer(slot: number, buffer: GPUBuffer | null, offset?: number, size?: number): void;
  setIndexBuffer(buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: number, size?: number): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  drawIndexed(indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number): void;
  drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void;
  drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void;
  
  // Debug
  pushDebugGroup(groupLabel: string): void;
  popDebugGroup(): void;
  insertDebugMarker(markerLabel: string): void;
}

interface GPURenderBundle {}

/**
 * GPU Compute Pass Encoder
 */
interface GPUComputePassEncoder {
  setPipeline(pipeline: GPUComputePipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup | null, dynamicOffsets?: number[]): void;
  dispatchWorkgroups(workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number): void;
  dispatchWorkgroupsIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void;
  end(): void;
  
  // Debug
  pushDebugGroup(groupLabel: string): void;
  popDebugGroup(): void;
  insertDebugMarker(markerLabel: string): void;
}

/**
 * GPU Queue
 */
interface GPUQueue {
  submit(commandBuffers: GPUCommandBuffer[]): void;
  onSubmittedWorkDone(): Promise<void>;
  writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: BufferSource | SharedArrayBuffer, dataOffset?: number, size?: number): void;
  writeTexture(destination: GPUImageCopyTexture, data: BufferSource | SharedArrayBuffer, dataLayout: GPUImageDataLayout, size: GPUExtent3D): void;
  copyExternalImageToTexture(source: GPUImageCopyExternalImage, destination: GPUImageCopyTextureTagged, copySize: GPUExtent3D): void;
}

interface GPUImageDataLayout {
  offset?: number;
  bytesPerRow?: number;
  rowsPerImage?: number;
}

interface GPUImageCopyExternalImage {
  source: ImageBitmap | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas;
  origin?: GPUOrigin2D;
  flipY?: boolean;
}

type GPUOrigin2D = [number, number] | { x?: number; y?: number };

interface GPUImageCopyTextureTagged extends GPUImageCopyTexture {
  colorSpace?: PredefinedColorSpace;
  premultipliedAlpha?: boolean;
}

/**
 * GPU Render Bundle Encoder
 */
interface GPURenderBundleEncoderDescriptor {
  label?: string;
  colorFormats: (GPUTextureFormat | null)[];
  depthStencilFormat?: GPUTextureFormat;
  sampleCount?: number;
  depthReadOnly?: boolean;
  stencilReadOnly?: boolean;
}

interface GPURenderBundleEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup | null, dynamicOffsets?: number[]): void;
  setVertexBuffer(slot: number, buffer: GPUBuffer | null, offset?: number, size?: number): void;
  setIndexBuffer(buffer: GPUBuffer, indexFormat: GPUIndexFormat, offset?: number, size?: number): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  drawIndexed(indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number): void;
  drawIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void;
  drawIndexedIndirect(indirectBuffer: GPUBuffer, indirectOffset: number): void;
  finish(descriptor?: GPURenderBundleDescriptor): GPURenderBundle;
  
  // Debug
  pushDebugGroup(groupLabel: string): void;
  popDebugGroup(): void;
  insertDebugMarker(markerLabel: string): void;
}

interface GPURenderBundleDescriptor {
  label?: string;
}

/**
 * GPU Query Set
 */
interface GPUQuerySetDescriptor {
  label?: string;
  type: GPUQueryType;
  count: number;
}

type GPUQueryType = 'occlusion' | 'timestamp';

interface GPUQuerySet {
  readonly type: GPUQueryType;
  readonly count: number;
  destroy(): void;
}

/**
 * GPU Canvas Context
 */
interface GPUCanvasContext {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  configure(configuration: GPUCanvasConfiguration): void;
  unconfigure(): void;
  getCurrentTexture(): GPUTexture;
}

interface GPUCanvasConfiguration {
  device: GPUDevice;
  format: GPUTextureFormat;
  usage?: GPUTextureUsageFlags;
  viewFormats?: GPUTextureFormat[];
  colorSpace?: PredefinedColorSpace;
  alphaMode?: GPUCanvasAlphaMode;
}

type GPUCanvasAlphaMode = 'opaque' | 'premultiplied';

// Canvas extension
interface HTMLCanvasElement {
  getContext(contextId: 'webgpu'): GPUCanvasContext | null;
}

interface OffscreenCanvas {
  getContext(contextId: 'webgpu'): GPUCanvasContext | null;
}
