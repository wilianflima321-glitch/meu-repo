/**
 * LOD System - Re-exports e tipos públicos
 */

export { 
  AutoLODPipeline,
  analyzeMesh,
  simplifyMeshQuadric,
  DEFAULT_LOD_CONFIG,
  DEFAULT_LOD_LEVELS,
  type LODConfig,
  type LODLevel,
  type LODResult,
  type MeshAnalysis,
  type AssetLODEntry,
} from './auto-lod-pipeline';

// ============================================================================
// LOD PRESETS
// ============================================================================

import type { LODConfig } from './auto-lod-pipeline';

/**
 * Preset para jogos mobile/web com recursos limitados
 */
export const LOD_PRESET_MOBILE: Partial<LODConfig> = {
  levels: [
    { level: 0, distance: 0, triangleRatio: 1.0, textureScale: 0.5 },
    { level: 1, distance: 15, triangleRatio: 0.3, textureScale: 0.25 },
    { level: 2, distance: 30, triangleRatio: 0.1, textureScale: 0.125 },
    { level: 3, distance: 50, triangleRatio: 0.03, textureScale: 0 },
  ],
  algorithm: 'quadric',
  targetErrorThreshold: 0.005,
};

/**
 * Preset para jogos de alta fidelidade
 */
export const LOD_PRESET_HIGH_FIDELITY: Partial<LODConfig> = {
  levels: [
    { level: 0, distance: 0, triangleRatio: 1.0, textureScale: 1.0 },
    { level: 1, distance: 50, triangleRatio: 0.7, textureScale: 1.0 },
    { level: 2, distance: 100, triangleRatio: 0.4, textureScale: 0.5 },
    { level: 3, distance: 200, triangleRatio: 0.2, textureScale: 0.25 },
    { level: 4, distance: 400, triangleRatio: 0.1, textureScale: 0.125 },
  ],
  algorithm: 'quadric',
  preserveUVSeams: true,
  preserveNormals: true,
  targetErrorThreshold: 0.0005,
};

/**
 * Preset para cenários open world
 */
export const LOD_PRESET_OPEN_WORLD: Partial<LODConfig> = {
  levels: [
    { level: 0, distance: 0, triangleRatio: 1.0, textureScale: 1.0 },
    { level: 1, distance: 100, triangleRatio: 0.5, textureScale: 0.5 },
    { level: 2, distance: 300, triangleRatio: 0.2, textureScale: 0.25 },
    { level: 3, distance: 600, triangleRatio: 0.08, textureScale: 0.125 },
    { level: 4, distance: 1000, triangleRatio: 0.02, textureScale: 0 },
    { level: 5, distance: 2000, triangleRatio: 0.005, textureScale: 0 },
  ],
  algorithm: 'quadric',
  generateAtlas: true,
  atlasSize: 4096,
};

/**
 * Preset para arquitetura/visualização
 */
export const LOD_PRESET_ARCHVIZ: Partial<LODConfig> = {
  levels: [
    { level: 0, distance: 0, triangleRatio: 1.0, textureScale: 1.0 },
    { level: 1, distance: 20, triangleRatio: 0.6, textureScale: 1.0 },
    { level: 2, distance: 50, triangleRatio: 0.3, textureScale: 0.5 },
  ],
  algorithm: 'quadric',
  preserveUVSeams: true,
  preserveNormals: true,
  targetErrorThreshold: 0.0001, // Alta precisão
};
