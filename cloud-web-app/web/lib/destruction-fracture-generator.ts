// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import * as THREE from 'three';
import type { VoronoiCell } from './destruction-contracts';

// ============================================================================
// VORONOI FRACTURE GENERATOR
// ============================================================================

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

    // Simplified Voronoi using closest-point partitioning
    // Real implementation would use Fortune's algorithm or similar

    const gridSize = 10;
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const step = size.clone().divideScalar(gridSize);

    // Assign grid points to nearest Voronoi center
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

    // Create cells from assignments
    for (let i = 0; i < points.length; i++) {
      const cellPoints = assignments.get(i) || [];
      if (cellPoints.length === 0) continue;

      cells.push({
        center: points[i],
        vertices: cellPoints,
        faces: [], // Would compute from convex hull
      });
    }

    return cells;
  }

  cellToGeometry(cell: VoronoiCell): THREE.BufferGeometry {
    if (cell.vertices.length < 4) {
      // Create small box as fallback
      return new THREE.BoxGeometry(1, 1, 1);
    }

    // Create convex hull from vertices
    const geometry = new THREE.BufferGeometry();

    // Compute centroid
    const centroid = new THREE.Vector3();
    for (const v of cell.vertices) {
      centroid.add(v);
    }
    centroid.divideScalar(cell.vertices.length);

    // Create tetrahedra from centroid to each face
    // Simplified: create triangulated surface
    const positions: number[] = [];
    const normals: number[] = [];

    // Sort vertices by angle around centroid
    const sorted = [...cell.vertices].sort((a, b) => {
      const angleA = Math.atan2(a.z - centroid.z, a.x - centroid.x);
      const angleB = Math.atan2(b.z - centroid.z, b.x - centroid.x);
      return angleA - angleB;
    });

    // Create fan triangulation
    for (let i = 1; i < sorted.length - 1; i++) {
      const v0 = centroid;
      const v1 = sorted[i];
      const v2 = sorted[i + 1];

      positions.push(v0.x, v0.y, v0.z);
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);

      // Compute normal
      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      for (let j = 0; j < 3; j++) {
        normals.push(normal.x, normal.y, normal.z);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.computeBoundingBox();

    return geometry;
  }
}
