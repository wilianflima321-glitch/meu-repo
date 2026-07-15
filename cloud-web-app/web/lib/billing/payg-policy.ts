/**
 * Block 6C — PAYG policy (mandatory spend cap, ×1.10 on-demand rate).
 * Stripe metered invoice settlement is separate (6C.4) — this module owns
 * enable/disable rules + accrual math + cap checks (Anti-Hype: no fake invoice).
 */

import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  PAYG_BILL_THRESHOLD_USD_CENTS,
  PAYG_CAP_PRESETS_USD,
  PAYG_CUSTOM_CAP_MAX_USD,
  PAYG_CUSTOM_CAP_MIN_USD,
  PAYG_ON_DEMAND_MARKUP,
  PREPAID_CENTS_PER_CREDIT,
  currentPaygPeriodKey,
} from '@/lib/billing/payg-constants'

export {
  PAYG_BILL_THRESHOLD_USD_CENTS,
  PAYG_CAP_PRESETS_USD,
  PAYG_CUSTOM_CAP_MAX_USD,
  PAYG_CUSTOM_CAP_MIN_USD,
  PAYG_ON_DEMAND_MARKUP,
  PREPAID_CENTS_PER_CREDIT,
  currentPaygPeriodKey,
} from '@/lib/billing/payg-constants'

const log = createComponentLogger('payg-policy')

export type PaygSnapshot = {
  enabled: boolean
  spendCapUsdCents: number | null
  accruedUsdCents: number
  periodKey: string
  hasPaymentMethod: boolean
}

export function parsePaygCapUsd(input: unknown): number | null {
  const n = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(n)) return null
  if (PAYG_CAP_PRESETS_USD.includes(n as (typeof PAYG_CAP_PRESETS_USD)[number])) {
    return n
  }
  if (n < PAYG_CUSTOM_CAP_MIN_USD || n > PAYG_CUSTOM_CAP_MAX_USD) return null
  return Math.round(n * 100) / 100
}

export function usdToCents(usd: number): number {
  return Math.round(usd * 100)
}

/**
 * On-demand USD cents for N wallet-equivalent credits (prepaid × 1.10).
 */
export function paygUsdCentsForCredits(credits: number): number {
  const prepaidCents = Math.max(0, credits) * PREPAID_CENTS_PER_CREDIT
  return Math.max(1, Math.ceil(prepaidCents * PAYG_ON_DEMAND_MARKUP))
}

export type EnablePaygInput = {
  userId: string
  enabled: boolean
  spendCapUsd?: number
  stripePaymentMethodId?: string | null
}

export type EnablePaygResult =
  | { ok: true; snapshot: PaygSnapshot }
  | { ok: false; code: 'CAP_REQUIRED' | 'CAP_BELOW_ACCRUED' | 'USER_NOT_FOUND'; message: string }

export async function loadPaygSnapshot(userId: string): Promise<PaygSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      paygEnabled: true,
      paygSpendCapUsdCents: true,
      paygAccruedUsdCents: true,
      paygPeriodKey: true,
      stripePaymentMethodId: true,
    },
  })
  if (!user) return null

  const periodKey = currentPaygPeriodKey()
  let accrued = user.paygAccruedUsdCents
  if (user.paygPeriodKey !== periodKey) {
    accrued = 0
  }

  return {
    enabled: user.paygEnabled,
    spendCapUsdCents: user.paygSpendCapUsdCents,
    accruedUsdCents: accrued,
    periodKey,
    hasPaymentMethod: Boolean(user.stripePaymentMethodId),
  }
}

/**
 * Enable/disable PAYG — cannot enable without cap (GAP-PAYG-11).
 * Cap cannot drop below already-accrued amount mid-period.
 */
export async function setPaygSettings(input: EnablePaygInput): Promise<EnablePaygResult> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      paygAccruedUsdCents: true,
      paygPeriodKey: true,
      paygSpendCapUsdCents: true,
      stripePaymentMethodId: true,
    },
  })
  if (!user) {
    return { ok: false, code: 'USER_NOT_FOUND', message: 'User not found.' }
  }

  const periodKey = currentPaygPeriodKey()
  const accrued =
    user.paygPeriodKey === periodKey ? user.paygAccruedUsdCents : 0

  if (!input.enabled) {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        paygEnabled: false,
        // Keep cap + accrued for audit; disable stops new charges
      },
    })
    log.info('payg_disabled', { userId: input.userId })
    const snap = await loadPaygSnapshot(input.userId)
    return { ok: true, snapshot: snap! }
  }

  const capUsd = parsePaygCapUsd(input.spendCapUsd)
  if (capUsd == null) {
    return {
      ok: false,
      code: 'CAP_REQUIRED',
      message: `Choose a spend cap ($${PAYG_CAP_PRESETS_USD.join(' / $')} or custom $${PAYG_CUSTOM_CAP_MIN_USD}–$${PAYG_CUSTOM_CAP_MAX_USD}).`,
    }
  }

  const capCents = usdToCents(capUsd)
  if (capCents < accrued) {
    return {
      ok: false,
      code: 'CAP_BELOW_ACCRUED',
      message: `Spend cap cannot be below already accrued $${(accrued / 100).toFixed(2)} this period.`,
    }
  }

  await prisma.user.update({
    where: { id: input.userId },
    data: {
      paygEnabled: true,
      paygSpendCapUsdCents: capCents,
      paygAccruedUsdCents: accrued,
      paygPeriodKey: periodKey,
      ...(input.stripePaymentMethodId !== undefined
        ? { stripePaymentMethodId: input.stripePaymentMethodId }
        : {}),
    },
  })

  log.info('payg_enabled', { userId: input.userId, capCents })
  const snap = await loadPaygSnapshot(input.userId)
  return { ok: true, snapshot: snap! }
}

export type PaygAllowDecision =
  | { allowed: true; estimatedUsdCents: number; remainingCapCents: number }
  | { allowed: false; code: 'PAYG_NOT_ENABLED' | 'PAYG_CAP_REACHED' | 'PAYG_NO_CAP'; message: string }

export function decidePaygCharge(
  snapshot: PaygSnapshot,
  estimatedCredits: number,
): PaygAllowDecision {
  if (!snapshot.enabled) {
    return {
      allowed: false,
      code: 'PAYG_NOT_ENABLED',
      message: 'Pay-as-you-go is off. Enable it in Billing with a spend cap.',
    }
  }
  if (snapshot.spendCapUsdCents == null || snapshot.spendCapUsdCents <= 0) {
    return {
      allowed: false,
      code: 'PAYG_NO_CAP',
      message: 'PAYG requires a mandatory spend cap.',
    }
  }

  const estimatedUsdCents = paygUsdCentsForCredits(estimatedCredits)
  const next = snapshot.accruedUsdCents + estimatedUsdCents
  if (next > snapshot.spendCapUsdCents) {
    return {
      allowed: false,
      code: 'PAYG_CAP_REACHED',
      message: `PAYG spend cap of $${(snapshot.spendCapUsdCents / 100).toFixed(2)} reached for this period.`,
    }
  }

  return {
    allowed: true,
    estimatedUsdCents,
    remainingCapCents: snapshot.spendCapUsdCents - snapshot.accruedUsdCents,
  }
}

/**
 * Accrue on-demand cents after a successful PAYG-funded AI call.
 * Stripe invoice flush is 6C.4 (threshold / month-end) — HELD until meter live.
 */
export async function accruePaygUsage(
  userId: string,
  usdCents: number,
): Promise<PaygSnapshot | null> {
  const cents = Math.max(0, Math.floor(usdCents))
  if (cents <= 0) return loadPaygSnapshot(userId)

  const periodKey = currentPaygPeriodKey()
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
    const row = await tx.user.findUnique({
      where: { id: userId },
      select: {
        paygAccruedUsdCents: true,
        paygPeriodKey: true,
        paygEnabled: true,
      },
    })
    if (!row?.paygEnabled) return

    const base = row.paygPeriodKey === periodKey ? row.paygAccruedUsdCents : 0
    await tx.user.update({
      where: { id: userId },
      data: {
        paygAccruedUsdCents: base + cents,
        paygPeriodKey: periodKey,
      },
    })
  })

  log.info('payg_accrued', { userId, usdCents: cents, periodKey })
  const snap = await loadPaygSnapshot(userId)
  // 6C.4 — threshold flush when PM + Stripe ready (never throws into spend path)
  const { maybeFlushPaygAfterAccrual } = await import('@/lib/billing/payg-invoice-flush')
  void maybeFlushPaygAfterAccrual(userId)
  // 6H.8 — PAYG 50%/100% email (HELD without Resend/SendGrid; never throws)
  const { maybeSendBillingThresholdEmails } = await import(
    '@/lib/billing/billing-threshold-emails'
  )
  void maybeSendBillingThresholdEmails(userId)
  return snap
}
