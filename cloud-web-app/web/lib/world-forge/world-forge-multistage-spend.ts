/**
 * Letter cc — World Forge multi-stage CostGuard spend (Creative #5).
 *
 * Law XVI Trava I — a creative mission (world-layout) must reserve BEFORE any paid stage.
 * This module owns the multi-stage spend contract for the World Forge conveyor:
 *
 *   reserve (ONE held reservation spanning the whole pipeline) →
 *   per-stage allocation (weight table over the estimate, Σ == estimate exactly) →
 *   per-stage actual attribution (caller-observed provider/cloud spend) →
 *   settle once (settle-ceiling guard caps runaways; 'Cost settle capped' evidence) →
 *   cancel (full refund) on ANY fail-closed stage (Fusion abort, LoRA empty, bake refuse, theater).
 *
 * Conveyor-nucleus pattern (Creative #1 parity): a single reserve → settle, never a
 * reserve-per-stage double-spend. The stage weight table is a *budget view* over the one hold.
 *
 * Honest: World Forge local math stages are $0 — no stage invents token consumption. Actuals are
 * attributed only from the caller (provider responses / cloud pieces once Held). Zero-UI/unfunded
 * runs carry worldForgeSpend: null and never touch CostGuard.
 */

import { randomUUID } from 'crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  cancelCreativeCost,
  createMemoryCostGuardLedger,
  getCreativeCostReservation,
  reserveCreativeCost,
  settleCreativeCost,
  type CostGuardBlockReason,
  type CostGuardLedgerAdapter,
  type SettleCreativeCostResult,
} from '@/lib/production/creative-cost-guard'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import {
  WORLD_FORGE_LETTER,
  WORLD_FORGE_PIPELINE_ID,
  type WorldForgeStageId,
  type WorldForgeStageReceipt,
  type WorldForgeStageStatus,
} from '@/lib/world-forge/types'

const log = createComponentLogger('world-forge-multistage-spend')

export const WORLD_FORGE_MULTISTAGE_SPEND_LETTER = 'wf-multistage-spend' as const
export const WORLD_FORGE_MULTISTAGE_SPEND_WIRED = true as const

/** Always false — local math-PCG spend ≠ Unreal World Partition / Nanite / LoRA clay claims. */
export const WORLD_FORGE_SPEND_UNREAL_WORLD_PARTITION_CLAIM = false as const
export const WORLD_FORGE_SPEND_NANITE_CLAIM = false as const
export const WORLD_FORGE_SPEND_LORA_CLAY_READY = false as const
export const WORLD_FORGE_SPEND_NATIVE_ONNX_READY = false as const

/**
 * Honest per-stage budget allocation over the reserved estimate. Local math stages are cheap; the
 * LoRA inject (LLM/cloud once Held) and Fusion manifest write carry the larger share. Sum = 1.
 */
export const WORLD_FORGE_STAGE_BUDGET_WEIGHTS: Record<WorldForgeStageId, number> = {
  'lora-inject': 0.3,
  'sdf-sculpt': 0.1,
  'seamless-pbr': 0.05,
  'biome-mask': 0.1,
  'pcg-scatter': 0.15,
  'collider-lod': 0.05,
  'navmesh-rebuild': 0.1,
  'detour-nav-rebuild': 0.05,
  'fusion-viewport': 0.1,
}

export const WORLD_FORGE_STAGE_IDS: WorldForgeStageId[] = [
  'lora-inject',
  'sdf-sculpt',
  'seamless-pbr',
  'biome-mask',
  'pcg-scatter',
  'collider-lod',
  'navmesh-rebuild',
  'detour-nav-rebuild',
  'fusion-viewport',
]

export interface WorldForgeStageSpendRecord {
  stage: WorldForgeStageId
  status: WorldForgeStageStatus
  /** estimate × weight (2dp) — the budget this stage may consume within the single hold. */
  allocatedTokens: number
  /** caller-attributed actual consumption for this stage (0 for local $0 math). */
  actualTokens: number
  evidence: string[]
}

export interface WorldForgeSpendHeld {
  reservationId: string
  userId: string
  projectId: string
  funding: 'byok' | 'usage_bucket' | 'wallet'
  settleCeilingMultiplier: number
  estimatedTokenWeight: number
  stages: WorldForgeStageSpendRecord[]
}

export type WorldForgeSpendStatus = 'reserved' | 'settled' | 'cancelled' | 'settle_zero'

export interface WorldForgeSpendReceipt {
  letter: typeof WORLD_FORGE_MULTISTAGE_SPEND_LETTER
  pipelineId: typeof WORLD_FORGE_PIPELINE_ID
  reservationId: string
  funding: 'byok' | 'usage_bucket' | 'wallet'
  estimatedTokenWeight: number
  settleCeilingMultiplier: number
  status: WorldForgeSpendStatus
  stages: WorldForgeStageSpendRecord[]
  totalActualTokens: number
  capped: boolean
  settle?: SettleCreativeCostResult
  ledgerEvents: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Distribute the estimate across stages by weight so Σ allocated === round2(estimate) exactly —
 * no floating drift that could corrupt the settle-ceiling guard or the drift gate.
 */
export function allocateWorldForgeSpendStages(
  estimatedTokenWeight: number,
): WorldForgeStageSpendRecord[] {
  const base = round2(estimatedTokenWeight)
  const raw = WORLD_FORGE_STAGE_IDS.map((stage) => ({
    stage,
    allocatedTokens: Math.floor(base * WORLD_FORGE_STAGE_BUDGET_WEIGHTS[stage]! * 100) / 100,
  }))
  const rawSum = raw.reduce((acc, record) => acc + record.allocatedTokens, 0)
  const remainder = round2(base - rawSum)
  const largest = raw.reduce((acc, record) =>
    record.allocatedTokens >= acc.allocatedTokens ? record : acc,
  )
  return raw.map((record) => ({
    stage: record.stage,
    status: 'held' as const,
    allocatedTokens:
      record.stage === largest.stage ? round2(record.allocatedTokens + remainder) : record.allocatedTokens,
    actualTokens: 0,
    evidence: [],
  }))
}

export interface ReserveWorldForgeSpendInput {
  userId: string
  projectId: string
  estimatedTokenWeight: number
  byokProfileId?: string
  usageBucketId?: string
  planId?: string
  settleCeilingMultiplier?: number
}

export type ReserveWorldForgeSpendResult =
  | { ok: true; held: WorldForgeSpendHeld }
  | { ok: false; reason: CostGuardBlockReason; message: string }

/**
 * Trava I — reserve ONE held reservation spanning the whole World Forge pipeline.
 * Domain is always 'world-layout' (a creative world mission). Returns the stage budget view.
 */
export async function reserveWorldForgeSpend(
  input: ReserveWorldForgeSpendInput,
  adapter: CostGuardLedgerAdapter,
): Promise<ReserveWorldForgeSpendResult> {
  const reserved = await reserveCreativeCost(
    {
      userId: input.userId,
      projectId: input.projectId,
      domain: 'world-layout',
      estimatedTokenWeight: input.estimatedTokenWeight,
      byokProfileId: input.byokProfileId,
      usageBucketId: input.usageBucketId,
      planId: input.planId,
      settleCeilingMultiplier: input.settleCeilingMultiplier,
    },
    adapter,
  )
  if (!reserved.ok) {
    return { ok: false, reason: reserved.reason, message: reserved.message }
  }
  const reservation = reserved.reservation
  log.info('world_forge_spend_reserved', {
    reservationId: reservation.reservationId,
    funding: reservation.funding,
    estimatedTokenWeight: reservation.estimatedTokenWeight,
  })
  return {
    ok: true,
    held: {
      reservationId: reservation.reservationId,
      userId: reservation.userId,
      projectId: reservation.projectId,
      funding: reservation.funding,
      settleCeilingMultiplier: reservation.settleCeilingMultiplier,
      estimatedTokenWeight: reservation.estimatedTokenWeight,
      stages: allocateWorldForgeSpendStages(reservation.estimatedTokenWeight),
    },
  }
}

export type AttributeWorldForgeStageActualResult =
  | { ok: true; held: WorldForgeSpendHeld }
  | { ok: false; code: 'unknown_stage' | 'invalid_actual'; message: string }

/**
 * Attribute caller-observed actual consumption to one stage of the held spend. Pure — returns a
 * new held. Fail-closed on unknown stage or non-finite/negative actual (never invents spend).
 */
export function attributeWorldForgeStageActual(
  held: WorldForgeSpendHeld,
  stage: WorldForgeStageId,
  actualTokens: number,
  evidence: string[] = [],
  status?: WorldForgeStageStatus,
): AttributeWorldForgeStageActualResult {
  const index = held.stages.findIndex((record) => record.stage === stage)
  if (index < 0) {
    return { ok: false, code: 'unknown_stage', message: `Unknown stage "${stage}"` }
  }
  if (!Number.isFinite(actualTokens) || actualTokens < 0) {
    return { ok: false, code: 'invalid_actual', message: 'actualTokens must be a finite number >= 0' }
  }
  const next = [...held.stages]
  next[index] = {
    ...next[index]!,
    actualTokens: round2(actualTokens),
    status: status ?? (actualTokens > 0 ? 'closed' : next[index]!.status),
    evidence: [...new Set([...next[index]!.evidence, ...evidence])],
  }
  return { ok: true, held: { ...held, stages: next } }
}

function mergeStageReceipts(
  held: WorldForgeSpendHeld,
  receipts: ReadonlyArray<Pick<WorldForgeStageReceipt, 'stage' | 'status' | 'evidence'>>,
): WorldForgeSpendHeld {
  if (receipts.length === 0) return held
  const byStage = new Map(receipts.map((receipt) => [receipt.stage, receipt]))
  return {
    ...held,
    stages: held.stages.map((record) => {
      const receipt = byStage.get(record.stage)
      if (!receipt) return record
      return {
        ...record,
        status: receipt.status,
        evidence: [...new Set([...record.evidence, ...receipt.evidence])],
      }
    }),
  }
}

function totalActualTokens(held: WorldForgeSpendHeld): number {
  return round2(held.stages.reduce((acc, record) => acc + record.actualTokens, 0))
}

export interface SettleWorldForgeSpendInput {
  held: WorldForgeSpendHeld
  adapter: CostGuardLedgerAdapter
  ledger?: TaskEvidenceLedger
  /** Merge conveyor stage receipts (status + evidence) into the spend stage records. */
  stageReceipts?: ReadonlyArray<Pick<WorldForgeStageReceipt, 'stage' | 'status' | 'evidence'>>
}

/**
 * Settle the multi-stage spend ONCE at the end of a successful conveyor. Total actual = Σ per-stage
 * actuals; CostGuard caps the total at estimate × ceiling and surfaces the cap as evidence. Local
 * $0 stages charge 0 (settle refunds the delta / full hold for a zero-actual mission).
 */
export async function settleWorldForgeSpend(input: SettleWorldForgeSpendInput): Promise<{
  receipt: WorldForgeSpendReceipt
  ledger: TaskEvidenceLedger
}> {
  let ledger =
    input.ledger ??
    createTaskEvidenceLedger({
      taskId: `world-forge-spend-${randomUUID().slice(0, 8)}`,
      projectId: input.held.projectId,
      mission: `World Forge multi-stage spend (${input.held.reservationId.slice(0, 8)})`,
      ownerAgent: 'WorldForgeCostGuard',
    })

  const merged = mergeStageReceipts(input.held, input.stageReceipts ?? [])
  const totalActual = totalActualTokens(merged)
  const settle = await settleCreativeCost(input.held.reservationId, totalActual, input.adapter)

  ledger = appendTaskEvidence(ledger, {
    kind: 'cost',
    title: 'World Forge mission settled',
    summary: `reservation=${input.held.reservationId.slice(0, 8)} totalActualTokens=${totalActual} capped=${settle.capped}`,
    refs: [`reservation:${input.held.reservationId}`, `world-forge:${WORLD_FORGE_LETTER}`],
    actor: 'WorldForgeCostGuard',
  })
  if (settle.capped) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'cost',
      title: 'Cost settle capped',
      summary: `actualTokenWeight=${settle.rawActual} capped to ${settle.cappedActual} by reservation ceiling`,
      refs: [`reservation:${input.held.reservationId}`],
      actor: 'CreativeCostGuard',
    })
  }

  const receipt: WorldForgeSpendReceipt = {
    letter: WORLD_FORGE_MULTISTAGE_SPEND_LETTER,
    pipelineId: WORLD_FORGE_PIPELINE_ID,
    reservationId: input.held.reservationId,
    funding: input.held.funding,
    estimatedTokenWeight: input.held.estimatedTokenWeight,
    settleCeilingMultiplier: input.held.settleCeilingMultiplier,
    status: 'settled',
    stages: merged.stages,
    totalActualTokens: totalActual,
    capped: settle.capped,
    settle,
    ledgerEvents: ledger.events.length,
  }
  return { receipt, ledger }
}

export interface CancelWorldForgeSpendInput {
  held: WorldForgeSpendHeld
  adapter: CostGuardLedgerAdapter
  ledger?: TaskEvidenceLedger
  reason?: string
  stageReceipts?: ReadonlyArray<Pick<WorldForgeStageReceipt, 'stage' | 'status' | 'evidence'>>
}

/**
 * Cancel the multi-stage spend on ANY fail-closed stage (Fusion abort, LoRA empty, bake refuse,
 * theater, math empty, barrier refuse). Refunds the full hold and records a durable reject event.
 */
export async function cancelWorldForgeSpend(input: CancelWorldForgeSpendInput): Promise<{
  receipt: WorldForgeSpendReceipt
  ledger: TaskEvidenceLedger
}> {
  let ledger =
    input.ledger ??
    createTaskEvidenceLedger({
      taskId: `world-forge-spend-${randomUUID().slice(0, 8)}`,
      projectId: input.held.projectId,
      mission: `World Forge multi-stage spend (${input.held.reservationId.slice(0, 8)})`,
      ownerAgent: 'WorldForgeCostGuard',
    })

  await cancelCreativeCost(input.held.reservationId, input.adapter)
  const merged = mergeStageReceipts(input.held, input.stageReceipts ?? [])
  const totalActual = totalActualTokens(merged)

  ledger = appendTaskEvidence(ledger, {
    kind: 'validation',
    title: 'World Forge mission refunded',
    summary: `reservation=${input.held.reservationId.slice(0, 8)} refunded full hold${
      input.reason ? ` — ${input.reason}` : ''
    }`,
    refs: [`reservation:${input.held.reservationId}`, `world-forge:${WORLD_FORGE_LETTER}`],
    actor: 'WorldForgeCostGuard',
  })

  const receipt: WorldForgeSpendReceipt = {
    letter: WORLD_FORGE_MULTISTAGE_SPEND_LETTER,
    pipelineId: WORLD_FORGE_PIPELINE_ID,
    reservationId: input.held.reservationId,
    funding: input.held.funding,
    estimatedTokenWeight: input.held.estimatedTokenWeight,
    settleCeilingMultiplier: input.held.settleCeilingMultiplier,
    status: 'cancelled',
    stages: merged.stages,
    totalActualTokens: totalActual,
    capped: false,
    ledgerEvents: ledger.events.length,
  }
  return { receipt, ledger }
}

/**
 * Probe — self-verifies ONE real reserve→settle round trip (single held reservation, allocation
 * sums to the estimate, reservation reaches 'settled') before reporting ready. Native ONNX / LoRA
 * clay / Unreal World Partition claims stay false.
 */
export async function probeWorldForgeMultistageSpendReadiness(): Promise<{
  id: 'world-forge-multistage-spend'
  status: 'PARTIAL'
  ready: boolean
  path: string
  wired: boolean
  weightsSumTo1: boolean
  allocationSumsToEstimate: boolean
  singleHeldReservationRoundTrip: boolean
  unrealWorldPartitionClaim: false
  loraClayReady: false
  nativeOnnxReady: false
  note: string
}> {
  const weightsSumTo1 =
    Math.abs(
      WORLD_FORGE_STAGE_IDS.reduce(
        (acc, stage) => acc + WORLD_FORGE_STAGE_BUDGET_WEIGHTS[stage]!,
        0,
      ) - 1,
    ) < 1e-9

  const adapter = createMemoryCostGuardLedger()
  adapter.enableByok('probe-spend')
  const reserved = await reserveWorldForgeSpend(
    { userId: 'probe-spend', projectId: 'probe', estimatedTokenWeight: 100, planId: 'pro' },
    adapter,
  )
  if (!reserved.ok) {
    return {
      id: 'world-forge-multistage-spend',
      status: 'PARTIAL',
      ready: false,
      path: 'lib/world-forge/world-forge-multistage-spend.ts',
      wired: true,
      weightsSumTo1,
      allocationSumsToEstimate: false,
      singleHeldReservationRoundTrip: false,
      unrealWorldPartitionClaim: false,
      loraClayReady: false,
      nativeOnnxReady: false,
      note: 'Probe reserve failed — multi-stage spend cannot self-verify',
    }
  }

  const allocationSumsToEstimate =
    Math.abs(
      reserved.held.stages.reduce((acc, record) => acc + record.allocatedTokens, 0) -
        reserved.held.estimatedTokenWeight,
    ) < 1e-6

  const settled = await settleWorldForgeSpend({ held: reserved.held, adapter })
  const singleHeldReservationRoundTrip =
    settled.receipt.status === 'settled' &&
    getCreativeCostReservation(reserved.held.reservationId)?.status === 'settled'

  const ready =
    weightsSumTo1 &&
    allocationSumsToEstimate &&
    singleHeldReservationRoundTrip &&
    WORLD_FORGE_SPEND_NATIVE_ONNX_READY === false

  return {
    id: 'world-forge-multistage-spend',
    status: 'PARTIAL',
    ready,
    path: 'lib/world-forge/world-forge-multistage-spend.ts',
    wired: WORLD_FORGE_MULTISTAGE_SPEND_WIRED,
    weightsSumTo1,
    allocationSumsToEstimate,
    singleHeldReservationRoundTrip,
    unrealWorldPartitionClaim: false,
    loraClayReady: false,
    nativeOnnxReady: false,
    note: 'World Forge conveyor reserves ONE held CostGuard reservation (Trava I) before any stage, attributes per-stage actuals, and settles once — refunding the full hold on any fail-closed stage; local $0 stages charge 0; native ONNX / LoRA clay / Unreal World Partition claims HELD',
  }
}
