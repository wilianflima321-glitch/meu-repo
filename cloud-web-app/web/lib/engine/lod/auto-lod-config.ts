import type { LODConfig, LODLevel } from './auto-lod-types';

export const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { level: 0, distance: 0, triangleRatio: 1.0, textureScale: 1.0 },
  { level: 1, distance: 25, triangleRatio: 0.5, textureScale: 0.5 },
  { level: 2, distance: 50, triangleRatio: 0.25, textureScale: 0.25 },
  { level: 3, distance: 100, triangleRatio: 0.1, textureScale: 0.125 },
  { level: 4, distance: 200, triangleRatio: 0.05, textureScale: 0 },
];

export const DEFAULT_LOD_CONFIG: LODConfig = {
  levels: DEFAULT_LOD_LEVELS,
  algorithm: 'quadric',
  preserveUVSeams: true,
  preserveNormals: true,
  targetErrorThreshold: 0.001,
  generateAtlas: false,
  atlasSize: 2048,
};
