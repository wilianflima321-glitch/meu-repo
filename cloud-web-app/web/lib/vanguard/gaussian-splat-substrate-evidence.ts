/**
 * Onda K — 3DGS / Gaussian splat substrate evidence (fail-closed AAA).
 *
 * Seals density→Marching Cubes extract via letter-ca splat-to-mesh.
 * Never claims Instant-NGP / commercial 3DGS viewer / Tripo parity.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  extractMeshFromSplats,
  POISSON_COMMERCIAL_PARITY_READY,
  SPLAT_TO_MESH_LETTER,
  SPLAT_TO_MESH_WIRED,
} from '@/lib/native-gen/splat-to-mesh'
import type { GaussianSplatCloud } from '@/lib/native-gen/types'

const log = createComponentLogger('gaussian-splat-substrate-evidence')

export const GAUSSIAN_SPLAT_AAA_READY = false as const
export const INSTANT_NGP_PARITY_READY = false as const
export const GAUSSIAN_SPLAT_MARKETING_ALLOWED = false as const
/** Spatial 3DGS live viewer in product viewport — HELD. */
export const SPLAT_VIEWPORT_PRODUCT_READY = false as const

export type SplatEvidenceRejectCode =
  | 'sparse_cloud'
  | 'extract_failed'
  | 'empty_mesh'
  | 'aaa_claim_held'
  | 'ngp_claim_held'

export type SplatEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: SplatEvidenceRejectCode; message: string }

export type GaussianSplatSubstrateEvidence = {
  version: 1
  letter: typeof SPLAT_TO_MESH_LETTER
  wired: typeof SPLAT_TO_MESH_WIRED
  splatCount: number
  triangleCount: number
  gridResolution: number
  splatToMeshReady: true
  fingerprint: string
  gaussianSplatAaaReady: false
  instantNgpParityReady: false
  poissonCommercialParityReady: false
  splatViewportProductReady: false
  marketingAllowed: false
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

/** Dense enough fixture cloud for MC extract (not production capture). */
export function buildGaussianSplatEvidenceCloud(count = 64): GaussianSplatCloud {
  const n = Math.max(16, Math.min(256, count))
  const positions = new Float32Array(n * 3)
  const opacities = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / n
    const a = t * Math.PI * 4
    positions[i * 3] = Math.cos(a) * (0.3 + 0.2 * Math.sin(t * 6))
    positions[i * 3 + 1] = (t - 0.5) * 0.8
    positions[i * 3 + 2] = Math.sin(a) * (0.3 + 0.2 * Math.cos(t * 5))
    opacities[i] = 0.7 + 0.3 * (i % 3) / 2
  }
  return { positions, opacities, splatCount: n }
}

export function runGaussianSplatSubstrateEvidenceSoak(input?: {
  cloud?: GaussianSplatCloud
  resolution?: number
}): SplatEvidenceResult<GaussianSplatSubstrateEvidence> {
  const cloud = input?.cloud ?? buildGaussianSplatEvidenceCloud()
  if (cloud.splatCount < 8) {
    return { ok: false, code: 'sparse_cloud', message: '3DGS evidence cloud too sparse' }
  }

  const extracted = extractMeshFromSplats({
    cloud,
    resolution: input?.resolution ?? 10,
    isoLevel: 0.12,
    method: 'marching-cubes',
  })

  if (!extracted.splatToMeshReady) {
    return {
      ok: false,
      code: 'extract_failed',
      message: extracted.receipt.heldReason ?? 'Splat→mesh extract failed for evidence soak',
    }
  }

  if (extracted.triangleCount <= 0 || extracted.mesh.indices.length < 3) {
    return { ok: false, code: 'empty_mesh', message: 'Splat→mesh produced empty triangle buffer' }
  }

  const fp = fingerprint([
    'onda-k-3dgs',
    SPLAT_TO_MESH_LETTER,
    String(extracted.splatCount),
    String(extracted.triangleCount),
    String(extracted.gridResolution),
    String(extracted.mesh.positions.length),
    String(extracted.mesh.indices[0] ?? 0),
  ])

  const evidence: GaussianSplatSubstrateEvidence = {
    version: 1,
    letter: SPLAT_TO_MESH_LETTER,
    wired: SPLAT_TO_MESH_WIRED,
    splatCount: extracted.splatCount,
    triangleCount: extracted.triangleCount,
    gridResolution: extracted.gridResolution,
    splatToMeshReady: true,
    fingerprint: fp,
    gaussianSplatAaaReady: false,
    instantNgpParityReady: false,
    poissonCommercialParityReady: POISSON_COMMERCIAL_PARITY_READY,
    splatViewportProductReady: false,
    marketingAllowed: false,
  }

  log.info('gaussian_splat_substrate_evidence_sealed', {
    fingerprint: fp,
    splats: evidence.splatCount,
    tris: evidence.triangleCount,
    aaa: false,
  })

  return { ok: true, value: evidence }
}

export function claimGaussianSplatAaa(): SplatEvidenceResult<never> {
  return {
    ok: false,
    code: 'aaa_claim_held',
    message: 'GAUSSIAN_SPLAT_AAA_READY=false — MC density extract ≠ commercial 3DGS AAA',
  }
}

export function claimInstantNgpParity(): SplatEvidenceResult<never> {
  return {
    ok: false,
    code: 'ngp_claim_held',
    message: 'INSTANT_NGP_PARITY_READY=false — no Instant-NGP / live splat viewer parity claim',
  }
}

export function probeGaussianSplatSubstrateReadiness(): {
  id: 'onda-k-3dgs-splat'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  gaussianSplatAaaReady: false
  marketingAllowed: false
  path: string
  note: string
} {
  const soak = runGaussianSplatSubstrateEvidenceSoak()
  const sparse = runGaussianSplatSubstrateEvidenceSoak({
    cloud: { positions: new Float32Array(6), splatCount: 2 },
  })
  const aaa = claimGaussianSplatAaa()
  const ngp = claimInstantNgpParity()

  const ready =
    soak.ok &&
    soak.value.fingerprint.length >= 8 &&
    soak.value.triangleCount > 0 &&
    soak.value.gaussianSplatAaaReady === false &&
    !sparse.ok &&
    !aaa.ok &&
    !ngp.ok &&
    GAUSSIAN_SPLAT_AAA_READY === false &&
    INSTANT_NGP_PARITY_READY === false &&
    GAUSSIAN_SPLAT_MARKETING_ALLOWED === false &&
    SPLAT_VIEWPORT_PRODUCT_READY === false

  return {
    id: 'onda-k-3dgs-splat',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    gaussianSplatAaaReady: false,
    marketingAllowed: false,
    path: 'lib/vanguard/gaussian-splat-substrate-evidence.ts',
    note: ready
      ? '3DGS splat→MC mesh substrate PARTIAL; Instant-NGP / splat AAA / product viewport HELD.'
      : 'Gaussian splat substrate probe failed.',
  }
}
