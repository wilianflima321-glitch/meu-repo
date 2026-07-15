/**
 * Block 6B — settle prepaid wallet purchase after Stripe checkout.session.completed.
 * Idempotent on stripeCheckoutSessionId.
 */

import { prisma } from '@/lib/db'
import { addCredits } from '@/lib/credit-wallet'
import { createComponentLogger } from '@/lib/observability/logger'
import { totalCreditsForPack, getWalletCreditPack } from '@/lib/billing/wallet-credit-packs'

const log = createComponentLogger('wallet-purchase-settle')

export type WalletPurchaseSettleInput = {
  userId: string
  intentId: string
  stripeCheckoutSessionId: string
  packageId?: string | null
  credits?: number
  bonusCredits?: number
  amountUsdCents?: number
}

export async function settleWalletCreditPurchase(
  input: WalletPurchaseSettleInput,
): Promise<{ ok: true; credits: number } | { ok: false; code: string; message: string }> {
  const userId = input.userId.trim()
  const intentId = input.intentId.trim()
  const sessionId = input.stripeCheckoutSessionId.trim()
  if (!userId || !intentId || !sessionId) {
    return { ok: false, code: 'INVALID_SETTLE', message: 'Missing userId, intentId, or session id' }
  }

  // Idempotency: already settled for this Stripe session
  const existing = await prisma.creditLedgerEntry.findFirst({
    where: {
      userId,
      entryType: 'PURCHASE',
      reference: sessionId,
    },
    select: { id: true, amount: true },
  })
  if (existing) {
    log.info('wallet_purchase_already_settled', { sessionId, userId })
    return { ok: true, credits: existing.amount }
  }

  const pack = input.packageId ? getWalletCreditPack(input.packageId) : undefined
  const credits = pack
    ? totalCreditsForPack(pack)
    : Math.max(1, Math.floor(input.credits ?? 0) + Math.floor(input.bonusCredits ?? 0))

  if (credits <= 0) {
    return { ok: false, code: 'INVALID_CREDITS', message: 'Resolved credit grant is zero' }
  }

  // Mark pending intent settled (if present)
  const pending = await prisma.creditLedgerEntry.findFirst({
    where: {
      userId,
      entryType: 'PENDING_PURCHASE',
      metadata: {
        path: ['intent_id'],
        equals: intentId,
      },
    },
  })

  if (pending) {
    await prisma.creditLedgerEntry.update({
      where: { id: pending.id },
      data: {
        metadata: {
          ...(typeof pending.metadata === 'object' && pending.metadata ? pending.metadata : {}),
          status: 'settled',
          settled: true,
          stripe_checkout_session_id: sessionId,
          settled_at: new Date().toISOString(),
        },
      },
    })
  }

  await addCredits(userId, credits, 'PURCHASE', sessionId, {
    settled: true,
    intent_id: intentId,
    package_id: input.packageId ?? null,
    amount_usd_cents: input.amountUsdCents ?? null,
    source: 'stripe_checkout',
  })

  log.info('wallet_purchase_settled', { userId, intentId, sessionId, credits })
  return { ok: true, credits }
}
