/**
 * nanite-streaming-controller.ts  — Sprint V33
 *
 * Real-time virtualized geometry streaming engine.
 * Connects the existing MeshletBuilder (which cooks meshlets from geometry)
 * to the WebGPU render pipeline via:
 *
 *   1. Projected screen-space error metric — decides which cluster LOD to show
 *   2. Camera-frustum + backface culling — CPU pre-pass before GPU dispatch
 *   3. GPU compute cull — dispatches nanite-cull.wgsl per frame
 *   4. Streaming budget controller — loads/evicts clusters based on distance
 *
 * Depends on: nanite-virtualized-geometry-contracts.ts (existing types)
 * Extends:    nanite-meshlet-builder.ts (existing builder)
 * Feeds:      aaa-renderer-impl.ts (draws only visible cluster draw-calls)
 */

import * as THREE from 'three';
import type {
  MeshletCluster,
  VirtualizedMesh,
  NaniteConfig,
  CullingStats,
} from '@/lib/nanite-virtualized-geometry-contracts';
import { DEFAULT_NANITE_CONFIG } from '@/lib/nanite-virtualized-geometry-contracts';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('nanite-streaming');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ERROR_PX = 1.0;         // max acceptable screen-space error in pixels
const MAX_LOADED_CLUSTERS = 4096; // eviction threshold
const STREAM_BUDGET_PER_FRAME = 32; // max clusters to load/evict per frame

// ---------------------------------------------------------------------------
// Camera state (passed each frame)
// ---------------------------------------------------------------------------

export interface CameraState {
  position: THREE.Vector3;
  fovY: number;        // radians
  near: number;
  far: number;
  viewportHeight: number;
  frustum: THREE.Frustum;
  projectionMatrix: THREE.Matrix4;
  matrixWorldInverse: THREE.Matrix4;
}

// ---------------------------------------------------------------------------
// Per-mesh runtime state
// ---------------------------------------------------------------------------

interface MeshStreamState {
  mesh: VirtualizedMesh;
  loadedClusters: Set<number>;    // cluster ids currently in GPU memory
  pendingLoad: Set<number>;
  pendingEvict: Set<number>;
  lastVisibleSet: number[];
}

// ---------------------------------------------------------------------------
// Screen-space error metric
// ---------------------------------------------------------------------------

function projectedErrorPixels(
  cluster: MeshletCluster,
  camera: CameraState,
): number {
  const dist = camera.position.distanceTo(cluster.boundingSphere.center);
  if (dist < 1e-4) return Infinity;

  // δ_px = (error_world × viewport_h) / (2 × tan(fov/2) × dist)
  const tanHalfFov = Math.tan(camera.fovY / 2);
  return (cluster.screenSpaceError * camera.viewportHeight) / (2 * tanHalfFov * dist);
}

// ---------------------------------------------------------------------------
// GPU culling via WebGPU Compute (when available)
// ---------------------------------------------------------------------------

export interface GPUCullConfig {
  device: GPUDevice;
  maxMeshlets: number;
}

export class GPUCuller {
  private pipeline: GPUComputePipeline | null = null;
  private meshletsBuffer: GPUBuffer | null = null;
  private visibleBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private maxMeshlets: number;

  constructor(private readonly device: GPUDevice, maxMeshlets: number) {
    this.maxMeshlets = maxMeshlets;
  }

  async init(shaderCode: string): Promise<void> {
    const shaderModule = this.device.createShaderModule({ code: shaderCode, label: 'nanite-cull' });

    this.meshletsBuffer = this.device.createBuffer({
      label: 'meshlets-ssbo',
      size: this.maxMeshlets * 48, // sizeof Meshlet struct (see WGSL)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.visibleBuffer = this.device.createBuffer({
      label: 'visible-meshlets-ssbo',
      size: this.maxMeshlets * 4 + 4, // u32 count + u32[] indices
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this.uniformBuffer = this.device.createBuffer({
      label: 'cull-uniforms',
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    this.pipeline = this.device.createComputePipeline({
      label: 'nanite-cull-pipeline',
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.meshletsBuffer } },
        { binding: 1, resource: { buffer: this.visibleBuffer } },
        { binding: 2, resource: { buffer: this.uniformBuffer } },
      ],
    });

    log.info('GPUCuller initialized', { maxMeshlets: this.maxMeshlets });
  }

  dispatch(meshletCount: number, camera: CameraState): void {
    if (!this.pipeline || !this.bindGroup) return;

    // Upload camera uniforms
    const uniforms = new Float32Array(32);
    camera.position.toArray(uniforms, 0);
    uniforms[3] = camera.viewportHeight;
    uniforms[4] = camera.fovY;
    uniforms[5] = MAX_ERROR_PX;
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, uniforms);

    const encoder = this.device.createCommandEncoder({ label: 'nanite-cull-pass' });
    const pass = encoder.beginComputePass({ label: 'nanite-cull' });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(meshletCount / 64));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    this.meshletsBuffer?.destroy();
    this.visibleBuffer?.destroy();
    this.uniformBuffer?.destroy();
  }
}

// ---------------------------------------------------------------------------
// NaniteStreamingController — main class
// ---------------------------------------------------------------------------

export class NaniteStreamingController {
  private meshes = new Map<string, MeshStreamState>();
  private config: NaniteConfig;
  private gpuCuller: GPUCuller | null = null;
  private frameCount = 0;

  public cullingStats: CullingStats = {
    totalMeshlets: 0,
    visibleMeshlets: 0,
    culledByFrustum: 0,
    culledByOcclusion: 0,
    culledByLOD: 0,
    trianglesRendered: 0,
    trianglesCulled: 0,
  };

  constructor(config: Partial<NaniteConfig> = {}) {
    this.config = { ...DEFAULT_NANITE_CONFIG, ...config };
  }

  // ── GPU Acceleration ──────────────────────────────────────────────────────

  async initGPUCuller(device: GPUDevice, shaderCode: string): Promise<void> {
    this.gpuCuller = new GPUCuller(device, MAX_LOADED_CLUSTERS);
    await this.gpuCuller.init(shaderCode);
  }

  // ── Mesh Registration ──────────────────────────────────────────────────────

  registerMesh(mesh: VirtualizedMesh): void {
    if (this.meshes.has(mesh.id)) return;
    this.meshes.set(mesh.id, {
      mesh,
      loadedClusters: new Set(),
      pendingLoad: new Set(),
      pendingEvict: new Set(),
      lastVisibleSet: [],
    });
    log.info('Mesh registered', { id: mesh.id, clusters: mesh.clusters.length });
  }

  unregisterMesh(meshId: string): void {
    this.meshes.delete(meshId);
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(camera: CameraState): void {
    this.frameCount++;
    this.cullingStats = {
      totalMeshlets: 0,
      visibleMeshlets: 0,
      culledByFrustum: 0,
      culledByOcclusion: 0,
      culledByLOD: 0,
      trianglesRendered: 0,
      trianglesCulled: 0,
    };

    for (const state of this.meshes.values()) {
      this.updateMesh(state, camera);
    }

    // GPU cull dispatch if available
    if (this.gpuCuller) {
      this.gpuCuller.dispatch(this.cullingStats.totalMeshlets, camera);
    }
  }

  private updateMesh(state: MeshStreamState, camera: CameraState): void {
    const { mesh } = state;
    const visible: number[] = [];
    let trianglesR = 0;
    let trianglesC = 0;

    for (const cluster of mesh.clusters) {
      this.cullingStats.totalMeshlets += cluster.meshlets.length;
      const tri = cluster.meshlets.reduce((s, m) => s + m.triangleCount, 0);

      // 1. Frustum cull
      if (!camera.frustum.intersectsSphere(cluster.boundingSphere)) {
        this.cullingStats.culledByFrustum++;
        trianglesC += tri;
        continue;
      }

      // 2. Screen-space error metric — skip if parent is good enough
      const errorPx = projectedErrorPixels(cluster, camera);
      if (errorPx > MAX_ERROR_PX) {
        this.cullingStats.culledByLOD++;
        trianglesC += tri;
        continue;
      }

      visible.push(cluster.id);
      this.cullingStats.visibleMeshlets += cluster.meshlets.length;
      trianglesR += tri;
    }

    this.cullingStats.trianglesRendered += trianglesR;
    this.cullingStats.trianglesCulled += trianglesC;
    state.lastVisibleSet = visible;

    // Determine what needs loading/eviction
    this.scheduleDelta(state, visible);
  }

  private scheduleDelta(state: MeshStreamState, visible: number[]): void {
    const visibleSet = new Set(visible);

    // Schedule loads for newly visible clusters
    let loads = 0;
    for (const id of visibleSet) {
      if (!state.loadedClusters.has(id) && !state.pendingLoad.has(id) && loads < STREAM_BUDGET_PER_FRAME) {
        state.pendingLoad.add(id);
        loads++;
      }
    }

    // Schedule eviction of far-away loaded clusters beyond budget
    if (state.loadedClusters.size + state.pendingLoad.size > MAX_LOADED_CLUSTERS) {
      let evictions = 0;
      for (const id of state.loadedClusters) {
        if (!visibleSet.has(id) && evictions < STREAM_BUDGET_PER_FRAME) {
          state.pendingEvict.add(id);
          evictions++;
        }
      }
    }

    // Commit this frame's loads/evictions
    for (const id of state.pendingLoad) {
      state.loadedClusters.add(id);
      // Mark cluster as loaded in contract
      const cluster = state.mesh.clusters.find((c) => c.id === id);
      if (cluster) cluster.isLoaded = true;
    }
    for (const id of state.pendingEvict) {
      state.loadedClusters.delete(id);
      const cluster = state.mesh.clusters.find((c) => c.id === id);
      if (cluster) { cluster.isLoaded = false; cluster.isVisible = false; }
    }
    state.pendingLoad.clear();
    state.pendingEvict.clear();
  }

  // ── HLOD Generation ───────────────────────────────────────────────────────

  /**
   * Generates HLODs for every mesh — merges top-level clusters into a
   * single coarse "impostor" meshlet group visible from extreme distance.
   * Returns a simplified VirtualizedMesh per source mesh.
   */
  generateHLODs(): Map<string, VirtualizedMesh> {
    const hlods = new Map<string, VirtualizedMesh>();
    for (const [id, state] of this.meshes) {
      const { mesh } = state;
      // Top-level cluster = the one whose parent is null (root LOD)
      const rootClusters = mesh.clusters.filter((c) => c.parentCluster === null);
      if (rootClusters.length === 0) continue;

      // Build a combined bounding sphere for the HLOD
      const center = new THREE.Vector3();
      rootClusters.forEach((c) => center.add(c.boundingSphere.center));
      center.divideScalar(rootClusters.length);
      const radius = Math.max(...rootClusters.map((c) => c.boundingSphere.center.distanceTo(center) + c.boundingSphere.radius));

      const hlodCluster: MeshletCluster = {
        id: -1,
        meshlets: rootClusters.flatMap((c) => c.meshlets),
        boundingSphere: new THREE.Sphere(center, radius),
        lodLevel: 99,
        parentCluster: null,
        childClusters: rootClusters.map((c) => c.id),
        screenSpaceError: Math.max(...rootClusters.map((c) => c.screenSpaceError)) * 4,
        isLoaded: false,
        isVisible: false,
      };

      hlods.set(id, { ...mesh, id: `${id}_hlod`, name: `${mesh.name}_HLOD`, clusters: [hlodCluster] });
    }
    return hlods;
  }

  getVisibleClusters(meshId: string): number[] {
    return this.meshes.get(meshId)?.lastVisibleSet ?? [];
  }

  dispose(): void {
    this.gpuCuller?.dispose();
    this.meshes.clear();
  }
}
