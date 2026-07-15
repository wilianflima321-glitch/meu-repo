/**
 * Block 6C.4 — PAYG Stripe invoice flush.
 * Charges saved PaymentMethod for accrued on-demand usage at $25 threshold
 * or month-end cron. Amount-based InvoiceItems (no invented Price IDs).
 * Fail-closed when Stripe or PM missing — never fake paid invoices.
 */

import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  PAYG_BILL_THRESHOLD_USD_CENTS,
  currentPaygPeriodKey,
} from '@/lib/billing/payg-constants'
import { loadPaygSnapshot, type PaygSnapshot } from '@/lib/billing/payg-policy'
import { optionalEnv } from '@/lib/env'

const log = createComponentLogger('payg-invoice-flush')

export type PaygInvoiceCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'HELD'

export function isStripePaygFlushConfigured(): boolean {
  return Boolean(optionalEnv('STRIPE_SECRET_KEY'))
}

/**
 * Honest capability:
 * - HELD: no payment method
 * - PARTIAL: PM saved but Stripe secret missing
 * - IMPLEMENTED: PM + Stripe ready to create/pay invoices
 */
export function resolvePaygInvoiceCapability(snapshot: PaygSnapshot): {
  status: PaygInvoiceCapabilityStatus
  message: string
} {
  if (!snapshot.hasPaymentMethod) {
    return {
      status: 'HELD',
      message:
        'Save a card via Billing → Pay-as-you-go to enable Stripe invoice flush at $25 or month-end. Accrual + spend cap still apply.',
    }
  }
  if (!isStripePaygFlushConfigured()) {
    return {
      status: 'PARTIAL',
      message:
        'Payment method saved, but Stripe is not configured in this environment. Accrual continues; flush resumes when STRIPE_SECRET_KEY is live.',
    }
  }
  return {
    status: 'IMPLEMENTED',
    message:
      'Accrual active. Stripe invoices charge your saved card at $25 accrued or month-end.',
  }
}

export type PaygFlushResult =
  | {
      ok: true
      flushedUsdCents: number
      invoiceId: string
      periodKey: string
    }
  | {
      ok: false
      code:
        | 'NO_ACCRUAL'
        | 'BELOW_THRESHOLD'
        | 'NO_PAYMENT_METHOD'
        | 'NO_STRIPE'
        | 'NO_CUSTOMER'
        | 'USER_NOT_FOUND'
        | 'STRIPE_ERROR'
      message: string
    }

/**
 * Flush accrued PAYG for one user. When `force` is false, requires
 * accrued >= PAYG_BILL_THRESHOLD_USD_CENTS. Resets accrued on success.
 */
export async function flushPaygInvoiceForUser(input: {
  userId: string
  force?: boolean
  reason?: 'threshold' | 'month_end' | 'manual'
}): Promise<PaygFlushResult> {
  if (!isStripePaygFlushConfigured()) {
    return { ok: false, code: 'NO_STRIPE', message: 'Stripe secret key not configured.' }
  }

  const periodKey = currentPaygPeriodKey()

  const locked = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE`
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripePaymentMethodId: true,
        paygAccruedUsdCents: true,
        paygPeriodKey: true,
        paygEnabled: true,
      },
    })
    if (!user) return { error: 'USER_NOT_FOUND' as const }

    const accrued =
      user.paygPeriodKey === periodKey ? user.paygAccruedUsdCents : 0

    if (accrued <= 0) return { error: 'NO_ACCRUAL' as const, accrued: 0 }
    if (!input.force && accrued < PAYG_BILL_THRESHOLD_USD_CENTS) {
      return { error: 'BELOW_THRESHOLD' as const, accrued }
    }
    if (!user.stripePaymentMethodId) {
      return { error: 'NO_PAYMENT_METHOD' as const, accrued }
    }
    if (!user.stripeCustomerId) {
      return { error: 'NO_CUSTOMER' as const, accrued }
    }

    // Reserve: zero accrual before Stripe call to prevent double-charge races.
    // If Stripe fails, we restore below.
    await tx.user.update({
      where: { id: user.id },
      data: { paygAccruedUsdCents: 0, paygPeriodKey: periodKey },
    })

    return {
      error: null,
      user,
      accrued,
    }
  })

  if ('error' in locked && locked.error) {
    const map: Record<string, PaygFlushResult> = {
      USER_NOT_FOUND: { ok: false, code: 'USER_NOT_FOUND', message: 'User not found.' },
      NO_ACCRUAL: { ok: false, code: 'NO_ACCRUAL', message: 'Nothing to bill.' },
      BELOW_THRESHOLD: {
        ok: false,
        code: 'BELOW_THRESHOLD',
        message: `Accrued $${((locked.accrued ?? 0) / 100).toFixed(2)} is below $${PAYG_BILL_THRESHOLD_USD_CENTS / 100} threshold.`,
      },
      NO_PAYMENT_METHOD: {
        ok: false,
        code: 'NO_PAYMENT_METHOD',
        message: 'No saved payment method.',
      },
      NO_CUSTOMER: {
        ok: false,
        code: 'NO_CUSTOMER',
        message: 'Stripe customer missing — complete payment-method setup first.',
      },
    }
    return map[locked.error] ?? { ok: false, code: 'STRIPE_ERROR', message: 'Flush failed.' }
  }

  if (!locked || locked.error !== null || !('user' in locked) || !locked.user) {
    return { ok: false, code: 'STRIPE_ERROR', message: 'Flush failed.' }
  }

  const { user, accrued } = locked
  const stripe = getStripe()

  try {
    await stripe.invoiceItems.create({
      customer: user.stripeCustomerId!,
      amount: accrued,
      currency: 'usd',
      description: `Aethel PAYG AI usage (${periodKey})`,
      metadata: {
        kind: 'payg_flush',
        userId: user.id,
        periodKey,
        reason: input.reason ?? 'threshold',
      },
    })

    const invoice = await stripe.invoices.create({
      customer: user.stripeCustomerId!,
      default_payment_method: user.stripePaymentMethodId!,
      collection_method: 'charge_automatically',
      auto_advance: true,
      metadata: {
        kind: 'payg_flush',
        userId: user.id,
        periodKey,
        reason: input.reason ?? 'threshold',
        accruedUsdCents: String(accrued),
      },
    })

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
    let paid = finalized
    if (finalized.status !== 'paid') {
      paid = await stripe.invoices.pay(invoice.id, {
        payment_method: user.stripePaymentMethodId!,
      })
    }

    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: accrued,
        currency: 'usd',
        status: paid.status === 'paid' ? 'succeeded' : paid.status || 'open',
        stripePaymentId:
          (typeof paid.payment_intent === 'string'
            ? paid.payment_intent
            : paid.id) || `payg_${paid.id}`,
      },
    }).catch((error) => {
      log.warn('payg_flush_payment_row_failed', { userId: user.id, error })
    })

    log.info('payg_flush_success', {
      userId: user.id,
      invoiceId: paid.id,
      accrued,
      reason: input.reason,
    })

    return {
      ok: true,
      flushedUsdCents: accrued,
      invoiceId: paid.id,
      periodKey,
    }
  } catch (error) {
    // Restore accrual so user is not charged twice and not silently zeroed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        paygAccruedUsdCents: { increment: accrued },
        paygPeriodKey: periodKey,
      },
    })
    log.error('payg_flush_stripe_failed', error, { userId: user.id, accrued })
    return {
      ok: false,
      code: 'STRIPE_ERROR',
      message: error instanceof Error ? error.message : 'Stripe invoice failed.',
    }
  }
}

/** After accrual — fire threshold flush when ready (best-effort, never throws to caller). */
export async function maybeFlushPaygAfterAccrual(userId: string): Promise<void> {
  try {
    const snap = await loadPaygSnapshot(userId)
    if (!snap?.enabled || !snap.hasPaymentMethod) return
    if (snap.accruedUsdCents < PAYG_BILL_THRESHOLD_USD_CENTS) return
    const capability = resolvePaygInvoiceCapability(snap)
    if (capability.status !== 'IMPLEMENTED') return
    await flushPaygInvoiceForUser({ userId, reason: 'threshold' })
  } catch (error) {
    log.warn('payg_threshold_flush_skipped', { userId, error })
  }
}
