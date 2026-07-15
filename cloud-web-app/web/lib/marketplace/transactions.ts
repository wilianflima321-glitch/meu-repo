/**
 * Real marketplace sale ledger — backs the `Transaction` Prisma model
 * (`marketplace_sale_transactions` table).
 *
 * This replaces the simulated transaction history that previously lived inline
 * inside `lib/marketplace/payouts.ts#getCreatorEarningsSummary`. Every row here
 * corresponds to a real Stripe checkout completion recorded by the billing
 * webhook (see `app/api/billing/webhook/route.ts`, `checkout.session.completed`
 * with `metadata.kind === 'marketplace_sale'`).
 *
 * Escrow: a transaction stays "pending" for ESCROW_WINDOW_DAYS after creation to
 * protect the platform against credit-card chargebacks. `isEscrowReleased`
 * classifies a row as released purely by comparing `escrowReleaseAt` to `now()`,
 * so summaries are correct even if no background job has run yet. A worker MAY
 * call `releaseEligibleEscrow()` periodically to flip `pending` rows to `cleared`
 * for audit-log clarity, but correctness never depends on that job running.
 *
 * The table itself was created by raw SQL migration
 * `20260703000000_marketplace_sale_transactions` (matching the pre-existing
 * `marketplace_creator_payout_accounts` out-of-schema convention); the
 * `Transaction` model in `schema.prisma` maps onto those exact columns via
 * `@@map`/`@map`, so this file now reads/writes through the typed Prisma Client
 * instead of `$queryRaw`/`$executeRaw`.
 */

import { randomUUID } from 'crypto'

import { prisma } from '@/lib/db'
import type { Transaction as TransactionRow } from '@prisma/client'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('marketplace-transactions')

export const ESCROW_WINDOW_DAYS = 14

export type SaleTransactionStatus = 'pending' | 'cleared' | 'disputed' | 'refunded' | 'failed'

export interface SaleTransactionRecord {
  id: string
  itemId: string
  itemTitle: string
  buyerId: string
  buyerEmail: string
  creatorId: string
  amountCents: number
  creatorCents: number
  platformCents: number
  currency: string
  stripeCheckoutSessionId: string | null
  stripePaymentIntentId: string | null
  stripeTransferId: string | null
  status: SaleTransactionStatus
  escrowReleaseAt: Date
  createdAt: Date
  updatedAt: Date
}

function mapRow(row: TransactionRow): SaleTransactionRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    itemTitle: row.itemTitle,
    buyerId: row.buyerId,
    buyerEmail: row.buyerEmail,
    creatorId: row.creatorId,
    amountCents: row.amountCents,
    creatorCents: row.creatorCents,
    platformCents: row.platformCents,
    currency: row.currency,
    stripeCheckoutSessionId: row.stripeCheckoutSessionId,
    stripePaymentIntentId: row.stripePaymentIntentId,
    stripeTransferId: row.stripeTransferId,
    status: row.status as SaleTransactionStatus,
    escrowReleaseAt: row.escrowReleaseAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** A row counts as escrow-released once its window has elapsed, regardless of a background job having run. */
export function isEscrowReleased(tx: Pick<SaleTransactionRecord, 'escrowReleaseAt'>, now: Date = new Date()): boolean {
  return tx.escrowReleaseAt.getTime() <= now.getTime()
}

export interface RecordSaleTransactionParams {
  itemId: string
  itemTitle: string
  buyerId: string
  buyerEmail: string
  creatorId: string
  amountCents: number
  creatorCents: number
  platformCents: number
  currency?: string
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
}

/**
 * Idempotent insert keyed by `stripeCheckoutSessionId` — Stripe may retry
 * webhook delivery, and this must never double-count a sale.
 */
export async function recordSaleTransaction(params: RecordSaleTransactionParams): Promise<SaleTransactionRecord> {
  const id = `txn_${randomUUID()}`
  const currency = params.currency ?? 'usd'
  const escrowReleaseAt = new Date(Date.now() + ESCROW_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  // `upsert` on the unique `stripeCheckoutSessionId` gives the same idempotency
  // as the previous `ON CONFLICT ... DO UPDATE`. When the session id is null
  // (should not happen for real Stripe sales, but keeps the type honest), fall
  // back to a plain create since there is no conflict target to upsert against.
  const row = params.stripeCheckoutSessionId
    ? await prisma.transaction.upsert({
        where: { stripeCheckoutSessionId: params.stripeCheckoutSessionId },
        update: {},
        create: {
          id,
          itemId: params.itemId,
          itemTitle: params.itemTitle,
          buyerId: params.buyerId,
          buyerEmail: params.buyerEmail,
          creatorId: params.creatorId,
          amountCents: params.amountCents,
          creatorCents: params.creatorCents,
          platformCents: params.platformCents,
          currency,
          stripeCheckoutSessionId: params.stripeCheckoutSessionId,
          stripePaymentIntentId: params.stripePaymentIntentId ?? null,
          status: 'pending',
          escrowReleaseAt,
        },
      })
    : await prisma.transaction.create({
        data: {
          id,
          itemId: params.itemId,
          itemTitle: params.itemTitle,
          buyerId: params.buyerId,
          buyerEmail: params.buyerEmail,
          creatorId: params.creatorId,
          amountCents: params.amountCents,
          creatorCents: params.creatorCents,
          platformCents: params.platformCents,
          currency,
          stripePaymentIntentId: params.stripePaymentIntentId ?? null,
          status: 'pending',
          escrowReleaseAt,
        },
      })

  const record = mapRow(row)
  log.info('marketplace.sale.recorded', {
    transactionId: record.id,
    itemId: record.itemId,
    creatorId: record.creatorId,
    creatorCents: record.creatorCents,
    platformCents: record.platformCents,
  })
  return record
}

export async function attachStripeTransfer(transactionId: string, stripeTransferId: string): Promise<void> {
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { stripeTransferId },
  })
}

export async function markTransactionDisputed(stripePaymentIntentId: string): Promise<void> {
  const result = await prisma.transaction.updateMany({
    where: { stripePaymentIntentId },
    data: { status: 'disputed' },
  })
  if (result.count > 0) {
    log.warn('marketplace.sale.disputed', { stripePaymentIntentId })
  }
}

export async function listCreatorTransactions(creatorId: string, limit = 100): Promise<SaleTransactionRecord[]> {
  const rows = await prisma.transaction.findMany({
    where: { creatorId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows.map(mapRow)
}

export interface CreatorBalances {
  availableBalanceCents: number
  pendingBalanceCents: number
  lifetimeEarningsCents: number
  lifetimeSalesCount: number
}

/**
 * Computes balances purely from real rows. `disputed`/`refunded`/`failed` are
 * excluded from every bucket — chargebacks must never inflate a creator's
 * apparent earnings (see UX_MONETIZATION_ALIGNMENT §7.1, the entire reason this
 * table has a `status` column instead of being append-only).
 */
export function computeCreatorBalances(transactions: SaleTransactionRecord[], now: Date = new Date()): CreatorBalances {
  let availableBalanceCents = 0
  let pendingBalanceCents = 0
  let lifetimeEarningsCents = 0
  let lifetimeSalesCount = 0

  for (const tx of transactions) {
    if (tx.status === 'disputed' || tx.status === 'refunded' || tx.status === 'failed') continue

    lifetimeEarningsCents += tx.creatorCents
    lifetimeSalesCount += 1

    const released = tx.status === 'cleared' || isEscrowReleased(tx, now)
    if (released) {
      availableBalanceCents += tx.creatorCents
    } else {
      pendingBalanceCents += tx.creatorCents
    }
  }

  return { availableBalanceCents, pendingBalanceCents, lifetimeEarningsCents, lifetimeSalesCount }
}

/**
 * Optional maintenance job: flips `pending` rows whose escrow window has
 * elapsed to `cleared`. Not required for balance correctness (see
 * `computeCreatorBalances`), but keeps the `status` column meaningful for
 * support/audit tooling and for any future SQL run directly against the table.
 */
export async function releaseEligibleEscrow(): Promise<number> {
  const result = await prisma.transaction.updateMany({
    where: { status: 'pending', escrowReleaseAt: { lte: new Date() } },
    data: { status: 'cleared' },
  })
  if (result.count > 0) {
    log.info('marketplace.escrow.released', { count: result.count })
  }
  return result.count
}
