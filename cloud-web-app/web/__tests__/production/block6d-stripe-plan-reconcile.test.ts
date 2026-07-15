/**
 * Block 6D — stripe-plan-reconcile unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  PLAN_STALE_GRACE_MS,
  decideLazyPlanReconcile,
  downgradeUserPlanData,
  effectiveEntitlementPlanId,
  reconcilePlanFromPriceIds,
  resolveSubscriptionCheckoutLineItems,
  STRIPE_PRICE_CATALOG,
} from '@/lib/billing/stripe-plan-reconcile'

describe('stripe-plan-reconcile (6D)', () => {
  it('reconciles modular Pro base+IA placeholders', () => {
    const result = reconcilePlanFromPriceIds([
      STRIPE_PRICE_CATALOG.placeholders.proBase,
      STRIPE_PRICE_CATALOG.placeholders.proIaAddon,
    ])
    expect(result.plan).toBe('pro')
    expect(result.hasIaAddon).toBe(true)
  })

  it('grandfathers legacy basic price as Pro+IA', () => {
    const result = reconcilePlanFromPriceIds([STRIPE_PRICE_CATALOG.placeholders.basicLegacy])
    expect(result.plan).toBe('pro')
    expect(result.hasIaAddon).toBe(true)
  })

  it('maps entitlement basic → pro and starter_trial → free', () => {
    expect(effectiveEntitlementPlanId('basic')).toBe('pro')
    expect(effectiveEntitlementPlanId('starter_trial')).toBe('free')
    expect(effectiveEntitlementPlanId('studio')).toBe('studio')
  })

  it('downgrades on canceled subscription (6D.1)', () => {
    const decision = decideLazyPlanReconcile({
      userPlan: 'pro',
      subscription: { status: 'canceled', currentPeriodEnd: new Date(Date.now() + 86400000) },
      planVerifiedAt: new Date(),
    })
    expect(decision.action).toBe('downgrade_free')
  })

  it('lazy stale paid without sub after 1h (6D.2)', () => {
    const now = Date.now()
    const stale = decideLazyPlanReconcile({
      userPlan: 'pro',
      subscription: null,
      planVerifiedAt: new Date(now - PLAN_STALE_GRACE_MS - 1000),
      nowMs: now,
    })
    expect(stale).toEqual({ action: 'downgrade_free', reason: 'stale_paid_without_subscription' })

    const grace = decideLazyPlanReconcile({
      userPlan: 'pro',
      subscription: null,
      planVerifiedAt: new Date(now - 1000),
      nowMs: now,
    })
    expect(grace.action).toBe('honor')
    expect(grace.reason).toBe('webhook_grace_window')
  })

  it('downgrade payload clears subscription id', () => {
    const data = downgradeUserPlanData()
    expect(data.plan).toBe('free')
    expect(data.stripeSubscriptionId).toBeNull()
  })

  it('enterprise checkout held / contact sales (6D.6)', () => {
    const result = resolveSubscriptionCheckoutLineItems('enterprise')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.capabilityStatus).toBe('HELD')
      expect(result.message).toMatch(/Contact Sales/i)
    }
  })

  it('pro modular HELD when price env missing (6D.3 honest)', () => {
    const result = resolveSubscriptionCheckoutLineItems('pro', 'month')
    // Without env in test process → HELD (never fake success)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.capabilityStatus).toBe('HELD')
      expect(result.requiredEnv.length).toBeGreaterThan(0)
    }
  })
})
