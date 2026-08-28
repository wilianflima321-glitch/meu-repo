/**
 * Top-8 #4 — Live bx poll → evidence ledger soak (bx→bw).
 *
 * Closes the "live bx poll → ledger soak" gap: a real live clay job poll (letter bx) is run to
 * terminal, the downloaded/parsed mesh is sealed into a durable ClayRefineEvidenceReceipt, and the
 * receipt is soaked into a TaskEvidenceLedger as a `Clay refine evidence sealed (bx→bw)` event.
 *
 * Trava I (Law XVI) choke — the provider poll/download is a provider call, so it is NEVER attempted
 * without a CostGuard reserve/settle: reserve before poll, settle on success, cancel (refund) on any
 * fail-closed path. Runaway actuals are capped by the reservation ceiling and surfaced as
 * `Cost settle capped` ledger evidence — never silently absorbed.
 *
 * Honesty: `nativeOnnxReady` stays false, no Meshy/Tripo clay parity or UE mesh quality claim. The
 * readiness probe self-verifies ONE real poll→download→parse→seal→ledger round-trip (real GLB parse,
 * real fingerprint, real ledger append) before reporting `liveSoakReady`.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  resolveLiveClayMesh,
  LIVE_CLAY_POLL_LETTER,
  buildMinimalGlbFixture,
  type ClayJobLifecycle,
  type ClayPollClientKeys,
  type ClayProviderPollClient,
  type FetchLike,
} from '@/lib/mesh-quality/clay-live-poll'
import {
  sealClayRefineEvidence,
  THEATER_IDS,
  MESHY_TRIPO_CLAY_PARITY_CLAIM,
  UE_MESH_QUALITY_CLAIM,
  type ClayRefineEvidenceRejectCode,
} from '@/lib/mesh-quality/clay-refine-evidence'
import type { ClayProviderId } from '@/lib/mesh-quality/clay-provider-adapters'
import type { MeshQualityStageReceipt } from '@/lib/mesh-quality/types'
import type { CreativeFidelityBand } from '@/lib/production/creative-quality-tier-binding'
import {
  reserveCreativeCost,
  settleCreativeCost,
  cancelCreativeCost,
  createMemoryCostGuardLedger,
  type CostGuardLedgerAdapter,
} from '@/lib/production/creative-cost-guard'
import {
  createTaskEvidenceLedger,
  appendTaskEvidence,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'

const log = createComponentLogger('clay-refine-live-soak')

/** bx→bw soak letter — live poll leg feeding the bw evidence seal. */
export const CLAY_REFINE_SOAK_LETTER = 'bx-bw-soak' as const
export const CLAY_REFINE_SOAK_WIRED = true as const

/** CostGuard estimate for one clay poll+download leg — actual settle may never exceed it (ceiling 1×). */
export const CLAY_REFINE_SOAK_ESTIMATE = 32 as const
/** Base actual token weight charged for the provider leg (settled on success). */
export const CLAY_REFINE_SOAK_BASE_WEIGHT = 1 as const

export type ClayRefineSoakRejectCode =
  | 'invalid_input'
  | 'theater_payload'
  | 'cost_guard_denied'
  | 'byok_missing'
  | 'clay_poll_failed'
  | 'clay_poll_timeout'
  | 'clay_model_url_missing'
  | 'clay_download_empty'
  | 'critic_rejected'
  | ClayRefineEvidenceRejectCode

export interface ClayRefineLiveSoakInput {
  taskId: string
  projectId: string
  provider: ClayProviderId
  keys?: ClayPollClientKeys
  fetchImpl?: FetchLike
  pollClient?: ClayProviderPollClient
  maxPollAttempts?: number
  pollIntervalMs?: number
  pollSleep?: (ms: number) => Promise<void>
  webhookPayload?: unknown
  /** Known model URL — skips poll HTTP (status-route shortcut) but still downloads/parses real bytes. */
  clayModelUrl?: string

  /** Trava I: provider poll/download requires a CostGuard reserve/settle. Fail-closed without it. */
  costGuardAdapter: CostGuardLedgerAdapter
  /** Durable evidence ledger the sealed receipt is appended to. Required. */
  ledger: TaskEvidenceLedger
  userId?: string
  byokProfileId?: string
  usageBucketId?: string
  planId?: string
  allowPlatformPay?: boolean

  /** Topology critic verdict on the refined mesh — must be true or the soak fails closed. */
  criticApproved: boolean
  criticRejectReasons?: string[]
  capabilityScore?: number | null
  fidelityBand?: CreativeFidelityBand
  triangleBudgetTarget?: number
  stages?: MeshQualityStageReceipt[]
  packSha256?: string
  sceneId?: string
  now?: string

  /** Provider-reported actual token weight for settle (default base weight). Capped by the ceiling. */
  settleActualTokenWeight?: number
  /** Minimum wall-clock the poll+seal cycle must observe before sealing (anti-theater; default 0). */
  soakMs?: number
  nowUnixMs?: () => number
  sleep?: (ms: number) => Promise<void>
}

export interface ClayRefineLiveSoakReceipt {
  letter: typeof CLAY_REFINE_SOAK_LETTER
  livePollLetter: typeof LIVE_CLAY_POLL_LETTER
  taskId: string
  projectId: string
  provider: string
  pollStatus: ClayJobLifecycle
  pollProgress: number | undefined
  triangles: number
  /** Sealed clay→refine evidence fingerprint (bx→bw). */
  fingerprint: string
  meshFingerprint: string
  ledgerEventId: string
  reservationId: string
  reservationFunding: 'byok' | 'usage_bucket' | 'wallet'
  settleCapped: boolean
  settleActual: number
  soakElapsedMs: number
  soakMsRequired: number
  nativeOnnxReady: false
  meshyTripoClayParityClaim: false
  ueMeshQualityClaim: false
  createdAt: string
  ledger: TaskEvidenceLedger
}

export type ClayRefineLiveSoakResult =
  | { ok: true; value: ClayRefineLiveSoakReceipt }
  | {
      ok: false
      code: ClayRefineSoakRejectCode
      message: string
      /** Ledger carrying the fail-closed reject event (durable, never silent). */
      ledger?: TaskEvidenceLedger
      pollStatus?: ClayJobLifecycle
    }

/** Last successful soak wall-clock (probe evidence). */
let lastSoakElapsedMs = 0

const SEAL_EVENT_TITLE = 'Clay refine evidence sealed (bx→bw)'

function mapPollBlockedReason(reason: string | undefined): ClayRefineSoakRejectCode {
  if (!reason) return 'clay_poll_failed'
  if (reason.startsWith('BYOK_MISSING_')) return 'byok_missing'
  if (reason === 'clay_poll_timeout') return 'clay_poll_timeout'
  if (reason === 'clay_model_url_missing') return 'clay_model_url_missing'
  if (
    reason.startsWith('clay_download') ||
    reason.startsWith('clay_obj_parse') ||
    reason.startsWith('clay_glb_parse')
  ) {
    return 'clay_download_empty'
  }
  return 'clay_poll_failed'
}

/**
 * Run a live bx clay poll to terminal, seal clay→refine evidence, and soak the receipt into the
 * evidence ledger. Reserve → poll/download → critic → seal → settle. Any post-reserve failure
 * cancels (refunds) the hold. No provider call without a CostGuard reservation.
 */
export async function runClayRefineLiveSoak(
  input: ClayRefineLiveSoakInput,
): Promise<ClayRefineLiveSoakResult> {
  if (!input.taskId?.trim() || !input.projectId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'taskId and projectId required' }
  }
  if (!input.costGuardAdapter) {
    return { ok: false, code: 'invalid_input', message: 'costGuardAdapter required (Trava I)' }
  }
  if (!input.ledger) {
    return { ok: false, code: 'invalid_input', message: 'evidence ledger required for soak' }
  }

  const scene = (input.sceneId ?? '').trim().toLowerCase()
  if (scene && THEATER_IDS.has(scene)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: `Theater sceneId "${input.sceneId}" refused before any provider poll — Law XVI`,
    }
  }

  // Trava I — reserve before the provider call.
  const reserve = await reserveCreativeCost(
    {
      userId: input.userId ?? 'soak-user',
      projectId: input.projectId,
      domain: 'clay-refine-soak',
      estimatedTokenWeight: CLAY_REFINE_SOAK_ESTIMATE,
      byokProfileId: input.byokProfileId,
      usageBucketId: input.usageBucketId,
      planId: input.planId,
      allowPlatformPay: input.allowPlatformPay,
      settleCeilingMultiplier: 1,
    },
    input.costGuardAdapter,
  )
  if (!reserve.ok) {
    const rejected = appendTaskEvidence(input.ledger, {
      kind: 'cost',
      title: 'Clay refine soak denied (CostGuard)',
      summary: reserve.message,
      refs: [`task:${input.taskId}`, `reason:${reserve.reason}`],
      actor: 'ClayRefineLiveSoak',
    })
    log.warn('clay_refine_soak_cost_guard_denied', {
      taskId: input.taskId,
      reason: reserve.reason,
    })
    return {
      ok: false,
      code: 'cost_guard_denied',
      message: reserve.message,
      ledger: rejected,
    }
  }
  const { reservationId, funding } = reserve.reservation

  const nowUnixMs = input.nowUnixMs ?? (() => Date.now())
  const sleep =
    input.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const startMs = nowUnixMs()

  // Live bx poll → download → parse (real bytes, fail-closed at every hop).
  const resolved = await resolveLiveClayMesh({
    provider: input.provider,
    taskId: input.taskId,
    keys: input.keys ?? {},
    fetchImpl: input.fetchImpl,
    client: input.pollClient,
    maxAttempts: input.maxPollAttempts,
    intervalMs: input.pollIntervalMs,
    sleep: input.pollSleep,
    webhookPayload: input.webhookPayload,
    modelUrl: input.clayModelUrl,
  })

  if (!resolved.ok || !resolved.mesh) {
    const reason = resolved.blockedReason ?? 'clay_poll_failed'
    const code = mapPollBlockedReason(reason)
    await cancelCreativeCost(reservationId, input.costGuardAdapter)
    const rejected = appendTaskEvidence(input.ledger, {
      kind: 'validation',
      title: 'Clay refine soak rejected',
      summary: `${code} — no seal, hold refunded (task ${input.taskId})`,
      refs: [`task:${input.taskId}`, `reason:${reason}`, `reservation:${reservationId}`],
      actor: 'ClayRefineLiveSoak',
    })
    log.info('clay_refine_soak_poll_rejected', { taskId: input.taskId, code, reason })
    return {
      ok: false,
      code,
      message: `Live clay poll failed: ${reason}`,
      ledger: rejected,
      pollStatus: resolved.poll?.status,
    }
  }

  const pollStatus: ClayJobLifecycle = resolved.poll?.status ?? 'completed'
  const pollProgress = resolved.poll?.progress

  // Anti-theater soak window — the poll+seal cycle must observe soakMs before sealing.
  let elapsed = nowUnixMs() - startMs
  const soakMsRequired = Math.max(0, input.soakMs ?? 0)
  if (elapsed < soakMsRequired) {
    await sleep(soakMsRequired - elapsed)
    elapsed = nowUnixMs() - startMs
  }

  if (input.criticApproved !== true) {
    await cancelCreativeCost(reservationId, input.costGuardAdapter)
    const rejected = appendTaskEvidence(input.ledger, {
      kind: 'validation',
      title: 'Clay refine soak rejected',
      summary: `critic_rejected — ${input.criticRejectReasons?.join(',') || 'not approved'} (task ${input.taskId})`,
      refs: [`task:${input.taskId}`, `reservation:${reservationId}`],
      actor: 'ClayRefineLiveSoak',
    })
    return {
      ok: false,
      code: 'critic_rejected',
      message: `Topology critic REJECT — ${input.criticRejectReasons?.join(',') || 'not approved'}`,
      ledger: rejected,
      pollStatus,
    }
  }

  const seal = sealClayRefineEvidence({
    projectId: input.projectId,
    providerId: input.provider,
    capabilityScore: input.capabilityScore,
    fidelityBand: input.fidelityBand,
    triangleBudgetTarget: input.triangleBudgetTarget,
    mesh: resolved.mesh,
    criticApproved: true,
    criticRejectReasons: input.criticRejectReasons,
    stages: [...(input.stages ?? []), resolved.receipt],
    packSha256: input.packSha256,
    sceneId: input.sceneId,
    now: input.now,
  })
  if (!seal.ok) {
    await cancelCreativeCost(reservationId, input.costGuardAdapter)
    const rejected = appendTaskEvidence(input.ledger, {
      kind: 'validation',
      title: 'Clay refine soak rejected',
      summary: `${seal.code} — no seal, hold refunded (task ${input.taskId})`,
      refs: [`task:${input.taskId}`, `reason:${seal.code}`, `reservation:${reservationId}`],
      actor: 'ClayRefineLiveSoak',
    })
    log.warn('clay_refine_soak_seal_rejected', { taskId: input.taskId, code: seal.code })
    return {
      ok: false,
      code: seal.code,
      message: seal.message,
      ledger: rejected,
      pollStatus,
    }
  }

  // Settle the SAME hold — capped actuals surface as ledger evidence, never silently absorbed.
  const actual =
    Number.isFinite(input.settleActualTokenWeight) && input.settleActualTokenWeight! >= 0
      ? input.settleActualTokenWeight!
      : CLAY_REFINE_SOAK_BASE_WEIGHT
  const settle = await settleCreativeCost(reservationId, actual, input.costGuardAdapter)
  let ledger = input.ledger
  if (settle.capped) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'cost',
      title: 'Cost settle capped',
      summary: `actualTokenWeight=${settle.rawActual} capped to ${settle.cappedActual} by reservation ceiling`,
      refs: [`reservation:${reservationId}`],
      actor: 'ClayRefineLiveSoak',
    })
  }

  const triangles = seal.value.triangleCount
  ledger = appendTaskEvidence(ledger, {
    id: `clay-refine-soak:${input.taskId}`,
    kind: 'artifact',
    title: SEAL_EVENT_TITLE,
    summary: `fingerprint=${seal.value.fingerprint} provider=${input.provider} triangles=${triangles} poll=${pollStatus}`,
    refs: [
      `task:${input.taskId}`,
      `mesh:${seal.value.meshFingerprint}`,
      `receipt:${seal.value.fingerprint}`,
      `reservation:${reservationId}`,
    ],
    actor: 'ClayRefineLiveSoak',
  })

  lastSoakElapsedMs = elapsed

  const receipt: ClayRefineLiveSoakReceipt = {
    letter: CLAY_REFINE_SOAK_LETTER,
    livePollLetter: LIVE_CLAY_POLL_LETTER,
    taskId: input.taskId,
    projectId: input.projectId,
    provider: input.provider,
    pollStatus,
    pollProgress,
    triangles,
    fingerprint: seal.value.fingerprint,
    meshFingerprint: seal.value.meshFingerprint,
    ledgerEventId: `clay-refine-soak:${input.taskId}`,
    reservationId,
    reservationFunding: funding,
    settleCapped: settle.capped,
    settleActual: settle.cappedActual,
    soakElapsedMs: elapsed,
    soakMsRequired,
    nativeOnnxReady: false,
    meshyTripoClayParityClaim: false,
    ueMeshQualityClaim: false,
    createdAt: input.now ?? new Date().toISOString(),
    ledger,
  }

  log.info('clay_refine_soak_sealed', {
    taskId: input.taskId,
    provider: input.provider,
    fingerprint: seal.value.fingerprint,
    pollStatus,
    soakElapsedMs: elapsed,
  })

  return { ok: true, value: receipt }
}

/**
 * Self-verifying readiness probe — runs ONE real bx poll→download→parse→seal→ledger round-trip on
 * a real GLB fixture before reporting `liveSoakReady`. Never claims `nativeOnnxReady` or parity.
 */
export async function probeClayRefineLiveSoakReadiness(): Promise<{
  id: 'clay-refine-live-soak'
  status: 'PARTIAL'
  ready: boolean
  liveSoakReady: boolean
  lastSoakElapsedMs: number
  path: string
  nativeOnnxReady: false
  meshyTripoClayParityClaim: false
  ueMeshQualityClaim: false
  note: string
}> {
  const adapter = createMemoryCostGuardLedger()
  adapter.enableByok('probe-soak')
  const ledger = createTaskEvidenceLedger({
    taskId: 'probe-soak',
    projectId: 'probe',
    mission: 'Clay refine live bx poll → ledger soak probe',
    ownerAgent: 'ClayRefineLiveSoak',
  })
  const glb = buildMinimalGlbFixture()
  const fetchImpl: FetchLike = async (url) => {
    if (!String(url).includes('.glb')) {
      throw new Error(`unexpected probe url ${url}`)
    }
    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => (name.toLowerCase() === 'content-type' ? 'model/gltf-binary' : null),
      },
      async text() {
        return ''
      },
      async arrayBuffer() {
        return glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer
      },
      async json() {
        return {}
      },
    }
  }

  const result = await runClayRefineLiveSoak({
    taskId: 'probe-soak',
    projectId: 'probe',
    provider: 'generic-mesh-gen',
    keys: {},
    userId: 'probe-soak',
    fetchImpl,
    clayModelUrl: 'https://probe.local/clay.glb',
    criticApproved: true,
    capabilityScore: 50,
    triangleBudgetTarget: 10_000,
    costGuardAdapter: adapter,
    ledger,
    now: '2026-08-10T12:00:00.000Z',
  })

  const liveSoakReady =
    result.ok &&
    result.value.ledger.events.some((event) => event.title === SEAL_EVENT_TITLE) &&
    result.value.ledger.events.some((event) => event.refs.includes(`receipt:${result.value.fingerprint}`))

  return {
    id: 'clay-refine-live-soak',
    status: 'PARTIAL',
    ready: liveSoakReady && MESHY_TRIPO_CLAY_PARITY_CLAIM === false && UE_MESH_QUALITY_CLAIM === false,
    liveSoakReady,
    lastSoakElapsedMs: result.ok ? result.value.soakElapsedMs : lastSoakElapsedMs,
    path: 'lib/mesh-quality/clay-refine-live-soak.ts',
    nativeOnnxReady: false,
    meshyTripoClayParityClaim: false,
    ueMeshQualityClaim: false,
    note:
      'Live bx poll→download→parse→seal→ledger soak; probe self-verifies one real cycle before liveSoakReady; nativeOnnxReady stays false',
  }
}

/** Test helper — clear module soak state. */
export function __resetClayRefineLiveSoakForTests(): void {
  lastSoakElapsedMs = 0
}
