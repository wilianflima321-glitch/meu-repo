/**
 * #5 — CreativeCostGuard multi-stage spend (Law XVI Trava I) soak.
 * Proves the full state machine: reserve holds → settle debits actual (capped at the immutable
 * settle ceiling with cost_guard_settle_capped evidence) → settleZero/cancel refunds the hold.
 * Also proves deny paths, double-settle idempotency, memory-ledger overage-debit parity with
 * spend-resolver, spend-resolver refundability, and the metering adapter fail-closed deprecation.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { getPlanById } from '@/lib/plans'
import {
  DEFAULT_SETTLE_CEILING_MULTIPLIER,
  MAX_SETTLE_CEILING_MULTIPLIER,
  __resetCreativeCostGuardForTests,
  cancelCreativeCost,
  createMemoryCostGuardLedger,
  getCreativeCostReservation,
  reserveCreativeCost,
  settleCreativeCost,
  settleCreativeCostZero,
} from '@/lib/production/creative-cost-guard'
import { createMemorySpendResolverCostGuardAdapter } from '@/lib/production/creative-cost-guard-spend-adapter'
import { createMeteringCostGuardAdapter } from '@/lib/production/creative-cost-guard-metering-adapter'
import { __resetSpendResolverForTests } from '@/lib/ai/spend-resolver'

const pro = getPlanById('pro')!

const memoryPlanLimits = {
  tokensPerMonth: 100_000,
  tokensFastPerMonth: 100_000,
  tokensPremiumRawPerMonth: 0,
  aiPoolMode: 'single_fast',
  tokensPerDay: -1,
  requestsPerDay: -1,
  concurrent: -1,
  cloudProjectsMax: -1,
  storage: -1,
  collaborators: -1,
  contextWindow: 128000,
  historyDays: 30,
  chatHistoryCopyMaxMessages: -1,
} as const

describe('multi-stage spend: reserve → settle (ceiling enforced)', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetSpendResolverForTests()
  })

  it('refunds the delta when actual < estimate', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5000)
    const reserved = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 2000, planId: 'pro' },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    expect(ledger.balances.get('u1')).toBe(3000)
    await settleCreativeCost(reserved.reservation.reservationId, 1500, ledger)
    expect(ledger.balances.get('u1')).toBe(3500)
    expect(getCreativeCostReservation(reserved.reservation.reservationId)?.status).toBe('settled')
  })

  it('caps runaway actual at the default ceiling (1.0×) — charged the estimate, never overdraws', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5000)
    const reserved = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 2000, planId: 'pro' },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    // Provider reports 3× the estimate — the default ceiling (1.0×) caps at the estimate.
    await settleCreativeCost(reserved.reservation.reservationId, 6000, ledger)
    expect(ledger.balances.get('u1')).toBe(3000)
    const res = getCreativeCostReservation(reserved.reservation.reservationId)
    expect(res?.settleCeilingMultiplier).toBe(DEFAULT_SETTLE_CEILING_MULTIPLIER)
    expect(res?.status).toBe('settled')
  })

  it('debited bounded overage within a tolerance ceiling (parity with spend-resolver)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5000)
    const reserved = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'image',
        estimatedTokenWeight: 2000,
        planId: 'pro',
        settleCeilingMultiplier: 2,
      },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    // actual 3000 within the 2× ceiling → full overage (1000) is debited
    await settleCreativeCost(reserved.reservation.reservationId, 3000, ledger)
    expect(ledger.balances.get('u1')).toBe(2000)

    // actual 9000 beyond the 2× ceiling → capped at estimate×2 (4000)
    const reserved2 = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'image',
        estimatedTokenWeight: 2000,
        planId: 'pro',
        settleCeilingMultiplier: 2,
      },
      ledger,
    )
    expect(reserved2.ok).toBe(true)
    if (!reserved2.ok) return
    await settleCreativeCost(reserved2.reservation.reservationId, 9000, ledger)
    expect(ledger.balances.get('u1')).toBe(0)
  })

  it('clamps a caller-proposed ceiling into [1, MAX_SETTLE_CEILING_MULTIPLIER]', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 100_000)
    const high = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'image',
        estimatedTokenWeight: 1000,
        planId: 'pro',
        settleCeilingMultiplier: 99,
      },
      ledger,
    )
    expect(high.ok).toBe(true)
    if (!high.ok) return
    expect(high.reservation.settleCeilingMultiplier).toBe(MAX_SETTLE_CEILING_MULTIPLIER)

    const low = await reserveCreativeCost(
      {
        userId: 'u1',
        projectId: 'p1',
        domain: 'image',
        estimatedTokenWeight: 1000,
        planId: 'pro',
        settleCeilingMultiplier: 0.1,
      },
      ledger,
    )
    expect(low.ok).toBe(true)
    if (!low.ok) return
    expect(low.reservation.settleCeilingMultiplier).toBe(1)
  })

  it('settleZero refunds the full hold — zero charge on the lazy-reject path', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5000)
    const reserved = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 2000, planId: 'pro' },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    await settleCreativeCostZero(reserved.reservation.reservationId, ledger)
    expect(ledger.balances.get('u1')).toBe(5000)
    expect(getCreativeCostReservation(reserved.reservation.reservationId)?.status).toBe('settle_zero')
  })

  it('cancel refunds the full hold — aborted provider path', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5000)
    const reserved = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 2000, planId: 'pro' },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    await cancelCreativeCost(reserved.reservation.reservationId, ledger)
    expect(ledger.balances.get('u1')).toBe(5000)
    expect(getCreativeCostReservation(reserved.reservation.reservationId)?.status).toBe('cancelled')
  })

  it('double-settle is idempotent — the status guard skips any finalization after the first', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5000)
    const reserved = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 2000, planId: 'pro' },
      ledger,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    await settleCreativeCost(reserved.reservation.reservationId, 1500, ledger)
    expect(ledger.balances.get('u1')).toBe(3500)
    // second settle on an already-settled reservation is a no-op
    await settleCreativeCost(reserved.reservation.reservationId, 100, ledger)
    expect(ledger.balances.get('u1')).toBe(3500)
    // settleZero on a settled reservation is also a no-op
    await settleCreativeCostZero(reserved.reservation.reservationId, ledger)
    expect(ledger.balances.get('u1')).toBe(3500)
  })

  it('denies free tier without BYOK — zero platform pay (Trava I)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 100_000)
    const result = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 1000, planId: 'free' },
      ledger,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('free_tier_platform_pay_forbidden')
  })

  it('denies invalid estimates', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 100_000)
    const result = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 0, planId: 'pro' },
      ledger,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('invalid_estimate')
  })

  it('denies credits exhausted on the pool path', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 100)
    const result = await reserveCreativeCost(
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 1000, planId: 'pro' },
      ledger,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('credits_exhausted')
  })
})

describe('spend-resolver adapter remains fully refundable (two-phase)', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetSpendResolverForTests()
  })

  it('settleZero through the spend-resolver adapter never debits the ledger', async () => {
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
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 12_000, planId: 'pro' },
      adapter,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    await settleCreativeCostZero(reserved.reservation.reservationId, adapter)
    expect(adapter.ledger.subscriptionDebits).toHaveLength(0)
  })

  it('settles actual through the spend-resolver adapter when within the default ceiling', async () => {
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
      { userId: 'u1', projectId: 'p1', domain: 'image', estimatedTokenWeight: 12_000, planId: 'pro' },
      adapter,
    )
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    await settleCreativeCost(reserved.reservation.reservationId, 6000, adapter)
    expect(adapter.ledger.subscriptionDebits).toHaveLength(1)
  })
})

describe('single-phase metering adapter is fail-closed (silent-billing liability eliminated)', () => {
  it('reserve refuses instead of consuming UsageBucket', async () => {
    const adapter = createMeteringCostGuardAdapter({
      getPlanLimits: async () => memoryPlanLimits,
      hasByok: async () => false,
    })
    const result = await adapter.reservePool({ userId: 'u1', estimatedTokenWeight: 1000 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('cost_guard_denied')
  })
})
