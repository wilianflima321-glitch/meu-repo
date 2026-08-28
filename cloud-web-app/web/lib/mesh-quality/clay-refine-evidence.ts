/**
 * Top-8 #4 — Clay→refine evidence fingerprints (bx→bw).
 *
 * Durable SHA-256 receipts when game-ready refine conveyor completes.
 * Fail-closed on empty mesh, critic REJECT, or theater/mock payloads.
 * Never claims Meshy/Tripo clay parity or Unreal mesh quality.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { countTriangles, type MeshQualityStageReceipt, type RawMeshBuffer } from '@/lib/mesh-quality/types'
import type { CreativeFidelityBand } from '@/lib/production/creative-quality-tier-binding'

const log = createComponentLogger('clay-refine-evidence')

export const CLAY_REFINE_EVIDENCE_LETTER = 'bx-bw-evidence' as const
export const CLAY_REFINE_EVIDENCE_WIRED = true as const

/** Always false — refine fingerprint ≠ commercial remesh / clay gen surpass. */
export const MESHY_TRIPO_CLAY_PARITY_CLAIM = false as const
export const UE_MESH_QUALITY_CLAIM = false as const
export const INSTANT_MESHES_PARITY_CLAIM = false as const

export type ClayRefineEvidenceRejectCode =
  | 'invalid_input'
  | 'empty_mesh'
  | 'critic_rejected'
  | 'theater_payload'
  | 'empty_evidence'
  | 'triangle_budget_violation'

export type ClayRefineEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ClayRefineEvidenceRejectCode; message: string }

export type ClayProviderHint = 'tripo' | 'meshy' | 'luma' | 'offline' | 'preparsed' | 'unknown'

export interface ClayRefineEvidenceInput {
  projectId: string
  providerId?: ClayProviderHint | string
  /** CapScore at cook time (Law XV). */
  capabilityScore?: number | null
  fidelityBand?: CreativeFidelityBand
  /** Target retopo / cook triangle budget. */
  triangleBudgetTarget?: number
  mesh?: RawMeshBuffer | null
  /** Topology critic must approve before seal. */
  criticApproved: boolean
  criticRejectReasons?: string[]
  stages?: MeshQualityStageReceipt[]
  /** Optional pack hash from AethelPack write. */
  packSha256?: string
  /** Theater ids (mock/empty/theater) always refuse. */
  sceneId?: string
  now?: string
}

export interface ClayRefineEvidenceReceipt {
  version: 1
  letter: typeof CLAY_REFINE_EVIDENCE_LETTER
  projectId: string
  providerId: string
  triangleCount: number
  triangleBudgetTarget: number | null
  capabilityScore: number | null
  fidelityBand: CreativeFidelityBand | null
  criticApproved: true
  stageCount: number
  meshFingerprint: string
  /** Durable evidence hash — publish/ledger receipt. */
  fingerprint: string
  createdAt: string
  meshyTripoClayParityClaim: false
  ueMeshQualityClaim: false
  instantMeshesParityClaim: false
  nativeOnnxReady: false
}

/** Shared across seal + live soak — a single source of truth for theater/mock refusal (Law XVI). */
export const THEATER_IDS = new Set(['mock', 'empty', 'theater', 'placeholder', 'fake'])

function fingerprintParts(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

function meshContentFingerprint(mesh: RawMeshBuffer): string {
  const tri = countTriangles(mesh)
  const posHead = mesh.positions.length > 0 ? mesh.positions.subarray(0, Math.min(24, mesh.positions.length)) : new Float32Array()
  const idxHead = mesh.indices.length > 0 ? mesh.indices.subarray(0, Math.min(24, mesh.indices.length)) : new Uint32Array()
  return fingerprintParts([
    `tri:${tri}`,
    `v:${Math.floor(mesh.positions.length / 3)}`,
    `p:${Array.from(posHead).map((n) => n.toFixed(5)).join(',')}`,
    `i:${Array.from(idxHead).join(',')}`,
  ])
}

/**
 * Seal durable clay→refine evidence after bw conveyor success path.
 * Callers must not advertise success without a sealed receipt.
 */
export function sealClayRefineEvidence(
  input: ClayRefineEvidenceInput,
): ClayRefineEvidenceResult<ClayRefineEvidenceReceipt> {
  if (!input.projectId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId required' }
  }

  const scene = (input.sceneId ?? '').trim().toLowerCase()
  if (scene && THEATER_IDS.has(scene)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: `Theater sceneId "${input.sceneId}" refused — Law XVI no empty/mock success`,
    }
  }

  if (input.criticApproved !== true) {
    return {
      ok: false,
      code: 'critic_rejected',
      message: `Topology critic REJECT — ${input.criticRejectReasons?.join(',') || 'not approved'}`,
    }
  }

  const mesh = input.mesh
  if (!mesh || mesh.positions.length < 9) {
    return { ok: false, code: 'empty_mesh', message: 'Empty mesh refused — no clay→refine fingerprint' }
  }

  const triangleCount = countTriangles(mesh)
  if (triangleCount <= 0) {
    return { ok: false, code: 'empty_mesh', message: 'Zero-triangle mesh refused' }
  }

  const budget =
    typeof input.triangleBudgetTarget === 'number' && Number.isFinite(input.triangleBudgetTarget)
      ? Math.max(1, Math.floor(input.triangleBudgetTarget))
      : null
  // Soft guard: refuse absurd overshoot theater (>20× budget) when budget set
  if (budget != null && triangleCount > budget * 20) {
    return {
      ok: false,
      code: 'triangle_budget_violation',
      message: `Triangle count ${triangleCount} exceeds 20× budget ${budget} — theater/unsanitized clay refused`,
    }
  }

  const meshFp = meshContentFingerprint(mesh)
  if (!meshFp || meshFp.length < 8) {
    return { ok: false, code: 'empty_evidence', message: 'Mesh fingerprint empty' }
  }

  const providerId = (input.providerId ?? 'unknown').trim() || 'unknown'
  const capabilityScore =
    typeof input.capabilityScore === 'number' && Number.isFinite(input.capabilityScore)
      ? Math.max(0, Math.min(100, Math.round(input.capabilityScore)))
      : null
  const stageCount = input.stages?.length ?? 0
  const createdAt = input.now ?? new Date().toISOString()

  const fingerprint = fingerprintParts([
    CLAY_REFINE_EVIDENCE_LETTER,
    input.projectId,
    providerId,
    `tri:${triangleCount}`,
    `budget:${budget ?? 'none'}`,
    `cap:${capabilityScore ?? 'none'}`,
    `band:${input.fidelityBand ?? 'none'}`,
    `critic:1`,
    `stages:${stageCount}`,
    meshFp,
    input.packSha256 ?? 'nopack',
    createdAt,
  ])

  if (!fingerprint || fingerprint.length < 8) {
    return { ok: false, code: 'empty_evidence', message: 'Evidence fingerprint empty' }
  }

  const receipt: ClayRefineEvidenceReceipt = {
    version: 1,
    letter: CLAY_REFINE_EVIDENCE_LETTER,
    projectId: input.projectId,
    providerId,
    triangleCount,
    triangleBudgetTarget: budget,
    capabilityScore,
    fidelityBand: input.fidelityBand ?? null,
    criticApproved: true,
    stageCount,
    meshFingerprint: meshFp,
    fingerprint,
    createdAt,
    meshyTripoClayParityClaim: false,
    ueMeshQualityClaim: false,
    instantMeshesParityClaim: false,
    nativeOnnxReady: false,
  }

  log.info('clay_refine_evidence_sealed', {
    projectId: input.projectId,
    providerId,
    triangleCount,
    fingerprint,
  })

  return { ok: true, value: receipt }
}

export function probeClayRefineEvidenceReadiness(): {
  id: 'clay-refine-evidence'
  status: 'PARTIAL'
  ready: boolean
  path: string
  meshyTripoClayParityClaim: false
  ueMeshQualityClaim: false
  nativeOnnxReady: false
  note: string
} {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1])
  const indices = new Uint32Array([0, 1, 2, 0, 2, 3])
  const ok = sealClayRefineEvidence({
    projectId: 'probe',
    providerId: 'preparsed',
    criticApproved: true,
    capabilityScore: 50,
    triangleBudgetTarget: 10_000,
    mesh: { positions, indices },
    stages: [{ stage: 'topology-critic', status: 'closed', evidence: ['probe'] }],
    now: '2026-08-10T12:00:00.000Z',
  })
  const empty = sealClayRefineEvidence({
    projectId: 'probe',
    criticApproved: true,
    mesh: { positions: new Float32Array(), indices: new Uint32Array() },
  })
  const theater = sealClayRefineEvidence({
    projectId: 'probe',
    criticApproved: true,
    sceneId: 'mock',
    mesh: { positions, indices },
  })
  const ready = ok.ok && !empty.ok && !theater.ok && MESHY_TRIPO_CLAY_PARITY_CLAIM === false

  return {
    id: 'clay-refine-evidence',
    status: 'PARTIAL',
    ready,
    path: 'lib/mesh-quality/clay-refine-evidence.ts',
    meshyTripoClayParityClaim: false,
    ueMeshQualityClaim: false,
    nativeOnnxReady: false,
    note:
      'Clay→refine fingerprints sealed on critic-pass mesh; empty/theater/critic-REJECT fail-closed; no Meshy/Tripo/UE claim',
  }
}
