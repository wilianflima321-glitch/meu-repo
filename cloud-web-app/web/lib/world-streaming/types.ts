/**
 * Letter cg — World Partition cell + streaming contracts (S2 deepen).
 * Letter ck — view frustum pose fields for playtest soak.
 * Honest: UE World Partition / Nanite / no-stutter marketing stay HELD.
 */

export const WORLD_PARTITION_LETTER = 'cg' as const

export interface WorldPartitionCell {
  cellId: string
  /** xmin, zmin, xmax, zmax (XZ ground plane). */
  bounds: [number, number, number, number]
  hlodLevel: number
  cookManifestRef: string
  streamingPriority: number
  /** Bytes estimated when loaded (RAM budget). */
  estimatedBytes: number
  state: 'unloaded' | 'loading' | 'resident' | 'unloading' | 'error'
  payload: unknown | null
}

export interface PartitionStreamingConfig {
  cellSize: number
  loadRadiusCells: number
  unloadRadiusCells: number
  maxResidentCells: number
  memoryBudgetBytes: number
  capabilityScore: number
}

/**
 * Camera / view pose for surgical streaming.
 * Position-only (x,z) is valid; optional forward + fov enable frustum filter (ck).
 */
export interface PartitionViewPose {
  x: number
  z: number
  /** Optional view forward on XZ (normalized preferred). */
  forwardX?: number
  forwardZ?: number
  /** Vertical FOV radians; half-angle used for XZ cone filter when forward set. */
  fovYRadians?: number
}

export interface PartitionLoadResult {
  cellId: string
  bytes: number
  fromCache: boolean
  payload: unknown
}

export interface PartitionStreamingStats {
  resident: number
  loading: number
  memoryUsedBytes: number
  memoryBudgetBytes: number
  loadsThisTick: number
  unloadsThisTick: number
  /** Cells considered this tick after radius (+ frustum when posed). */
  wantCount?: number
  /** True when frustum cone filtered the want set (ck). */
  frustumFiltered?: boolean
}
