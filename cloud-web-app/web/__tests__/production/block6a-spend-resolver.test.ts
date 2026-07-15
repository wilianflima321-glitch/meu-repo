import { describe, expect, it, beforeEach } from 'vitest'
import {
  __resetSpendResolverForTests,
  cancelSpend,
  createMemorySpendLedger,
  decideSpendLane,
  reserveSpend,
  settleSpend,
} from '@/lib/ai/spend-resolver'
import {
  creditsForCustomUsd,
  getWalletCreditPack,
  parseCustomUsdAmount,
  totalCreditsForPack,
} from '@/lib/billing/wallet-credit-packs'

const dualPro = {
  tokensPerMonth: 4_500_000,
  tokensFastPerMonth: 3_000_000,
  tokensPremiumRawPerMonth: 37_500,
  aiPoolMode: 'dual' as const,
}

describe('spend-resolver Block 6A.5–6A.8', () => {
  beforeEach(() => {
    __resetSpendResolverForTests()
  })

  it('6A.5: Premium exhausted → Fast fallback with PREMIUM_POOL_EXHAUSTED notice', async () => {
    const reserved = await reserveSpend({
      userId: 'u1',
      planId: 'pro',
      planLimits: dualPro,
      modelId: 'anthropic/claude-sonnet-4',
      estimatedRawTokens: 1_000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 37_500,
        tokensWeightedUsed: 1_500_000,
        walletBalance: 0,
      },
    })
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    expect(reserved.reservation.lane).toBe('subscription_fast')
    expect(reserved.reservation.fallbackFromPremium).toBe(true)
    expect(reserved.noticeCode).toBe('PREMIUM_POOL_EXHAUSTED')
  })

  it('6A.5: Premium + Fast exhausted → QUOTA_EXCEEDED (no silent continue)', async () => {
    const reserved = await reserveSpend({
      userId: 'u2',
      planId: 'pro',
      planLimits: dualPro,
      modelId: 'anthropic/claude-sonnet-4',
      estimatedRawTokens: 1_000,
      usage: {
        tokensFastUsed: 3_000_000,
        tokensPremiumRawUsed: 37_500,
        tokensWeightedUsed: 4_500_000,
        walletBalance: 0,
      },
    })
    expect(reserved.ok).toBe(false)
    if (reserved.ok) return
    expect(reserved.code).toBe('QUOTA_EXCEEDED')
  })

  it('6A.6: Ultra on subscription path → ULTRA_REQUIRES_WALLET', () => {
    const decision = decideSpendLane({
      userId: 'u3',
      planId: 'pro',
      planLimits: dualPro,
      modelId: 'anthropic/claude-opus-4',
      estimatedRawTokens: 1_000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.code).toBe('ULTRA_REQUIRES_WALLET')
  })

  it('6A.6: Ultra with wallet balance → wallet lane', async () => {
    const reserved = await reserveSpend({
      userId: 'u4',
      planId: 'pro',
      planLimits: dualPro,
      modelId: 'openai/o1',
      estimatedRawTokens: 500,
      estimatedWalletCredits: 100,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 500,
      },
    })
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    expect(reserved.reservation.lane).toBe('wallet')
  })

  it('6A.7: cancelSpend releases hold with zero ledger debit', async () => {
    const ledger = createMemorySpendLedger()
    const reserved = await reserveSpend({
      userId: 'u5',
      planId: 'pro',
      planLimits: dualPro,
      modelId: 'openai/gpt-4o-mini',
      estimatedRawTokens: 2_000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    await cancelSpend(reserved.reservation.reservationId)
    const after = await settleSpend(
      { reservationId: reserved.reservation.reservationId, actualRawTokens: 2_000 },
      ledger,
    )
    expect(after.ok).toBe(false)
    if (after.ok) return
    expect(after.code).toBe('ALREADY_FINALIZED')
    expect(ledger.subscriptionDebits).toHaveLength(0)
  })

  it('6A.8: 40× weight settle once on premium lane', async () => {
    const ledger = createMemorySpendLedger()
    const reserved = await reserveSpend({
      userId: 'u6',
      planId: 'pro',
      planLimits: dualPro,
      modelId: 'anthropic/claude-sonnet-4',
      estimatedRawTokens: 1_000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    expect(reserved.reservation.lane).toBe('subscription_premium')
    const settled = await settleSpend(
      { reservationId: reserved.reservation.reservationId, actualRawTokens: 1_000 },
      ledger,
    )
    expect(settled.ok).toBe(true)
    if (!settled.ok) return
    expect(settled.actualWeighted).toBe(40_000)
    expect(ledger.subscriptionDebits).toHaveLength(1)
    expect(ledger.subscriptionDebits[0]?.weightedTokens).toBe(40_000)
  })
})

describe('wallet-credit-packs Block 6B', () => {
  it('matches PAYG pack table totals including bonus', () => {
    const creator = getWalletCreditPack('pack-1500')
    expect(creator).toBeTruthy()
    expect(totalCreditsForPack(creator!)).toBe(1600)
    expect(creator!.unitAmountCents).toBe(2499)
  })

  it('custom top-up enforces $5–$500 and credits at starter rate', () => {
    expect(parseCustomUsdAmount(4.99)).toBeNull()
    expect(parseCustomUsdAmount(5)).toBe(5)
    expect(creditsForCustomUsd(9.99)).toBe(500)
  })
})
