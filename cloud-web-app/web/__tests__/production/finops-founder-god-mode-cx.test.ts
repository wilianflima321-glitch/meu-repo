/**
 * Letter cx — FinOps + Founder God Mode (router + gate + cadence).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  DOMAIN_ECONOMIC_ROUTER_LETTER,
  DOMAIN_ECONOMIC_ROUTER_WIRED,
  resolveEconomicLane,
  routeDomainEconomically,
  rejectDomainRouteWithSettleZero,
} from '@/lib/ai/domain-economic-router-policy'
import {
  createMemoryCostGuardLedger,
  reserveCreativeCost,
  getCreativeCostReservation,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import {
  enqueueHotFixEvent,
  __resetHotFixEventBusForTests,
  HOT_FIX_EVENT_BUS_LETTER,
  assertCadenceNotContinuousOpus,
} from '@/lib/production/hot-fix-event-bus'
import {
  proposeWeeklyEvolution,
  approveEvolutionProposal,
  rejectEvolutionProposal,
  __resetWeeklyEvolutionPlannerForTests,
  WEEKLY_EVOLUTION_LETTER,
} from '@/lib/production/weekly-evolution-planner'
import {
  runAutonomousEngineerLoop,
  AUTONOMOUS_ENGINEER_LOOP_LETTER,
  AUTONOMOUS_ENGINEER_L1_SANDBOX_HELD,
  wireHotFixBusToEngineerLoop,
} from '@/lib/production/autonomous-engineer-loop'
import {
  beginUiMutationTransaction,
  commitUiMutationTransaction,
  abortUiMutationTransaction,
  createMemoryUiMutationStore,
  __resetUiMutationTransactionsForTests,
  UI_MUTATION_TX_LETTER,
} from '@/lib/production/ui-mutation-transaction'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'
import { buildQualityCompetitorRadar, FAKE_UNREAL_FPS_FORBIDDEN } from '@/lib/production/quality-competitor-radar'
import { runCommunityPublishAaaAudit, COMMUNITY_AAA_AUDIT_LETTER } from '@/lib/production/community-publish-aaa-audit'
import { probeFinOpsFounderHonesty, FINOPS_FOUNDER_LETTER } from '@/lib/production/finops-founder-honesty'
import type { ApexMissionResult } from '@/lib/production/apex-mission-orchestrator'

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetHotFixEventBusForTests()
  __resetWeeklyEvolutionPlannerForTests()
  __resetUiMutationTransactionsForTests()
  __resetCreativeFusionTransactionsForTests()
})

describe('FinOps Founder flags (cx)', () => {
  it('wires letter cx and keeps L1 sandbox / FPS / Coins HELD', () => {
    expect(DOMAIN_ECONOMIC_ROUTER_LETTER).toBe('cx')
    expect(HOT_FIX_EVENT_BUS_LETTER).toBe('cx')
    expect(WEEKLY_EVOLUTION_LETTER).toBe('cx')
    expect(AUTONOMOUS_ENGINEER_LOOP_LETTER).toBe('cx')
    expect(UI_MUTATION_TX_LETTER).toBe('cx')
    expect(FINOPS_FOUNDER_LETTER).toBe('cx')
    expect(DOMAIN_ECONOMIC_ROUTER_WIRED).toBe(true)
    expect(AUTONOMOUS_ENGINEER_L1_SANDBOX_HELD).toBe(true)
    expect(FAKE_UNREAL_FPS_FORBIDDEN).toBe(true)

    const honesty = probeFinOpsFounderHonesty()
    expect(honesty.coinsInvented).toBe(false)
    expect(honesty.agonesInvented).toBe(false)
    expect(honesty.j11j12Stopped).toBe(true)
    expect(honesty.continuousOpusPollingForbidden).toBe(true)
    expect(honesty.orphanAdminDashboardForbidden).toBe(true)
  })
})

describe('Domain economic router (cx)', () => {
  it('routes UI→Sonnet lane and kernel→reasoning lane', async () => {
    expect(resolveEconomicLane('panels')).toBe('ui-sonnet')
    expect(resolveEconomicLane('physics')).toBe('kernel-reasoning')

    const ui = await routeDomainEconomically({ domain: 'ui', premiumAvailable: true })
    expect(ui.ok).toBe(true)
    if (ui.ok) {
      expect(ui.lane).toBe('ui-sonnet')
      expect(ui.modelId).not.toBe('anthropic/claude-opus-4')
      expect(ui.settleZeroOnReject).toBe(true)
    }

    const kernel = await routeDomainEconomically({ domain: 'kernel', premiumAvailable: true })
    expect(kernel.ok).toBe(true)
    if (kernel.ok) {
      expect(kernel.lane).toBe('kernel-reasoning')
      expect(['anthropic/claude-opus-4', 'x-ai/grok-3', 'qwen/qwen-2.5-72b-instruct']).toContain(
        kernel.modelId,
      )
    }
  })

  it('settle:0 on reject with CostGuard reservation', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 10_000)
    const reserved = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'ui',
        estimatedTokenWeight: 100,
        planId: 'pro',
      },
      adapter,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return

    const rejected = await rejectDomainRouteWithSettleZero({
      domain: 'ui',
      reason: 'lane_policy_forbidden',
      message: 'test reject',
      reservationId: reserved.reservation.reservationId,
      costGuardAdapter: adapter,
    })
    expect(rejected.settleZero).toBe(true)
    expect(rejected.settledZero).toBe(true)
    expect(getCreativeCostReservation(reserved.reservation.reservationId)?.status).toBe('settle_zero')
  })
})

describe('Cadence: hot-fix vs weekly evolution (cx)', () => {
  it('rejects continuous Opus polling and band-aid proposals', async () => {
    expect(assertCadenceNotContinuousOpus('hot-fix')).toBe(true)
    expect(assertCadenceNotContinuousOpus('weekly-evolution')).toBe(true)

    const poll = await enqueueHotFixEvent({
      projectId: 'p1',
      severity: 'blocker',
      domain: 'kernel',
      summary: 'soak fail',
      continuousPolling: true,
    })
    expect(poll.accepted).toBe(false)
    if (!poll.accepted) expect(poll.settleZero).toBe(true)

    const bandAid = proposeWeeklyEvolution({
      projectId: 'p1',
      title: 'Add null check bandaid',
      rootCause: 'architecture-debt',
      rationale: 'quick fix if-null',
      targetPaths: ['a.ts'],
      domain: 'code',
    })
    expect(bandAid.ok).toBe(false)
    if (!bandAid.ok) expect(bandAid.reason).toBe('band_aid_forbidden')
  })

  it('wires hot-fix bus listener and weekly approve/reject', async () => {
    const seen: string[] = []
    const unsub = wireHotFixBusToEngineerLoop((e) => {
      seen.push(e.eventId)
    })
    const enq = await enqueueHotFixEvent({
      projectId: 'p1',
      severity: 'l5-fail',
      domain: 'code',
      summary: 'L.5 typecheck failed on patch',
    })
    expect(enq.accepted).toBe(true)
    expect(seen.length).toBe(1)
    unsub()

    const proposed = proposeWeeklyEvolution({
      projectId: 'p1',
      title: 'Root-cause: split UI and kernel routing lanes',
      rootCause: 'cost-burn-misroute',
      rationale: 'Consolidate economic router so panel polish never burns Opus.',
      targetPaths: ['lib/ai/domain-economic-router-policy.ts'],
      domain: 'deep-refactor',
    })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return
    expect(approveEvolutionProposal(proposed.proposal.proposalId)?.status).toBe('approved')
    const rejected = rejectEvolutionProposal(proposed.proposal.proposalId)
    expect(rejected.settleZero).toBe(true)
    expect(rejected.proposal?.status).toBe('rejected')
  })
})

describe('AutonomousEngineerLoop + L.11 gate (cx)', () => {
  it('LazyInspector reject on APPLY path settles zero', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 50_000)
    const reserved = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'code',
        estimatedTokenWeight: 500,
        planId: 'pro',
      },
      adapter,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return

    const fakeMission = async (): Promise<ApexMissionResult> => ({
      missionId: 'm1',
      plan: {
        missionId: 'm1',
        maestroModelId: 'anthropic/claude-sonnet-4',
        criticalTask: {
          taskId: 't1',
          domain: 'code',
          intent: 'fix',
          allowedPaths: ['a.ts'],
          successCriteria: ['compiles'],
          riskScore: 40,
          generatorWidth: 1,
        },
        peripheralTasks: [],
        projectMemoryDigestId: 'mem',
        lawsPackId: 'laws',
        contextPackId: 'ctx',
        trivialBypass: true,
      },
      estimatedSpendTokens: 100,
      cells: [],
      verdict: 'APPLY',
      supremePatch: 'export const x = 1\n// TODO implement here\n',
      liveProvider: true,
      phases: [],
    })

    const result = await runAutonomousEngineerLoop({
      cadence: 'hot-fix',
      domain: 'code',
      userId: 'u1',
      planId: 'pro',
      projectId: 'p1',
      userPrompt: 'fix',
      targetFilePath: 'a.ts',
      reservationId: reserved.reservation.reservationId,
      costGuardAdapter: adapter,
      runMission: fakeMission,
    })
    expect(result.verdict).toBe('REJECT')
    expect(result.settleZero).toBe(true)
    expect(result.lazy?.verdict).toBe('REJECT')
    expect(getCreativeCostReservation(reserved.reservation.reservationId)?.status).toBe('settle_zero')
  })

  it('UIMutationTransaction commit/abort under FusionTx', async () => {
    const uiStore = createMemoryUiMutationStore()
    const fusionStore = createMemoryFusionScopeStore()
    uiStore.applySnapshot('p1', { tsx: 'A', css: 'B', previewDom: 'C' })
    const tx = await beginUiMutationTransaction({
      projectId: 'p1',
      store: uiStore,
      fusionStore,
    })
    await abortUiMutationTransaction({ txId: tx.id, store: uiStore, fusionStore })
    expect(uiStore.getSnapshot('p1').tsx).toBe('A')

    const tx2 = await beginUiMutationTransaction({
      projectId: 'p1',
      store: uiStore,
      fusionStore,
    })
    uiStore.applySnapshot('p1', { tsx: 'Z', css: 'B', previewDom: 'C' })
    await commitUiMutationTransaction({ txId: tx2.id, store: uiStore, fusionStore })
    expect(uiStore.getSnapshot('p1').tsx).toBe('Z')
  })
})

describe('Quality radar + community AAA audit (cx)', () => {
  it('radar never invents Unreal FPS and finops axis flips when wired', () => {
    const radar = buildQualityCompetitorRadar({
      domainEconomicRouterWired: true,
      weeklyEvolutionWired: true,
    })
    expect(radar.fakeUnrealFpsForbidden).toBe(true)
    expect(radar.marketingSurpassUnrealAllowed).toBe(false)
    expect(radar.letter).toBe('cx')
    const finops = radar.axes.find((a) => a.axis === 'forge-finops')
    expect(finops?.status).toBe('parity')
    expect(finops?.marketingClaimAllowed).toBe(false)
  })

  it('community AAA audit fail-closed without bake + settle:0 on polish offer', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const audit = await runCommunityPublishAaaAudit({
      userId: 'u1',
      projectId: 'p1',
      planId: 'free',
      byokProfileId: 'byok-1',
      adapter,
      bakedLightingEvidencePresent: false,
      meshManifoldOk: false,
      offerCreativeBridgePolish: true,
      polishPatchText: 'const ok = true',
    })
    expect(audit.letter).toBe(COMMUNITY_AAA_AUDIT_LETTER)
    expect(audit.ok).toBe(false)
    expect(audit.allowPublishSuccessArtifact).toBe(false)
    expect(audit.unrealAaaParityPass).toBe(false)
    expect(audit.coinsInvented).toBe(false)
    expect(audit.settledZero).toBe(true)
    expect(audit.suggestions.some((s) => s.id === 'baked-lighting-missing')).toBe(true)
  })
})
