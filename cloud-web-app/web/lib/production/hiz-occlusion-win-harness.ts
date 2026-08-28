/**
 * Hi-Z occlusion win harness (G.% ladder 30→50 gate #4 prep) — round 2b.
 *
 * Measures draw reduction on REAL instanced dogfood meshlets:
 * frustum-only cull vs frustum + soft Hi-Z occlusion.
 *
 * This harness mirrors the Rust kernel byte-for-byte (doctrine #73 / Law XV):
 * - `Mat4::perspective` / `Mat4::look_at` / `Mat4::mul` from
 *   `gpu_micropoly_raster.rs` (column-major `cols[c][r]`, composite
 *   `view_proj = projection × view`).
 * - `CullingFrustum::extract_frustum_planes` Gribb–Hartmann plane extraction.
 * - WGSL `hiz_occluded` projection-mode 1 (gpu_culling.rs / gpu_meshlet_cull.rs):
 *     clip = view_proj · (center, 1)
 *     uv = (clip.xy / clip.w) * 0.5 + 0.5
 *     radius_ndc = max(max(|vp[0][0]|, |vp[1][1]|) * radius / clip.w, 0.001)
 *     True sphere near-depth recovered from the COMPOSITE matrix:
 *       a = -vp[2][2] / vp[2][3]
 *       b =  vp[3][2] + a * vp[3][3]
 *       t_near = clip.w - radius            (fail-open when ≤ 0)
 *       ndc_z_near = -a + b / t_near        (fail-open outside [-1, 1])
 *       obj_near = clamp(0.5 * ndc_z_near + 0.5, 0, 1)
 *     MAX-filter pyramid (gpu_hiz.rs DOWNSAMPLE_SHADER), mip by radius_px,
 *     `textureLoad`-exact coord; occluded iff obj_near > max_z + 0.002.
 * - Depth convention unified with the kernel: OpenGL NDC z ∈ [-1, 1], view
 *   down −z, depth = ndc_z * 0.5 + 0.5 (HIGHER = farther), closer-wins depth
 *   buffer, MAX downsample.
 *
 * The win is MEASURED on a deterministic scene of instanced dogfood cubes: a
 * wall of occluders is rasterized into a real depth target, then every other
 * instance is culled first frustum-only, then frustum + Hi-Z, with the SAME
 * camera. No synthetic clusters, no fabricated depth.
 *
 * Fail-closed on theater / invented wins / empty evidence.
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

/** OpenGL depth epsilon — mirrored from WGSL `obj_near > (max_z + 0.002)`. */
const HIZ_EPSILON = 0.002 as const

/** Kernel `Mat4::look_at` forward/up basis — camera 60° fov, near 0.1, far 12. */
const DOGFOOD_CAMERA = {
  eye: [0, 0, 2] as const,
  center: [0, 0, 0] as const,
  up: [0, 1, 0] as const,
  fovYRadians: Math.PI / 3,
  near: 0.1,
  far: 12,
  aspect: 1,
} as const

const THEATER_RE =
  /^(mock|fake|todo|tbd|placeholder|pending|n\/a|none|null|undefined|invent|example|empty|always.?win)([:_-].*)?$/i

export type HizWinRejectCode =
  | 'theater_payload'
  | 'empty_clusters'
  | 'empty_depth'
  | 'invented_win_forbidden'
  | 'identity_occlusion'
  | 'mesh_empty'

/**
 * Column-major 4×4 matrix — `m[c][r]`, matching the kernel `Mat4::cols`.
 * `clip = M · (p, 1)` with `M = projection × view` (composite).
 */
export type Mat4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
]

/** Camera driving cull + raster + Hi-Z — one authority (doctrine #73). */
export type OcclusionCamera = {
  viewProj: Mat4
  /** Mirrors `MicropolyCamera::projection_mode` — 1 = data-driven perspective. */
  projectionMode: 1
  fovYRadians: number
  near: number
  far: number
  aspect: number
}

export type SoftHizPyramid = {
  width: number
  height: number
  /** MAX-filter mip chain (gpu_hiz.rs DOWNSAMPLE_SHADER). */
  levels: Float32Array[]
  levelWidths: number[]
  levelHeights: number[]
}

export type CullPassResult = {
  mode: 'frustum_only' | 'frustum_hiz'
  drawn: number
  culled: number
  total: number
}

export type OcclusionSceneInstance = {
  position: [number, number, number]
  role: 'wall' | 'occludee' | 'visible'
}

export type HizOcclusionWinEvidence = {
  version: 2
  letter: typeof HIZ_OCCLUSION_WIN_LETTER
  fixtureId: typeof HIZ_OCCLUSION_WIN_FIXTURE_ID
  meshFixtureId: typeof GF_MESH_001_FIXTURE_ID
  camera: {
    eye: readonly [number, number, number]
    fovYRadians: number
    near: number
    far: number
    aspect: number
  }
  scene: {
    instances: number
    wallInstances: number
    occludeeInstances: number
    visibleInstances: number
  }
  rasterizedOccluderTriangles: number
  coveredPixels: number
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

// ---------------------------------------------------------------------------
// Matrix math — byte-for-byte mirror of gpu_micropoly_raster.rs Mat4.
// ---------------------------------------------------------------------------

function vec3Sub(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function vec3Cross(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function vec3Normalize(a: readonly number[]): [number, number, number] {
  const len = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / len, a[1] / len, a[2] / len]
}

function vec3Dot(a: readonly number[], b: readonly number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

/**
 * `Mat4::perspective(aspect, fov_y_radians, near, far)` — column-major.
 * col0=[f/aspect,0,0,0] col1=[0,f,0,0] col2=[0,0,(far+near)*range_inv,-1]
 * col3=[0,0,2*far*near*range_inv,0]; f=1/tan(fov/2), range_inv=1/(near-far).
 */
export function mat4Perspective(
  aspect: number,
  fovYRadians: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1 / Math.tan(fovYRadians / 2)
  const rangeInv = 1 / (near - far)
  return [
    [f / aspect, 0, 0, 0],
    [0, f, 0, 0],
    [0, 0, (far + near) * rangeInv, -1],
    [0, 0, 2 * far * near * rangeInv, 0],
  ]
}

/**
 * `Mat4::look_at(eye, center, up)` — column-major. f=norm(center−eye),
 * s=norm(cross(f,up)), u=cross(s,f).
 */
export function mat4LookAt(
  eye: readonly [number, number, number],
  center: readonly [number, number, number],
  up: readonly [number, number, number],
): Mat4 {
  const f = vec3Normalize(vec3Sub(center, eye))
  const s = vec3Normalize(vec3Cross(f, up))
  const u = vec3Cross(s, f)
  return [
    [s[0], u[0], -f[0], 0],
    [s[1], u[1], -f[1], 0],
    [s[2], u[2], -f[2], 0],
    [-vec3Dot(s, eye), -vec3Dot(u, eye), vec3Dot(f, eye), 1],
  ]
}

/** `Mat4::mul(a, b)`: out[c][r] = Σ_k a[k][r]·b[c][k] (applies b first). */
export function mat4Mul(a: Mat4, b: Mat4): Mat4 {
  const out: Mat4 = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c][r] =
        a[0][r]! * b[c][0]! +
        a[1][r]! * b[c][1]! +
        a[2][r]! * b[c][2]! +
        a[3][r]! * b[c][3]!
    }
  }
  return out
}

/** WGSL `project_to_clip`: clip = view_proj · (p, 1). */
export function mat4ProjectToClip(
  vp: Mat4,
  p: readonly number[],
): [number, number, number, number] {
  return [
    vp[0][0]! * p[0]! + vp[1][0]! * p[1]! + vp[2][0]! * p[2]! + vp[3][0]!,
    vp[0][1]! * p[0]! + vp[1][1]! * p[1]! + vp[2][1]! * p[2]! + vp[3][1]!,
    vp[0][2]! * p[0]! + vp[1][2]! * p[1]! + vp[2][2]! * p[2]! + vp[3][2]!,
    vp[0][3]! * p[0]! + vp[1][3]! * p[1]! + vp[2][3]! * p[2]! + vp[3][3]!,
  ]
}

/** Gribb–Hartmann plane extraction — mirror of `extract_frustum_planes`. */
export function extractFrustumPlanes(vp: Mat4): Array<[number, number, number, number]> {
  const row = (i: number): [number, number, number, number] => [
    vp[0][i]!,
    vp[1][i]!,
    vp[2][i]!,
    vp[3][i]!,
  ]
  const r3 = row(3)
  const add = (a: readonly number[], b: readonly number[]): [number, number, number, number] => [
    a[0] + b[0],
    a[1] + b[1],
    a[2] + b[2],
    a[3] + b[3],
  ]
  const sub = (a: readonly number[], b: readonly number[]): [number, number, number, number] => [
    a[0] - b[0],
    a[1] - b[1],
    a[2] - b[2],
    a[3] - b[3],
  ]
  const normalize = (p: readonly number[]): [number, number, number, number] => {
    const len = Math.hypot(p[0], p[1], p[2]) || 1
    return [p[0] / len, p[1] / len, p[2] / len, p[3] / len]
  }
  return [
    normalize(add(r3, row(0))), // left
    normalize(sub(r3, row(0))), // right
    normalize(add(r3, row(1))), // bottom
    normalize(sub(r3, row(1))), // top
    normalize(add(r3, row(2))), // near
    normalize(sub(r3, row(2))), // far
  ]
}

/** Mirror of `sphere_in_frustum_cpu`: inside iff every plane passes. */
export function sphereInFrustum(
  planes: Array<[number, number, number, number]>,
  center: readonly number[],
  radius: number,
): boolean {
  return planes.every(
    (p) => p[0] * center[0]! + p[1] * center[1]! + p[2] * center[2]! + p[3] >= -radius,
  )
}

/** Deterministic dogfood occlusion scene (camera at [0,0,2] looking −z). */
export function buildDogfoodOcclusionScene(): OcclusionSceneInstance[] {
  const instances: OcclusionSceneInstance[] = []
  // Wall occluder — 3×3 grid of unit cubes at z = -1.4 (covers [-1.1, 1.1]²).
  for (const x of [-0.6, 0, 0.6]) {
    for (const y of [-0.6, 0, 0.6]) {
      instances.push({ position: [x, y, -1.4], role: 'wall' })
    }
  }
  // Occludees — 3×3×2 grid behind the wall.
  for (const z of [-3.5, -4.1]) {
    for (const x of [-0.6, 0, 0.6]) {
      for (const y of [-0.6, 0, 0.6]) {
        instances.push({ position: [x, y, z], role: 'occludee' })
      }
    }
  }
  // Visible foreground — 4 cubes in front of the wall (stay drawn).
  for (const x of [-0.5, 0.5]) {
    for (const y of [-0.5, 0.5]) {
      instances.push({ position: [x, y, -0.4], role: 'visible' })
    }
  }
  return instances
}

/** Camera authority for the harness — composite view_proj like the kernel. */
export function buildOcclusionCamera(): OcclusionCamera {
  const view = mat4LookAt(
    [...DOGFOOD_CAMERA.eye],
    [...DOGFOOD_CAMERA.center],
    [...DOGFOOD_CAMERA.up],
  )
  const proj = mat4Perspective(
    DOGFOOD_CAMERA.aspect,
    DOGFOOD_CAMERA.fovYRadians,
    DOGFOOD_CAMERA.near,
    DOGFOOD_CAMERA.far,
  )
  return {
    viewProj: mat4Mul(proj, view),
    projectionMode: 1,
    fovYRadians: DOGFOOD_CAMERA.fovYRadians,
    near: DOGFOOD_CAMERA.near,
    far: DOGFOOD_CAMERA.far,
    aspect: DOGFOOD_CAMERA.aspect,
  }
}

/**
 * WGSL-exact sphere near-depth under the data-driven camera (mode 1).
 * Returns null on any fail-open condition (never treats such spheres occluded).
 */
function sphereNearDepth(
  vp: Mat4,
  center: readonly number[],
  radius: number,
  clipW: number,
): number | null {
  // a = -vp[2][2] / vp[2][3]; b = vp[3][2] + a * vp[3][3] (composite matrix).
  const a = -vp[2][2]! / vp[2][3]!
  const b = vp[3][2]! + a * vp[3][3]!
  const tNear = clipW - radius
  if (tNear <= 0) return null
  const ndcZNear = -a + b / tNear
  if (ndcZNear < -1 || ndcZNear > 1) return null
  return Math.min(1, Math.max(0, 0.5 * ndcZNear + 0.5))
}

/**
 * WGSL `hiz_occluded` (projection mode 1) mirror with an already-built pyramid:
 * projection → uv → radius_ndc → sphere near-depth → mip → textureLoad coord.
 */
export function hizOccludedFor(
  vp: Mat4,
  center: readonly number[],
  radius: number,
  pyramid: SoftHizPyramid,
): boolean {
  const clip = mat4ProjectToClip(vp, center)
  if (clip[3] <= 0) return false
  const rawX = clip[0] / clip[3]
  const rawY = clip[1] / clip[3]
  const uvX = rawX * 0.5 + 0.5
  const uvY = rawY * 0.5 + 0.5
  const sx = Math.abs(vp[0][0]!)
  const sy = Math.abs(vp[1][1]!)
  const radiusNdc = Math.max(Math.max(sx, sy) * radius / clip[3], 0.001)
  const objNear = sphereNearDepth(vp, center, radius, clip[3])
  if (objNear === null) return false
  if (uvX < 0 || uvX > 1 || uvY < 0 || uvY > 1) return false

  const radiusPx = radiusNdc * pyramid.width * 0.5
  let mip = 0
  if (radiusPx > 1) mip = Math.floor(Math.log2(radiusPx))
  mip = Math.min(Math.max(0, mip), pyramid.levels.length - 1)
  const lw = pyramid.levelWidths[mip]!
  const lh = pyramid.levelHeights[mip]!
  const x = Math.min(Math.max(0, Math.floor(uvX * lw)), lw - 1)
  const y = Math.min(Math.max(0, Math.floor(uvY * lh)), lh - 1)
  const maxZ = pyramid.levels[mip]![y * lw + x]!
  return objNear > maxZ + HIZ_EPSILON
}

/**
 * Rasterize the real depth target from the wall occluder instances through the
 * real perspective camera. OpenGL convention: depth = ndc_z*0.5+0.5 (higher =
 * farther), closer-wins depth test (smaller depth survives) — exactly the
 * kernel depth attachment consumed by `gpu_hiz.rs`.
 */
export function rasterizeOccluderDepth(
  mesh: GfMesh001Mesh,
  instances: OcclusionSceneInstance[],
  camera: OcclusionCamera,
  opts?: { width?: number; height?: number },
): { width: number; height: number; depth: Float32Array; rasterizedTriangles: number } {
  const width = Math.max(16, Math.min(128, Math.floor(opts?.width ?? 64)))
  const height = Math.max(16, Math.min(128, Math.floor(opts?.height ?? 64)))
  const depth = new Float32Array(width * height)
  depth.fill(1)
  const wallInstances = instances.filter((i) => i.role === 'wall')
  let rasterizedTriangles = 0

  const edge = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (cx - ax) * (by - ay) - (cy - ay) * (bx - ax)

  for (const inst of wallInstances) {
    const px = inst.position[0]
    const py = inst.position[1]
    const pz = inst.position[2]
    for (let t = 0; t < mesh.triangleCount; t++) {
      const i0 = mesh.indices[t * 3]!
      const i1 = mesh.indices[t * 3 + 1]!
      const i2 = mesh.indices[t * 3 + 2]!
      const w0: [number, number, number] = [
        mesh.positions[i0 * 3]! + px,
        mesh.positions[i0 * 3 + 1]! + py,
        mesh.positions[i0 * 3 + 2]! + pz,
      ]
      const w1: [number, number, number] = [
        mesh.positions[i1 * 3]! + px,
        mesh.positions[i1 * 3 + 1]! + py,
        mesh.positions[i1 * 3 + 2]! + pz,
      ]
      const w2: [number, number, number] = [
        mesh.positions[i2 * 3]! + px,
        mesh.positions[i2 * 3 + 1]! + py,
        mesh.positions[i2 * 3 + 2]! + pz,
      ]
      const c0 = mat4ProjectToClip(camera.viewProj, w0)
      const c1 = mat4ProjectToClip(camera.viewProj, w1)
      const c2 = mat4ProjectToClip(camera.viewProj, w2)
      // Skip triangles crossing/behind the near plane (the wall is fully inside).
      if (c0[3] <= 0 || c1[3] <= 0 || c2[3] <= 0) continue
      const n0 = [c0[0] / c0[3], c0[1] / c0[3], c0[2] / c0[3]]
      const n1 = [c1[0] / c1[3], c1[1] / c1[3], c1[2] / c1[3]]
      const n2 = [c2[0] / c2[3], c2[1] / c2[3], c2[2] / c2[3]]
      const s0 = [n0[0] * 0.5 + 0.5, 1 - (n0[1] * 0.5 + 0.5)]
      const s1 = [n1[0] * 0.5 + 0.5, 1 - (n1[1] * 0.5 + 0.5)]
      const s2 = [n2[0] * 0.5 + 0.5, 1 - (n2[1] * 0.5 + 0.5)]
      const d0 = n0[2] * 0.5 + 0.5
      const d1 = n1[2] * 0.5 + 0.5
      const d2 = n2[2] * 0.5 + 0.5
      const minX = Math.max(0, Math.floor(Math.min(s0[0], s1[0], s2[0]) * (width - 1)))
      const maxX = Math.min(width - 1, Math.ceil(Math.max(s0[0], s1[0], s2[0]) * (width - 1)))
      const minY = Math.max(0, Math.floor(Math.min(s0[1], s1[1], s2[1]) * (height - 1)))
      const maxY = Math.min(height - 1, Math.ceil(Math.max(s0[1], s1[1], s2[1]) * (height - 1)))
      const area = edge(s0[0], s0[1], s1[0], s1[1], s2[0], s2[1])
      if (Math.abs(area) < 1e-8) continue
      for (let sy = minY; sy <= maxY; sy++) {
        for (let sx = minX; sx <= maxX; sx++) {
          const fx = (sx + 0.5) / width
          const fy = (sy + 0.5) / height
          const wA = edge(s1[0], s1[1], s2[0], s2[1], fx, fy)
          const wB = edge(s2[0], s2[1], s0[0], s0[1], fx, fy)
          const wC = edge(s0[0], s0[1], s1[0], s1[1], fx, fy)
          if (area > 0 ? wA >= 0 && wB >= 0 && wC >= 0 : wA <= 0 && wB <= 0 && wC <= 0) {
            const z = (wA * d0 + wB * d1 + wC * d2) / area
            const idx = sy * width + sx
            // Closer-wins depth test (smaller depth survives).
            if (z < depth[idx]!) depth[idx] = z
          }
        }
      }
      rasterizedTriangles++
    }
  }

  return { width, height, depth, rasterizedTriangles }
}

/** Build MAX-filter Hi-Z pyramid — mirror of gpu_hiz.rs DOWNSAMPLE_SHADER. */
export function buildSoftHizPyramid(
  depth: Float32Array,
  width: number,
  height: number,
): SoftHizPyramid {
  const levels: Float32Array[] = [depth.slice()]
  const levelWidths: number[] = [width]
  const levelHeights: number[] = [height]
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
    levelWidths.push(nw)
    levelHeights.push(nh)
    prev = next
    w = nw
    h = nh
  }
  return { width, height, levels, levelWidths, levelHeights }
}

/**
 * Cull world-space instanced meshlets — frustum only, or frustum + Hi-Z,
 * both through the SAME camera. `clusters` carry world-space centers/radii.
 */
export function cullMeshletsPass(
  clusters: GfMeshletCluster[],
  mode: 'frustum_only' | 'frustum_hiz',
  pyramid: SoftHizPyramid | null,
  camera: OcclusionCamera,
): CullPassResult {
  const planes = extractFrustumPlanes(camera.viewProj)
  let drawn = 0
  let culled = 0
  for (const c of clusters) {
    if (!sphereInFrustum(planes, c.center, c.radius)) {
      culled++
      continue
    }
    if (mode === 'frustum_hiz' && pyramid) {
      if (hizOccludedFor(camera.viewProj, c.center, c.radius, pyramid)) {
        culled++
        continue
      }
    }
    drawn++
  }
  return { mode, drawn, culled, total: clusters.length }
}

/** Instanced world-space clusters from the dogfood cook + a scene instance. */
function instancedClusters(
  cook: GfMeshletCookResult,
  instances: OcclusionSceneInstance[],
  roles: OcclusionSceneInstance['role'][],
): GfMeshletCluster[] {
  const out: GfMeshletCluster[] = []
  let meshletIndex = 0
  for (const inst of instances) {
    if (!roles.includes(inst.role)) continue
    for (const c of cook.clusters) {
      out.push({
        meshletIndex,
        vertexOffset: c.vertexOffset,
        vertexCount: c.vertexCount,
        indexOffset: c.indexOffset,
        indexCount: c.indexCount,
        center: [
          inst.position[0] + c.center[0],
          inst.position[1] + c.center[1],
          inst.position[2] + c.center[2],
        ],
        radius: c.radius,
        coneAxis: c.coneAxis,
      })
      meshletIndex++
    }
  }
  return out
}

/**
 * Measure Hi-Z occlusion win on real instanced GF-MESH-001 dogfood meshlets.
 */
export function runHizOcclusionWinEvidence(input?: {
  cwd?: string
  mesh?: GfMesh001Mesh
  width?: number
  height?: number
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

  const camera = buildOcclusionCamera()
  const scene = buildDogfoodOcclusionScene()
  const wallCount = scene.filter((i) => i.role === 'wall').length
  const occludeeCount = scene.filter((i) => i.role === 'occludee').length
  const visibleCount = scene.filter((i) => i.role === 'visible').length

  // Real occluder depth from the wall instances (no synthetic fill).
  const raster = rasterizeOccluderDepth(mesh, scene, camera, {
    width: input?.width ?? 64,
    height: input?.height ?? 64,
  })

  let covered = 0
  for (let i = 0; i < raster.depth.length; i++) if (raster.depth[i]! < 1) covered++
  if (covered <= 0) {
    return heldFail('empty_depth', 'Hi-Z win harness refused — empty occluder depth')
  }

  const pyramid = buildSoftHizPyramid(raster.depth, raster.width, raster.height)
  const candidates = instancedClusters(cook, scene, ['occludee', 'visible'])
  if (candidates.length === 0) {
    return heldFail('empty_clusters', 'Hi-Z win harness refused — empty candidate meshlets')
  }

  const frustumOnly = cullMeshletsPass(candidates, 'frustum_only', null, camera)
  const frustumHiz = cullMeshletsPass(candidates, 'frustum_hiz', pyramid, camera)

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
    raster.rasterizedTriangles,
    raster.width,
    raster.height,
    scene.length,
    DOGFOOD_CAMERA.fovYRadians.toFixed(6),
  ]).slice(0, 16)

  const evidence: HizOcclusionWinEvidence = {
    version: 2,
    letter: HIZ_OCCLUSION_WIN_LETTER,
    fixtureId: HIZ_OCCLUSION_WIN_FIXTURE_ID,
    meshFixtureId: GF_MESH_001_FIXTURE_ID,
    camera: {
      eye: DOGFOOD_CAMERA.eye,
      fovYRadians: DOGFOOD_CAMERA.fovYRadians,
      near: DOGFOOD_CAMERA.near,
      far: DOGFOOD_CAMERA.far,
      aspect: DOGFOOD_CAMERA.aspect,
    },
    scene: {
      instances: scene.length,
      wallInstances: wallCount,
      occludeeInstances: occludeeCount,
      visibleInstances: visibleCount,
    },
    rasterizedOccluderTriangles: raster.rasterizedTriangles,
    coveredPixels: covered,
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
      ? `Hi-Z occlusion win measured ${(occlusionWinRatio * 100).toFixed(1)}% (≥20% threshold) on ${occludeeCount} occluded + ${visibleCount} visible instanced dogfood cubes — harness PARTIAL; hiz_ready/Nanite/product still HELD; G.3% locked 15; band 30→50 HELD`
      : `Hi-Z occlusion win measured ${(occlusionWinRatio * 100).toFixed(1)}% (<20% band threshold) — evidence recorded; hiz_ready/Nanite HELD; G.3% locked 15; band 30→50 HELD`,
  }

  log.info('hiz_occlusion_win', {
    frustumDrawn: frustumOnly.drawn,
    hizDrawn: frustumHiz.drawn,
    win: occlusionWinRatio.toFixed(4),
    meetsBandThreshold,
    covered,
    rasterizedTriangles: raster.rasterizedTriangles,
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
