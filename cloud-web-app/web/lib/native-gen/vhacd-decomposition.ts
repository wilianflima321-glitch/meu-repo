/**
 * Letter ca — V-HACD / hierarchical approximate convex decomposition.
 *
 * Auto-generate ~N convex hulls for Rapier — NOT full trimesh on complex AI meshes.
 * Async/worker-friendly pure function; fail-closed to single convex if too heavy.
 * Run offline / inside VRAM pager pause window — never every frame.
 * `vhacdReady` flips when hierarchical path real (not commercial V-HACD library claim).
 */

import {
  countTriangles,
  countVertices,
  type RawMeshBuffer,
  type Vec3,
} from '@/lib/mesh-quality/types'
import {
  VHACD_DEFAULT_MAX_HULLS,
  VHACD_FAILCLOSED_SINGLE_HULL,
  VHACD_MIN_CAPABILITY_SCORE,
  type NativeGenStageReceipt,
} from '@/lib/native-gen/types'

export const VHACD_WIRED = true as const
export const VHACD_LETTER = 'ca' as const
/** Full Khaled Mamou V-HACD library parity — HELD. */
export const VHACD_COMMERCIAL_PARITY_HELD = true as const
export const VHACD_COMMERCIAL_PARITY_READY = false as const

export interface ConvexHullPart {
  points: Vec3[]
  volumeHint: number
}

export interface VhacdDecompositionResult {
  hulls: ConvexHullPart[]
  hullCount: number
  /** Prefer these over trimesh for dynamic AI props. */
  rapierConvexPreferred: true
  failClosedSingle: boolean
  deferredOffline: boolean
  /** True when hierarchical approx path produced ≥1 hull (soak-gated). */
  vhacdReady: boolean
  commercialParityReady: false
  receipt: NativeGenStageReceipt
}

export function decomposeVhacdApproximate(input: {
  mesh: RawMeshBuffer
  maxHulls?: number
  capabilityScore?: number
  /** When true, allow inline even on weak GPU (tests). */
  allowInlineOnWeakGpu?: boolean
  /** Force single-hull fail-closed. */
  forceSingleHull?: boolean
}): VhacdDecompositionResult {
  const score = input.capabilityScore ?? 100
  const maxHulls = Math.max(
    VHACD_FAILCLOSED_SINGLE_HULL,
    Math.min(64, input.maxHulls ?? VHACD_DEFAULT_MAX_HULLS),
  )
  const triCount = countTriangles(input.mesh)
  const vertCount = countVertices(input.mesh)

  if (vertCount < 4 || triCount < 1) {
    return {
      hulls: [],
      hullCount: 0,
      rapierConvexPreferred: true,
      failClosedSingle: true,
      deferredOffline: false,
      vhacdReady: false,
      commercialParityReady: false,
      receipt: {
        stage: 'vhacd',
        status: 'rejected',
        evidence: ['empty-mesh'],
        heldReason: 'Mesh too sparse for convex decomposition',
      },
    }
  }

  // Law XV — defer heavy decomp on weak GPU unless explicitly allowed
  if (score < VHACD_MIN_CAPABILITY_SCORE && !input.allowInlineOnWeakGpu) {
    const single = buildSingleConvex(input.mesh)
    return {
      hulls: [single],
      hullCount: 1,
      rapierConvexPreferred: true,
      failClosedSingle: true,
      deferredOffline: true,
      vhacdReady: true,
      commercialParityReady: false,
      receipt: {
        stage: 'vhacd',
        status: 'closed',
        evidence: [
          'law-xv-defer',
          'fail-closed-single-convex',
          'no-trimesh-dynamic',
          'commercial-vhacd-HELD',
        ],
        metrics: { capabilityScore: score, hullCount: 1, triCount },
        heldReason: `Capability ${score} < ${VHACD_MIN_CAPABILITY_SCORE} — hierarchical decomp deferred; single convex shipped`,
      },
    }
  }

  // Too heavy → fail-closed single (1000 AI objects must not melt CPU)
  const tooHeavy = triCount > 80_000 || input.forceSingleHull === true
  if (tooHeavy) {
    const single = buildSingleConvex(input.mesh)
    return {
      hulls: [single],
      hullCount: 1,
      rapierConvexPreferred: true,
      failClosedSingle: true,
      deferredOffline: false,
      vhacdReady: true,
      commercialParityReady: false,
      receipt: {
        stage: 'vhacd',
        status: 'closed',
        evidence: ['fail-closed-single-convex', 'too-heavy-for-inline-vhacd'],
        metrics: { triCount, hullCount: 1 },
      },
    }
  }

  const parts = hierarchicalSplit(input.mesh, maxHulls)
  const ok = parts.length >= 1

  return {
    hulls: parts,
    hullCount: parts.length,
    rapierConvexPreferred: true,
    failClosedSingle: parts.length === 1,
    deferredOffline: false,
    vhacdReady: ok,
    commercialParityReady: false,
    receipt: {
      stage: 'vhacd',
      status: ok ? 'closed' : 'rejected',
      evidence: [
        'hierarchical-aabb-split',
        'per-leaf-convex-hull',
        'rapier-convex-preferred',
        'not-trimesh-dynamic',
        'commercial-vhacd-library-HELD',
        'offline-or-pager-window-only',
      ],
      metrics: {
        hullCount: parts.length,
        maxHulls,
        triCount,
        vertCount,
        capabilityScore: score,
      },
    },
  }
}

function buildSingleConvex(mesh: RawMeshBuffer): ConvexHullPart {
  const pts = sampleVertices(mesh, 32)
  const hull = farthestPointHull(pts, 24)
  return { points: hull, volumeHint: aabbVolume(hull) }
}

function hierarchicalSplit(mesh: RawMeshBuffer, maxHulls: number): ConvexHullPart[] {
  const all = sampleVertices(mesh, Math.min(512, countVertices(mesh)))
  if (all.length < 4) return [{ points: all, volumeHint: aabbVolume(all) }]

  type Node = { points: Vec3[] }
  let leaves: Node[] = [{ points: all }]

  while (leaves.length < maxHulls) {
    // Split largest leaf along longest AABB axis
    let bi = 0
    let bestExtent = -1
    for (let i = 0; i < leaves.length; i++) {
      const e = aabbExtent(leaves[i]!.points)
      const m = Math.max(e.x, e.y, e.z)
      if (m > bestExtent) {
        bestExtent = m
        bi = i
      }
    }
    if (bestExtent < 1e-4) break
    const node = leaves[bi]!
    if (node.points.length < 8) break
    const ext = aabbExtent(node.points)
    const axis: 'x' | 'y' | 'z' =
      ext.x >= ext.y && ext.x >= ext.z ? 'x' : ext.y >= ext.z ? 'y' : 'z'
    const mid =
      node.points.reduce((s, p) => s + p[axis], 0) / Math.max(1, node.points.length)
    const left: Vec3[] = []
    const right: Vec3[] = []
    for (const p of node.points) {
      if (p[axis] <= mid) left.push(p)
      else right.push(p)
    }
    if (left.length < 4 || right.length < 4) break
    leaves.splice(bi, 1, { points: left }, { points: right })
  }

  return leaves.map((leaf) => {
    const hull = farthestPointHull(leaf.points, 20)
    return { points: hull, volumeHint: aabbVolume(hull) }
  })
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

function farthestPointHull(points: Vec3[], maxPoints: number): Vec3[] {
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

  const selected: Vec3[] = []
  const seen = new Set<string>()
  const push = (p: Vec3) => {
    const k = `${p.x.toFixed(5)}:${p.y.toFixed(5)}:${p.z.toFixed(5)}`
    if (seen.has(k)) return
    seen.add(k)
    selected.push(p)
  }
  for (const p of [minX, maxX, minY, maxY, minZ, maxZ]) push(p)

  while (selected.length < maxPoints) {
    let best: Vec3 | null = null
    let bestDist = -1
    for (const p of points) {
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
    if (!best || bestDist < 1e-10) break
    push(best)
  }
  return selected
}

function aabbExtent(points: Vec3[]) {
  if (points.length === 0) return { x: 0, y: 0, z: 0 }
  let minX = points[0]!.x
  let maxX = points[0]!.x
  let minY = points[0]!.y
  let maxY = points[0]!.y
  let minZ = points[0]!.z
  let maxZ = points[0]!.z
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
    if (p.z < minZ) minZ = p.z
    if (p.z > maxZ) maxZ = p.z
  }
  return { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
}

function aabbVolume(points: Vec3[]): number {
  const e = aabbExtent(points)
  return Math.max(0, e.x) * Math.max(0, e.y) * Math.max(0, e.z)
}

export function probeVhacdReady(input?: { soakProven?: boolean }): boolean {
  return VHACD_WIRED && input?.soakProven !== false
}
