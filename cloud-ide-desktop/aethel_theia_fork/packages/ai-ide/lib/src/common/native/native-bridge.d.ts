import { Event } from '@theia/core/lib/common';
/**
 * ============================================================================
 * AETHEL NATIVE C++/WASM BRIDGE
 * ============================================================================
 *
 * Bridge para código nativo C++/WASM para performance crítica:
 * - Physics simulation (high-precision, multi-threaded)
 * - Mesh processing (LOD generation, decimation, boolean ops)
 * - Ray tracing acceleration structures (BVH)
 * - Animation compression/decompression
 * - Audio processing (DSP, spatial audio)
 * - Pathfinding (large-scale nav meshes)
 * - Particle systems (millions of particles)
 * - Terrain generation/LOD
 *
 * Arquitetura:
 * - TypeScript ↔ WASM via shared memory buffers
 * - Multi-threading com Web Workers + SharedArrayBuffer
 * - SIMD optimization (WebAssembly SIMD)
 * - Async job system
 */
export declare enum NativeModuleType {
    Physics = "physics",
    Rendering = "rendering",
    Animation = "animation",
    Audio = "audio",
    Navigation = "navigation",
    Geometry = "geometry",
    Particles = "particles",
    Terrain = "terrain"
}
export interface NativeModuleInfo {
    type: NativeModuleType;
    wasmPath: string;
    workerPath?: string;
    threadCount?: number;
    features: string[];
}
export declare enum JobPriority {
    Critical = 0,
    High = 1,
    Normal = 2,
    Low = 3,
    Background = 4
}
export interface NativeJob {
    id: string;
    module: NativeModuleType;
    function: string;
    params: ArrayBuffer | SharedArrayBuffer;
    priority: JobPriority;
    callback?: (result: ArrayBuffer) => void;
}
export interface JobResult {
    jobId: string;
    success: boolean;
    result?: ArrayBuffer;
    error?: string;
    executionTime: number;
}
/**
 * Physics Simulation Buffer Layout
 *
 * Shared between TS and C++ for zero-copy physics updates
 */
export interface PhysicsSharedBuffer {
    /** Header */
    version: number;
    frameNumber: number;
    objectCount: number;
    deltaTime: number;
    gravity: Float32Array;
    /** Per-object data (Structure of Arrays) */
    positions: Float32Array;
    rotations: Float32Array;
    velocities: Float32Array;
    angularVel: Float32Array;
    masses: Float32Array;
    flags: Uint32Array;
    /** Collision results */
    collisionCount: number;
    collisions: CollisionData[];
}
export interface CollisionData {
    objectA: number;
    objectB: number;
    point: Float32Array;
    normal: Float32Array;
    penetration: number;
    impulse: number;
}
/**
 * Mesh Processing Buffer
 */
export interface MeshProcessingBuffer {
    vertexCount: number;
    indexCount: number;
    /** Input mesh */
    positions: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
    /** Output (LOD generation, decimation, etc.) */
    outputVertexCount: number;
    outputIndexCount: number;
    outputPositions: Float32Array;
    outputNormals: Float32Array;
    outputUvs: Float32Array;
    outputIndices: Uint32Array;
}
/**
 * Animation Compression Buffer
 */
export interface AnimationBuffer {
    frameCount: number;
    boneCount: number;
    fps: number;
    /** Uncompressed (input) */
    positions: Float32Array;
    rotations: Float32Array;
    scales: Float32Array;
    /** Compressed (output) */
    compressedSize: number;
    compressedData: Uint8Array;
    compressionRatio: number;
}
/**
 * Audio Processing Buffer
 */
export interface AudioBuffer {
    sampleRate: number;
    channelCount: number;
    sampleCount: number;
    /** Input audio */
    samples: Float32Array;
    /** Spatial audio params */
    listenerPosition: Float32Array;
    listenerForward: Float32Array;
    listenerUp: Float32Array;
    sourcePosition: Float32Array;
    sourceVelocity: Float32Array;
    /** Output (spatialized) */
    outputLeft: Float32Array;
    outputRight: Float32Array;
}
export interface INativeModule {
    readonly type: NativeModuleType;
    readonly isLoaded: boolean;
    readonly supportsThreading: boolean;
    readonly supportsSIMD: boolean;
    initialize(): Promise<void>;
    dispose(): void;
    executeJob(job: NativeJob): Promise<JobResult>;
    executeJobSync(job: NativeJob): JobResult;
}
export declare class NativePhysicsModule implements INativeModule {
    readonly type = NativeModuleType.Physics;
    private wasmInstance?;
    private memory?;
    private workers;
    private sharedBuffer?;
    isLoaded: boolean;
    supportsThreading: boolean;
    supportsSIMD: boolean;
    initialize(): Promise<void>;
    dispose(): void;
    executeJob(job: NativeJob): Promise<JobResult>;
    executeJobSync(job: NativeJob): JobResult;
    /**
     * Step physics simulation (zero-copy via shared memory)
     */
    stepSimulation(deltaTime: number, sharedBuffer: PhysicsSharedBuffer): void;
    private allocateMemory;
    private freeMemory;
    private getWasmPath;
    private getWorkerPath;
}
export declare class NativeMeshProcessingModule implements INativeModule {
    readonly type = NativeModuleType.Geometry;
    private wasmInstance?;
    private memory?;
    isLoaded: boolean;
    supportsThreading: boolean;
    supportsSIMD: boolean;
    initialize(): Promise<void>;
    dispose(): void;
    executeJob(job: NativeJob): Promise<JobResult>;
    executeJobSync(job: NativeJob): JobResult;
    /**
     * Generate LOD levels for a mesh
     */
    generateLODs(mesh: MeshProcessingBuffer, lodCount: number, targetReduction: number[]): Promise<MeshProcessingBuffer[]>;
    /**
     * Mesh decimation (reduce poly count)
     */
    decimateMesh(mesh: MeshProcessingBuffer, targetTriangleCount: number): Promise<MeshProcessingBuffer>;
    /**
     * Boolean operations (union, intersection, difference)
     */
    meshBoolean(meshA: MeshProcessingBuffer, meshB: MeshProcessingBuffer, operation: 'union' | 'intersection' | 'difference'): Promise<MeshProcessingBuffer>;
    private copyMeshToWasm;
    private readMeshFromWasm;
}
export declare class NativeAnimationModule implements INativeModule {
    readonly type = NativeModuleType.Animation;
    private wasmInstance?;
    isLoaded: boolean;
    supportsThreading: boolean;
    supportsSIMD: boolean;
    initialize(): Promise<void>;
    dispose(): void;
    executeJob(job: NativeJob): Promise<JobResult>;
    executeJobSync(job: NativeJob): JobResult;
    /**
     * Compress animation data
     */
    compressAnimation(anim: AnimationBuffer): Promise<AnimationBuffer>;
    /**
     * Decompress animation frame
     */
    decompressFrame(compressed: Uint8Array, frameIndex: number): {
        positions: Float32Array;
        rotations: Float32Array;
        scales: Float32Array;
    };
}
export declare class NativeBridge {
    private modules;
    private jobQueue;
    private activeJobs;
    private readonly onJobCompleteEmitter;
    readonly onJobComplete: Event<JobResult>;
    initialize(): Promise<void>;
    private loadModule;
    dispose(): void;
    submitJob(job: NativeJob): void;
    private startJobProcessor;
    private processJobs;
    getPhysicsModule(): NativePhysicsModule | undefined;
    getMeshProcessingModule(): NativeMeshProcessingModule | undefined;
    getAnimationModule(): NativeAnimationModule | undefined;
    createSharedBuffer(size: number): SharedArrayBuffer | undefined;
    getFeatures(): {
        wasmSupported: boolean;
        simdSupported: boolean;
        threadsSupported: boolean;
        sharedMemorySupported: boolean;
    };
    getStatistics(): NativeBridgeStats;
}
export interface NativeBridgeStats {
    loadedModules: number;
    queuedJobs: number;
    activeJobs: number;
    features: {
        wasmSupported: boolean;
        simdSupported: boolean;
        threadsSupported: boolean;
        sharedMemorySupported: boolean;
    };
}
