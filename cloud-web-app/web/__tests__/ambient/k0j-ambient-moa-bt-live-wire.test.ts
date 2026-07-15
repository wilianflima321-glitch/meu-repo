/**
 * K.0/J AmbientEmotionDelta live wire — MoA + BT + CostGuard suppressor (letter az).
 * Zero-UI / enhancement-only: probe-fail → classic path, no error surface.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import { Blackboard } from '@/lib/ai/behavior-tree-blackboard'
import {
  AmbientEmotionConditionNode,
  recomputeNpcPriorityFromAmbientBlackboard,
} from '@/lib/ai/behavior-tree-nodes'
import {
  AMBIENT_BT_KEYS,
  createAethelAmbientApi,
  createGameplayHeuristicEmotionProvider,
  resetAethelAmbientApiForTests,
  resetAmbientMoALiveWireForTests,
  silentAmbientStartupProbe,
  subscribeAmbientEmotionForMoA,
  wireAmbientEmotionDeltaLive,
} from '@/lib/ambient'
import {
  appendAmbientCriticalHintToPrompt,
  enrichApexMoAPromptWithAmbient,
  stampMultiSurfacePackWithAmbient,
  subscribeAmbientEmotionDeltaToMoA,
} from '@/lib/production/apex-moa-orchestrator'
import { buildMultiSurfaceContextPack } from '@/lib/production/multi-surface-context-pack'
import {
  createMemoryCostGuardLedger,
  reserveCreativeCost,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import type { BehaviorContext } from '@/lib/ai/behavior-tree-types'

describe('Zero-UI / enhancement-only probe', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
    resetAmbientMoALiveWireForTests()
  })

  it('probe-fail / ethernet produces no error surface and classic provider', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'ethernet' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const silent = silentAmbientStartupProbe(api, { linkMedium: 'ethernet' })
    expect(silent.errorSurface).toBeNull()
    expect(silent.classicPath).toBe(true)
    expect(silent.csiReady).toBe(false)
    expect(api.probeCapability().csiReady).toBe(false)
    expect(api.getProviderId()).toBe('gameplay-heuristic')
  })

  it('onEmotion listener throw is swallowed (Zero-UI)', () => {
    const api = createAethelAmbientApi({
      probeInput: { linkMedium: 'none' },
      provider: createGameplayHeuristicEmotionProvider(),
    })
    api.onEmotion(() => {
      throw new Error('should not surface')
    })
    expect(() =>
      api.ingestGameplayHeuristic({ damageIntensity: 0.2, nowMs: 1 }),
    ).not.toThrow()
  })
})

describe('Ambient → local BT wire ($0)', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
    resetAmbientMoALiveWireForTests()
  })

  it('writes blackboard keys and recomputes NPC priority on emotion change', () => {
    const api = createAethelAmbientApi({
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const board = new Blackboard()
    const biases: string[] = []

    const wire = wireAmbientEmotionDeltaLive({
      api,
      blackboards: [board],
      onBtEmotion: ({ priorityBias }) => biases.push(priorityBias),
    })

    api.ingestGameplayHeuristic({
      damageIntensity: 0.9,
      msSinceThreat: 100,
      nowMs: 1_000,
    })

    expect(board.get(AMBIENT_BT_KEYS.emotion)).toBe('panicked')
    expect(board.get(AMBIENT_BT_KEYS.heartRateHeld)).toBe(true)
    expect(board.get(AMBIENT_BT_KEYS.npcPriorityBias)).toBe('critical')
    expect(recomputeNpcPriorityFromAmbientBlackboard(board, 1)).toBe(2)
    expect(biases[0]).toBe('critical')

    const agent = { id: 'npc-1' } as BehaviorContext['agent']
    const ctx: BehaviorContext = { blackboard: board, agent, deltaTime: 0.016 }
    const cond = new AmbientEmotionConditionNode('is_panicked', 'panicked')
    expect(cond.tick(ctx)).toBe('success')

    wire.stop()
  })

  it('classic BT path when ambient keys absent (no throw)', () => {
    const board = new Blackboard()
    expect(recomputeNpcPriorityFromAmbientBlackboard(board, 1)).toBe(1)
    const agent = { id: 'npc-2' } as BehaviorContext['agent']
    const ctx: BehaviorContext = { blackboard: board, agent, deltaTime: 0.016 }
    const cond = new AmbientEmotionConditionNode('is_stressed', 'stressed')
    expect(cond.tick(ctx)).toBe('failure')
  })
})

describe('Ambient → MoA via CostGuard suppressor', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
    resetAmbientMoALiveWireForTests()
    __resetCreativeCostGuardForTests()
  })

  it('escalates critical deltas to MoA and stamps MultiSurface pack', () => {
    const api = createAethelAmbientApi({
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const escalations: string[] = []
    const wire = subscribeAmbientEmotionDeltaToMoA({
      api,
      onCritical: ({ moaPort }) => {
        escalations.push(moaPort.ambientEmotionSlice!.label)
      },
    })

    // calm first then panicked transition
    api.ingestGameplayHeuristic({ damageIntensity: 0, nowMs: 1_000 })
    api.ingestGameplayHeuristic({
      damageIntensity: 0.95,
      msSinceThreat: 50,
      nowMs: 2_000,
    })

    expect(escalations.length).toBeGreaterThanOrEqual(1)
    expect(escalations[0]).toBe('panicked')
    expect(wire.getLatestMoASlice()?.physiologyHeld).toBe(true)

    const pack = buildMultiSurfaceContextPack({
      projectId: 'p1',
      mode: 'game-3d',
      tokenBudget: 3000,
      ambientCriticalDelta: wire.getLatestMoASlice()
        ? {
            label: wire.getLatestMoASlice()!.label,
            confidence: wire.getLatestMoASlice()!.confidence,
            source: wire.getLatestMoASlice()!.source,
            physiologyHeld: true,
          }
        : undefined,
    })
    expect(pack.ambientCriticalDelta?.label).toBe('panicked')

    const stamped = stampMultiSurfacePackWithAmbient({
      ...pack,
      ambientCriticalDelta: undefined,
    })
    expect(stamped.ambientCriticalDelta?.label).toBe('panicked')

    const prompted = enrichApexMoAPromptWithAmbient('Rewrite NPC bark')
    expect(prompted).toContain('AmbientEmotionDelta')
    expect(prompted).toContain('panicked')

    wire.stop()
    resetAmbientMoALiveWireForTests()
  })

  it('suppresses routine deltas — settle:0; no MoA slice pollution', () => {
    const api = createAethelAmbientApi({
      provider: createGameplayHeuristicEmotionProvider(),
    })
    let moaHits = 0
    const wire = wireAmbientEmotionDeltaLive({
      api,
      onMoAEscalation: () => {
        moaHits += 1
      },
    })

    api.ingestGameplayHeuristic({ damageIntensity: 0, exertion: 0.1, nowMs: 5_000 })
    expect(moaHits).toBe(0)
    expect(wire.getLatestMoASlice()).toBeUndefined()
    const decision = wire.getLastDecision()
    expect(decision?.allow).toBe(false)
    if (decision && !decision.allow) {
      expect(decision.settleOnReject).toBe(0)
    }

    const prompt = appendAmbientCriticalHintToPrompt('base', wire.getLatestMoASlice())
    expect(prompt).toBe('base')
    wire.stop()
  })

  it('Law XVI: suppressed escalation settles CostGuard reservation to zero', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 100)
    ledger.enableByok('u1')

    const api = createAethelAmbientApi({
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const wire = wireAmbientEmotionDeltaLive({
      api,
      costGuardAdapter: ledger,
    })

    const reserved = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'ambient-emotion-moa',
        estimatedTokenWeight: 10,
        byokProfileId: 'byok-1',
        planId: 'pro',
      },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return

    api.ingestGameplayHeuristic({ damageIntensity: 0, nowMs: 9_000 })
    await wire.settleRejectedReservation(reserved.reservation)
    expect(wire.getLastDecision()?.allow).toBe(false)
    wire.stop()
  })
})

describe('subscribeAmbientEmotionForMoA singleton', () => {
  beforeEach(() => {
    resetAethelAmbientApiForTests()
    resetAmbientMoALiveWireForTests()
  })

  it('reuses singleton handle', () => {
    const api = createAethelAmbientApi({
      provider: createGameplayHeuristicEmotionProvider(),
    })
    const a = subscribeAmbientEmotionForMoA({ api })
    const b = subscribeAmbientEmotionForMoA({ api })
    expect(a).toBe(b)
    a.stop()
    resetAmbientMoALiveWireForTests()
  })
})