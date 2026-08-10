/**
 * Top-8 #5 — World Forge Maestro success barrier.
 *
 * Refuse success:true without terrain (heightfield) + PCG foliage evidence.
 * Fail-closed on FusionTx abort, LoRA-HELD empty world, bake-gate refuse, theater.
 * Does not resurrect J.12 OrchestratorProd; complements world-forge-maestro plan builder.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import type { HeightfieldDocument } from '@/lib/production/terrain-heightfield-math'
import type { FoliageDocument } from '@/lib/production/terrain-foliage-math'
import { evaluateBakedLightingPublishGate } from '@/lib/production/baked-lighting-publish-gate'

const log = createComponentLogger('world-forge-maestro-barrier')

export const WORLD_FORGE_MAESTRO_BARRIER_LETTER = 'wf-maestro-barrier' as const
export const WORLD_FORGE_MAESTRO_BARRIER_WIRED = true as const

/** Always false — math-PCG barrier ≠ Unreal World Partition / Nanite / LoRA clay. */
export const UNREAL_WORLD_PARTITION_CLAIM = false as const
export const NANITE_WORLD_CLAIM = false as const
export const LORA_CLAY_READY_CLAIM = false as const
export const NATIVE_ONNX_READY = false as const

export type WorldForgeBarrierRejectCode =
  | 'invalid_input'
  | 'missing_heightfield'
  | 'empty_heightfield'
  | 'missing_pcg_foliage'
  | 'empty_pcg_foliage'
  | 'fusion_aborted'
  | 'lora_held_empty_world'
  | 'bake_gate_refuse'
  | 'theater_payload'
  | 'claimed_success_without_evidence'

export type WorldForgeBarrierResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: WorldForgeBarrierRejectCode; message: string }

export interface WorldForgeArtifactEvidence {
  projectId: string
  heightfield?: HeightfieldDocument | null
  foliage?: FoliageDocument | null
  /** True when FusionTx aborted mid-stamp. */
  fusionAborted?: boolean
  /** LoRA path HELD and produced no math-PCG fallback artifacts. */
  loraHeldEmptyWorld?: boolean
  /**
   * When true, evaluate baked-lighting publish gate for web-static —
   * barrier refuses if gate would refuse publish.
   */
  checkBakeGate?: boolean
  bakeReceiptRef?: string | null
  lightmapBytes?: number | null
  /** CapScore Zero-UI path may allow empty foliage only with explicit flag. */
  zeroUiFallback?: boolean
  sceneId?: string
  now?: string
}

export interface WorldForgeMaestroSuccessVerdict {
  allowed: boolean
  fingerprint: string
  heightSampleCount: number
  heightVariance: number
  foliageInstanceCount: number
  unrealWorldPartitionClaim: false
  naniteWorldClaim: false
  loraClayReady: false
  nativeOnnxReady: false
  reasons: string[]
  letter: typeof WORLD_FORGE_MAESTRO_BARRIER_LETTER
}

const THEATER_IDS = new Set(['mock', 'empty', 'theater', 'placeholder', 'fake'])

function fingerprintParts(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}

function heightVariance(heights: Float32Array): number {
  if (heights.length === 0) return 0
  let sum = 0
  for (let i = 0; i < heights.length; i++) sum += heights[i]!
  const mean = sum / heights.length
  let acc = 0
  for (let i = 0; i < heights.length; i++) {
    const d = heights[i]! - mean
    acc += d * d
  }
  return acc / heights.length
}

/**
 * Evaluate whether World Forge may advertise mission success.
 * Never returns allowed=true without terrain + (PCG instances | Zero-UI carve-out).
 */
export function evaluateWorldForgeMaestroSuccessBarrier(
  input: WorldForgeArtifactEvidence & { claimedSuccess?: boolean },
): WorldForgeBarrierResult<WorldForgeMaestroSuccessVerdict> {
  if (!input.projectId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId required' }
  }

  const scene = (input.sceneId ?? '').trim().toLowerCase()
  if (scene && THEATER_IDS.has(scene)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: `Theater sceneId "${input.sceneId}" refused`,
    }
  }

  if (input.fusionAborted === true) {
    return {
      ok: false,
      code: 'fusion_aborted',
      message: 'FusionTx abort — World Forge success refused (Trava II)',
    }
  }

  if (input.loraHeldEmptyWorld === true) {
    return {
      ok: false,
      code: 'lora_held_empty_world',
      message: 'LoRA HELD path returned empty world — success refused; math-PCG artifacts required',
    }
  }

  if (input.checkBakeGate === true) {
    const bake = evaluateBakedLightingPublishGate({
      target: 'web-static',
      bakeReceiptRef: input.bakeReceiptRef ?? undefined,
      lightmapBytes: input.lightmapBytes ?? undefined,
    })
    if (!bake.allowed) {
      return {
        ok: false,
        code: 'bake_gate_refuse',
        message: `Bake gate would refuse publish — ${bake.reason}`,
      }
    }
  }

  const hf = input.heightfield
  if (!hf) {
    return {
      ok: false,
      code: 'missing_heightfield',
      message: 'Terrain heightfield evidence missing — World Forge success refused',
    }
  }

  const expected = hf.meta.resolution * hf.meta.resolution
  if (!hf.heights || hf.heights.length === 0 || hf.heights.length !== expected) {
    return {
      ok: false,
      code: 'empty_heightfield',
      message: 'Heightfield heights empty or resolution mismatch',
    }
  }

  const variance = heightVariance(hf.heights)
  // Flat all-zero with no strokes = theater empty world
  if (variance <= 0 && hf.meta.strokeCount <= 0) {
    // Allow tiny epsilon sculpt from SDF (variance > 0); pure zeros fail
    let anyNonZero = false
    for (let i = 0; i < hf.heights.length; i++) {
      if (hf.heights[i] !== 0) {
        anyNonZero = true
        break
      }
    }
    if (!anyNonZero) {
      return {
        ok: false,
        code: 'empty_heightfield',
        message: 'All-zero heightfield without strokes — empty world theater refused',
      }
    }
  }

  const foliage = input.foliage
  if (!foliage) {
    return {
      ok: false,
      code: 'missing_pcg_foliage',
      message: 'PCG foliage document missing — World Forge success refused',
    }
  }

  const instanceCount = foliage.instances?.length ?? 0
  if (instanceCount <= 0 && input.zeroUiFallback !== true) {
    return {
      ok: false,
      code: 'empty_pcg_foliage',
      message: 'PCG foliage instance count is 0 — success refused (set zeroUiFallback only for CapScore Zero-UI)',
    }
  }

  if (input.claimedSuccess === false) {
    return {
      ok: false,
      code: 'claimed_success_without_evidence',
      message: 'Caller already marked success:false',
    }
  }

  const fingerprint = fingerprintParts([
    WORLD_FORGE_MAESTRO_BARRIER_LETTER,
    input.projectId,
    `res:${hf.meta.resolution}`,
    `var:${variance.toFixed(6)}`,
    `foliage:${instanceCount}`,
    `strokes:${hf.meta.strokeCount}`,
    input.now ?? new Date().toISOString(),
  ])

  const verdict: WorldForgeMaestroSuccessVerdict = {
    allowed: true,
    fingerprint,
    heightSampleCount: hf.heights.length,
    heightVariance: variance,
    foliageInstanceCount: instanceCount,
    unrealWorldPartitionClaim: false,
    naniteWorldClaim: false,
    loraClayReady: false,
    nativeOnnxReady: false,
    reasons: [
      'Terrain heightfield evidence present',
      instanceCount > 0
        ? `PCG foliage instances=${instanceCount}`
        : 'Zero-UI foliage carve-out (CapScore)',
      'FusionTx not aborted',
      'LoRA empty-world theater refused',
      'Unreal World Partition / Nanite / LoRA clay claims HELD',
    ],
    letter: WORLD_FORGE_MAESTRO_BARRIER_LETTER,
  }

  log.info('world_forge_maestro_barrier_pass', {
    projectId: input.projectId,
    instanceCount,
    variance,
    fingerprint,
  })

  return { ok: true, value: verdict }
}

/**
 * Gate a conveyor/mission success flag — returns success:false + reason when barrier fails.
 */
export function gateWorldForgeMissionSuccess(input: {
  projectId: string
  proposedSuccess: boolean
  heightfield?: HeightfieldDocument | null
  foliage?: FoliageDocument | null
  fusionAborted?: boolean
  loraHeldEmptyWorld?: boolean
  zeroUiFallback?: boolean
  checkBakeGate?: boolean
  bakeReceiptRef?: string | null
  lightmapBytes?: number | null
  sceneId?: string
}): {
  success: boolean
  blockedReason?: string
  barrierCode?: WorldForgeBarrierRejectCode
  verdict?: WorldForgeMaestroSuccessVerdict
} {
  if (!input.proposedSuccess) {
    return { success: false, blockedReason: 'proposed_success_false' }
  }

  const barrier = evaluateWorldForgeMaestroSuccessBarrier({
    projectId: input.projectId,
    heightfield: input.heightfield,
    foliage: input.foliage,
    fusionAborted: input.fusionAborted,
    loraHeldEmptyWorld: input.loraHeldEmptyWorld,
    zeroUiFallback: input.zeroUiFallback,
    checkBakeGate: input.checkBakeGate,
    bakeReceiptRef: input.bakeReceiptRef,
    lightmapBytes: input.lightmapBytes,
    sceneId: input.sceneId,
    claimedSuccess: true,
  })

  if (!barrier.ok) {
    log.warn('world_forge_maestro_barrier_refuse', {
      projectId: input.projectId,
      code: barrier.code,
    })
    return {
      success: false,
      blockedReason: barrier.message,
      barrierCode: barrier.code,
    }
  }

  return { success: true, verdict: barrier.value }
}

export function probeWorldForgeMaestroBarrierReadiness(): {
  id: 'world-forge-maestro-barrier'
  status: 'PARTIAL'
  ready: boolean
  path: string
  unrealWorldPartitionClaim: false
  loraClayReady: false
  nativeOnnxReady: false
  note: string
} {
  const res = 8
  const heights = new Float32Array(res * res)
  for (let i = 0; i < heights.length; i++) heights[i] = (i % 3) * 0.1
  const hf: HeightfieldDocument = {
    meta: {
      resolution: res,
      widthMeters: 64,
      depthMeters: 64,
      maxHeight: 32,
      version: 1,
      updatedAt: '2026-08-10T12:00:00.000Z',
      strokeCount: 1,
    },
    heights,
  }
  const foliage: FoliageDocument = {
    meta: {
      version: 1,
      updatedAt: '2026-08-10T12:00:00.000Z',
      strokeCount: 1,
      types: [{ id: 't1', name: 'tree', category: 'tree', color: 'var(--aethel-accent)', minScale: 1, maxScale: 1 }],
    },
    instances: [{ id: 'i1', typeId: 't1', x: 0, y: 0, z: 0, rotY: 0, scale: 1 }],
  }
  const pass = evaluateWorldForgeMaestroSuccessBarrier({
    projectId: 'probe',
    heightfield: hf,
    foliage,
    claimedSuccess: true,
    now: '2026-08-10T12:00:00.000Z',
  })
  const empty = evaluateWorldForgeMaestroSuccessBarrier({
    projectId: 'probe',
    heightfield: null,
    foliage,
    claimedSuccess: true,
  })
  const ready = pass.ok && !empty.ok && NATIVE_ONNX_READY === false

  return {
    id: 'world-forge-maestro-barrier',
    status: 'PARTIAL',
    ready,
    path: 'lib/world-forge/world-forge-maestro-barrier.ts',
    unrealWorldPartitionClaim: false,
    loraClayReady: false,
    nativeOnnxReady: false,
    note:
      'World Forge success requires heightfield + PCG foliage evidence; Fusion abort / LoRA empty / bake refuse / theater fail-closed',
  }
}
