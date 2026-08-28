// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import type { VoronoiCell } from './destruction-contracts';

/**
 * DEST-001 / IMPROVE-ENG-020 — Voronoi cell → geometry.
 * Uses 3D convex hull (not XZ atan2 fan). Fortune full 3D remains HELD.
 */
export const FRACTURE_GEOMETRY_SHIP_STATUS = {
  cellGeometry: 'SHIPPED' as const,
  fortune3d: 'HELD' as const,
  /** Letter cv — hierarchical plan + GPU debris path; Chaos parity remains HELD. */
  gpuFractureDeepen: 'cv' as const,
  note: 'Convex hull cell meshing shipped; hierarchical Voronoi plan + GPU debris (cv) comutada para a autoridade Rust via probe_voronoi_destruction_3d_cmd; Chaos parity [HELD]',
};

export class VoronoiFractureGenerator {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  generatePoints(bounds: THREE.Box3, count: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const size = new THREE.Vector3();
    bounds.getSize(size);

    for (let i = 0; i < count; i++) {
      points.push(new THREE.Vector3(
        bounds.min.x + this.random() * size.x,
        bounds.min.y + this.random() * size.y,
        bounds.min.z + this.random() * size.z
      ));
    }

    return points;
  }

  generateCells(points: THREE.Vector3[], bounds: THREE.Box3): VoronoiCell[] {
    const cells: VoronoiCell[] = [];
    const gridSize = 10;
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const step = size.clone().divideScalar(gridSize);
    const assignments: Map<number, THREE.Vector3[]> = new Map();

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          const point = new THREE.Vector3(
            bounds.min.x + (x + 0.5) * step.x,
            bounds.min.y + (y + 0.5) * step.y,
            bounds.min.z + (z + 0.5) * step.z
          );

          let nearestIdx = 0;
          let nearestDist = Infinity;

          for (let i = 0; i < points.length; i++) {
            const dist = point.distanceToSquared(points[i]);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestIdx = i;
            }
          }

          if (!assignments.has(nearestIdx)) {
            assignments.set(nearestIdx, []);
          }
          assignments.get(nearestIdx)!.push(point);
        }
      }
    }

    for (let i = 0; i < points.length; i++) {
      const cellPoints = assignments.get(i) || [];
      if (cellPoints.length === 0) continue;

      cells.push({
        center: points[i],
        vertices: cellPoints,
        faces: [],
      });
    }

    return cells;
  }

  cellToGeometry(cell: VoronoiCell): THREE.BufferGeometry {
    if (cell.vertices.length < 4) {
      return new THREE.BoxGeometry(0.15, 0.15, 0.15);
    }

    // Deduplicate near-coincident samples so ConvexHull stays stable
    const unique: THREE.Vector3[] = [];
    const eps = 1e-5;
    for (const v of cell.vertices) {
      let dup = false;
      for (const u of unique) {
        if (u.distanceToSquared(v) < eps) {
          dup = true;
          break;
        }
      }
      if (!dup) unique.push(v.clone());
    }

    if (unique.length < 4) {
      return new THREE.BoxGeometry(0.15, 0.15, 0.15);
    }

    try {
      const geometry = new ConvexGeometry(unique);
      geometry.computeVertexNormals();
      if (!geometry.getAttribute('normal')) {
        geometry.computeVertexNormals();
      }
      // Ensure outward-facing normals via centroid check
      this.ensureOutwardNormals(geometry);
      geometry.computeBoundingBox();
      return geometry;
    } catch {
      return this.fallbackCentroidFanWithNormals(unique);
    }
  }

  /** Last-resort mesher — 3D fan with proper triangle normals (not XZ-only atan2). */
  private fallbackCentroidFanWithNormals(vertices: THREE.Vector3[]): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const centroid = new THREE.Vector3();
    for (const v of vertices) centroid.add(v);
    centroid.divideScalar(vertices.length);

    // Project to best-fit plane via PCA-ish: use dominant normal from first triangle
    const positions: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      positions.push(centroid.x, centroid.y, centroid.z);
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);
      const edge1 = new THREE.Vector3().subVectors(v1, centroid);
      const edge2 = new THREE.Vector3().subVectors(v2, centroid);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
      if (normal.lengthSq() < 1e-8) {
        normal.set(0, 1, 0);
      }
      for (let j = 0; j < 3; j++) {
        normals.push(normal.x, normal.y, normal.z);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.computeBoundingBox();
    return geometry;
  }

  private ensureOutwardNormals(geometry: THREE.BufferGeometry): void {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return;
    const center = new THREE.Vector3();
    box.getCenter(center);

    const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
    let normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
    if (!normalAttr) {
      geometry.computeVertexNormals();
      normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
    }
    if (!normalAttr || pos.count < 3) return;

    // Flip any triangle whose normal points toward the AABB center
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const ax = pos.getX(i);
      const ay = pos.getY(i);
      const az = pos.getZ(i);
      const bx = pos.getX(i + 1);
      const by = pos.getY(i + 1);
      const bz = pos.getZ(i + 1);
      const cx = pos.getX(i + 2);
      const cy = pos.getY(i + 2);
      const cz = pos.getZ(i + 2);
      const mx = (ax + bx + cx) / 3;
      const my = (ay + by + cy) / 3;
      const mz = (az + bz + cz) / 3;
      const nx = normalAttr.getX(i);
      const ny = normalAttr.getY(i);
      const nz = normalAttr.getZ(i);
      const toFaceX = mx - center.x;
      const toFaceY = my - center.y;
      const toFaceZ = mz - center.z;
      if (nx * toFaceX + ny * toFaceY + nz * toFaceZ < 0) {
        // swap B/C + flip normals
        pos.setXYZ(i + 1, cx, cy, cz);
        pos.setXYZ(i + 2, bx, by, bz);
        for (let k = 0; k < 3; k++) {
          normalAttr.setXYZ(i + k, -nx, -ny, -nz);
        }
      }
    }
    pos.needsUpdate = true;
    normalAttr.needsUpdate = true;
  }
}
