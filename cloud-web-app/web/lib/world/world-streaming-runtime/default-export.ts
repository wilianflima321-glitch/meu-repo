/**
 * World Streaming - split runtime modules.
 *
 * World streaming stays behind Studio/game runtime boundaries; public route
 * shells should consume only summaries or manifests, never this runtime barrel.
 */

import { Octree } from './octree';
import { useChunkState, useEntityLOD, useStreamingStats, useViewerPosition, useVisibleChunks, useWorldStreaming, WorldStreamingProvider } from './react';
import { WorldStreamingSystem } from './system';

const __defaultExport = {
  WorldStreamingSystem,
  Octree,
  WorldStreamingProvider,
  useWorldStreaming,
  useStreamingStats,
  useViewerPosition,
  useVisibleChunks,
  useChunkState,
  useEntityLOD,
};

export default __defaultExport;
