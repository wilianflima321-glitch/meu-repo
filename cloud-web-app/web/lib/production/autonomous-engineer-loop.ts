/**
 * Letter cx — AutonomousEngineerLoop (L.6) wire.
 * Weekly evolution + hot-fix events → Apex mission (Maestro/MoA → LazyInspector → L.5 → Heal).
 * Spec path: lib/production/autonomous-engineer-loop.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  routeDomainEconomically,
  rejectDomainRouteWithSettleZero,
  type ForgeWorkDomain,
} from '@/lib/ai/domain-economic-router-policy'
import {
  runApexCodeMission,
  type ApexMissionInput,
  type ApexMissionResult,
} from '@/lib/production/apex-mission-orchestrator'
import {
  enqueueHotFixEvent,
  subscribeHotFixEvents,
  type HotFixEvent,
} from '@/lib/production/hot-fix-event-bus'
import {
  approveEvolutionProposal,
  getEvolutionProposal,
  markEvolutionApplied,
  rejectEvolutionProposal,
  type WeeklyEvolutionProposal,
} from '@/lib/production/weekly-evolution-planner'
import {
  inspectLazyPatch,
  type LazyInspectorResult,
} from '@/lib/production/lazy-inspector'
import {
  settleCreativeCostZero,
  type CostGuardLedgerAdapter,
} from '@/lib/production/creative-cost-guard'
import {
  beginUiMutationTransaction,
  commitUiMutationTransaction,
  abortUiMutationTransaction,
  type UiMutationStore,
} from '@/lib/production/ui-mutation-transaction'
import type { FusionScopeStore } from '@/lib/production/creative-fusion-transaction'

const log = createComponentLogger('autonomous-engineer-loop')

export const AUTONOMOUS_ENGINEER_LOOP_LETTER = 'cx' as const
export const AUTONOMOUS_ENGINEER_LOOP_WIRED = true as const
/** Full Devin-class L.1 sandbox loop remains HELD — this wire uses Apex mission + cadence */
export const AUTONOMOUS_ENGINEER_L1_SANDBOX_HELD = true as const

export type EngineerLoopCadence = 'hot-fix' | 'weekly-evolution'

export interface EngineerLoopRunInput {
  cadence: EngineerLoopCadence
  domain: ForgeWorkDomain
  userId: string
  planId: string
  projectId: string
  userPrompt: string
  targetFilePath: string
  allowedPaths?: string[]
  riskScore?: number
  proposalId?: string
  hotFixEventId?: string
  reservationId?: string
  costGuardAdapter?: CostGuardLedgerAdapter
  /** When UI apply — optional L.11 surfaces */
  uiStore?: UiMutationStore
  fusionStore?: FusionScopeStore
  enableUiMutationOnApply?: boolean
  /** Inject Apex mission for tests */
  runMission?: (input: ApexMissionInput) => Promise<ApexMissionResult>
}

export interface EngineerLoopResult {
  cadence: EngineerLoopCadence
  domain: ForgeWorkDomain
  modelId?: string
  lazy?: LazyInspectorResult
  mission?: ApexMissionResult
  verdict: 'APPLY' | 'BLOCK' | 'ESCALATE' | 'REJECT'
  settleZero: boolean
  reason?: string
  proposal?: WeeklyEvolutionProposal
  uiMutationTxId?: string
  letter: typeof AUTONOMOUS_ENGINEER_LOOP_LETTER
}

/**
 * Wire Founder approve → L.6 mission. Reject → settle:0.
 */
export async function runAutonomousEngineerLoop(
  input: EngineerLoopRunInput,
): Promise<EngineerLoopResult> {
  const route = await routeDomainEconomically({
    domain: input.domain,
    premiumAvailable: input.planId.toLowerCase() !== 'free',
    reservationId: input.reservationId,
    costGuardAdapter: input.costGuardAdapter,
  })

  if (!route.ok) {
    return {
      cadence: input.cadence,
      domain: input.domain,
      verdict: 'REJECT',
      settleZero: true,
      reason: route.message,
      letter: AUTONOMOUS_ENGINEER_LOOP_LETTER,
    }
  }

  let proposal: WeeklyEvolutionProposal | undefined
  if (input.cadence === 'weekly-evolution' && input.proposalId) {
    const existing = getEvolutionProposal(input.proposalId)
    if (!existing || existing.status === 'rejected') {
      const rejected = await rejectDomainRouteWithSettleZero({
        domain: input.domain,
        reason: 'lane_policy_forbidden',
        message: 'Weekly evolution proposal missing or already rejected',
        reservationId: input.reservationId,
        costGuardAdapter: input.costGuardAdapter,
      })
      return {
        cadence: input.cadence,
        domain: input.domain,
        modelId: route.modelId,
        verdict: 'REJECT',
        settleZero: rejected.settleZero,
        reason: rejected.message,
        letter: AUTONOMOUS_ENGINEER_LOOP_LETTER,
      }
    }
    if (existing.status === 'proposed') {
      approveEvolutionProposal(existing.proposalId)
    }
    proposal = getEvolutionProposal(input.proposalId)
  }

  const missionInput: ApexMissionInput = {
    userId: input.userId,
    planId: input.planId,
    maestroModelId: route.modelId,
    userPrompt: input.userPrompt,
    targetFilePath: input.targetFilePath,
    allowedPaths: input.allowedPaths,
    riskScore: input.riskScore ?? (input.cadence === 'weekly-evolution' ? 70 : 55),
    contextPackId: proposal?.contextPackId,
  }

  const runMission = input.runMission ?? runApexCodeMission
  const mission = await runMission(missionInput)

  // Pre-apply LazyInspector on supreme patch (L.5 already inside mission; #66 belt)
  let lazy: LazyInspectorResult | undefined
  if (mission.supremePatch) {
    lazy = inspectLazyPatch(mission.supremePatch)
    if (lazy.verdict === 'REJECT') {
      if (input.reservationId && input.costGuardAdapter) {
        await settleCreativeCostZero(input.reservationId, input.costGuardAdapter)
      }
      if (input.proposalId) {
        rejectEvolutionProposal(input.proposalId)
      }
      log.warn('engineer_loop_lazy_reject', { missionId: mission.missionId, settleZero: true })
      return {
        cadence: input.cadence,
        domain: input.domain,
        modelId: route.modelId,
        lazy,
        mission,
        verdict: 'REJECT',
        settleZero: true,
        reason: 'LazyInspector REJECT — settle:0 (#66)',
        proposal,
        letter: AUTONOMOUS_ENGINEER_LOOP_LETTER,
      }
    }
  }

  if (mission.verdict !== 'APPLY') {
    if (input.reservationId && input.costGuardAdapter) {
      await settleCreativeCostZero(input.reservationId, input.costGuardAdapter)
    }
    return {
      cadence: input.cadence,
      domain: input.domain,
      modelId: route.modelId,
      lazy,
      mission,
      verdict: mission.verdict === 'ESCALATE' ? 'ESCALATE' : 'BLOCK',
      settleZero: true,
      reason: mission.reason ?? 'Mission did not reach APPLY',
      proposal,
      letter: AUTONOMOUS_ENGINEER_LOOP_LETTER,
    }
  }

  let uiMutationTxId: string | undefined
  if (
    input.enableUiMutationOnApply &&
    input.uiStore &&
    input.fusionStore &&
    (input.domain === 'ui' || input.domain === 'panels' || input.domain === 'agentic-ui')
  ) {
    const uiTx = await beginUiMutationTransaction({
      projectId: input.projectId,
      store: input.uiStore,
      fusionStore: input.fusionStore,
    })
    uiMutationTxId = uiTx.id
    try {
      await commitUiMutationTransaction({
        txId: uiTx.id,
        store: input.uiStore,
        fusionStore: input.fusionStore,
      })
    } catch (err) {
      await abortUiMutationTransaction({
        txId: uiTx.id,
        store: input.uiStore,
        fusionStore: input.fusionStore,
      })
      log.warn('ui_mutation_apply_aborted', { err: String(err) })
    }
  }

  if (input.proposalId) {
    markEvolutionApplied(input.proposalId)
    proposal = getEvolutionProposal(input.proposalId)
  }

  log.info('engineer_loop_apply', {
    cadence: input.cadence,
    missionId: mission.missionId,
    letter: AUTONOMOUS_ENGINEER_LOOP_LETTER,
  })

  return {
    cadence: input.cadence,
    domain: input.domain,
    modelId: route.modelId,
    lazy,
    mission,
    verdict: 'APPLY',
    settleZero: false,
    proposal,
    uiMutationTxId,
    letter: AUTONOMOUS_ENGINEER_LOOP_LETTER,
  }
}

/**
 * Subscribe hot-fix bus → optional engineer callback (event-driven, not polling).
 */
export function wireHotFixBusToEngineerLoop(
  handler: (event: HotFixEvent) => void | Promise<void>,
): () => void {
  return subscribeHotFixEvents(handler)
}

export { enqueueHotFixEvent }
