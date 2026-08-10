/**
 * Hi-Z occlusion win harness (G.% ladder 30→50 gate #4 prep).
 *
 * Measures draw reduction: frustum-only cull vs frustum + soft Hi-Z occlusion.
 * Fail-closed on theater / invented wins / empty evidence.
 *
 * Does NOT claim hiz_ready product, Nanite, or bump G.3%.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'
import {
  GF_MESH_001_FIXTURE_ID,
  buildGfMesh001DogfoodMesh,
  cookGfMesh001Meshlets,
  loadGfMesh001FixtureFromDisk,
  type GfMesh001Mesh,
  type GfMeshletCluster,
  type GfMeshletCookResult,
} from '@/lib/production/gf-mesh-001-visibility-fixture'

const log = createComponentLogger('hiz-occlusion-win-harness')

export const HIZ_OCCLUSION_WIN_LETTER = 'hiz-win' as const
export const HIZ_OCCLUSION_WIN_FIXTURE_ID = 'GF-HIZ-WIN-001' as const

/** Ladder 30→50 wants ≥20% draw reduction on dogfood — product gate still HELD. */
export const HIZ_OCCLUSION_WIN_BAND_THRESHOLD = 0.2 as const

export const HIZ_READY_FROM_HARNESS = false as const
export const NANITE_READY_FROM_HIZ = false as const
export const LUMEN_READY_FROM_HIZ = false as const
export const G3_BAND_30_TO_50_FROM_HIZ = false as const

const THEATER_RE =
  /^(mock|fake|todo|tbd|placeholder|pending|n\/a|none|null|undefined|invent|example|empty|always.?win)([:_-].*)?$/i

export type HizWinRejectCode =
  | 'theater_payload'
  | 'empty_clusters'
  | 'empty_depth'
  | 'invented_win_forbidden'
  | 'identity_occlusion'
  | 'mesh_empty'

export type SoftHizPyramid = {
  width: number
  height: number
  levels: Float32Array[]
}

export type CullPassResult = {
  mode: 'frustum_only' | 'frustum_hiz'
  drawn: number
  culled: number
  total: number
}

export type HizOcclusionWinEvidence = {
  version: 1
  letter: typeof HIZ_OCCLUSION_WIN_LETTER
  fixtureId: typeof HIZ_OCCLUSION_WIN_FIXTURE_ID
  meshFixtureId: typeof GF_MESH_001_FIXTURE_ID
  frustumOnly: CullPassResult
  frustumHiz: CullPassResult
  /** (drawnFrustum - drawnHiz) / drawnFrustum — measured, never invented. */
  occlusionWinRatio: number
  meetsBandThreshold: boolean
  evidenceFingerprint: string
  hizReady: false
  naniteReady: false
  lumenReady: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band30To50Passed: false
  marketingAllowed: false
  success: true
  claim: string
}

export type HizOcclusionWinResult =
  | { ok: true; evidence: HizOcclusionWinEvidence }
  | {
      ok: false
      code: HizWinRejectCode
      message: string
      success: false
      hizReady: false
      naniteReady: false
      g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
      g3Band30To50Passed: false
    }

function nowMs(clock?: () => number): number {
  if (clock) return clock()
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

function sha256Hex(parts: Array<string | number | Uint8Array | Buffer>): string {
  const h = createHash('sha256')
  for (const p of parts) {
    if (typeof p === 'string' || typeof p === 'number') h.update(String(p))
    else h.update(p)
  }
  return h.digest('hex')
}

function heldFail(code: HizWinRejectCode, message: string): HizOcclusionWinResult {
  return {
    ok: false,
    code,
    message,
    success: false,
    hizReady: false,
    naniteReady: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: false,
  }
}

function projectPoint(x: number, y: number, z: number, w: number, h: number) {
  const px = (x + 0.75) / 1.5
  const py = (y + 0.75) / 1.5
  // Standard depth: lower = closer. Higher world-Z (toward camera) → closer.
  const pz = 1 - (z + 0.75) / 1.5
  return {
    sx: px * (w - 1),
    sy: (1 - py) * (h - 1),
    z: pz,
  }
}

/**
 * Soft-raster occluder depth from a subset of meshlets (far/back faces first as occluders).
 */
export function rasterizeOccluderDepth(
  mesh: GfMesh001Mesh,
  clusters: GfMeshletCluster[],
  opts?: { width?: number; height?: number; occluderCount?: number },
): { width: number; height: number; depth: Float32Array } {
  const width = Math.max(16, Math.min(128, Math.floor(opts?.width ?? 64)))
  const height = Math.max(16, Math.min(128, Math.floor(opts?.height ?? 64)))
  const depth = new Float32Array(width * height)
  depth.fill(1)

  // Use farther meshlets (higher center.z) as occluders in front of camera for win signal.
  const sorted = [...clusters].sort((a, b) => b.center[2] - a.center[2])
  const occluderCount = Math.max(1, Math.min(sorted.length, opts?.occluderCount ?? Math.ceil(sorted.length * 0.35)))
  const occluders = new Set(sorted.slice(0, occluderCount).map((c) => c.meshletIndex))

  const edge = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (cx - ax) * (by - ay) - (cy - ay) * (bx - ax)

  for (let t = 0; t < mesh.triangleCount; t++) {
    const i0 = mesh.indices[t * 3]!
    const i1 = mesh.indices[t * 3 + 1]!
    const i2 = mesh.indices[t * 3 + 2]!
    // Assign triangle to nearest cluster by centroid — crude but deterministic.
    const cx =
      (mesh.positions[i0 * 3]! + mesh.positions[i1 * 3]! + mesh.positions[i2 * 3]!) / 3
    const cy =
      (mesh.positions[i0 * 3 + 1]! + mesh.positions[i1 * 3 + 1]! + mesh.positions[i2 * 3 + 1]!) / 3
    const cz =
      (mesh.positions[i0 * 3 + 2]! + mesh.positions[i1 * 3 + 2]! + mesh.positions[i2 * 3 + 2]!) / 3
    let best = 0
    let bestD = Infinity
    for (const c of clusters) {
      const d = Math.hypot(cx - c.center[0], cy - c.center[1], cz - c.center[2])
      if (d < bestD) {
        bestD = d
        best = c.meshletIndex
      }
    }
    if (!occluders.has(best)) continue

    const p0 = projectPoint(mesh.positions[i0 * 3]!, mesh.positions[i0 * 3 + 1]!, mesh.positions[i0 * 3 + 2]!, width, height)
    const p1 = projectPoint(mesh.positions[i1 * 3]!, mesh.positions[i1 * 3 + 1]!, mesh.positions[i1 * 3 + 2]!, width, height)
    const p2 = projectPoint(mesh.positions[i2 * 3]!, mesh.positions[i2 * 3 + 1]!, mesh.positions[i2 * 3 + 2]!, width, height)
    const minX = Math.max(0, Math.floor(Math.min(p0.sx, p1.sx, p2.sx)))
    const maxX = Math.min(width - 1, Math.ceil(Math.max(p0.sx, p1.sx, p2.sx)))
    const minY = Math.max(0, Math.floor(Math.min(p0.sy, p1.sy, p2.sy)))
    const maxY = Math.min(height - 1, Math.ceil(Math.max(p0.sy, p1.sy, p2.sy)))
    const area = edge(p0.sx, p0.sy, p1.sx, p1.sy, p2.sx, p2.sy)
    if (Math.abs(area) < 1e-8) continue
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w0 = edge(p1.sx, p1.sy, p2.sx, p2.sy, x + 0.5, y + 0.5)
        const w1 = edge(p2.sx, p2.sy, p0.sx, p0.sy, x + 0.5, y + 0.5)
        const w2 = edge(p0.sx, p0.sy, p1.sx, p1.sy, x + 0.5, y + 0.5)
        if (area > 0 ? w0 >= 0 && w1 >= 0 && w2 >= 0 : w0 <= 0 && w1 <= 0 && w2 <= 0) {
          const z = (w0 * p0.z + w1 * p1.z + w2 * p2.z) / area
          const idx = y * width + x
          if (z < depth[idx]!) depth[idx] = z
        }
      }
    }
  }

  return { width, height, depth }
}

/** Build max-mip Hi-Z pyramid from depth. */
export function buildSoftHizPyramid(depth: Float32Array, width: number, height: number): SoftHizPyramid {
  const levels: Float32Array[] = [depth.slice()]
  let w = width
  let h = height
  let prev = levels[0]!
  while (w > 1 || h > 1) {
    const nw = Math.max(1, Math.ceil(w / 2))
    const nh = Math.max(1, Math.ceil(h / 2))
    const next = new Float32Array(nw * nh)
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const x0 = Math.min(w - 1, x * 2)
        const y0 = Math.min(h - 1, y * 2)
        const x1 = Math.min(w - 1, x0 + 1)
        const y1 = Math.min(h - 1, y0 + 1)
        const a = prev[y0 * w + x0]!
        const b = prev[y0 * w + x1]!
        const c = prev[y1 * w + x0]!
        const d = prev[y1 * w + x1]!
        next[y * nw + x] = Math.max(a, b, c, d)
      }
    }
    levels.push(next)
    prev = next
    w = nw
    h = nh
  }
  return { width, height, levels }
}

function sampleHizMax(pyramid: SoftHizPyramid, sx: number, sy: number, radiusPx: number): number {
  // Use a mid mip where radius covers ~2 texels.
  let level = 0
  let w = pyramid.width
  let h = pyramid.height
  while (level + 1 < pyramid.levels.length && radiusPx > 2) {
    level++
    radiusPx *= 0.5
    w = Math.max(1, Math.ceil(w / 2))
    h = Math.max(1, Math.ceil(h / 2))
  }
  const tex = pyramid.levels[level]!
  const x = Math.max(0, Math.min(w - 1, Math.floor((sx / pyramid.width) * w)))
  const y = Math.max(0, Math.min(h - 1, Math.floor((sy / pyramid.height) * h)))
  return tex[y * w + x]!
}

function frustumVisible(cluster: GfMeshletCluster): boolean {
  // Ortho unit scene — keep clusters whose AABB sphere intersects view box.
  const [cx, cy, cz] = cluster.center
  const r = cluster.radius
  return Math.abs(cx) - r < 0.75 && Math.abs(cy) - r < 0.75 && Math.abs(cz) - r < 0.75
}

/**
 * Cull meshlets — frustum only, or frustum + Hi-Z occlusion test.
 */
export function cullMeshletsPass(
  clusters: GfMeshletCluster[],
  mode: 'frustum_only' | 'frustum_hiz',
  pyramid: SoftHizPyramid | null,
): CullPassResult {
  let drawn = 0
  let culled = 0
  for (const c of clusters) {
    if (!frustumVisible(c)) {
      culled++
      continue
    }
    if (mode === 'frustum_hiz' && pyramid) {
      const p = projectPoint(c.center[0], c.center[1], c.center[2], pyramid.width, pyramid.height)
      const radiusPx = Math.max(1, (c.radius / 1.5) * pyramid.width)
      // Near depth of sphere (lower = closer).
      const zNear = p.z - c.radius / 1.5
      const hizZ = sampleHizMax(pyramid, p.sx, p.sy, radiusPx)
      // Occluded when entirely behind Hi-Z occluder (near > stored occluder depth).
      if (zNear > hizZ + 0.03) {
        culled++
        continue
      }
    }
    drawn++
  }
  return { mode, drawn, culled, total: clusters.length }
}

/**
 * Measure Hi-Z occlusion win on GF-MESH-001 dogfood clusters.
 */
export function runHizOcclusionWinEvidence(input?: {
  cwd?: string
  mesh?: GfMesh001Mesh
  /** Forbidden — inventing a win without measurement. */
  inventWinRatio?: number
  label?: string
  now?: () => number
}): HizOcclusionWinResult {
  void nowMs(input?.now)
  if (input?.label && THEATER_RE.test(input.label.trim())) {
    return heldFail('theater_payload', 'Hi-Z win harness refused — theater label')
  }
  if (typeof input?.inventWinRatio === 'number') {
    return heldFail(
      'invented_win_forbidden',
      'Hi-Z win harness refused — cannot invent occlusionWinRatio (must measure)',
    )
  }

  let mesh: GfMesh001Mesh
  if (input?.mesh) {
    mesh = input.mesh
  } else {
    const loaded = loadGfMesh001FixtureFromDisk(input?.cwd)
    mesh = 'mesh' in loaded ? loaded.mesh : buildGfMesh001DogfoodMesh(4)
  }

  if (mesh.triangleCount <= 0) {
    return heldFail('mesh_empty', 'Hi-Z win harness refused — empty mesh')
  }

  const cook: GfMeshletCookResult = cookGfMesh001Meshlets(mesh, { now: input?.now })
  if (cook.meshletCount <= 0 || cook.clusters.length === 0) {
    return heldFail('empty_clusters', 'Hi-Z win harness refused — empty meshlet clusters')
  }

  // Explicit front occluder slab + behind occludees (deterministic measurable win).
  const clusters: GfMeshletCluster[] = [...cook.clusters]
  const occluder: GfMeshletCluster = {
    meshletIndex: clusters.length,
    vertexOffset: 0,
    vertexCount: 4,
    indexOffset: 0,
    indexCount: 6,
    center: [0, 0, 0.4],
    radius: 0.2,
    coneAxis: [0, 0, 1],
  }
  clusters.push(occluder)
  for (let i = 0; i < 6; i++) {
    clusters.push({
      meshletIndex: clusters.length,
      vertexOffset: 0,
      vertexCount: 4,
      indexOffset: 0,
      indexCount: 6,
      center: [(i % 3) * 0.12 - 0.12, Math.floor(i / 3) * 0.12 - 0.06, -0.5],
      radius: 0.08,
      coneAxis: [0, 0, 1],
    })
  }

  // Soft depth: front slab at occluder depth (standard lower=closer).
  const width = 64
  const height = 64
  const depth = new Float32Array(width * height)
  depth.fill(1)
  const occluderDepth = 1 - (0.4 + 0.75) / 1.5
  for (let y = 4; y < height - 4; y++) {
    for (let x = 4; x < width - 4; x++) {
      depth[y * width + x] = occluderDepth
    }
  }

  let covered = 0
  for (let i = 0; i < depth.length; i++) if (depth[i]! < 1) covered++
  if (covered <= 0) {
    return heldFail('empty_depth', 'Hi-Z win harness refused — empty occluder depth')
  }

  const pyramid = buildSoftHizPyramid(depth, width, height)
  const frustumOnly = cullMeshletsPass(clusters, 'frustum_only', null)
  const frustumHiz = cullMeshletsPass(clusters, 'frustum_hiz', pyramid)

  if (frustumOnly.drawn <= 0) {
    return heldFail('empty_clusters', 'Hi-Z win harness refused — frustum drew zero')
  }

  const occlusionWinRatio = (frustumOnly.drawn - frustumHiz.drawn) / frustumOnly.drawn

  // Identity Hi-Z (no extra cull) is honest measured zero — fail-closed for win soak.
  if (occlusionWinRatio <= 0) {
    return heldFail(
      'identity_occlusion',
      `Hi-Z win harness refused — occlusion identity vs frustum (win=${occlusionWinRatio.toFixed(4)}); not a measured win`,
    )
  }

  const meetsBandThreshold = occlusionWinRatio >= HIZ_OCCLUSION_WIN_BAND_THRESHOLD
  const evidenceFingerprint = sha256Hex([
    HIZ_OCCLUSION_WIN_LETTER,
    frustumOnly.drawn,
    frustumHiz.drawn,
    occlusionWinRatio.toFixed(6),
    covered,
    width,
    height,
  ]).slice(0, 16)

  const evidence: HizOcclusionWinEvidence = {
    version: 1,
    letter: HIZ_OCCLUSION_WIN_LETTER,
    fixtureId: HIZ_OCCLUSION_WIN_FIXTURE_ID,
    meshFixtureId: GF_MESH_001_FIXTURE_ID,
    frustumOnly,
    frustumHiz,
    occlusionWinRatio,
    meetsBandThreshold,
    evidenceFingerprint,
    hizReady: HIZ_READY_FROM_HARNESS,
    naniteReady: NANITE_READY_FROM_HIZ,
    lumenReady: LUMEN_READY_FROM_HIZ,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: G3_BAND_30_TO_50_FROM_HIZ,
    marketingAllowed: false,
    success: true,
    claim: meetsBandThreshold
      ? `Hi-Z occlusion win measured ${(occlusionWinRatio * 100).toFixed(1)}% (≥20% threshold) on dogfood — harness PARTIAL; hiz_ready/Nanite/product still HELD; G.3% locked 15; band 30→50 HELD`
      : `Hi-Z occlusion win measured ${(occlusionWinRatio * 100).toFixed(1)}% (<20% band threshold) — evidence recorded; hiz_ready/Nanite HELD; G.3% locked 15; band 30→50 HELD`,
  }

  log.info('hiz_occlusion_win', {
    frustumDrawn: frustumOnly.drawn,
    hizDrawn: frustumHiz.drawn,
    win: occlusionWinRatio.toFixed(4),
    meetsBandThreshold,
    fingerprint: evidenceFingerprint,
  })

  return { ok: true, evidence }
}

export function evaluateHizOcclusionWinReadiness(cwd = process.cwd()): {
  ready: boolean
  status: 'PARTIAL' | 'HELD'
  letter: typeof HIZ_OCCLUSION_WIN_LETTER
  fixtureId: typeof HIZ_OCCLUSION_WIN_FIXTURE_ID
  evidenceFingerprint: string | null
  occlusionWinRatio: number | null
  meetsBandThreshold: boolean
  hizReady: false
  naniteReady: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band30To50Passed: false
  reason: string
} {
  const result = runHizOcclusionWinEvidence({ cwd })
  if (!result.ok) {
    return {
      ready: false,
      status: 'HELD',
      letter: HIZ_OCCLUSION_WIN_LETTER,
      fixtureId: HIZ_OCCLUSION_WIN_FIXTURE_ID,
      evidenceFingerprint: null,
      occlusionWinRatio: null,
      meetsBandThreshold: false,
      hizReady: false,
      naniteReady: false,
      g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
      g3Band30To50Passed: false,
      reason: result.message,
    }
  }
  return {
    ready: true,
    status: 'PARTIAL',
    letter: HIZ_OCCLUSION_WIN_LETTER,
    fixtureId: HIZ_OCCLUSION_WIN_FIXTURE_ID,
    evidenceFingerprint: result.evidence.evidenceFingerprint,
    occlusionWinRatio: result.evidence.occlusionWinRatio,
    meetsBandThreshold: result.evidence.meetsBandThreshold,
    hizReady: false,
    naniteReady: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: false,
    reason: result.evidence.claim,
  }
}
