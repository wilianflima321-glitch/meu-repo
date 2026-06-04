// @aethel-heavy-async-boundary Studio/viewport mesh analysis; only load through LOD runtime.
import * as THREE from 'three';

import type { MeshAnalysis } from './auto-lod-types';

export function analyzeMesh(geometry: THREE.BufferGeometry): MeshAnalysis {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();

  const vertexCount = position.count;
  const triangleCount = index ? index.count / 3 : vertexCount / 3;

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const boundingBox = geometry.boundingBox || new THREE.Box3();
  const boundingSphere = geometry.boundingSphere || new THREE.Sphere();
  const surfaceArea = calculateSurfaceArea(geometry);

  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const volume = size.x * size.y * size.z;

  let complexity: MeshAnalysis['complexity'] = 'low';
  if (triangleCount > 1_000_000) complexity = 'ultra';
  else if (triangleCount > 100_000) complexity = 'high';
  else if (triangleCount > 10_000) complexity = 'medium';

  return {
    triangleCount,
    vertexCount,
    boundingBox,
    boundingSphere,
    surfaceArea,
    volume,
    complexity,
    materialCount: geometry.groups.length || 1,
    hasUVs: !!geometry.getAttribute('uv'),
    hasNormals: !!geometry.getAttribute('normal'),
    hasTangents: !!geometry.getAttribute('tangent'),
  };
}

function calculateSurfaceArea(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();

  let totalArea = 0;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const getVertex = (i: number, target: THREE.Vector3) => {
    target.fromBufferAttribute(position, i);
  };

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      getVertex(index.getX(i), v0);
      getVertex(index.getX(i + 1), v1);
      getVertex(index.getX(i + 2), v2);
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      cross.crossVectors(edge1, edge2);
      totalArea += cross.length() * 0.5;
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      getVertex(i, v0);
      getVertex(i + 1, v1);
      getVertex(i + 2, v2);
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      cross.crossVectors(edge1, edge2);
      totalArea += cross.length() * 0.5;
    }
  }

  return totalArea;
}
