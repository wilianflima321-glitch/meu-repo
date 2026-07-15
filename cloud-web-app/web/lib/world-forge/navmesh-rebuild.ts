/**
 * Letter cc — Dynamic NavMesh rebuild after terrain / PCG change.
 * Letter ch — WebGPU compute heightfield→walkable soak (see gpu-recast-navmesh.ts).
 *
 * CPU grid walkability from heightfield + slope CLOSED.
 * GPU path: real WebGPU compute when adapter+soak proven; else Zero-UI CPU fallback.
 * Unreal Recast/Detour full parity stays HELD.
 */

import type { HeightfieldDocument } from '@/lib/production/terrain-heightfield-math'
import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'

export const NAVMESH_REBUILD_WIRED = true as const
/**
 * Module default without session soak — use `probeGpuRecastHonesty` / soak result
 * to flip `gpuRecastReady`. Unreal Recast/Detour parity remains HELD (letter ch).
 */
export const NAVMESH_GPU_RECAST_READY = false as const
/** @deprecated Prefer NAVMESH_UNREAL_RECAST_PARITY_HELD — full UE Recast still HELD. */
export const NAVMESH_GPU_RECAST_HELD = true as const

export interface NavMeshCell {
  x: number
  z: number
  walkable: boolean
  height: number
}

export interface NavMeshGrid {
  resolution: number
  widthMeters: number
  depthMeters: number
  cells: NavMeshCell[]
  walkableCount: number
  version: number
  backend: 'cpu-grid' | 'webgpu-compute'
  gpuRecastReady: boolean
}

export interface NavMeshRebuildResult {
  navmesh: NavMeshGrid
  gpuRecastReady: boolean
  receipt: WorldForgeStageReceipt
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function sampleHeightNorm(doc: HeightfieldDocument, u: number, v: number): number {
  const res = doc.meta.resolution
  const x = clamp01(u) * (res - 1)
  const z = clamp01(v) * (res - 1)
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const x1 = Math.min(res - 1, x0 + 1)
  const z1 = Math.min(res - 1, z0 + 1)
  const tx = x - x0
  const tz = z - z0
  const h00 = doc.heights[z0 * res + x0] ?? 0
  const h10 = doc.heights[z0 * res + x1] ?? 0
  const h01 = doc.heights[z1 * res + x0] ?? 0
  const h11 = doc.heights[z1 * res + x1] ?? 0
  return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz
}

/**
 * Rebuild CPU nav grid from heightfield. Slope + abyss reject walkable.
 */
export function rebuildNavMeshFromHeightfield(input: {
  heightfield: HeightfieldDocument
  /** Cells along one axis (default 48). */
  resolution?: number
  maxSlopeNormPerMeter?: number
  /** Heights below this normalized are abyss (unwalkable). */
  abyssMaxHeight?: number
  version?: number
}): NavMeshRebuildResult {
  const doc = input.heightfield
  const resolution = Math.max(8, Math.min(128, Math.floor(input.resolution ?? 48)))
  const maxSlope = input.maxSlopeNormPerMeter ?? 0.45
  const abyssMax = input.abyssMaxHeight ?? 0.08
  const cells: NavMeshCell[] = []
  let walkableCount = 0
  const cellW = doc.meta.widthMeters / resolution
  const cellD = doc.meta.depthMeters / resolution

  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      const u = (x + 0.5) / resolution
      const v = (z + 0.5) / resolution
      const h = sampleHeightNorm(doc, u, v)
      const hx = sampleHeightNorm(doc, Math.min(1, u + 1 / resolution), v)
      const hz = sampleHeightNorm(doc, u, Math.min(1, v + 1 / resolution))
      const slopeX = Math.abs(hx - h) / Math.max(1e-4, cellW / doc.meta.maxHeight)
      const slopeZ = Math.abs(hz - h) / Math.max(1e-4, cellD / doc.meta.maxHeight)
      const slope = Math.max(slopeX, slopeZ)
      const walkable = h >= abyssMax && slope <= maxSlope
      if (walkable) walkableCount++
      cells.push({
        x,
        z,
        walkable,
        height: h * doc.meta.maxHeight,
      })
    }
  }

  const navmesh: NavMeshGrid = {
    resolution,
    widthMeters: doc.meta.widthMeters,
    depthMeters: doc.meta.depthMeters,
    cells,
    walkableCount,
    version: input.version ?? 1,
    backend: 'cpu-grid',
    gpuRecastReady: false,
  }

  return {
    navmesh,
    gpuRecastReady: false,
    receipt: {
      stage: 'navmesh-rebuild',
      status: walkableCount > 0 ? 'closed' : 'rejected',
      evidence: [
        'cpu-grid',
        `walkable=${walkableCount}`,
        `cells=${cells.length}`,
        'unreal-recast-parity-held',
      ],
      heldReason:
        'CPU grid rebuild CLOSED — GPU heightfield→walkable requires soak (letter ch); Unreal Recast parity HELD',
      metrics: {
        walkableCount,
        resolution,
        version: navmesh.version,
      },
    },
  }
}

/** BFS reachability smoke — enemies need a walkable component after gen. */
export function navMeshHasWalkablePath(
  navmesh: NavMeshGrid,
  from: { x: number; z: number },
  to: { x: number; z: number },
): boolean {
  const res = navmesh.resolution
  const idx = (x: number, z: number) => z * res + x
  const start = idx(from.x, from.z)
  const goal = idx(to.x, to.z)
  if (!navmesh.cells[start]?.walkable || !navmesh.cells[goal]?.walkable) return false

  const seen = new Uint8Array(res * res)
  const queue: number[] = [start]
  seen[start] = 1
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur === goal) return true
    const cx = cur % res
    const cz = Math.floor(cur / res)
    for (const [dx, dz] of dirs) {
      const nx = cx + dx
      const nz = cz + dz
      if (nx < 0 || nz < 0 || nx >= res || nz >= res) continue
      const ni = idx(nx, nz)
      if (seen[ni]) continue
      if (!navmesh.cells[ni]?.walkable) continue
      seen[ni] = 1
      queue.push(ni)
    }
  }
  return false
}
