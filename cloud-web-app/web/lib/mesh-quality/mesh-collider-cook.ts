/**
 * Letter bw — Physics collider cook (convex hull + trimesh).
 * Convex = gameplay proxy; trimesh = precise static cook (Rapier-ready bytes).
 */

import {
  countTriangles,
  countVertices,
  type MeshQualityStageReceipt,
  type RawMeshBuffer,
  type Vec3,
} from '@/lib/mesh-quality/types'

export const MESH_COLLIDER_COOK_WIRED = true as const

export type ColliderCookKind = 'convex-hull' | 'trimesh'

export interface CookedCollider {
  kind: ColliderCookKind
  /** Convex hull points (≤ maxHullPoints). */
  points: Vec3[]
  /** Trimesh indices into source mesh (when kind=trimesh). */
  triangleIndices?: Uint32Array
  vertexCount: number
  triangleCount: number
}

export interface ColliderCookResult {
  convex: CookedCollider
  trimesh: CookedCollider
  receipt: MeshQualityStageReceipt
}

export function cookMeshColliders(input: {
  mesh: RawMeshBuffer
  maxHullPoints?: number
}): ColliderCookResult {
  const maxHull = Math.max(4, input.maxHullPoints ?? 32)
  const verts = sampleVertices(input.mesh, maxHull * 4)
  const hull = giftWrapConvexHullApprox(verts, maxHull)

  const triCount = countTriangles(input.mesh)
  const trimesh: CookedCollider = {
    kind: 'trimesh',
    points: [],
    triangleIndices: input.mesh.indices.length > 0
      ? new Uint32Array(input.mesh.indices)
      : undefined,
    vertexCount: countVertices(input.mesh),
    triangleCount: triCount,
  }

  const convex: CookedCollider = {
    kind: 'convex-hull',
    points: hull,
    vertexCount: hull.length,
    triangleCount: Math.max(0, hull.length - 2),
  }

  const ok = hull.length >= 4 && triCount > 0
  return {
    convex,
    trimesh,
    receipt: {
      stage: 'collider-cook',
      status: ok ? 'closed' : 'rejected',
      evidence: ['convex-hull', 'trimesh-cook', 'rapier-ready-indices'],
      metrics: {
        hullPoints: hull.length,
        trimeshTriangles: triCount,
      },
      heldReason: ok ? undefined : 'Insufficient geometry for collider cook',
    },
  }
}

function sampleVertices(mesh: RawMeshBuffer, max: number): Vec3[] {
  const n = countVertices(mesh)
  if (n === 0) return []
  const step = Math.max(1, Math.floor(n / max))
  const out: Vec3[] = []
  for (let i = 0; i < n && out.length < max; i += step) {
    out.push({
      x: mesh.positions[i * 3]!,
      y: mesh.positions[i * 3 + 1]!,
      z: mesh.positions[i * 3 + 2]!,
    })
  }
  return out
}

/** Approximate 3D convex hull via AABB extremes + farthest-point set (not Qhull). */
function giftWrapConvexHullApprox(points: Vec3[], maxPoints: number): Vec3[] {
  if (points.length <= maxPoints) return points.slice()
  if (points.length === 0) return []

  let minX = points[0]!
  let maxX = points[0]!
  let minY = points[0]!
  let maxY = points[0]!
  let minZ = points[0]!
  let maxZ = points[0]!
  for (const p of points) {
    if (p.x < minX.x) minX = p
    if (p.x > maxX.x) maxX = p
    if (p.y < minY.y) minY = p
    if (p.y > maxY.y) maxY = p
    if (p.z < minZ.z) minZ = p
    if (p.z > maxZ.z) maxZ = p
  }

  const seed = [minX, maxX, minY, maxY, minZ, maxZ]
  const selected: Vec3[] = []
  const seen = new Set<string>()
  const push = (p: Vec3) => {
    const k = `${p.x.toFixed(5)}:${p.y.toFixed(5)}:${p.z.toFixed(5)}`
    if (seen.has(k)) return
    seen.add(k)
    selected.push(p)
  }
  for (const p of seed) push(p)

  while (selected.length < maxPoints) {
    let best: Vec3 | null = null
    let bestDist = -1
    for (const p of points) {
      const k = `${p.x.toFixed(5)}:${p.y.toFixed(5)}:${p.z.toFixed(5)}`
      if (seen.has(k)) continue
      let minD = Infinity
      for (const s of selected) {
        const d = (p.x - s.x) ** 2 + (p.y - s.y) ** 2 + (p.z - s.z) ** 2
        if (d < minD) minD = d
      }
      if (minD > bestDist) {
        bestDist = minD
        best = p
      }
    }
    if (!best || bestDist <= 0) break
    push(best)
  }

  return selected
}
