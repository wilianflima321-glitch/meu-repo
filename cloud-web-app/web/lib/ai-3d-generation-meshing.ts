/**
 * AI 3D generation meshing utilities.
 */

import * as THREE from 'three';

import type { PointCloudData } from './ai-3d-generation-types';

export class PointCloudToMesh {
  private gridResolution: number;

  constructor(gridResolution: number = 64) {
    this.gridResolution = gridResolution;
  }

  reconstructSurface(pointCloud: PointCloudData): THREE.BufferGeometry {
    const normals = pointCloud.normals || this.estimateNormals(pointCloud);
    const spatialHash = this.buildSpatialHash(pointCloud);
    const triangles = this.advancingFront(pointCloud, normals, spatialHash);

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normalArray: number[] = [];

    for (const tri of triangles) {
      for (const idx of tri) {
        positions.push(
          pointCloud.positions[idx * 3],
          pointCloud.positions[idx * 3 + 1],
          pointCloud.positions[idx * 3 + 2]
        );
        normalArray.push(normals[idx * 3], normals[idx * 3 + 1], normals[idx * 3 + 2]);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
    return geometry;
  }

  private estimateNormals(pointCloud: PointCloudData): Float32Array {
    const normals = new Float32Array(pointCloud.count * 3);
    const k = 10;

    for (let i = 0; i < pointCloud.count; i++) {
      const point = new THREE.Vector3(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2]
      );

      const neighbors: THREE.Vector3[] = [];

      for (let j = 0; j < pointCloud.count && neighbors.length < k; j++) {
        if (i === j) continue;

        const neighbor = new THREE.Vector3(
          pointCloud.positions[j * 3],
          pointCloud.positions[j * 3 + 1],
          pointCloud.positions[j * 3 + 2]
        );

        if (point.distanceTo(neighbor) < 0.1) {
          neighbors.push(neighbor);
        }
      }

      const normal = this.pcaNormal(point, neighbors);
      normals[i * 3] = normal.x;
      normals[i * 3 + 1] = normal.y;
      normals[i * 3 + 2] = normal.z;
    }

    return normals;
  }

  private pcaNormal(center: THREE.Vector3, neighbors: THREE.Vector3[]): THREE.Vector3 {
    if (neighbors.length < 3) {
      return new THREE.Vector3(0, 1, 0);
    }

    const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (const neighbor of neighbors) {
      const d = neighbor.clone().sub(center);
      cov[0] += d.x * d.x;
      cov[1] += d.x * d.y;
      cov[2] += d.x * d.z;
      cov[3] += d.y * d.x;
      cov[4] += d.y * d.y;
      cov[5] += d.y * d.z;
      cov[6] += d.z * d.x;
      cov[7] += d.z * d.y;
      cov[8] += d.z * d.z;
    }

    let normal = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();

    for (let iter = 0; iter < 20; iter++) {
      const result = new THREE.Vector3(
        cov[0] * normal.x + cov[1] * normal.y + cov[2] * normal.z,
        cov[3] * normal.x + cov[4] * normal.y + cov[5] * normal.z,
        cov[6] * normal.x + cov[7] * normal.y + cov[8] * normal.z
      );

      if (result.length() < 0.0001) break;
      normal = result.normalize();
    }

    return normal;
  }

  private buildSpatialHash(pointCloud: PointCloudData): Map<string, number[]> {
    const hash = new Map<string, number[]>();
    const cellSize = 0.05;

    for (let i = 0; i < pointCloud.count; i++) {
      const key = this.hashKey(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2],
        cellSize
      );

      if (!hash.has(key)) {
        hash.set(key, []);
      }
      hash.get(key)!.push(i);
    }

    return hash;
  }

  private hashKey(x: number, y: number, z: number, cellSize: number): string {
    return `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;
  }

  private advancingFront(
    pointCloud: PointCloudData,
    _normals: Float32Array,
    _spatialHash: Map<string, number[]>
  ): number[][] {
    const triangles: number[][] = [];
    const used = new Set<number>();
    const maxNeighborDistance = 0.1;

    for (let i = 0; i < pointCloud.count; i++) {
      if (used.has(i)) continue;

      const point = new THREE.Vector3(
        pointCloud.positions[i * 3],
        pointCloud.positions[i * 3 + 1],
        pointCloud.positions[i * 3 + 2]
      );

      const neighbors: { idx: number; dist: number }[] = [];

      for (let j = 0; j < pointCloud.count; j++) {
        if (i === j || used.has(j)) continue;

        const neighbor = new THREE.Vector3(
          pointCloud.positions[j * 3],
          pointCloud.positions[j * 3 + 1],
          pointCloud.positions[j * 3 + 2]
        );

        const dist = point.distanceTo(neighbor);
        if (dist < maxNeighborDistance) {
          neighbors.push({ idx: j, dist });
        }
      }

      neighbors.sort((a, b) => a.dist - b.dist);

      if (neighbors.length >= 2) {
        triangles.push([i, neighbors[0].idx, neighbors[1].idx]);
        used.add(i);
      }
    }

    return triangles;
  }
}

