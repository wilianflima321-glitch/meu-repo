/**
 * GF-MESH-001 — dogfood mesh fixture + golden visibility hash (G.% ladder 30→50 prep).
 *
 * On-disk fixture + deterministic meshlet cook + soft-raster visibility fingerprint.
 * Fail-closed: empty mesh, theater ids, capsule/proxy character, empty success.
 *
 * Does NOT:
 * - bump g3CodeDepthPercent (stays 15)
 * - claim Nanite / Lumen / OpenUSD product / capsule character
 * - flip frameGraphLive or product present
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createComponentLogger } from '@/lib/observability/logger'
import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'

const log = createComponentLogger('gf-mesh-001-visibility')

export const GF_MESH_001_FIXTURE_ID = 'GF-MESH-001' as const
export const GF_MESH_001_LETTER = 'gf-mesh-001' as const
export const GF_MESH_001_MAX_VERTS_PER_MESHLET = 64 as const
export const GF_MESH_001_MAX_TRIS_PER_MESHLET = 128 as const

/** Product Nanite / Micro-Poly AAA — always false until ladder bands pass. */
export const NANITE_READY_FROM_GF_MESH = false as const
export const MICRO_POLY_AAA_FROM_GF_MESH = false as const
export const LUMEN_READY_FROM_GF_MESH = false as const
export const OPEN_USD_STAGE_READY_FROM_GF_MESH = false as const
export const G3_BAND_30_TO_50_PASSED = false as const

const THEATER_RE =
  /^(mock|fake|todo|tbd|placeholder|pending|n\/a|none|null|undefined|invent|example|empty|capsule|proxy)([:_-].*)?$/i

export type GfMesh001RejectCode =
  | 'fixture_missing'
  | 'empty_mesh'
  | 'theater_payload'
  | 'capsule_proxy_forbidden'
  | 'cook_empty'
  | 'visibility_empty'
  | 'golden_hash_mismatch'
  | 'open_usd_claim_forbidden'

export type GfMesh001Mesh = {
  fixtureId: typeof GF_MESH_001_FIXTURE_ID
  name: string
  version: number
  positions: Float32Array
  indices: Uint32Array
  vertexCount: number
  triangleCount: number
}

export type GfMeshletCluster = {
  meshletIndex: number
  vertexOffset: number
  vertexCount: number
  indexOffset: number
  indexCount: number
  /** AABB center */
  center: [number, number, number]
  radius: number
  /** Approx normal cone axis (unit-ish) */
  coneAxis: [number, number, number]
}

export type GfMeshletCookResult = {
  meshletCount: number
  clusters: GfMeshletCluster[]
  packedIndices: Uint32Array
  cookDurationMs: number
}

export type GfVisibilityEvidence = {
  width: number
  height: number
  /** Covered pixel count (depth < far) */
  coveredPixels: number
  /** SHA-256 of coverage+depth buffer — NOT meshlet-ID debug colors */
  goldenVisibilityHash: string
  evidenceFingerprint: string
  rasterDurationMs: number
}

export type GfMesh001Evidence = {
  version: 1
  letter: typeof GF_MESH_001_LETTER
  fixtureId: typeof GF_MESH_001_FIXTURE_ID
  fixtureOnDisk: boolean
  vertexCount: number
  triangleCount: number
  meshletCount: number
  cook: GfMeshletCookResult
  visibility: GfVisibilityEvidence
  evidenceFingerprint: string
  naniteReady: false
  microPolyAaaReady: false
  lumenReady: false
  openUsdStageReady: false
  frameGraphLive: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band30To50Passed: false
  marketingAllowed: false
  success: true
  claim: string
}

export type GfMesh001Result =
  | { ok: true; evidence: GfMesh001Evidence }
  | {
      ok: false
      code: GfMesh001RejectCode
      message: string
      success: false
      naniteReady: false
      openUsdStageReady: false
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

function sha256Hex(parts: Array<string | Uint8Array | Buffer>): string {
  const h = createHash('sha256')
  for (const p of parts) {
    if (typeof p === 'string') h.update(p)
    else h.update(p)
  }
  return h.digest('hex')
}

function heldFail(code: GfMesh001RejectCode, message: string): GfMesh001Result {
  return {
    ok: false,
    code,
    message,
    success: false,
    naniteReady: false,
    openUsdStageReady: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: false,
  }
}

/**
 * Deterministic dogfood mesh — subdivided box (not capsule / not proxy character).
 * Same seed → same topology.
 */
export function buildGfMesh001DogfoodMesh(subdivisions = 4): GfMesh001Mesh {
  const n = Math.max(2, Math.min(8, Math.floor(subdivisions)))
  const positions: number[] = []
  const indices: number[] = []

  // 6 faces of a unit cube, each subdivided into n×n quads → 2 tris each.
  const faces: Array<{
    origin: [number, number, number]
    u: [number, number, number]
    v: [number, number, number]
  }> = [
    { origin: [-0.5, -0.5, 0.5], u: [1, 0, 0], v: [0, 1, 0] }, // +Z
    { origin: [0.5, -0.5, -0.5], u: [-1, 0, 0], v: [0, 1, 0] }, // -Z
    { origin: [-0.5, 0.5, -0.5], u: [1, 0, 0], v: [0, 0, 1] }, // +Y
    { origin: [-0.5, -0.5, 0.5], u: [1, 0, 0], v: [0, 0, -1] }, // -Y
    { origin: [0.5, -0.5, 0.5], u: [0, 0, -1], v: [0, 1, 0] }, // +X
    { origin: [-0.5, -0.5, -0.5], u: [0, 0, 1], v: [0, 1, 0] }, // -X
  ]

  for (const face of faces) {
    const base = positions.length / 3
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const s = i / n
        const t = j / n
        positions.push(
          face.origin[0] + face.u[0] * s + face.v[0] * t,
          face.origin[1] + face.u[1] * s + face.v[1] * t,
          face.origin[2] + face.u[2] * s + face.v[2] * t,
        )
      }
    }
    const stride = n + 1
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = base + j * stride + i
        const b = a + 1
        const c = a + stride
        const d = c + 1
        indices.push(a, b, d, a, d, c)
      }
    }
  }

  const pos = new Float32Array(positions)
  const idx = new Uint32Array(indices)
  return {
    fixtureId: GF_MESH_001_FIXTURE_ID,
    name: 'dogfood-subdivided-box',
    version: 1,
    positions: pos,
    indices: idx,
    vertexCount: pos.length / 3,
    triangleCount: idx.length / 3,
  }
}

/** Detect capsule/proxy character theater — forbidden as GF-MESH-001 dogfood. */
export function isCapsuleOrProxyCharacter(input: {
  name?: string
  fixtureId?: string
  proxyCapsule?: boolean
  triangleCount?: number
}): boolean {
  if (input.proxyCapsule === true) return true
  const name = (input.name || '').toLowerCase()
  const id = (input.fixtureId || '').toLowerCase()
  if (/capsule|proxy.?char|proxy.?mesh|placeholder.?hero/.test(name)) return true
  if (/capsule|proxy/.test(id) && id !== GF_MESH_001_FIXTURE_ID.toLowerCase()) return true
  // Extremely thin "capsule stand-in" — single prism strip (< 24 tris) named character-ish
  if ((input.triangleCount ?? 0) > 0 && (input.triangleCount ?? 0) < 24 && /character|hero|npc/.test(name)) {
    return true
  }
  return false
}

export function resolveGfMesh001FixturePath(cwd = process.cwd()): string {
  const candidates = [
    join(cwd, 'fixtures', 'gf-mesh-001', 'manifest.json'),
    join(cwd, 'web', 'fixtures', 'gf-mesh-001', 'manifest.json'),
    join(cwd, 'cloud-web-app', 'web', 'fixtures', 'gf-mesh-001', 'manifest.json'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return candidates[0]!
}

type DiskManifest = {
  fixtureId: string
  name: string
  version: number
  vertexCount: number
  triangleCount: number
  positions: number[]
  indices: number[]
  notes?: string
  /** Sealed golden visibility hash — optional; verified when present. */
  sealedGoldenVisibilityHash?: string | null
}

/**
 * Load GF-MESH-001 from disk — fail-closed if missing/empty/theater/capsule.
 */
export function loadGfMesh001FixtureFromDisk(cwd = process.cwd()): GfMesh001Result | { ok: true; mesh: GfMesh001Mesh; path: string; sealedHash: string | null } {
  const path = resolveGfMesh001FixturePath(cwd)
  if (!existsSync(path)) {
    return heldFail('fixture_missing', `GF-MESH-001 fixture missing on disk: ${path}`)
  }

  let raw: DiskManifest
  try {
    raw = JSON.parse(readFileSync(path, 'utf8')) as DiskManifest
  } catch {
    return heldFail('theater_payload', 'GF-MESH-001 manifest unreadable / invalid JSON')
  }

  if (!raw || raw.fixtureId !== GF_MESH_001_FIXTURE_ID) {
    return heldFail('theater_payload', 'GF-MESH-001 fixtureId mismatch or theater payload')
  }
  if (THEATER_RE.test(raw.name || '') || THEATER_RE.test(raw.fixtureId)) {
    return heldFail('theater_payload', 'GF-MESH-001 theater name/id refused')
  }
  if (isCapsuleOrProxyCharacter({ name: raw.name, fixtureId: raw.fixtureId, triangleCount: raw.triangleCount })) {
    return heldFail('capsule_proxy_forbidden', 'GF-MESH-001 capsule/proxy character forbidden (J.7)')
  }
  if (!Array.isArray(raw.positions) || !Array.isArray(raw.indices) || raw.positions.length < 9 || raw.indices.length < 3) {
    return heldFail('empty_mesh', 'GF-MESH-001 empty mesh on disk (Law XVI no empty success)')
  }

  const positions = new Float32Array(raw.positions)
  const indices = new Uint32Array(raw.indices)
  const mesh: GfMesh001Mesh = {
    fixtureId: GF_MESH_001_FIXTURE_ID,
    name: raw.name,
    version: raw.version || 1,
    positions,
    indices,
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
  }

  if (mesh.triangleCount <= 0 || mesh.vertexCount < 3) {
    return heldFail('empty_mesh', 'GF-MESH-001 degenerate mesh')
  }

  return {
    ok: true,
    mesh,
    path,
    sealedHash: typeof raw.sealedGoldenVisibilityHash === 'string' ? raw.sealedGoldenVisibilityHash : null,
  }
}

function triNormal(
  positions: Float32Array,
  i0: number,
  i1: number,
  i2: number,
): [number, number, number] {
  const ax = positions[i1 * 3]! - positions[i0 * 3]!
  const ay = positions[i1 * 3 + 1]! - positions[i0 * 3 + 1]!
  const az = positions[i1 * 3 + 2]! - positions[i0 * 3 + 2]!
  const bx = positions[i2 * 3]! - positions[i0 * 3]!
  const by = positions[i2 * 3 + 1]! - positions[i0 * 3 + 1]!
  const bz = positions[i2 * 3 + 2]! - positions[i0 * 3 + 2]!
  const nx = ay * bz - az * by
  const ny = az * bx - ax * bz
  const nz = ax * by - ay * bx
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

/**
 * Deterministic meshlet cook — face-adjacency BFS, ≤64v / ≤128tri (Rust cook parity scaffold).
 */
export function cookGfMesh001Meshlets(
  mesh: GfMesh001Mesh,
  opts?: { now?: () => number }
): GfMeshletCookResult {
  const t0 = nowMs(opts?.now)
  const triCount = mesh.triangleCount
  const visited = new Uint8Array(triCount)
  const clusters: GfMeshletCluster[] = []
  const packed: number[] = []

  // Edge → triangle adjacency
  const edgeMap = new Map<string, number[]>()
  const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)
  for (let t = 0; t < triCount; t++) {
    const i0 = mesh.indices[t * 3]!
    const i1 = mesh.indices[t * 3 + 1]!
    const i2 = mesh.indices[t * 3 + 2]!
    for (const [a, b] of [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ] as const) {
      const k = edgeKey(a, b)
      const list = edgeMap.get(k) ?? []
      list.push(t)
      edgeMap.set(k, list)
    }
  }

  const neighbors = (t: number): number[] => {
    const i0 = mesh.indices[t * 3]!
    const i1 = mesh.indices[t * 3 + 1]!
    const i2 = mesh.indices[t * 3 + 2]!
    const out: number[] = []
    for (const [a, b] of [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ] as const) {
      for (const n of edgeMap.get(edgeKey(a, b)) ?? []) {
        if (n !== t) out.push(n)
      }
    }
    return out
  }

  for (let seed = 0; seed < triCount; seed++) {
    if (visited[seed]) continue
    const queue: number[] = [seed]
    const clusterTris: number[] = []
    const localVerts = new Map<number, number>()

    while (queue.length > 0 && clusterTris.length < GF_MESH_001_MAX_TRIS_PER_MESHLET) {
      const t = queue.shift()!
      if (visited[t]) continue

      const i0 = mesh.indices[t * 3]!
      const i1 = mesh.indices[t * 3 + 1]!
      const i2 = mesh.indices[t * 3 + 2]!
      const needed = [i0, i1, i2].filter((v) => !localVerts.has(v))
      if (localVerts.size + needed.length > GF_MESH_001_MAX_VERTS_PER_MESHLET) {
        continue
      }

      visited[t] = 1
      clusterTris.push(t)
      for (const v of [i0, i1, i2]) {
        if (!localVerts.has(v)) localVerts.set(v, localVerts.size)
      }
      for (const n of neighbors(t)) {
        if (!visited[n]) queue.push(n)
      }
    }

    if (clusterTris.length === 0) {
      visited[seed] = 1
      continue
    }

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity
    let nx = 0,
      ny = 0,
      nz = 0
    const indexOffset = packed.length

    for (const t of clusterTris) {
      const i0 = mesh.indices[t * 3]!
      const i1 = mesh.indices[t * 3 + 1]!
      const i2 = mesh.indices[t * 3 + 2]!
      packed.push(localVerts.get(i0)!, localVerts.get(i1)!, localVerts.get(i2)!)
      const n = triNormal(mesh.positions, i0, i1, i2)
      nx += n[0]
      ny += n[1]
      nz += n[2]
      for (const vi of [i0, i1, i2]) {
        const x = mesh.positions[vi * 3]!
        const y = mesh.positions[vi * 3 + 1]!
        const z = mesh.positions[vi * 3 + 2]!
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        minZ = Math.min(minZ, z)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
        maxZ = Math.max(maxZ, z)
      }
    }

    const cx = (minX + maxX) * 0.5
    const cy = (minY + maxY) * 0.5
    const cz = (minZ + maxZ) * 0.5
    const radius = Math.hypot(maxX - cx, maxY - cy, maxZ - cz)
    const clen = Math.hypot(nx, ny, nz) || 1

    clusters.push({
      meshletIndex: clusters.length,
      vertexOffset: 0,
      vertexCount: localVerts.size,
      indexOffset,
      indexCount: clusterTris.length * 3,
      center: [cx, cy, cz],
      radius,
      coneAxis: [nx / clen, ny / clen, nz / clen],
    })
  }

  const t1 = nowMs(opts?.now)
  return {
    meshletCount: clusters.length,
    clusters,
    packedIndices: new Uint32Array(packed),
    cookDurationMs: Math.max(0, t1 - t0),
  }
}

/**
 * Soft-raster golden visibility — coverage + depth hash (not meshlet-ID false-color).
 */
export function computeGoldenVisibilityHash(
  mesh: GfMesh001Mesh,
  opts?: {
    width?: number
    height?: number
    /** Camera look-at from +Z toward origin */
    now?: () => number
  }
): GfVisibilityEvidence {
  const t0 = nowMs(opts?.now)
  const width = Math.max(16, Math.min(128, Math.floor(opts?.width ?? 64)))
  const height = Math.max(16, Math.min(128, Math.floor(opts?.height ?? 64)))
  const depth = new Float32Array(width * height)
  depth.fill(1)
  const coverage = new Uint8Array(width * height)

  // Orthographic project XY of unit cube → NDC, Z as depth.
  const project = (x: number, y: number, z: number) => {
    const px = (x + 0.6) / 1.2
    const py = (y + 0.6) / 1.2
    const pz = (z + 0.6) / 1.2
    return {
      sx: px * (width - 1),
      sy: (1 - py) * (height - 1),
      z: pz,
    }
  }

  const edge = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => (cx - ax) * (by - ay) - (cy - ay) * (bx - ax)

  for (let t = 0; t < mesh.triangleCount; t++) {
    const i0 = mesh.indices[t * 3]!
    const i1 = mesh.indices[t * 3 + 1]!
    const i2 = mesh.indices[t * 3 + 2]!
    const p0 = project(mesh.positions[i0 * 3]!, mesh.positions[i0 * 3 + 1]!, mesh.positions[i0 * 3 + 2]!)
    const p1 = project(mesh.positions[i1 * 3]!, mesh.positions[i1 * 3 + 1]!, mesh.positions[i1 * 3 + 2]!)
    const p2 = project(mesh.positions[i2 * 3]!, mesh.positions[i2 * 3 + 1]!, mesh.positions[i2 * 3 + 2]!)

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
          if (z < depth[idx]!) {
            depth[idx] = z
            coverage[idx] = 1
          }
        }
      }
    }
  }

  let covered = 0
  for (let i = 0; i < coverage.length; i++) covered += coverage[i]!

  // Pack coverage + quantized depth into hash payload (no meshlet ID colors).
  const packed = new Uint8Array(width * height * 2)
  for (let i = 0; i < width * height; i++) {
    packed[i * 2] = coverage[i]!
    packed[i * 2 + 1] = Math.min(255, Math.max(0, Math.floor(depth[i]! * 255)))
  }

  const goldenVisibilityHash = sha256Hex([
    GF_MESH_001_FIXTURE_ID,
    'visibility-v1',
    String(width),
    String(height),
    String(covered),
    packed,
  ])
  const t1 = nowMs(opts?.now)

  return {
    width,
    height,
    coveredPixels: covered,
    goldenVisibilityHash,
    evidenceFingerprint: goldenVisibilityHash.slice(0, 16),
    rasterDurationMs: Math.max(0, t1 - t0),
  }
}

/**
 * Full GF-MESH-001 evidence soak — load disk fixture (or explicit mesh), cook, golden visibility.
 */
export function runGfMesh001VisibilityEvidence(input?: {
  cwd?: string
  mesh?: GfMesh001Mesh
  /** When true, refuse OpenUSD product claim attempts. */
  claimsOpenUsdStage?: boolean
  proxyCapsule?: boolean
  expectSealedHash?: boolean
  now?: () => number
}): GfMesh001Result {
  if (input?.claimsOpenUsdStage === true) {
    return heldFail(
      'open_usd_claim_forbidden',
      'GF-MESH-001 refused — OpenUSD product stage claim forbidden (mesh fixture ≠ OpenUSD)',
    )
  }
  if (input?.proxyCapsule === true) {
    return heldFail('capsule_proxy_forbidden', 'GF-MESH-001 capsule/proxy character forbidden')
  }

  let mesh: GfMesh001Mesh
  let fixtureOnDisk = false
  let sealedHash: string | null = null

  if (input?.mesh) {
    mesh = input.mesh
    if (isCapsuleOrProxyCharacter({ name: mesh.name, fixtureId: mesh.fixtureId, triangleCount: mesh.triangleCount })) {
      return heldFail('capsule_proxy_forbidden', 'GF-MESH-001 capsule/proxy character forbidden')
    }
  } else {
    const loaded = loadGfMesh001FixtureFromDisk(input?.cwd)
    if (!('mesh' in loaded)) return loaded
    mesh = loaded.mesh
    fixtureOnDisk = true
    sealedHash = loaded.sealedHash
  }

  if (mesh.triangleCount <= 0 || mesh.vertexCount < 3) {
    return heldFail('empty_mesh', 'GF-MESH-001 empty mesh — no empty success')
  }

  const cook = cookGfMesh001Meshlets(mesh, { now: input?.now })
  if (cook.meshletCount <= 0 || cook.packedIndices.length < 3) {
    return heldFail('cook_empty', 'GF-MESH-001 meshlet cook produced empty clusters')
  }

  const visibility = computeGoldenVisibilityHash(mesh, { now: input?.now })
  if (visibility.coveredPixels <= 0 || !visibility.goldenVisibilityHash) {
    return heldFail('visibility_empty', 'GF-MESH-001 golden visibility empty — refuse success')
  }

  if (sealedHash && visibility.goldenVisibilityHash !== sealedHash) {
    return heldFail(
      'golden_hash_mismatch',
      'GF-MESH-001 sealed golden visibility hash mismatch (fixture drift)',
    )
  }
  if (input?.expectSealedHash && !sealedHash) {
    return heldFail('golden_hash_mismatch', 'GF-MESH-001 sealed golden hash required but missing on disk')
  }

  const evidenceFingerprint = sha256Hex([
    GF_MESH_001_LETTER,
    mesh.fixtureId,
    String(mesh.triangleCount),
    String(cook.meshletCount),
    visibility.goldenVisibilityHash,
  ]).slice(0, 16)

  const evidence: GfMesh001Evidence = {
    version: 1,
    letter: GF_MESH_001_LETTER,
    fixtureId: GF_MESH_001_FIXTURE_ID,
    fixtureOnDisk,
    vertexCount: mesh.vertexCount,
    triangleCount: mesh.triangleCount,
    meshletCount: cook.meshletCount,
    cook,
    visibility,
    evidenceFingerprint,
    naniteReady: NANITE_READY_FROM_GF_MESH,
    microPolyAaaReady: MICRO_POLY_AAA_FROM_GF_MESH,
    lumenReady: LUMEN_READY_FROM_GF_MESH,
    openUsdStageReady: OPEN_USD_STAGE_READY_FROM_GF_MESH,
    frameGraphLive: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: G3_BAND_30_TO_50_PASSED,
    marketingAllowed: false,
    success: true,
    claim: `GF-MESH-001 dogfood mesh + golden visibility hash sealed path — meshlets=${cook.meshletCount}; Nanite/Lumen/OpenUSD/product-present HELD; G.3% locked ${G3_CODE_DEPTH_PERCENT_LOCKED}; band 30→50 HELD`,
  }

  log.info('gf_mesh_001_evidence', {
    fixtureOnDisk,
    triangles: evidence.triangleCount,
    meshlets: evidence.meshletCount,
    covered: visibility.coveredPixels,
    fingerprint: evidenceFingerprint,
  })

  return { ok: true, evidence }
}

export function evaluateGfMesh001Readiness(cwd = process.cwd()): {
  ready: boolean
  status: 'PARTIAL' | 'HELD'
  letter: typeof GF_MESH_001_LETTER
  fixtureId: typeof GF_MESH_001_FIXTURE_ID
  evidenceFingerprint: string | null
  fixtureOnDisk: boolean
  meshletCount: number
  goldenVisibilityHash: string | null
  naniteReady: false
  openUsdStageReady: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band30To50Passed: false
  band30To50HeldReason: string
  reason: string
} {
  const result = runGfMesh001VisibilityEvidence({ cwd })
  if (!result.ok) {
    return {
      ready: false,
      status: 'HELD',
      letter: GF_MESH_001_LETTER,
      fixtureId: GF_MESH_001_FIXTURE_ID,
      evidenceFingerprint: null,
      fixtureOnDisk: false,
      meshletCount: 0,
      goldenVisibilityHash: null,
      naniteReady: false,
      openUsdStageReady: false,
      g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
      g3Band30To50Passed: false,
      band30To50HeldReason:
        '30→50 band HELD — GF-MESH-001 evidence failed; product meshlet cull + Hi-Z win + Micro-Poly scale still open',
      reason: result.message,
    }
  }

  return {
    ready: true,
    status: 'PARTIAL',
    letter: GF_MESH_001_LETTER,
    fixtureId: GF_MESH_001_FIXTURE_ID,
    evidenceFingerprint: result.evidence.evidenceFingerprint,
    fixtureOnDisk: result.evidence.fixtureOnDisk,
    meshletCount: result.evidence.meshletCount,
    goldenVisibilityHash: result.evidence.visibility.goldenVisibilityHash,
    naniteReady: false,
    openUsdStageReady: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: false,
    band30To50HeldReason:
      '30→50 band HELD — GF-MESH-001 fixture+golden hash PARTIAL; product present cook→cull→indirect + Hi-Z occlusion win + Micro-Poly ≥1080p still open; G.3% stays 15',
    reason: result.evidence.claim,
  }
}

/** Serialize dogfood mesh for writing fixtures/gf-mesh-001/manifest.json */
export function serializeGfMesh001Manifest(
  mesh: GfMesh001Mesh,
  sealedGoldenVisibilityHash?: string | null,
): DiskManifest {
  return {
    fixtureId: GF_MESH_001_FIXTURE_ID,
    name: mesh.name,
    version: mesh.version,
    vertexCount: mesh.vertexCount,
    triangleCount: mesh.triangleCount,
    positions: Array.from(mesh.positions),
    indices: Array.from(mesh.indices),
    notes:
      'Deterministic dogfood subdivided-box for GF-MESH-001 golden visibility — not Nanite product, not capsule, not OpenUSD',
    sealedGoldenVisibilityHash: sealedGoldenVisibilityHash ?? null,
  }
}
