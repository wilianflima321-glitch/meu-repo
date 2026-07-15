/**
 * Block 6D — Stripe plan reconciliation (canonical).
 * Webhook + entitlements MUST import from here — never duplicate Price ID maps.
 *
 * Closes: DEBT-FIN-005 (cancel → free), DEBT-FIN-013 (lazy stale downgrade ≤1h).
 * 6D.3 modular Price IDs: live when env set; otherwise honest HELD / legacy_single.
 */

import { optionalEnv } from '@/lib/env'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('stripe-plan-reconcile')

/** Lazy reconcile grace: paid plan without active sub → free after this (Master Map ≤1h). */
export const PLAN_STALE_GRACE_MS = 60 * 60 * 1000

/**
 * Canonical Price ID → plan map.
 * Prefer live Stripe Price IDs via env; placeholders document modular SKUs until live.
 */
export const STRIPE_PRICE_CATALOG = {
  /** Documented modular SKUs (6D.3) — replace with live IDs via env overrides */
  placeholders: {
    proBase: 'price_pro_base_15',
    proIaAddon: 'price_pro_ia_addon_14',
    studioBase: 'price_studio_base_45',
    studioIaAddon: 'price_studio_ia_addon_34',
    starter: 'price_starter_9',
    /** Legacy Basic $29 → grandfather Pro+IA */
    basicLegacy: 'price_basic_29',
  },
} as const

export type PricePlanComponent = 'base' | 'ia_addon'

export type PricePlanMapping = { plan: string; component: PricePlanComponent }

/**
 * Build Price ID map: env live IDs win; placeholders remain for webhook test fixtures.
 */
export function buildPriceIdToPlanMap(): Record<string, PricePlanMapping> {
  const map: Record<string, PricePlanMapping> = {
    [STRIPE_PRICE_CATALOG.placeholders.proBase]: { plan: 'pro', component: 'base' },
    [STRIPE_PRICE_CATALOG.placeholders.proIaAddon]: { plan: 'pro', component: 'ia_addon' },
    [STRIPE_PRICE_CATALOG.placeholders.studioBase]: { plan: 'studio', component: 'base' },
    [STRIPE_PRICE_CATALOG.placeholders.studioIaAddon]: { plan: 'studio', component: 'ia_addon' },
    [STRIPE_PRICE_CATALOG.placeholders.starter]: { plan: 'starter', component: 'base' },
    [STRIPE_PRICE_CATALOG.placeholders.basicLegacy]: { plan: 'pro', component: 'base' },
  }

  const envPairs: Array<[string | undefined, PricePlanMapping]> = [
    [optionalEnv('STRIPE_PRICE_PRO_BASE'), { plan: 'pro', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_PRO_IA_ADDON'), { plan: 'pro', component: 'ia_addon' }],
    [optionalEnv('STRIPE_PRICE_STUDIO_BASE'), { plan: 'studio', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_STUDIO_IA_ADDON'), { plan: 'studio', component: 'ia_addon' }],
    [optionalEnv('STRIPE_PRICE_PRO'), { plan: 'pro', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_STUDIO'), { plan: 'studio', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_STARTER'), { plan: 'starter', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_BASIC'), { plan: 'pro', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_PRO_ANNUAL'), { plan: 'pro', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_STUDIO_ANNUAL'), { plan: 'studio', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_STARTER_ANNUAL'), { plan: 'starter', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_BASIC_ANNUAL'), { plan: 'pro', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_PRO_BASE_ANNUAL'), { plan: 'pro', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_PRO_IA_ADDON_ANNUAL'), { plan: 'pro', component: 'ia_addon' }],
    [optionalEnv('STRIPE_PRICE_STUDIO_BASE_ANNUAL'), { plan: 'studio', component: 'base' }],
    [optionalEnv('STRIPE_PRICE_STUDIO_IA_ADDON_ANNUAL'), { plan: 'studio', component: 'ia_addon' }],
  ]

  for (const [priceId, mapping] of envPairs) {
    if (priceId?.trim()) map[priceId.trim()] = mapping
  }

  return map
}

const PLAN_TIER_ORDER: Record<string, number> = {
  free: 0,
  starter: 1,
  basic: 2,
  pro: 3,
  studio: 4,
  enterprise: 5,
}

export const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
])

export const AT_RISK_SUBSCRIPTION_STATUSES = new Set(['past_due', 'incomplete'])

export const PAID_PLAN_IDS = new Set(['starter', 'basic', 'pro', 'studio', 'enterprise'])

/**
 * Given active Stripe Price IDs, resolve internal plan + IA addon presence.
 */
export function reconcilePlanFromPriceIds(priceIds: string[]): {
  plan: string
  hasIaAddon: boolean
} {
  const map = buildPriceIdToPlanMap()
  let highestPlan = 'free'
  let highestTier = 0
  let hasIaAddon = false

  for (const priceId of priceIds) {
    const mapping = map[priceId]
    if (!mapping) continue

    if (mapping.component === 'ia_addon') {
      hasIaAddon = true
    }

    const tier = PLAN_TIER_ORDER[mapping.plan] ?? 0
    if (tier > highestTier) {
      highestTier = tier
      highestPlan = mapping.plan
    }
  }

  // Legacy Basic Price ID implicitly includes IA addon (grandfathered)
  if (
    priceIds.includes(STRIPE_PRICE_CATALOG.placeholders.basicLegacy) ||
    priceIds.some((id) => {
      const basic = optionalEnv('STRIPE_PRICE_BASIC')
      const basicAnnual = optionalEnv('STRIPE_PRICE_BASIC_ANNUAL')
      return (basic && id === basic) || (basicAnnual && id === basicAnnual)
    })
  ) {
    hasIaAddon = true
  }

  return { plan: highestPlan, hasIaAddon }
}

/** 6D.5 — legacy `basic` row grants Pro+IA entitlements. Deprecated trials → free. */
export function effectiveEntitlementPlanId(planId: string): string {
  const raw = String(planId || '').trim()
  if (!raw || raw.endsWith('_trial')) return 'free'
  if (raw === 'basic') return 'pro'
  return raw
}

export type LazyReconcileDecision =
  | { action: 'honor'; reason: string }
  | { action: 'downgrade_free'; reason: string }

/**
 * Pure decision for DEBT-FIN-013 — entitlements applies DB write.
 */
export function decideLazyPlanReconcile(input: {
  userPlan: string
  subscription: { status: string; currentPeriodEnd: Date | null } | null
  planVerifiedAt: Date | null
  nowMs?: number
}): LazyReconcileDecision {
  const now = input.nowMs ?? Date.now()
  const plan = effectiveEntitlementPlanId(input.userPlan)
  const sub = input.subscription

  if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < now) {
      return { action: 'downgrade_free', reason: 'subscription_period_expired' }
    }
    return { action: 'honor', reason: 'active_subscription' }
  }

  if (sub && INACTIVE_SUBSCRIPTION_STATUSES.has(sub.status)) {
    if (PAID_PLAN_IDS.has(input.userPlan) || PAID_PLAN_IDS.has(plan)) {
      return { action: 'downgrade_free', reason: `inactive_status:${sub.status}` }
    }
  }

  if (sub && AT_RISK_SUBSCRIPTION_STATUSES.has(sub.status)) {
    return { action: 'honor', reason: `at_risk_grace:${sub.status}` }
  }

  if (PAID_PLAN_IDS.has(input.userPlan) && !sub) {
    const verifiedAt = input.planVerifiedAt?.getTime() ?? 0
    if (now - verifiedAt > PLAN_STALE_GRACE_MS) {
      return { action: 'downgrade_free', reason: 'stale_paid_without_subscription' }
    }
    return { action: 'honor', reason: 'webhook_grace_window' }
  }

  if (sub && sub.status !== 'active' && sub.status !== 'trialing') {
    if (PAID_PLAN_IDS.has(input.userPlan)) {
      return { action: 'downgrade_free', reason: `non_active_status:${sub.status}` }
    }
  }

  return { action: 'honor', reason: 'no_paid_claim' }
}

export type ModularLineItemResult =
  | {
      ok: true
      mode: 'modular_base_ia' | 'legacy_single'
      lineItems: Array<{ price: string; quantity: number }>
      capabilityStatus: 'IMPLEMENTED' | 'LEGACY_BUNDLE'
    }
  | {
      ok: false
      capabilityStatus: 'HELD'
      requiredEnv: string[]
      message: string
    }

/**
 * 6D.3 — Pro $15+$14 / Studio $45+$34 modular line items when env live;
 * otherwise legacy single price or honest HELD.
 */
export function resolveSubscriptionCheckoutLineItems(
  planId: string,
  interval: 'month' | 'year' = 'month',
): ModularLineItemResult {
  const annual = interval === 'year'

  if (planId === 'enterprise') {
    return {
      ok: false,
      capabilityStatus: 'HELD',
      requiredEnv: [],
      message: 'Enterprise is Contact Sales only — no self-serve checkout.',
    }
  }

  if (planId === 'pro' || planId === 'studio') {
    const baseKey =
      planId === 'pro'
        ? annual
          ? 'STRIPE_PRICE_PRO_BASE_ANNUAL'
          : 'STRIPE_PRICE_PRO_BASE'
        : annual
          ? 'STRIPE_PRICE_STUDIO_BASE_ANNUAL'
          : 'STRIPE_PRICE_STUDIO_BASE'
    const iaKey =
      planId === 'pro'
        ? annual
          ? 'STRIPE_PRICE_PRO_IA_ADDON_ANNUAL'
          : 'STRIPE_PRICE_PRO_IA_ADDON'
        : annual
          ? 'STRIPE_PRICE_STUDIO_IA_ADDON_ANNUAL'
          : 'STRIPE_PRICE_STUDIO_IA_ADDON'

    const base = optionalEnv(baseKey)?.trim()
    const ia = optionalEnv(iaKey)?.trim()
    if (base && ia) {
      return {
        ok: true,
        mode: 'modular_base_ia',
        lineItems: [
          { price: base, quantity: 1 },
          { price: ia, quantity: 1 },
        ],
        capabilityStatus: 'IMPLEMENTED',
      }
    }

    const legacyKey =
      planId === 'pro'
        ? annual
          ? 'STRIPE_PRICE_PRO_ANNUAL'
          : 'STRIPE_PRICE_PRO'
        : annual
          ? 'STRIPE_PRICE_STUDIO_ANNUAL'
          : 'STRIPE_PRICE_STUDIO'
    const legacy = optionalEnv(legacyKey)?.trim()
    if (legacy) {
      log.info('checkout_legacy_bundle_price', { planId, interval, legacyKey })
      return {
        ok: true,
        mode: 'legacy_single',
        lineItems: [{ price: legacy, quantity: 1 }],
        capabilityStatus: 'LEGACY_BUNDLE',
      }
    }

    return {
      ok: false,
      capabilityStatus: 'HELD',
      requiredEnv: [baseKey, iaKey, legacyKey],
      message: `Modular ${planId} checkout is held until Stripe Price IDs are configured (${baseKey}+${iaKey}), or set ${legacyKey} for legacy single-price bundle.`,
    }
  }

  if (planId === 'starter') {
    const key = annual ? 'STRIPE_PRICE_STARTER_ANNUAL' : 'STRIPE_PRICE_STARTER'
    const price = optionalEnv(key)?.trim()
    if (!price) {
      return {
        ok: false,
        capabilityStatus: 'HELD',
        requiredEnv: [key],
        message: `Starter checkout held until ${key} is set.`,
      }
    }
    return {
      ok: true,
      mode: 'legacy_single',
      lineItems: [{ price, quantity: 1 }],
      capabilityStatus: 'IMPLEMENTED',
    }
  }

  return {
    ok: false,
    capabilityStatus: 'HELD',
    requiredEnv: [],
    message: `Unsupported checkout plan: ${planId}`,
  }
}

export function downgradeUserPlanData() {
  return {
    plan: 'free' as const,
    planVerifiedAt: new Date(),
    stripeSubscriptionId: null as string | null,
  }
}
