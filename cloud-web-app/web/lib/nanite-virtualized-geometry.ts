/**
 * @aethel-heavy-async-boundary Studio/Nanite runtime; do not import from public route shells.
 *
 * NANITE-LIKE VIRTUALIZED GEOMETRY SYSTEM - Aethel Engine
 *
 * Sistema de geometria virtualizada inspirado no Nanite do Unreal Engine 5.
 * Permite renderizar milhões de polígonos em tempo real.
 *
 * FEATURES:
 * - Meshlet-based rendering
 * - Hierarchical LOD clustering
 * - GPU-driven culling (Hi-Z, frustum, occlusion)
 * - Software rasterization fallback
 * - Visibility buffer rendering
 * - Streaming de geometria
 * - Instancing automático
 */

import * as THREE from 'three';

import { createComponentLogger } from '@/lib/observability/logger'
import { DEFAULT_NANITE_CONFIG } from './nanite-virtualized-geometry-contracts';
import { MeshletBuilder } from './nanite-meshlet-builder';
import { GPUCullingSystem, VisibilityBufferRenderer } from './nanite-virtualized-geometry-renderers';

const log = createComponentLogger('nanite-virtualized-geometry')

import type { CullingStats, Meshlet, MeshletCluster, NaniteConfig, VirtualizedMesh } from './nanite-virtualized-geometry-contracts';

export type { CullingStats, Meshlet, MeshletCluster, NaniteConfig, VirtualizedMesh } from './nanite-virtualized-geometry-contracts';
export { MeshletBuilder } from './nanite-meshlet-builder';
export { GPUCullingSystem, VisibilityBufferRenderer } from './nanite-virtualized-geometry-renderers';

// ============================================================================
// NANITE RENDERER
// ============================================================================

export class NaniteRenderer {
  private meshletBuilder: MeshletBuilder;
  private cullingSystem: GPUCullingSystem;
  private visibilityRenderer: VisibilityBufferRenderer;

  private virtualizedMeshes: Map<string, VirtualizedMesh> = new Map();
  private config: NaniteConfig;

  constructor(config: Partial<NaniteConfig> = {}) {
    this.config = {
      ...DEFAULT_NANITE_CONFIG,
      ...config,
    };

    this.meshletBuilder = new MeshletBuilder(this.config);
    this.cullingSystem = new GPUCullingSystem();
    this.visibilityRenderer = new VisibilityBufferRenderer();
  }

  initialize(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.cullingSystem.initialize(gl);
    this.visibilityRenderer.initialize(gl, width, height);
  }

  /**
   * Importa uma geometria para o sistema Nanite
   */
  importGeometry(geometry: THREE.BufferGeometry, name: string): string {
    const virtualizedMesh = this.meshletBuilder.buildFromGeometry(geometry, name);
    this.virtualizedMeshes.set(virtualizedMesh.id, virtualizedMesh);

    log.info(`[Nanite] Imported "${name}":`, {
      vertices: virtualizedMesh.totalVertices,
      triangles: virtualizedMesh.totalTriangles,
      clusters: virtualizedMesh.clusters.length,
      lodLevels: virtualizedMesh.lodLevels,
    });

    return virtualizedMesh.id;
  }

  /**
   * Renderiza todos os meshes virtualizados
   */
  render(camera: THREE.Camera, transform: THREE.Matrix4): void {
    const viewProjection = new THREE.Matrix4()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

    for (const [id, mesh] of this.virtualizedMeshes) {
      // Culling
      const visibleMeshlets = this.cullingSystem.cullMeshlets(mesh, camera);

      // Renderizar
      const mvp = new THREE.Matrix4().multiplyMatrices(viewProjection, transform);
      this.visibilityRenderer.renderVisibilityPass(visibleMeshlets, mesh, mvp);
    }

    // Resolve final
    this.visibilityRenderer.resolvePass();
  }

  /**
   * Retorna estatísticas de culling
   */
  getStats(): CullingStats {
    return this.cullingSystem.getStats();
  }

  /**
   * Remove um mesh virtualizado
   */
  removeMesh(meshId: string): boolean {
    return this.virtualizedMeshes.delete(meshId);
  }

  /**
   * Limpa todos os meshes
   */
  clear(): void {
    this.virtualizedMeshes.clear();
  }

  getMeshCount(): number {
    return this.virtualizedMeshes.size;
  }

  getMesh(meshId: string): VirtualizedMesh | undefined {
    return this.virtualizedMeshes.get(meshId);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const createNaniteRenderer = (config?: Partial<NaniteConfig>): NaniteRenderer => {
  return new NaniteRenderer(config);
};

export const createMeshletBuilder = (config?: Partial<NaniteConfig>): MeshletBuilder => {
  return new MeshletBuilder(config);
};

export const createGPUCullingSystem = (): GPUCullingSystem => {
  return new GPUCullingSystem();
};
