/**
 * Block 6C — PAYG policy + spend-resolver payg lane.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  PAYG_ON_DEMAND_MARKUP,
  decidePaygCharge,
  parsePaygCapUsd,
  paygUsdCentsForCredits,
} from '@/lib/billing/payg-policy'
import {
  __resetSpendResolverForTests,
  createMemorySpendLedger,
  reserveSpend,
  settleSpend,
} from '@/lib/ai/spend-resolver'

const baseLimits = {
  tokensPerMonth: 1000,
  tokensFastPerMonth: 1000,
  tokensPremiumRawPerMonth: 0,
  aiPoolMode: 'single_fast' as const,
}

const exhaustedUsage = {
  tokensFastUsed: 1000,
  tokensPremiumRawUsed: 0,
  tokensWeightedUsed: 1000,
  walletBalance: 0,
}

describe('payg-policy (6C)', () => {
  it('rejects enable without valid cap', () => {
    expect(parsePaygCapUsd(undefined)).toBeNull()
    expect(parsePaygCapUsd(5)).toBeNull()
    expect(parsePaygCapUsd(25)).toBe(25)
    expect(parsePaygCapUsd(40)).toBe(40)
  })

  it('applies ×1.10 on-demand markup vs prepaid', () => {
    const cents = paygUsdCentsForCredits(500)
    // 500 credits @ $9.99 prepaid = 999 cents → ×1.10 = 1099
    expect(cents).toBe(Math.ceil(999 * PAYG_ON_DEMAND_MARKUP))
  })

  it('blocks when accrued would exceed cap', () => {
    const denied = decidePaygCharge(
      {
        enabled: true,
        spendCapUsdCents: 2500,
        accruedUsdCents: 2400,
        periodKey: '2026-07',
        hasPaymentMethod: false,
      },
      500,
    )
    expect(denied.allowed).toBe(false)
    if (!denied.allowed) expect(denied.code).toBe('PAYG_CAP_REACHED')
  })
})

describe('spend-resolver PAYG lane (6C)', () => {
  beforeEach(() => {
    __resetSpendResolverForTests()
  })

  it('uses payg when pools+wallet empty and cap allows', async () => {
    const reserved = await reserveSpend({
      userId: 'u-payg',
      planId: 'pro',
      planLimits: baseLimits,
      modelId: 'google/gemini-2.5-flash',
      estimatedRawTokens: 100,
      estimatedWalletCredits: 10,
      allowWalletFallback: true,
      payg: { enabled: true, spendCapUsdCents: 2500, accruedUsdCents: 0 },
      usage: exhaustedUsage,
    })
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    expect(reserved.reservation.lane).toBe('payg')
    expect(reserved.reservation.estimatedPaygUsdCents).toBeGreaterThan(0)

    const ledger = createMemorySpendLedger()
    const settled = await settleSpend(
      { reservationId: reserved.reservation.reservationId, actualRawTokens: 100 },
      ledger,
    )
    expect(settled.ok).toBe(true)
    expect(ledger.paygDebits).toHaveLength(1)
  })

  it('returns PAYG_CAP_REACHED when cap would be exceeded', async () => {
    const reserved = await reserveSpend({
      userId: 'u-cap',
      planId: 'pro',
      planLimits: baseLimits,
      modelId: 'google/gemini-2.5-flash',
      estimatedRawTokens: 100,
      estimatedWalletCredits: 500,
      allowWalletFallback: true,
      payg: { enabled: true, spendCapUsdCents: 100, accruedUsdCents: 90 },
      usage: exhaustedUsage,
    })
    expect(reserved.ok).toBe(false)
    if (reserved.ok) return
    expect(reserved.code).toBe('PAYG_CAP_REACHED')
  })
})
