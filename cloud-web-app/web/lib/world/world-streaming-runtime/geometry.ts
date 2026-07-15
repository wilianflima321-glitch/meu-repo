import type { BoundingBox, Vector3, WorldChunk } from './types';

export function getChunkId(position: Vector3, chunkSize: Vector3): string {
  const cx = Math.floor(position.x / chunkSize.x);
  const cy = Math.floor(position.y / chunkSize.y);
  const cz = Math.floor(position.z / chunkSize.z);
  return 'chunk_' + cx + '_' + cy + '_' + cz;
}

export function calculateChunkBounds(position: Vector3, chunkSize: Vector3): BoundingBox {
  const cx = Math.floor(position.x / chunkSize.x) * chunkSize.x;
  const cy = Math.floor(position.y / chunkSize.y) * chunkSize.y;
  const cz = Math.floor(position.z / chunkSize.z) * chunkSize.z;

  return {
    min: { x: cx, y: cy, z: cz },
    max: { x: cx + chunkSize.x, y: cy + chunkSize.y, z: cz + chunkSize.z },
  };
}

export function findNeighborIds(position: Vector3, chunkSize: Vector3): string[] {
  const neighbors: string[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;

        neighbors.push(getChunkId({
          x: position.x + dx * chunkSize.x,
          y: position.y + dy * chunkSize.y,
          z: position.z + dz * chunkSize.z,
        }, chunkSize));
      }
    }
  }

  return neighbors;
}

export function getChunkCenter(chunk: WorldChunk): Vector3 {
  return {
    x: (chunk.bounds.min.x + chunk.bounds.max.x) / 2,
    y: (chunk.bounds.min.y + chunk.bounds.max.y) / 2,
    z: (chunk.bounds.min.z + chunk.bounds.max.z) / 2,
  };
}

export function getChunkDistance(chunk: WorldChunk, viewerPosition: Vector3): number {
  return distance(getChunkCenter(chunk), viewerPosition);
}

export function getChunkViewAngle(chunk: WorldChunk, viewerPosition: Vector3, viewerDirection: Vector3): number {
  const center = getChunkCenter(chunk);
  const toChunk = {
    x: center.x - viewerPosition.x,
    y: center.y - viewerPosition.y,
    z: center.z - viewerPosition.z,
  };

  const value = dot(normalize(toChunk), viewerDirection);
  return Math.acos(Math.max(-1, Math.min(1, value)));
}

export function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
