/**
 * AI-v1-e / J.6 — VideoToMechanic operator (Trava III)
 * Sole ship path: video-to-scaffold-extractor → FusionTx BT/SM scopes via CreativeBridge.
 * Never auto-wires Rapier/GAS. Marketing "video → GTA / playable AAA" is rejected.
 */

import { createHash, randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import {
  extractVideoToMechanicScaffold,
  type VideoScaffoldClipMeta,
  type VideoToMechanicScaffoldResult,
} from '@/lib/production/video-to-scaffold-extractor'

const log = createComponentLogger('video-to-mechanic-operator')

/** Binding UX copy — must appear in UI for any VideoToMechanic surface */
export const VIDEO_TO_MECHANIC_HONESTY = {
  productLabel: 'Video-to-design scaffold',
  notPlayableAaa: 'Not a playable AAA / GTA clone from video alone.',
  userWiringRequired:
    'Scaffold only — wire Rapier impulses, GAS abilities, and VS execution paths yourself.',
  marketingForbidden: 'Marketing claim "video → playable AAA" is forbidden forever on web.',
} as const

export type VideoToMechanicBlockReason =
  | 'invalid_clip'
  | 'marketing_claim_rejected'
  | 'cost_guard'
  | 'transaction_aborted'
  | 'empty_artifact'
  | 'provider_down'

export interface VideoToMechanicOperatorSuccess {
  success: true
  scaffold: VideoToMechanicScaffoldResult
  fusionTransactionId: string
  snapshotHashBefore: string
  snapshotHashAfter: string
  evidenceReceiptId: string
  honesty: typeof VIDEO_TO_MECHANIC_HONESTY
  ledger: TaskEvidenceLedger
  /** VS stub nodes derived from BT actions — never auto-physics */
  visualScriptStubs: Array<{ id: string; label: string; stub: true }>
}

export interface VideoToMechanicOperatorDenied {
  success: false
  blockedReason: VideoToMechanicBlockReason
  message: string
  honesty: typeof VIDEO_TO_MECHANIC_HONESTY
  ledger: TaskEvidenceLedger
}

export type VideoToMechanicOperatorResult =
  | VideoToMechanicOperatorSuccess
  | VideoToMechanicOperatorDenied

/**
 * Run VideoToMechanic through CreativeBridge + FusionTx (behavior-tree scope).
 * Extractor remains the only logic source — this operator is the Fusion ship path.
 */
export async function runVideoToMechanicOperator(input: {
  projectId: string
  userId: string
  clips: VideoScaffoldClipMeta[]
  missionLabel?: string
  planId?: string
  byokProfileId?: string
  usageBucketId?: string
  estimatedTokenWeight?: number
  adapter: CostGuardLedgerAdapter
  store: FusionScopeStore
}): Promise<VideoToMechanicOperatorResult> {
  let ledger = createTaskEvidenceLedger({
    taskId: `v2m-${randomUUID().slice(0, 8)}`,
    projectId: input.projectId,
    mission: `J.6 VideoToMechanic scaffold: ${(input.missionLabel ?? 'clip').slice(0, 80)}`,
    ownerAgent: 'VideoToMechanic',
  })

  const extracted = extractVideoToMechanicScaffold({
    projectId: input.projectId,
    clips: input.clips,
    missionLabel: input.missionLabel,
  })

  if (!extracted.success) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Trava III extractor denied',
      summary: extracted.message,
      refs: [`reason:${extracted.reason}`],
      actor: 'VideoToScaffoldExtractor',
    })
    return {
      success: false,
      blockedReason: extracted.reason,
      message: extracted.message,
      honesty: VIDEO_TO_MECHANIC_HONESTY,
      ledger,
    }
  }

  // Hard assert Trava III invariants even if extractor is later mutated.
  if (extracted.autoPhysics !== false || extracted.physicsWiringRequired !== true) {
    return {
      success: false,
      blockedReason: 'marketing_claim_rejected',
      message: 'Trava III invariant failed — scaffold must set autoPhysics:false + physicsWiringRequired:true',
      honesty: VIDEO_TO_MECHANIC_HONESTY,
      ledger,
    }
  }

  const visualScriptStubs = extracted.behaviorTree.root.children.map((c) => ({
    id: `vs_${c.id}`,
    label: c.label.startsWith('USER_WIRE:') ? c.label : `USER_WIRE: ${c.label}`,
    stub: true as const,
  }))

  let tx
  try {
    tx = await beginCreativeFusionTransaction({
      projectId: input.projectId,
      yDocScope: 'behavior-tree',
      store: input.store,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'transaction_aborted'
    return {
      success: false,
      blockedReason: 'transaction_aborted',
      message,
      honesty: VIDEO_TO_MECHANIC_HONESTY,
      ledger,
    }
  }

  const weight = input.estimatedTokenWeight ?? 2400
  const { result: bridge, ledger: bridgeLedger } = await dispatchCreativeArtifact({
    request: {
      domain: 'video-to-scaffold',
      prompt: input.missionLabel ?? 'Video-to-design scaffold',
      projectId: input.projectId,
      userId: input.userId,
      evidenceKind: 'video-to-mechanic-scaffold',
      costGuard: {
        estimatedTokenWeight: weight,
        byokProfileId: input.byokProfileId,
        usageBucketId: input.usageBucketId,
        planId: input.planId ?? 'pro',
      },
      fusionTransactionId: tx.id,
      requiresFusionWrite: true,
      fusionScope: 'behavior-tree',
    },
    adapter: input.adapter,
    ledger,
    provider: async () => {
      const payload = JSON.stringify({
        projectId: input.projectId,
        scope: 'behavior-tree',
        scaffold: extracted,
        visualScriptStubs,
        honesty: VIDEO_TO_MECHANIC_HONESTY,
        autoPhysics: false,
        updatedAt: new Date().toISOString(),
      })
      recordFusionMutation(tx.id, input.store, payload)

      // Also mirror VS stubs into visual-script scope under same operator custody
      // via a nested snapshot key — still scaffold-only.
      const vsSnap = input.store.getSnapshot(input.projectId, 'visual-script')
      const vsDoc = safeParse(vsSnap)
      const nextVs = JSON.stringify({
        ...vsDoc,
        projectId: input.projectId,
        scope: 'visual-script',
        stubs: [...(Array.isArray(vsDoc.stubs) ? vsDoc.stubs : []), ...visualScriptStubs],
        sourceScaffoldId: extracted.scaffoldId,
        updatedAt: new Date().toISOString(),
      })
      input.store.applySnapshot(input.projectId, 'visual-script', nextVs)

      return {
        artifactId: extracted.scaffoldId,
        provider: 'video-to-scaffold-extractor',
        costUsd: 0,
        actualTokenWeight: weight,
        empty: !extracted.scaffoldId,
      }
    },
  })

  ledger = bridgeLedger

  if (!bridge.success) {
    return {
      success: false,
      blockedReason:
        bridge.blockedReason === 'transaction_aborted'
          ? 'transaction_aborted'
          : bridge.blockedReason === 'empty_artifact'
            ? 'empty_artifact'
            : bridge.blockedReason === 'provider_down'
              ? 'provider_down'
              : 'cost_guard',
      message: `CreativeBridge blocked VideoToMechanic: ${bridge.blockedReason ?? 'unknown'}`,
      honesty: VIDEO_TO_MECHANIC_HONESTY,
      ledger,
    }
  }

  const committed = await commitCreativeFusionTransaction(tx.id, input.store)
  const snapshotHashAfter = committed.snapshotHashAfter

  ledger = appendTaskEvidence(ledger, {
    kind: 'artifact',
    title: 'VideoToMechanic scaffold committed',
    summary: `${VIDEO_TO_MECHANIC_HONESTY.productLabel} — ${extracted.stateMachine.states.length} states, BT stubs only`,
    refs: [
      `scaffold:${extracted.scaffoldId}`,
      `tx:${tx.id}`,
      `snap:${tx.snapshotHashBefore}→${snapshotHashAfter}`,
      'trava-iii:no-auto-physics',
    ],
    actor: 'VideoToMechanic',
  })

  log.info('video_to_mechanic_ok', {
    scaffoldId: extracted.scaffoldId,
    states: extracted.stateMachine.states.length,
    txId: tx.id,
  })

  return {
    success: true,
    scaffold: extracted,
    fusionTransactionId: tx.id,
    snapshotHashBefore: tx.snapshotHashBefore,
    snapshotHashAfter,
    evidenceReceiptId: ledger.events[ledger.events.length - 1]?.id ?? '',
    honesty: VIDEO_TO_MECHANIC_HONESTY,
    ledger,
    visualScriptStubs,
  }
}

/**
 * Map a generated video job (clip metas) into the scaffold operator.
 * generate/video remains video generation; this is the J.6 scaffold ship path.
 */
export function buildClipsFromVideoJob(input: {
  taskId: string
  durationSeconds?: number
  beatLabels?: string[]
}): VideoScaffoldClipMeta[] {
  const labels =
    input.beatLabels?.length
      ? input.beatLabels
      : ['Observe', 'Transition', 'Resolve']
  const durationMs = Math.max(500, Math.round((input.durationSeconds ?? 5) * 1000))
  return labels.map((label, i) => ({
    clipId: `${input.taskId}_beat_${i}`,
    durationMs: Math.round(durationMs / labels.length),
    label,
  }))
}

export function videoToMechanicContentHash(scaffoldId: string, projectId: string): string {
  return createHash('sha256').update(`${projectId}:${scaffoldId}`).digest('hex').slice(0, 16)
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw) as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
