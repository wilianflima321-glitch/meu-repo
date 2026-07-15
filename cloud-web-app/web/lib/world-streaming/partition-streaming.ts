/**
 * Letter cg — View-driven World Partition streaming tick.
 * Letter ck — frustum/view cone filter + CapScore resident budget deepen.
 * Surgical load by view; no-loading-screen claim HELD until Founder soak.
 */

import {
  WORLD_PARTITION_LETTER,
  type PartitionStreamingConfig,
  type PartitionStreamingStats,
  type PartitionViewPose,
} from '@/lib/world-streaming/types'
import { resolvePartitionStreamingConfig } from '@/lib/world-streaming/partition-capability-budget'
import {
  PartitionCellStore,
  boundsForGridCell,
  cellIdFromGrid,
  PARTITION_CELL_API_WIRED,
} from '@/lib/world-streaming/partition-cell-store'

export const PARTITION_STREAMING_WIRED = true as const

const DEFAULT_FOV_Y = Math.PI / 3

/** Normalize XZ vector; zero-length → null. */
export function normalizeXZ(
  x: number,
  z: number,
): { x: number; z: number } | null {
  const len = Math.hypot(x, z)
  if (len < 1e-8) return null
  return { x: x / len, z: z / len }
}

/**
 * XZ ground-plane cone test: cell center within half-FOV of view forward.
 * Position-only poses (no forward) always pass.
 */
export function cellIntersectsViewFrustum(
  bounds: [number, number, number, number],
  view: PartitionViewPose,
): boolean {
  if (view.forwardX === undefined || view.forwardZ === undefined) return true
  const fwd = normalizeXZ(view.forwardX, view.forwardZ)
  if (!fwd) return true

  const [xmin, zmin, xmax, zmax] = bounds
  const midX = (xmin + xmax) / 2
  const midZ = (zmin + zmax) / 2
  const to = normalizeXZ(midX - view.x, midZ - view.z)
  // Viewer inside / on cell → always visible.
  if (!to) return true

  const cosHalf = Math.cos((view.fovYRadians ?? DEFAULT_FOV_Y) * 0.5)
  const dot = fwd.x * to.x + fwd.z * to.z
  return dot >= cosHalf
}

export class WorldPartitionStreamer {
  readonly letter = WORLD_PARTITION_LETTER
  readonly store: PartitionCellStore
  private config: PartitionStreamingConfig
  private lastStats: PartitionStreamingStats

  constructor(capabilityScore = 38) {
    this.config = resolvePartitionStreamingConfig(capabilityScore)
    this.store = new PartitionCellStore(capabilityScore)
    this.store.setBudgetBytes(this.config.memoryBudgetBytes)
    this.lastStats = {
      resident: 0,
      loading: 0,
      memoryUsedBytes: 0,
      memoryBudgetBytes: this.config.memoryBudgetBytes,
      loadsThisTick: 0,
      unloadsThisTick: 0,
      wantCount: 0,
      frustumFiltered: false,
    }
  }

  getConfig(): PartitionStreamingConfig {
    return { ...this.config }
  }

  /**
   * Seed a rectangular grid of cells around origin (authoring / soak).
   */
  seedGrid(halfExtentCells: number, estimatedBytesPerCell = 64 * 1024): void {
    const size = this.config.cellSize
    for (let iz = -halfExtentCells; iz <= halfExtentCells; iz++) {
      for (let ix = -halfExtentCells; ix <= halfExtentCells; ix++) {
        const cellId = cellIdFromGrid(ix, iz)
        this.store.registerCell({
          cellId,
          bounds: boundsForGridCell(ix, iz, size),
          hlodLevel: Math.max(Math.abs(ix), Math.abs(iz)),
          cookManifestRef: `cook://${cellId}`,
          streamingPriority: Math.abs(ix) + Math.abs(iz),
          estimatedBytes: estimatedBytesPerCell,
        })
      }
    }
  }

  /**
   * Surgical tick: load cells in load radius (optionally frustum-filtered);
   * unload outside unload radius. Respects maxResidentCells + CapScore memory.
   */
  async tick(view: PartitionViewPose): Promise<PartitionStreamingStats> {
    const size = this.config.cellSize
    const cx = Math.floor(view.x / size)
    const cz = Math.floor(view.z / size)
    let loads = 0
    let unloads = 0
    const frustumActive =
      view.forwardX !== undefined && view.forwardZ !== undefined

    const want = new Set<string>()
    for (let dz = -this.config.loadRadiusCells; dz <= this.config.loadRadiusCells; dz++) {
      for (let dx = -this.config.loadRadiusCells; dx <= this.config.loadRadiusCells; dx++) {
        const id = cellIdFromGrid(cx + dx, cz + dz)
        const cell = this.store.getCell(id)
        const bounds = cell?.bounds ?? boundsForGridCell(cx + dx, cz + dz, size)
        if (cellIntersectsViewFrustum(bounds, view)) {
          want.add(id)
        }
      }
    }

    for (const cell of this.store.listCells()) {
      const [xmin, zmin, xmax, zmax] = cell.bounds
      const midX = (xmin + xmax) / 2
      const midZ = (zmin + zmax) / 2
      const ix = Math.floor(midX / size)
      const iz = Math.floor(midZ / size)
      const chebyshev = Math.max(Math.abs(ix - cx), Math.abs(iz - cz))
      if (chebyshev > this.config.unloadRadiusCells && cell.state === 'resident') {
        if (this.store.unloadCell(cell.cellId)) unloads += 1
      }
    }

    const sortedWant = [...want].sort((a, b) => {
      const ca = this.store.getCell(a)
      const cb = this.store.getCell(b)
      return (ca?.streamingPriority ?? 99) - (cb?.streamingPriority ?? 99)
    })

    for (const id of sortedWant) {
      const resident = this.store
        .listCells()
        .filter((c) => c.state === 'resident').length
      if (resident >= this.config.maxResidentCells) break
      const cell = this.store.getCell(id)
      if (!cell || cell.state === 'resident') continue
      const loaded = await this.store.loadCell(id)
      if (loaded) loads += 1
    }

    this.lastStats = {
      resident: this.store.listCells().filter((c) => c.state === 'resident').length,
      loading: this.store.listCells().filter((c) => c.state === 'loading').length,
      memoryUsedBytes: this.store.memoryUsedBytes(),
      memoryBudgetBytes: this.store.memoryBudgetBytes(),
      loadsThisTick: loads,
      unloadsThisTick: unloads,
      wantCount: want.size,
      frustumFiltered: frustumActive,
    }
    return { ...this.lastStats }
  }

  getStats(): PartitionStreamingStats {
    return { ...this.lastStats }
  }
}

export async function runPartitionStreamingSoak(capabilityScore = 38): Promise<{
  passed: boolean
  letter: typeof WORLD_PARTITION_LETTER
  residentAfterMove: number
  memoryOk: boolean
  apiWired: typeof PARTITION_CELL_API_WIRED
}> {
  const streamer = new WorldPartitionStreamer(capabilityScore)
  streamer.seedGrid(3, 32 * 1024)
  const s0 = await streamer.tick({ x: 0, z: 0 })
  const s1 = await streamer.tick({ x: streamer.getConfig().cellSize * 2, z: 0 })
  const memoryOk =
    s1.memoryUsedBytes <= s1.memoryBudgetBytes &&
    s0.memoryUsedBytes <= s0.memoryBudgetBytes
  const passed =
    PARTITION_STREAMING_WIRED &&
    PARTITION_CELL_API_WIRED &&
    s0.resident > 0 &&
    s1.resident > 0 &&
    memoryOk
  return {
    passed,
    letter: WORLD_PARTITION_LETTER,
    residentAfterMove: s1.resident,
    memoryOk,
    apiWired: PARTITION_CELL_API_WIRED,
  }
}
