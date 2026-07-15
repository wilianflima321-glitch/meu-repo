import { calculateChunkBounds, findNeighborIds, getChunkId } from './geometry';
import type { StreamingConfig, Vector3, WorldChunk } from './types';

export function createRegisteredWorldChunk(position: Vector3, config: StreamingConfig, data?: unknown): WorldChunk {
  return {
    id: getChunkId(position, config.chunkSize),
    position,
    size: { ...config.chunkSize },
    bounds: calculateChunkBounds(position, config.chunkSize),
    state: 'unloaded',
    lodLevel: 4,
    priority: 0,
    data,
    neighbors: findNeighborIds(position, config.chunkSize),
    lastAccessTime: Date.now(),
    loadTime: 0,
    memorySize: 0,
    entities: [],
    terrainMesh: null,
    collisionMesh: null,
  };
}
