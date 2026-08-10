/**
 * Creative Generation Honesty Matrix #2 — collapse dual Bridge surfaces.
 * lib/ai/* must re-export production choke; legacy class APIs fail-closed.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it, beforeEach } from 'vitest'

import {
  CREATIVE_ARTIFACT_BRIDGE_CANONICAL,
  CreativeArtifactBridge as AiLegacyBridge,
  dispatchCreativeArtifact as aiDispatch,
} from '@/lib/ai/creative-artifact-bridge'
import {
  CREATIVE_COST_GUARD_CANONICAL,
  CreativeCostGuard as AiLegacyCostGuard,
  createMemoryCostGuardLedger as aiCreateLedger,
  reserveCreativeCost as aiReserve,
} from '@/lib/ai/creative-cost-guard'
import {
  CREATIVE_FUSION_TRANSACTION_CANONICAL,
  CreativeFusionTransaction as AiLegacyFusion,
  beginCreativeFusionTransaction as aiBeginFusion,
  createMemoryFusionScopeStore as aiCreateFusionStore,
} from '@/lib/ai/creative-fusion-transaction'
import { dispatchCreativeArtifact as prodDispatch } from '@/lib/production/creative-artifact-bridge'
import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger as prodCreateLedger,
  reserveCreativeCost as prodReserve,
} from '@/lib/production/creative-cost-guard'
import {
  __resetCreativeFusionTransactionsForTests,
  beginCreativeFusionTransaction as prodBeginFusion,
  createMemoryFusionScopeStore as prodCreateFusionStore,
} from '@/lib/production/creative-fusion-transaction'

const WEB_ROOT = join(__dirname, '../..')

describe('collapse dual Creative Bridge (Honesty Matrix #2)', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetCreativeFusionTransactionsForTests()
  })

  it('marks production modules as the only canonical choke paths', () => {
    expect(CREATIVE_ARTIFACT_BRIDGE_CANONICAL).toBe('lib/production/creative-artifact-bridge')
    expect(CREATIVE_COST_GUARD_CANONICAL).toBe('lib/production/creative-cost-guard')
    expect(CREATIVE_FUSION_TRANSACTION_CANONICAL).toBe(
      'lib/production/creative-fusion-transaction',
    )
  })

  it('re-exports the same dispatchCreativeArtifact function identity', () => {
    expect(aiDispatch).toBe(prodDispatch)
  })

  it('routes CostGuard reserve through the production ledger choke', async () => {
    expect(aiReserve).toBe(prodReserve)
    expect(aiCreateLedger).toBe(prodCreateLedger)

    const ledger = aiCreateLedger()
    ledger.grant('u1', 100_000)
    const denied = await aiReserve(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'image',
        estimatedTokenWeight: 1000,
        planId: 'free',
      },
      ledger,
    )
    expect(denied.ok).toBe(false)
    if (!denied.ok) expect(denied.reason).toBe('free_tier_platform_pay_forbidden')
  })

  it('fail-closes legacy lib/ai class APIs (no parallel CostGuard/Fusion)', async () => {
    await expect(AiLegacyBridge.generateAndApply()).rejects.toThrow(/single CostGuard choke/)
    await expect(AiLegacyCostGuard.reserveTokens()).rejects.toThrow(/deprecated/)
    await expect(AiLegacyFusion.executeAtomically()).rejects.toThrow(/deprecated/)
  })

  it('Fusion begin via lib/ai re-export is production begin (Trava II)', async () => {
    expect(aiBeginFusion).toBe(prodBeginFusion)
    expect(aiCreateFusionStore).toBe(prodCreateFusionStore)
    const store = aiCreateFusionStore()
    const tx = await aiBeginFusion({
      projectId: 'p-dual',
      yDocScope: 'manifest',
      store,
    })
    expect(tx.id.length).toBeGreaterThan(0)
    expect(tx.status).toBe('open')
  })

  it('dispatch via lib/ai still requires FusionTx on write domains', async () => {
    const ledger = aiCreateLedger()
    ledger.grant('u1', 10_000)
    const { result } = await aiDispatch({
      request: {
        domain: 'vs-graph',
        prompt: 'stealth',
        projectId: 'p1',
        userId: 'u1',
        costGuard: { estimatedTokenWeight: 500, planId: 'pro' },
      },
      adapter: ledger,
      provider: async () => ({
        artifactId: 'x',
        provider: 'test',
        costUsd: 0.01,
        actualTokenWeight: 100,
      }),
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('transaction_aborted')
  })

  it('lib/ai bridge sources only re-export production (no second CostGuard body)', () => {
    const bridge = readFileSync(
      join(WEB_ROOT, 'lib/ai/creative-artifact-bridge.ts'),
      'utf8',
    )
    const cost = readFileSync(join(WEB_ROOT, 'lib/ai/creative-cost-guard.ts'), 'utf8')
    const fusion = readFileSync(
      join(WEB_ROOT, 'lib/ai/creative-fusion-transaction.ts'),
      'utf8',
    )
    expect(bridge).toContain("from '@/lib/production/creative-artifact-bridge'")
    expect(bridge).not.toContain('aiService')
    expect(cost).toContain("from '@/lib/production/creative-cost-guard'")
    expect(cost).not.toContain('beginChatSpendSession')
    expect(cost).not.toContain("from '../db'")
    expect(fusion).toContain("from '@/lib/production/creative-fusion-transaction'")
    expect(fusion).not.toContain("from 'yjs'")
  })

  it('expensive creative generate routes use production HTTP Bridge choke', () => {
    const routes = [
      'app/api/ai/image/generate/route.ts',
      'app/api/ai/3d/generate/route.ts',
      'app/api/ai/music/generate/route.ts',
      'app/api/ai/video/generate/route.ts',
      'app/api/ai/voice/generate/route.ts',
    ]
    for (const rel of routes) {
      const src = readFileSync(join(WEB_ROOT, rel), 'utf8')
      expect(src).toContain('runExpensiveCreativeViaBridge')
      expect(src).toContain('@/lib/production/creative-bridge-http-dispatch')
      expect(src).not.toContain('@/lib/ai/creative-artifact-bridge')
    }
    const scaffold = readFileSync(
      join(WEB_ROOT, 'app/api/ai/video/scaffold/route.ts'),
      'utf8',
    )
    expect(scaffold).toContain('@/lib/production/creative-cost-guard-creative-wallet-adapter')
    expect(scaffold).toContain('runVideoToMechanicOperator')
  })
})
