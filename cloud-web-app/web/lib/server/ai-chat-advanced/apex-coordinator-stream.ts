/**
 * R19 — Apex MoA / multi-agent coordinator SSE.
 *
 * Honest contract:
 * - Streams `status` (Nexus phases) + `cell` lifecycle events.
 * - Emits final answer as a single `content` event with `tokenSource: 'final_complete'`
 *   (MoA fan-in is not a safe per-agent token multiplex — do not fake it).
 * - Cancelable via AbortSignal (spend cancel + stream close).
 */

import { NextResponse } from 'next/server'
import type { ChatSpendSession } from '@/lib/ai/chat-spend-session'
import { createComponentLogger } from '@/lib/observability/logger'
import { runApexCodeMission } from '@/lib/production/apex-mission-orchestrator'
import { buildNexusMissionUiPayload } from '@/lib/production/nexus-mission-ui'
import { buildApexMissionEvidenceLedger } from '@/lib/production/apex-mission-evidence'
import { persistGovernedTaskEvidence } from '@/lib/server/ai-change-apply/persist-governed-evidence'
import {
  abortCreativeFusionTransaction,
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  createMemoryFusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import { buildArchitectureContextSpine } from '@/lib/production/architecture-context-spine'
import type { NexusPhaseEvent } from '@/lib/production/nexus-mission-phases'

const logger = createComponentLogger('server.ai-chat-advanced.apex-coordinator-stream')

function sse(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function handleApexCoordinatorStream(params: {
  userId: string
  planId: string
  model: string
  lastUserMessage: string
  enhancedSystemMessage: string
  projectId?: string
  targetFilePath: string
  riskScore: number
  enableLlmFuse: boolean
  spendSession: ChatSpendSession
  traceId: string
  abortSignal?: AbortSignal
}): Promise<NextResponse> {
  const {
    userId,
    planId,
    model,
    lastUserMessage,
    enhancedSystemMessage,
    projectId,
    targetFilePath,
    riskScore,
    enableLlmFuse,
    spendSession,
    traceId,
    abortSignal,
  } = params

  const encoder = new TextEncoder()
  let settled = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sse(payload)))
      }

      const onAbort = () => {
        void spendSession.cancel().catch(() => {})
      }
      if (abortSignal) {
        if (abortSignal.aborted) {
          await spendSession.cancel().catch(() => {})
          controller.close()
          return
        }
        abortSignal.addEventListener('abort', onAbort, { once: true })
      }

      try {
        enqueue({
          type: 'meta',
          streamMode: 'apex_coordinator',
          notice:
            'Coordinator status + final answer only. Per-agent MoA token fan-in is not streamed (architecturally unsafe / not claimed).',
          traceId,
          model,
          spendLane: spendSession.lane,
          noticeCode: spendSession.noticeCode,
        })

        let spinePrompt = enhancedSystemMessage
        let spineIds: {
          lawsPackId?: string
          contextPackId?: string
          projectMemoryDigestId?: string
          cartographyManifestId?: string
        } = {}

        if (projectId) {
          try {
            const spine = await buildArchitectureContextSpine({
              userId,
              projectId,
              query: lastUserMessage,
              mode: 'mixed',
              tokenBudget: 2500,
            })
            spinePrompt = `${enhancedSystemMessage}\n${spine.promptSection}`
            spineIds = {
              lawsPackId: spine.lawsPackId,
              contextPackId: spine.contextPackId,
              projectMemoryDigestId: spine.projectMemoryDigestId,
              cartographyManifestId: spine.cartographyManifestId,
            }
          } catch (spineError) {
            logger.warn('architecture_spine_failed_continuing', spineError)
          }
        }

        if (abortSignal?.aborted) {
          await spendSession.cancel().catch(() => {})
          controller.close()
          return
        }

        const mission = await runApexCodeMission({
          userId,
          planId,
          maestroModelId: model,
          userPrompt: lastUserMessage,
          systemPrompt: spinePrompt,
          targetFilePath,
          allowedPaths: [targetFilePath],
          riskScore,
          enableLlmFuse,
          lawsPackId: spineIds.lawsPackId,
          contextPackId: spineIds.contextPackId,
          projectMemoryDigestId: spineIds.projectMemoryDigestId,
          onPhase: (event: NexusPhaseEvent) => {
            if (abortSignal?.aborted) return
            enqueue({
              type: 'status',
              phase: event.phase,
              label: event.label,
              detail: event.detail,
              at: event.at,
            })
          },
          onCell: (event) => {
            if (abortSignal?.aborted) return
            enqueue({
              type: 'cell',
              taskId: event.taskId,
              role: event.role,
              status: event.status,
              moaVerdict: event.moaVerdict,
              healVerdict: event.healVerdict,
              healRounds: event.healRounds,
            })
          },
        })

        if (abortSignal?.aborted) {
          await spendSession.cancel().catch(() => {})
          controller.close()
          return
        }

        let fusionMeta:
          | {
              fusionTransactionId: string
              snapshotHashBefore: string
              snapshotHashAfter?: string
              fusionHandoffJson?: string
            }
          | undefined

        if (projectId) {
          try {
            const store = createMemoryFusionScopeStore()
            store.applySnapshot(
              projectId,
              'manifest',
              JSON.stringify({ missionId: mission.missionId, patch: null }),
            )
            const tx = await beginCreativeFusionTransaction({
              projectId,
              yDocScope: 'manifest',
              store,
            })
            store.applySnapshot(
              projectId,
              'manifest',
              JSON.stringify({
                missionId: mission.missionId,
                patch: mission.supremePatch ?? null,
                verdict: mission.verdict,
              }),
            )
            if (mission.verdict === 'APPLY') {
              const committed = await commitCreativeFusionTransaction(tx.id, store)
              const { buildFusionTxClientHandoff, serializeFusionTxClientHandoff } = await import(
                '@/lib/production/fusion-tx-client-handoff'
              )
              fusionMeta = {
                fusionTransactionId: tx.id,
                snapshotHashBefore: tx.snapshotHashBefore,
                snapshotHashAfter: committed.snapshotHashAfter,
                fusionHandoffJson: serializeFusionTxClientHandoff(
                  buildFusionTxClientHandoff(committed.record),
                ),
              }
            } else {
              await abortCreativeFusionTransaction(tx.id, store)
              fusionMeta = {
                fusionTransactionId: tx.id,
                snapshotHashBefore: tx.snapshotHashBefore,
              }
            }
          } catch (fusionError) {
            logger.warn('fusion_tx_mission_wrap_failed', fusionError)
          }
        }

        const nexus = buildNexusMissionUiPayload(mission, mission.phases, fusionMeta)
        const evidenceLedger = buildApexMissionEvidenceLedger({
          mission,
          projectId: projectId || 'session',
          nexus,
        })
        if (projectId) {
          void persistGovernedTaskEvidence({
            userId,
            projectId,
            ledger: evidenceLedger,
          })
        }

        const apexMission = {
          missionId: mission.missionId,
          verdict: mission.verdict,
          liveProvider: true as const,
          generatorWidths: mission.cells.map((c) => c.moa.generatorWidth),
          healRounds: mission.cells.map((c) => c.heal?.turns.length ?? 0),
          trivialBypass: mission.plan.trivialBypass,
          architectureSpine: spineIds,
          nexus,
          evidenceLedger,
          undoHint:
            fusionMeta != null
              ? {
                  transactionId: fusionMeta.fusionTransactionId,
                  message:
                    'Ctrl+Z / Cmd+Z reverts this AI edit atomically via CreativeFusionTransaction (Trava II).',
                  fusionHandoffJson: fusionMeta.fusionHandoffJson,
                }
              : undefined,
          cells:
            mission.verdict === 'APPLY'
              ? undefined
              : mission.cells.map((c) => ({
                  taskId: c.taskId,
                  role: c.role,
                  moaVerdict: c.moa.verdict,
                  healVerdict: c.heal?.verdict,
                })),
        }

        if (mission.verdict === 'APPLY' && mission.supremePatch) {
          await spendSession.settle(mission.estimatedSpendTokens)
          settled = true
          // Honest final delivery: one complete answer — not fake token theater.
          enqueue({
            type: 'content',
            delta: mission.supremePatch,
            content: mission.supremePatch,
            tokenSource: 'final_complete',
          })
          enqueue({
            type: 'done',
            tokensUsed: mission.estimatedSpendTokens,
            traceId,
            content: mission.supremePatch,
            streamMode: 'apex_coordinator',
            apexMission,
          })
          controller.close()
          return
        }

        await spendSession.settleZero()
        settled = true
        enqueue({
          type: 'error',
          error: 'APEX_MISSION_BLOCKED',
          message: mission.reason || 'Apex MoA mission did not produce an APPLY candidate.',
          success: false,
          apexMission,
        })
        enqueue({
          type: 'done',
          tokensUsed: 0,
          traceId,
          content: '',
          streamMode: 'apex_coordinator',
          apexMission,
          blocked: true,
        })
        controller.close()
      } catch (error) {
        if (!settled) {
          await spendSession.cancel().catch(() => {})
        }
        logger.error('apex_coordinator_stream_failed', error, { traceId })
        enqueue({
          type: 'error',
          error: 'APEX_MISSION_FAILED',
          message: error instanceof Error ? error.message : 'Apex MoA mission failed',
        })
        controller.close()
      } finally {
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort)
        }
      }
    },
    cancel() {
      if (!settled) {
        void spendSession.cancel().catch(() => {})
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Aethel-Spend-Resolver': '1',
      'X-Aethel-Stream-Mode': 'apex_coordinator',
    },
  })
}
