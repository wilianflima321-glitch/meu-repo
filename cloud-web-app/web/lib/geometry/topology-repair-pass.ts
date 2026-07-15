/**
 * topology-repair-pass.ts  — Sprint V33
 *
 * Mesh topology repair system for AI-generated triangle soups.
 *
 * AI generative models (TripoSR, SyncDreamer, etc.) produce meshes with:
 *   - Duplicate / near-duplicate vertices (T-junctions)
 *   - Non-manifold edges (edges shared by >2 faces)
 *   - Degenerate triangles (zero area)
 *   - Flipped normals
 *   - Disconnected islands (floating geometry)
 *   - UV seams producing hard edges in smoothing groups
 *
 * This pass runs as a post-processing step after mesh import.
 * Heavy operations (isotropic remeshing) run in a Web Worker.
 *
 * Pipeline:
 *   1. Vertex merging (weld nearby verts within epsilon)
 *   2. Degenerate face removal
 *   3. Normal recalculation + flip detection
 *   4. UV auto-unwrap (spherical / cube projection fallback)
 *   5. (Optional) Isotropic remesh for uniform triangle distribution
 */

import * as THREE from 'three';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('topology-repair');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface TopologyRepairConfig {
  /** Vertex merge threshold (world units) */
  mergeEpsilon: number;
  /** Remove triangles with area < this threshold */
  degenerateAreaThreshold: number;
  /** Flip normals pointing away from mesh centroid */
  autoFixNormals: boolean;
  /** Run UV auto-unwrap when no UV channel exists */
  autoUnwrapUV: boolean;
  /** Remove islands smaller than this fraction of total vertex count */
  removeSmallIslandsFraction: number;
}

export const DEFAULT_REPAIR_CONFIG: TopologyRepairConfig = {
  mergeEpsilon: 0.001,
  degenerateAreaThreshold: 1e-8,
  autoFixNormals: true,
  autoUnwrapUV: true,
  removeSmallIslandsFraction: 0.01,
};

export interface TopologyRepairReport {
  verticesBefore: number;
  verticesAfter: number;
  facesRemoved: number;
  normalsFlipped: number;
  uvChannelsAdded: number;
  islandsRemoved: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// TopologyRepairPass
// ---------------------------------------------------------------------------

export class TopologyRepairPass {
  constructor(private config: TopologyRepairConfig = DEFAULT_REPAIR_CONFIG) {}

  /**
   * Apply full repair pipeline to a THREE.BufferGeometry in-place.
   * Returns a detailed report of changes made.
   */
  repair(geometry: THREE.BufferGeometry): TopologyRepairReport {
    const start = performance.now();
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const verticesBefore = posAttr.count;
    let facesRemoved = 0;
    let normalsFlipped = 0;
    let uvChannelsAdded = 0;
    let islandsRemoved = 0;

    // 1. Weld near-duplicate vertices
    const { positions, remap } = this.weldVertices(posAttr);
    const newIndex = this.remapIndices(geometry, remap);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    if (newIndex) geometry.setIndex(newIndex);

    // 2. Remove degenerate faces
    const removalResult = this.removeDegenerates(geometry);
    facesRemoved = removalResult.removed;

    // 3. Recompute normals
    geometry.computeVertexNormals();
    if (this.config.autoFixNormals) {
      normalsFlipped = this.fixNormals(geometry);
    }

    // 4. UV auto-unwrap
    if (this.config.autoUnwrapUV && !geometry.getAttribute('uv')) {
      this.autoUnwrap(geometry);
      uvChannelsAdded = 1;
    }

    // 5. Remove disconnected islands
    if (this.config.removeSmallIslandsFraction > 0) {
      islandsRemoved = this.removeSmallIslands(geometry, this.config.removeSmallIslandsFraction);
    }

    const durationMs = performance.now() - start;
    const verticesAfter = (geometry.getAttribute('position') as THREE.BufferAttribute).count;

    const report: TopologyRepairReport = {
      verticesBefore,
      verticesAfter,
      facesRemoved,
      normalsFlipped,
      uvChannelsAdded,
      islandsRemoved,
      durationMs,
    };

    log.info('Topology repair complete', report);
    return report;
  }

  // ── Vertex welding ────────────────────────────────────────────────────────

  private weldVertices(posAttr: THREE.BufferAttribute): { positions: number[]; remap: Uint32Array } {
    const eps = this.config.mergeEpsilon;
    const n = posAttr.count;
    const positions: number[] = [];
    const remap = new Uint32Array(n);
    const seen: THREE.Vector3[] = [];

    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      let found = -1;
      for (let j = 0; j < seen.length; j++) {
        if (seen[j].distanceTo(v) < eps) { found = j; break; }
      }
      if (found >= 0) {
        remap[i] = found;
      } else {
        remap[i] = seen.length;
        seen.push(v);
        positions.push(v.x, v.y, v.z);
      }
    }

    return { positions, remap };
  }

  private remapIndices(geometry: THREE.BufferGeometry, remap: Uint32Array): THREE.BufferAttribute | null {
    const idx = geometry.getIndex();
    if (!idx) return null;
    const newIdx = new Uint32Array(idx.count);
    for (let i = 0; i < idx.count; i++) newIdx[i] = remap[idx.getX(i)];
    return new THREE.BufferAttribute(newIdx, 1);
  }

  // ── Degenerate face removal ───────────────────────────────────────────────

  private removeDegenerates(geometry: THREE.BufferGeometry): { removed: number } {
    const idx = geometry.getIndex();
    if (!idx) return { removed: 0 };
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const newIdx: number[] = [];
    let removed = 0;

    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

    for (let i = 0; i < idx.count; i += 3) {
      const ia = idx.getX(i), ib = idx.getX(i + 1), ic = idx.getX(i + 2);
      a.set(pos.getX(ia), pos.getY(ia), pos.getZ(ia));
      b.set(pos.getX(ib), pos.getY(ib), pos.getZ(ib));
      c.set(pos.getX(ic), pos.getY(ic), pos.getZ(ic));

      // Area = |AB × AC| / 2
      const area = b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
      if (area < this.config.degenerateAreaThreshold || ia === ib || ib === ic || ia === ic) {
        removed++;
      } else {
        newIdx.push(ia, ib, ic);
      }
    }

    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(newIdx), 1));
    return { removed };
  }

  // ── Normal fixing ─────────────────────────────────────────────────────────

  private fixNormals(geometry: THREE.BufferGeometry): number {
    geometry.computeBoundingSphere();
    const centroid = geometry.boundingSphere!.center;
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const nrm = geometry.getAttribute('normal') as THREE.BufferAttribute;
    if (!nrm) return 0;
    let flipped = 0;

    for (let i = 0; i < pos.count; i++) {
      const vp = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const vn = new THREE.Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      const outward = vp.clone().sub(centroid);
      if (outward.dot(vn) < 0) {
        nrm.setXYZ(i, -vn.x, -vn.y, -vn.z);
        flipped++;
      }
    }
    nrm.needsUpdate = true;
    return flipped;
  }

  // ── UV auto-unwrap (spherical projection) ─────────────────────────────────

  private autoUnwrap(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingSphere();
    const center = geometry.boundingSphere!.center;
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    const uvs = new Float32Array(pos.count * 2);

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(center).normalize();
      const u = 0.5 + Math.atan2(v.z, v.x) / (2 * Math.PI);
      const vv = 0.5 - Math.asin(Math.max(-1, Math.min(1, v.y))) / Math.PI;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = vv;
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    log.info('UV auto-unwrap applied (spherical projection)');
  }

  // ── Island removal ────────────────────────────────────────────────────────

  private removeSmallIslands(geometry: THREE.BufferGeometry, fraction: number): number {
    const idx = geometry.getIndex();
    if (!idx) return 0;
    const n = (geometry.getAttribute('position') as THREE.BufferAttribute).count;

    // Build adjacency from face connectivity
    const adj = new Array<Set<number>>(n).fill(null!).map(() => new Set<number>());
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
      adj[a].add(b); adj[a].add(c);
      adj[b].add(a); adj[b].add(c);
      adj[c].add(a); adj[c].add(b);
    }

    // BFS to find connected components
    const visited = new Uint8Array(n);
    const components: number[][] = [];

    for (let start = 0; start < n; start++) {
      if (visited[start]) continue;
      const component: number[] = [];
      const queue = [start];
      while (queue.length > 0) {
        const v = queue.shift()!;
        if (visited[v]) continue;
        visited[v] = 1;
        component.push(v);
        for (const nb of adj[v]) if (!visited[nb]) queue.push(nb);
      }
      components.push(component);
    }

    const minSize = Math.floor(n * fraction);
    const keepComponents = new Set(
      components.filter((c) => c.length >= minSize).flatMap((c) => c),
    );

    // Remove faces where any vertex is not in kept components
    const newIdx: number[] = [];
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
      if (keepComponents.has(a) && keepComponents.has(b) && keepComponents.has(c)) {
        newIdx.push(a, b, c);
      }
    }
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(newIdx), 1));

    return components.filter((c) => c.length < minSize).length;
  }
}
