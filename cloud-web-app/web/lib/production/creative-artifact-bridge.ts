/**
 * Law XVI — CreativeArtifactBridge (J.1 choke)
 * ALL creative/LLM provider dispatches for artifact domains MUST enter here.
 * Custody: Intent → CostGuard → (optional FusionTx) → Provider → Evidence → settle
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  cancelCreativeCost,
  reserveCreativeCost,
  settleCreativeCost,
  settleCreativeCostZero,
  type CostGuardBlockReason,
  type CostGuardLedgerAdapter,
  type CreativeCostGuardInput,
} from './creative-cost-guard'
import {
  assertFusionTransactionOpen,
  type FusionYDocScope,
} from './creative-fusion-transaction'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from './task-evidence-ledger'

const log = createComponentLogger('creative-artifact-bridge')

export type CreativeArtifactDomain =
  | 'image'
  | 'mesh'
  | 'music'
  | 'voice'
  | 'video'
  | 'texture'
  | 'world-layout'
  | 'vs-graph'
  | 'bt-graph'
  | 'cinematic-beat'
  | 'video-to-scaffold'
  | 'code-patch'
  /** J.8 — governed research browser session (evidence path; no Fusion write by default) */
  | 'web-research'

export interface CreativeArtifactRequest {
  domain: CreativeArtifactDomain
  prompt: string
  projectId: string
  userId: string
  sceneSelection?: string[]
  targetPaths?: string[]
  evidenceKind?: string
  costGuard: {
    byokProfileId?: string
    usageBucketId?: string
    estimatedTokenWeight: number
    planId?: string
  }
  fusionTransactionId?: string
  /** Domains that mutate Yjs scopes require an open FusionTx */
  requiresFusionWrite?: boolean
  fusionScope?: FusionYDocScope
}

export interface CreativeArtifactResult {
  success: boolean
  artifactId: string
  previewUrl?: string
  provider: string
  costUsd: number
  evidenceReceiptId: string
  blockedReason?: CostGuardBlockReason | 'provider_down' | 'scope_violation' | 'transaction_aborted' | 'empty_artifact'
  /** Present when blockedReason is provider_down — original error text for HTTP mapping */
  providerError?: string
  fusionTransactionId?: string
  yjsSnapshotHashBefore?: string
  yjsSnapshotHashAfter?: string
  reservationId?: string
  actualTokenWeight?: number
}

export interface CreativeProviderDispatch {
  (input: {
    request: CreativeArtifactRequest
    reservationId: string
  }): Promise<{
    artifactId: string
    previewUrl?: string
    provider: string
    costUsd: number
    actualTokenWeight: number
    /** Law XVI: success:true + empty artifact forbidden */
    empty?: boolean
  }>
}

const WRITE_DOMAINS: Set<CreativeArtifactDomain> = new Set([
  'world-layout',
  'vs-graph',
  'bt-graph',
  'cinematic-beat',
  'texture',
  'mesh',
  'code-patch',
  /** J.6 — scaffold writes BT/VS scopes via FusionTx */
  'video-to-scaffold',
])

export async function dispatchCreativeArtifact(input: {
  request: CreativeArtifactRequest
  adapter: CostGuardLedgerAdapter
  provider: CreativeProviderDispatch
  ledger?: TaskEvidenceLedger
}): Promise<{ result: CreativeArtifactResult; ledger: TaskEvidenceLedger }> {
  const { request, adapter, provider } = input
  let ledger =
    input.ledger ??
    createTaskEvidenceLedger({
      taskId: `creative-${request.domain}-${randomUUID().slice(0, 8)}`,
      projectId: request.projectId,
      mission: `Creative ${request.domain}: ${request.prompt.slice(0, 80)}`,
      ownerAgent: 'CreativeBridge',
    })

  const requiresWrite = request.requiresFusionWrite ?? WRITE_DOMAINS.has(request.domain)
  try {
    assertFusionTransactionOpen(request.fusionTransactionId, requiresWrite)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'transaction_aborted'
    log.warn('bridge_blocked_trava_ii', { message, domain: request.domain })
    return {
      result: {
        success: false,
        artifactId: '',
        provider: 'none',
        costUsd: 0,
        evidenceReceiptId: '',
        blockedReason: 'transaction_aborted',
      },
      ledger,
    }
  }

  const guardInput: CreativeCostGuardInput = {
    userId: request.userId,
    projectId: request.projectId,
    domain: request.domain,
    estimatedTokenWeight: request.costGuard.estimatedTokenWeight,
    byokProfileId: request.costGuard.byokProfileId,
    usageBucketId: request.costGuard.usageBucketId,
    planId: request.costGuard.planId,
  }

  const reserved = await reserveCreativeCost(guardInput, adapter)
  if (!reserved.ok) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'cost',
      title: 'CostGuard denied',
      summary: reserved.message,
      refs: [`cost-guard:${reserved.reason}`],
      actor: 'CreativeCostGuard',
    })
    return {
      result: {
        success: false,
        artifactId: '',
        provider: 'none',
        costUsd: 0,
        evidenceReceiptId: ledger.events[ledger.events.length - 1]?.id ?? '',
        blockedReason: reserved.reason,
      },
      ledger,
    }
  }

  const reservationId = reserved.reservation.reservationId

  try {
    const dispatched = await provider({ request, reservationId })

    if (dispatched.empty || !dispatched.artifactId) {
      await settleCreativeCostZero(reservationId, adapter)
      ledger = appendTaskEvidence(ledger, {
        kind: 'validation',
        title: 'Empty artifact rejected',
        summary: 'Law XVI forbids success with empty artifact',
        refs: [`reservation:${reservationId}`],
        actor: 'CreativeBridge',
      })
      return {
        result: {
          success: false,
          artifactId: '',
          provider: dispatched.provider,
          costUsd: 0,
          evidenceReceiptId: ledger.events[ledger.events.length - 1]?.id ?? '',
          blockedReason: 'empty_artifact',
          reservationId,
          fusionTransactionId: request.fusionTransactionId,
        },
        ledger,
      }
    }

    await settleCreativeCost(reservationId, dispatched.actualTokenWeight, adapter)

    ledger = appendTaskEvidence(ledger, {
      kind: 'artifact',
      title: `Artifact ${request.domain}`,
      summary: `Provider ${dispatched.provider} produced ${dispatched.artifactId}`,
      refs: [`artifact:${dispatched.artifactId}`, `reservation:${reservationId}`],
      actor: 'CreativeBridge',
    })
    ledger = appendTaskEvidence(ledger, {
      kind: 'cost',
      title: 'Cost settled',
      summary: `actualTokenWeight=${dispatched.actualTokenWeight} costUsd=${dispatched.costUsd}`,
      refs: [`reservation:${reservationId}`],
      actor: 'CreativeCostGuard',
    })

    // J.9 / #63 — cinematic-beat jobs attach engine VisualEvidence (never empty success; Veo demoted).
    if (request.domain === 'cinematic-beat') {
      const { attachCinematicVisualEvidenceAfterShoot } = await import(
        '@/lib/production/cinematic-visual-evidence'
      )
      const cinematic = await attachCinematicVisualEvidenceAfterShoot({
        intent: 'custom',
        timelineId: `fusion-cinematic:${dispatched.artifactId}`,
        timelineLabel: request.prompt.slice(0, 64),
        source: 'fusion-cinematic-job',
        jobId: dispatched.artifactId,
        afterPatch: JSON.stringify({
          artifactId: dispatched.artifactId,
          domain: request.domain,
          prompt: request.prompt.slice(0, 200),
        }),
        ledger,
      })
      if (cinematic.ledger) ledger = cinematic.ledger
      if (cinematic.visual.status === 'IMPLEMENTED' && cinematic.visual.refs.length === 0) {
        // Law XVI: refuse success theater if capture claimed IMPLEMENTED with empty refs
        log.warn('cinematic_beat_empty_visual_refused', { artifactId: dispatched.artifactId })
      }
    }

    log.info('bridge_dispatch_ok', {
      domain: request.domain,
      artifactId: dispatched.artifactId,
      reservationId,
    })

    return {
      result: {
        success: true,
        artifactId: dispatched.artifactId,
        previewUrl: dispatched.previewUrl,
        provider: dispatched.provider,
        costUsd: dispatched.costUsd,
        evidenceReceiptId: ledger.events[ledger.events.length - 1]?.id ?? '',
        fusionTransactionId: request.fusionTransactionId,
        reservationId,
        actualTokenWeight: dispatched.actualTokenWeight,
      },
      ledger,
    }
  } catch (err) {
    await cancelCreativeCost(reservationId, adapter)
    const message = err instanceof Error ? err.message : 'provider_down'
    log.error('bridge_provider_failed', err instanceof Error ? err : new Error(message))
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Provider failed',
      summary: message,
      refs: [`reservation:${reservationId}`],
      actor: 'CreativeBridge',
    })
    return {
      result: {
        success: false,
        artifactId: '',
        provider: 'none',
        costUsd: 0,
        evidenceReceiptId: ledger.events[ledger.events.length - 1]?.id ?? '',
        blockedReason: 'provider_down',
        providerError: message,
        reservationId,
      },
      ledger,
    }
  }
}
