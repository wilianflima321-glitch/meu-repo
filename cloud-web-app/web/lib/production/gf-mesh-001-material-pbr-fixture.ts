/**
 * GF-MESH-001 — golden material / PBR fingerprint (G.% ladder 30→50 prep).
 *
 * Seals real albedo/roughness/metalness/normal maps for the dogfood mesh.
 * Fail-closed when "materials" are meshlet-ID false-colors only.
 *
 * Does NOT bump G.3%, claim Nanite/Lumen, or flip product present.
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
  type GfMeshletCookResult,
} from '@/lib/production/gf-mesh-001-visibility-fixture'

const log = createComponentLogger('gf-mesh-001-material-pbr')

export const GF_MESH_001_PBR_LETTER = 'gf-mesh-pbr' as const
export const GF_MESH_001_PBR_FIXTURE_ID = 'GF-MESH-001-PBR' as const

export const NANITE_READY_FROM_PBR = false as const
export const LUMEN_READY_FROM_PBR = false as const
export const MICRO_POLY_AAA_FROM_PBR = false as const
export const G3_BAND_30_TO_50_FROM_PBR = false as const

const THEATER_RE =
  /^(mock|fake|todo|tbd|placeholder|pending|n\/a|none|null|undefined|invent|example|empty|id.?color|debug.?color)([:_-].*)?$/i

export type GfMeshPbrRejectCode =
  | 'empty_maps'
  | 'theater_payload'
  | 'id_color_only_forbidden'
  | 'missing_channels'
  | 'mesh_empty'
  | 'fingerprint_empty'

export type PbrMapBundle = {
  width: number
  height: number
  /** RGB albedo 0–255 */
  albedo: Uint8Array
  /** Single-channel roughness 0–255 */
  roughness: Uint8Array
  /** Single-channel metalness 0–255 */
  metalness: Uint8Array
  /** RGB tangent-space normal (128,128,255 neutral bias) */
  normal: Uint8Array
}

export type GfMeshPbrEvidence = {
  version: 1
  letter: typeof GF_MESH_001_PBR_LETTER
  fixtureId: typeof GF_MESH_001_PBR_FIXTURE_ID
  meshFixtureId: typeof GF_MESH_001_FIXTURE_ID
  width: number
  height: number
  meshletCount: number
  /** True only when maps carry real PBR variation (not ID colors). */
  realPbrMaps: true
  idColorOnly: false
  goldenPbrFingerprint: string
  evidenceFingerprint: string
  albedoEntropy: number
  roughnessEntropy: number
  naniteReady: false
  lumenReady: false
  microPolyAaaReady: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band30To50Passed: false
  marketingAllowed: false
  success: true
  claim: string
}

export type GfMeshPbrResult =
  | { ok: true; evidence: GfMeshPbrEvidence; maps: PbrMapBundle }
  | {
      ok: false
      code: GfMeshPbrRejectCode
      message: string
      success: false
      naniteReady: false
      lumenReady: false
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

function heldFail(code: GfMeshPbrRejectCode, message: string): GfMeshPbrResult {
  return {
    ok: false,
    code,
    message,
    success: false,
    naniteReady: false,
    lumenReady: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: false,
  }
}

/** Shannon-ish byte entropy proxy — ID-color strips are low-entropy / periodic. */
export function mapChannelEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0
  const hist = new Float64Array(256)
  for (let i = 0; i < bytes.length; i++) hist[bytes[i]!]! += 1
  let h = 0
  const n = bytes.length
  for (let i = 0; i < 256; i++) {
    const p = hist[i]! / n
    if (p > 0) h -= p * Math.log2(p)
  }
  return h
}

/**
 * Detect meshlet-ID false-color theater: albedo encodes discrete ID stripes
 * with near-zero roughness/metalness variation.
 */
export function isIdColorOnlyMaterial(maps: PbrMapBundle): boolean {
  const pix = maps.width * maps.height
  if (pix <= 0 || maps.albedo.length < pix * 3) return true

  // Sample unique RGB triples — ID colors use few discrete hues.
  const unique = new Set<string>()
  for (let i = 0; i < pix; i++) {
    const r = maps.albedo[i * 3]!
    const g = maps.albedo[i * 3 + 1]!
    const b = maps.albedo[i * 3 + 2]!
    // Quantize to reduce noise for real maps; ID colors stay few buckets.
    unique.add(`${r >> 4},${g >> 4},${b >> 4}`)
    if (unique.size > 48) break
  }

  const roughEntropy = mapChannelEntropy(maps.roughness)
  const metalEntropy = mapChannelEntropy(maps.metalness)
  const albedoEntropy = mapChannelEntropy(maps.albedo)

  // Classic ID-color: ≤16 quantized hues + flat roughness/metalness.
  if (unique.size <= 16 && roughEntropy < 0.35 && metalEntropy < 0.35) return true
  // Explicitly empty / constant albedo
  if (albedoEntropy < 0.15) return true
  return false
}

/**
 * Build deterministic PBR maps for GF-MESH-001 — triplanar-ish rock/metal blend.
 * Not meshlet-ID debug colors.
 */
export function buildGfMesh001PbrMaps(input?: {
  width?: number
  height?: number
  seed?: number
  /** When true, emit ID-color theater (for fail-closed tests only). */
  forceIdColorTheater?: boolean
  meshletCount?: number
}): PbrMapBundle {
  const width = Math.max(16, Math.min(128, Math.floor(input?.width ?? 64)))
  const height = Math.max(16, Math.min(128, Math.floor(input?.height ?? 64)))
  const seed = Number.isFinite(input?.seed) ? Math.floor(input!.seed!) : 0x0100_0b4
  const pix = width * height
  const albedo = new Uint8Array(pix * 3)
  const roughness = new Uint8Array(pix)
  const metalness = new Uint8Array(pix)
  const normal = new Uint8Array(pix * 3)

  if (input?.forceIdColorTheater) {
    const n = Math.max(1, input.meshletCount ?? 8)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x
        const id = (x + y) % n
        // Distinct per-ID false color — classic debug strip.
        albedo[i * 3] = (id * 37) & 0xff
        albedo[i * 3 + 1] = (id * 73) & 0xff
        albedo[i * 3 + 2] = (id * 19) & 0xff
        roughness[i] = 128
        metalness[i] = 0
        normal[i * 3] = 128
        normal[i * 3 + 1] = 128
        normal[i * 3 + 2] = 255
      }
    }
    return { width, height, albedo, roughness, metalness, normal }
  }

  // LCG — deterministic, not Math.random.
  let state = (seed >>> 0) || 1
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const u = x / (width - 1)
      const v = y / (height - 1)
      const n0 = (next() & 0xff) / 255
      const n1 = (next() & 0xff) / 255
      // Rock base + metal streak (real channel variation).
      const streak = Math.pow(Math.max(0, Math.sin((u * 7 + v * 3) * Math.PI) * 0.5 + 0.5), 2)
      const rockR = 92 + 40 * n0 + 30 * v
      const rockG = 78 + 28 * n1 + 20 * u
      const rockB = 64 + 22 * n0
      const metalR = 160 + 50 * n1
      const metalG = 168 + 40 * n0
      const metalB = 180 + 30 * n1
      albedo[i * 3] = Math.min(255, Math.floor(rockR * (1 - streak) + metalR * streak))
      albedo[i * 3 + 1] = Math.min(255, Math.floor(rockG * (1 - streak) + metalG * streak))
      albedo[i * 3 + 2] = Math.min(255, Math.floor(rockB * (1 - streak) + metalB * streak))
      roughness[i] = Math.min(255, Math.floor(210 * (1 - streak) + 45 * streak + 20 * n0))
      metalness[i] = Math.min(255, Math.floor(10 + 220 * streak + 15 * n1))
      // Perturbed normal from finite-difference noise
      const nx = 128 + Math.floor((n0 - 0.5) * 40)
      const ny = 128 + Math.floor((n1 - 0.5) * 40)
      normal[i * 3] = Math.max(0, Math.min(255, nx))
      normal[i * 3 + 1] = Math.max(0, Math.min(255, ny))
      normal[i * 3 + 2] = 255
    }
  }

  return { width, height, albedo, roughness, metalness, normal }
}

export function fingerprintGfMeshPbrMaps(maps: PbrMapBundle): string {
  return sha256Hex([
    GF_MESH_001_PBR_FIXTURE_ID,
    'pbr-v1',
    String(maps.width),
    String(maps.height),
    maps.albedo,
    maps.roughness,
    maps.metalness,
    maps.normal,
  ])
}

/**
 * Run golden PBR evidence for GF-MESH path — refuse ID-color-only materials.
 */
export function runGfMesh001PbrEvidence(input?: {
  cwd?: string
  mesh?: GfMesh001Mesh
  maps?: PbrMapBundle
  forceIdColorTheater?: boolean
  materialName?: string
  now?: () => number
}): GfMeshPbrResult {
  const t0 = nowMs(input?.now)
  if (input?.materialName && THEATER_RE.test(input.materialName.trim())) {
    return heldFail('theater_payload', 'GF-MESH PBR refused — theater material name')
  }

  let mesh: GfMesh001Mesh
  if (input?.mesh) {
    mesh = input.mesh
  } else {
    const loaded = loadGfMesh001FixtureFromDisk(input?.cwd)
    if (!('mesh' in loaded)) {
      // Fall back to in-memory dogfood if disk missing in exotic cwd.
      mesh = buildGfMesh001DogfoodMesh(4)
    } else {
      mesh = loaded.mesh
    }
  }

  if (mesh.triangleCount <= 0 || mesh.vertexCount < 3) {
    return heldFail('mesh_empty', 'GF-MESH PBR refused — empty mesh')
  }

  const cook: GfMeshletCookResult = cookGfMesh001Meshlets(mesh, { now: input?.now })
  const maps =
    input?.maps ??
    buildGfMesh001PbrMaps({
      width: 64,
      height: 64,
      seed: 0x0100_0b4,
      forceIdColorTheater: input?.forceIdColorTheater,
      meshletCount: cook.meshletCount,
    })

  if (
    maps.albedo.length === 0 ||
    maps.roughness.length === 0 ||
    maps.metalness.length === 0 ||
    maps.normal.length === 0
  ) {
    return heldFail('empty_maps', 'GF-MESH PBR refused — empty map buffers')
  }

  const pix = maps.width * maps.height
  if (
    maps.albedo.length < pix * 3 ||
    maps.roughness.length < pix ||
    maps.metalness.length < pix ||
    maps.normal.length < pix * 3
  ) {
    return heldFail('missing_channels', 'GF-MESH PBR refused — incomplete PBR channels')
  }

  if (isIdColorOnlyMaterial(maps)) {
    return heldFail(
      'id_color_only_forbidden',
      'GF-MESH PBR refused — meshlet ID-color-only "materials" are not golden PBR (ladder 30→50)',
    )
  }

  const goldenPbrFingerprint = fingerprintGfMeshPbrMaps(maps)
  if (!goldenPbrFingerprint || goldenPbrFingerprint.length < 16) {
    return heldFail('fingerprint_empty', 'GF-MESH PBR refused — empty fingerprint')
  }

  const albedoEntropy = mapChannelEntropy(maps.albedo)
  const roughnessEntropy = mapChannelEntropy(maps.roughness)
  const evidenceFingerprint = sha256Hex([
    GF_MESH_001_PBR_LETTER,
    goldenPbrFingerprint,
    String(cook.meshletCount),
  ]).slice(0, 16)

  void t0
  const evidence: GfMeshPbrEvidence = {
    version: 1,
    letter: GF_MESH_001_PBR_LETTER,
    fixtureId: GF_MESH_001_PBR_FIXTURE_ID,
    meshFixtureId: GF_MESH_001_FIXTURE_ID,
    width: maps.width,
    height: maps.height,
    meshletCount: cook.meshletCount,
    realPbrMaps: true,
    idColorOnly: false,
    goldenPbrFingerprint,
    evidenceFingerprint,
    albedoEntropy,
    roughnessEntropy,
    naniteReady: NANITE_READY_FROM_PBR,
    lumenReady: LUMEN_READY_FROM_PBR,
    microPolyAaaReady: MICRO_POLY_AAA_FROM_PBR,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: G3_BAND_30_TO_50_FROM_PBR,
    marketingAllowed: false,
    success: true,
    claim: `GF-MESH-001-PBR golden maps sealed (albedo/rough/metal/normal) — ID-color refused; Nanite/Lumen HELD; G.3% locked ${G3_CODE_DEPTH_PERCENT_LOCKED}; band 30→50 HELD`,
  }

  log.info('gf_mesh_pbr_evidence', {
    meshlets: cook.meshletCount,
    fingerprint: evidenceFingerprint,
    albedoEntropy: albedoEntropy.toFixed(2),
  })

  return { ok: true, evidence, maps }
}

export function evaluateGfMesh001PbrReadiness(cwd = process.cwd()): {
  ready: boolean
  status: 'PARTIAL' | 'HELD'
  letter: typeof GF_MESH_001_PBR_LETTER
  fixtureId: typeof GF_MESH_001_PBR_FIXTURE_ID
  evidenceFingerprint: string | null
  goldenPbrFingerprint: string | null
  idColorOnly: false
  naniteReady: false
  lumenReady: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band30To50Passed: false
  reason: string
} {
  const result = runGfMesh001PbrEvidence({ cwd })
  if (!result.ok) {
    return {
      ready: false,
      status: 'HELD',
      letter: GF_MESH_001_PBR_LETTER,
      fixtureId: GF_MESH_001_PBR_FIXTURE_ID,
      evidenceFingerprint: null,
      goldenPbrFingerprint: null,
      idColorOnly: false,
      naniteReady: false,
      lumenReady: false,
      g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
      g3Band30To50Passed: false,
      reason: result.message,
    }
  }
  return {
    ready: true,
    status: 'PARTIAL',
    letter: GF_MESH_001_PBR_LETTER,
    fixtureId: GF_MESH_001_PBR_FIXTURE_ID,
    evidenceFingerprint: result.evidence.evidenceFingerprint,
    goldenPbrFingerprint: result.evidence.goldenPbrFingerprint,
    idColorOnly: false,
    naniteReady: false,
    lumenReady: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band30To50Passed: false,
    reason: result.evidence.claim,
  }
}
