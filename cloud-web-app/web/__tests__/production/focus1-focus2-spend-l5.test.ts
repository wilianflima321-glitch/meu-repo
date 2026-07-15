import { describe, expect, it, beforeEach } from 'vitest'
import { getPlanById } from '@/lib/plans'
import {
  __resetSpendResolverForTests,
  createMemorySpendLedger,
  decideSpendLane,
  reserveSpend,
  settleSpend,
  settleSpendZero,
} from '@/lib/ai/spend-resolver'
import { runProjectL5Typecheck } from '@/lib/production/project-l5-typecheck'
import { evaluateRendererHonesty } from '@/lib/production/renderer-honesty-capability'
import { runAutoHealLoop } from '@/lib/production/auto-heal-loop'
import {
  __resetCreativeCostGuardForTests,
  reserveCreativeCost,
  settleCreativeCostZero,
} from '@/lib/production/creative-cost-guard'
import { createMemorySpendResolverCostGuardAdapter } from '@/lib/production/creative-cost-guard-spend-adapter'

const pro = getPlanById('pro')!

describe('spend-resolver 6A.1', () => {
  beforeEach(() => {
    __resetSpendResolverForTests()
  })

  it('blocks Ultra on subscription without wallet', () => {
    const decision = decideSpendLane({
      userId: 'u1',
      planId: 'pro',
      planLimits: pro.limits,
      modelId: 'anthropic/claude-opus-4',
      estimatedRawTokens: 1000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.code).toBe('ULTRA_REQUIRES_WALLET')
  })

  it('applies 40× weight and settles once (no debit on settleZero)', async () => {
    const ledger = createMemorySpendLedger()
    const reserved = await reserveSpend({
      userId: 'u1',
      planId: 'pro',
      planLimits: pro.limits,
      modelId: 'anthropic/claude-sonnet-4',
      estimatedRawTokens: 1000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    expect(reserved.reservation.estimatedWeightedTokens).toBe(40_000)
    expect(reserved.reservation.lane).toBe('subscription_premium')

    await settleSpendZero(reserved.reservation.reservationId)
    expect(ledger.subscriptionDebits).toHaveLength(0)

    const reserved2 = await reserveSpend({
      userId: 'u1',
      planId: 'pro',
      planLimits: pro.limits,
      modelId: 'anthropic/claude-sonnet-4',
      estimatedRawTokens: 1000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(reserved2.ok).toBe(true)
    if (!reserved2.ok) return
    const settled = await settleSpend(
      { reservationId: reserved2.reservation.reservationId, actualRawTokens: 500 },
      ledger,
    )
    expect(settled.ok).toBe(true)
    expect(ledger.subscriptionDebits).toHaveLength(1)
    expect(ledger.subscriptionDebits[0].weightedTokens).toBe(20_000)
  })

  it('falls back to Fast when Premium pool exhausted', () => {
    const decision = decideSpendLane({
      userId: 'u1',
      planId: 'pro',
      planLimits: pro.limits,
      modelId: 'anthropic/claude-sonnet-4',
      estimatedRawTokens: 100,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: pro.limits.tokensPremiumRawPerMonth,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.lane).toBe('subscription_fast')
    expect(decision.fallbackFromPremium).toBe(true)
    expect(decision.noticeCode).toBe('PREMIUM_POOL_EXHAUSTED')
  })
})

describe('CostGuard ↔ spend-resolver settleZero', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetSpendResolverForTests()
  })

  it('refunds hold without debiting ledger', async () => {
    const adapter = createMemorySpendResolverCostGuardAdapter({
      getPlanId: async () => 'pro',
      getPlanLimits: async () => pro.limits,
      getUsage: async () => ({
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      }),
      hasByok: async () => false,
    })
    const reserved = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'image',
        estimatedTokenWeight: 12_000,
        planId: 'pro',
      },
      adapter,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    await settleCreativeCostZero(reserved.reservation.reservationId, adapter)
    expect(adapter.ledger.subscriptionDebits).toHaveLength(0)
  })
})

describe('project L.5 typecheck', () => {
  it('PASSes clean overlay', () => {
    const result = runProjectL5Typecheck({
      files: [
        {
          fileName: 'src/ok.ts',
          content: 'export function add(a: number, b: number): number { return a + b }\n',
        },
      ],
    })
    expect(result.verdict).toBe('PASS')
  })

  it('FAILs type errors and feeds Auto-Heal', async () => {
    const bad = 'export const x: number = "nope"\n'
    const gate = runProjectL5Typecheck({
      files: [{ fileName: 'src/bad.ts', content: bad }],
    })
    expect(gate.verdict).toBe('FAIL')
    expect(gate.compilerLog.length).toBeGreaterThan(0)

    const heal = await runAutoHealLoop({
      initialPatch: bad,
      validate: async (patch) =>
        runProjectL5Typecheck({ files: [{ fileName: 'src/bad.ts', content: patch }] }),
      repair: async () => ({
        patchText: 'export const x: number = 1\n',
      }),
      maxRounds: 2,
    })
    expect(heal.verdict).toBe('APPLY')
  })
})

describe('Focus 2A renderer honesty', () => {
  it('never markets AAA from webgl2-only + desktop held', () => {
    const report = evaluateRendererHonesty({
      webgpuAvailable: false,
      webgl2Available: true,
      desktopWgpuAvailable: false,
    })
    expect(report.web.activePath).toBe('webgl2')
    expect(report.desktop.status).toBe('held')
    expect(report.marketingAllowed).toBe(false)
    expect(report.web.placeboForbidden).toBe(true)
  })

  it('allows marketing only when both live', () => {
    const report = evaluateRendererHonesty({
      webgpuAvailable: true,
      desktopWgpuAvailable: true,
    })
    expect(report.marketingAllowed).toBe(true)
  })
})
