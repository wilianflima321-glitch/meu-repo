import { describe, expect, it, beforeEach } from 'vitest'

import { injectAntiLazySystemPrompt } from '@/lib/ai/fusion-anti-lazy-system'
import { evaluateArchitectureLawsGate } from '@/lib/ai/architecture-laws-gate'
import {
  adaptiveMoAWidth,
  assertNoNanoInRegistry,
  selectApexForDomain,
  selectMoAGenerators,
} from '@/lib/ai/fusion-specialist-registry'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'
import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
  reserveCreativeCost,
  settleCreativeCostZero,
} from '@/lib/production/creative-cost-guard'
import {
  __resetCreativeFusionTransactionsForTests,
  abortCreativeFusionTransaction,
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  createMemoryFusionScopeStore,
  recordFusionMutation,
} from '@/lib/production/creative-fusion-transaction'
import {
  canRetryLazyReject,
  inspectLazyPatch,
} from '@/lib/production/lazy-inspector'
import { buildMultiSurfaceContextPack } from '@/lib/production/multi-surface-context-pack'
import { extractVideoToMechanicScaffold } from '@/lib/production/video-to-scaffold-extractor'

describe('Law XVI creative-cost-guard', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
  })

  it('blocks free tier without BYOK (zero platform pay)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 100_000)
    const result = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'image',
        estimatedTokenWeight: 1000,
        planId: 'free',
      },
      ledger,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('free_tier_platform_pay_forbidden')
  })

  it('reserves and settleZero refunds pool (lazy reject path)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5000)
    const reserved = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'code-patch',
        estimatedTokenWeight: 2000,
        planId: 'pro',
      },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    expect(ledger.balances.get('u1')).toBe(3000)
    await settleCreativeCostZero(reserved.reservation.reservationId, ledger)
    expect(ledger.balances.get('u1')).toBe(5000)
  })
})

describe('Law XVI creative-fusion-transaction', () => {
  beforeEach(() => {
    __resetCreativeFusionTransactionsForTests()
  })

  it('commits mutations and abort restores before snapshot', async () => {
    const store = createMemoryFusionScopeStore()
    store.applySnapshot('p1', 'scene', JSON.stringify({ entities: ['a'] }))
    const tx = await beginCreativeFusionTransaction({
      projectId: 'p1',
      yDocScope: 'scene',
      store,
    })
    recordFusionMutation(tx.id, store, JSON.stringify({ entities: ['a', 'b'] }))
    const committed = await commitCreativeFusionTransaction(tx.id, store)
    expect(committed.snapshotHashAfter).toBeTruthy()
    expect(JSON.parse(store.getSnapshot('p1', 'scene')).entities).toEqual(['a', 'b'])

    const tx2 = await beginCreativeFusionTransaction({
      projectId: 'p1',
      yDocScope: 'scene',
      store,
    })
    recordFusionMutation(tx2.id, store, JSON.stringify({ entities: ['wrecked'] }))
    await abortCreativeFusionTransaction(tx2.id, store)
    expect(JSON.parse(store.getSnapshot('p1', 'scene')).entities).toEqual(['a', 'b'])
  })
})

describe('Law XVI creative-artifact-bridge', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetCreativeFusionTransactionsForTests()
  })

  it('fail-closes without FusionTx on write domains', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const { result } = await dispatchCreativeArtifact({
      request: {
        domain: 'vs-graph',
        prompt: 'add stealth state',
        projectId: 'p1',
        userId: 'u1',
        costGuard: { estimatedTokenWeight: 1000, planId: 'pro' },
      },
      adapter: ledger,
      provider: async () => ({
        artifactId: 'x',
        provider: 'test',
        costUsd: 0.01,
        actualTokenWeight: 500,
      }),
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('transaction_aborted')
  })

  it('dispatches after CostGuard + open FusionTx and rejects empty artifact', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 10_000)
    const store = createMemoryFusionScopeStore()
    const tx = await beginCreativeFusionTransaction({
      projectId: 'p1',
      yDocScope: 'manifest',
      store,
    })

    const empty = await dispatchCreativeArtifact({
      request: {
        domain: 'image',
        prompt: 'rock albedo',
        projectId: 'p1',
        userId: 'u1',
        fusionTransactionId: tx.id,
        requiresFusionWrite: true,
        costGuard: { estimatedTokenWeight: 1000, planId: 'pro' },
      },
      adapter,
      provider: async () => ({
        artifactId: '',
        provider: 'test',
        costUsd: 0,
        actualTokenWeight: 100,
        empty: true,
      }),
    })
    expect(empty.result.success).toBe(false)
    expect(empty.result.blockedReason).toBe('empty_artifact')

    const ok = await dispatchCreativeArtifact({
      request: {
        domain: 'image',
        prompt: 'rock albedo',
        projectId: 'p1',
        userId: 'u1',
        fusionTransactionId: tx.id,
        requiresFusionWrite: true,
        costGuard: { estimatedTokenWeight: 1000, planId: 'pro' },
      },
      adapter,
      provider: async () => ({
        artifactId: 'art_1',
        previewUrl: 'https://example.invalid/p',
        provider: 'test-provider',
        costUsd: 0.02,
        actualTokenWeight: 800,
      }),
    })
    expect(ok.result.success).toBe(true)
    expect(ok.result.artifactId).toBe('art_1')
    expect(ok.ledger.events.some((e) => e.kind === 'artifact')).toBe(true)
  })
})

describe('Decision #66 lazy-inspector', () => {
  it('rejects TODO and comment elision in new hunks', () => {
    const diff = [
      '--- a/x.ts',
      '+++ b/x.ts',
      '@@ -1,3 +1,5 @@',
      ' export function jump() {',
      '+  // ... rest of code',
      '+  // TODO: implement physics',
      ' }',
    ].join('\n')
    const result = inspectLazyPatch(diff, 0)
    expect(result.verdict).toBe('REJECT')
    expect(result.settleZero).toBe(true)
    expect(result.matchedPatterns.length).toBeGreaterThan(0)
    expect(canRetryLazyReject(result.lazyRejectCount)).toBe(true)
  })

  it('passes clean complete function and allows TS spread', () => {
    const content = `export function merge(a: number[], b: number[]) {\n  return [...a, ...b]\n}\n`
    expect(inspectLazyPatch(content).verdict).toBe('PASS')
  })
})

describe('fusion-anti-lazy-system', () => {
  it('injects anti-truncation system prompt', () => {
    const prompt = injectAntiLazySystemPrompt('You are a coding agent.')
    expect(prompt).toContain('terminantly forbidden')
    expect(prompt).toContain('You are a coding agent.')
  })
})

describe('architecture-laws-gate #58', () => {
  it('blocks write without laws/cartography/pack/memory', () => {
    const blocked = evaluateArchitectureLawsGate({
      projectId: 'p1',
      intent: 'apply',
    })
    expect(blocked.verdict).toBe('BLOCK')
    expect(blocked.missing).toEqual(
      expect.arrayContaining(['laws_pack', 'cartography', 'context_pack', 'project_memory']),
    )
  })

  it('passes when full context present', () => {
    const ok = evaluateArchitectureLawsGate({
      projectId: 'p1',
      intent: 'apply',
      lawsPackId: 'laws-1',
      cartographyManifestId: 'cart-1',
      contextPackId: 'pack-1',
      projectMemoryDigestId: 'mem-1',
    })
    expect(ok.verdict).toBe('PASS')
  })
})

describe('fusion-specialist-registry Apex', () => {
  it('never registers nano and selects apex by domain', () => {
    expect(() => assertNoNanoInRegistry()).not.toThrow()
    const model = selectApexForDomain({ domain: 'code', preferOpenWeights: true })
    expect(model?.openWeights).toBe(true)
    expect(model?.qualityTier).not.toBe('nano')
  })

  it('adaptive MoA width follows #62', () => {
    expect(adaptiveMoAWidth(10, 'pro')).toBe(1)
    expect(adaptiveMoAWidth(50, 'pro')).toBe(2)
    expect(adaptiveMoAWidth(80, 'pro')).toBe(3)
    expect(adaptiveMoAWidth(99, 'free')).toBe(1)
    expect(selectMoAGenerators({ domain: 'code', width: 2 }).length).toBe(2)
  })
})

describe('Trava III video-to-scaffold', () => {
  it('returns SM+BT scaffold without auto physics', () => {
    const result = extractVideoToMechanicScaffold({
      projectId: 'p1',
      clips: [
        { clipId: 'c1', durationMs: 1000, label: 'Idle' },
        { clipId: 'c2', durationMs: 1000, label: 'Attack' },
      ],
      missionLabel: 'Stealth beat',
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.autoPhysics).toBe(false)
    expect(result.physicsWiringRequired).toBe(true)
    expect(result.behaviorTree.root.children.every((c) => c.stub)).toBe(true)
  })

  it('rejects video→GTA marketing claims', () => {
    const denied = extractVideoToMechanicScaffold({
      projectId: 'p1',
      clips: [{ clipId: 'c1', durationMs: 500 }],
      missionLabel: 'Make it playable AAA GTA',
    })
    expect(denied.success).toBe(false)
  })
})

describe('L.14 multi-surface-context-pack', () => {
  it('omits DOM for game-3d and omits scene for web-react', () => {
    const game = buildMultiSurfaceContextPack({
      projectId: 'p1',
      mode: 'game-3d',
      tokenBudget: 2000,
      codeChunks: [{ path: 'a.ts', content: ' cons x = 1', tokenEstimate: 10 }],
      sceneSelection: ['player'],
      previewDomSnapshot: '<div/>',
      terminalTail: 'error',
    })
    expect(game.activeSurfaces).toContain('scene')
    expect(game.sceneSelection).toEqual(['player'])
    expect(game.previewDomSnapshot).toBeUndefined()
    expect(game.terminalTail).toBeUndefined()

    const web = buildMultiSurfaceContextPack({
      projectId: 'p1',
      mode: 'web-react',
      tokenBudget: 2000,
      previewDomSnapshot: '<button/>',
      sceneSelection: ['mesh'],
    })
    expect(web.previewDomSnapshot).toBe('<button/>')
    expect(web.sceneSelection).toBeUndefined()
  })
})
