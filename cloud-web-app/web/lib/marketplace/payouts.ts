import { getCreatorPayoutAccount } from '@/lib/server/stripe-connect'
import {
  computeCreatorBalances,
  isEscrowReleased,
  listCreatorTransactions,
  type SaleTransactionRecord,
} from '@/lib/marketplace/transactions'
import {
  RevenueLane,
  REVENUE_LANE_PLATFORM_TAKE,
  calculateRevenueSplit as calculateRevenueSplitForLane,
  type CreatorRevenueSplit as LaneSplit,
} from '@/lib/marketplace/payouts-lanes'

export {
  RevenueLane,
  REVENUE_LANE_PLATFORM_TAKE,
  isUniversalStoreLane,
} from '@/lib/marketplace/payouts-lanes'

export type CreatorRevenueSplit = LaneSplit

export interface SaleTransaction {
  id: string
  itemId: string
  itemTitle: string
  buyerEmail: string
  amountCents: number
  creatorCents: number
  platformCents: number
  status: 'pending' | 'cleared' | 'disputed' | 'refunded' | 'failed'
  createdAt: string
}

export interface CreatorEarningsSummary {
  payoutsEnabled: boolean
  stripeAccountId: string | null
  currency: string
  availableBalanceCents: number
  pendingBalanceCents: number
  lifetimeEarningsCents: number
  lifetimeSalesCount: number
  transactions: SaleTransaction[]
}

/**
 * IAP / dedicated-server offset rate (12%).
 * Universal Store uses RevenueLane.UNIVERSAL_STORE (30%) via calculateRevenueSplit(cents, lane).
 */
export const PLATFORM_TAKE_RATE = REVENUE_LANE_PLATFORM_TAKE[RevenueLane.IN_GAME_IAP]

/**
 * Block 6G.3 / H.0 — lane-aware split.
 * Default IN_GAME_IAP preserves redis-cost-guard callers.
 * Marketplace checkout MUST pass RevenueLane.UNIVERSAL_STORE (30/70).
 */
export function calculateRevenueSplit(
  totalPriceCents: number,
  lane: RevenueLane = RevenueLane.IN_GAME_IAP,
): CreatorRevenueSplit {
  return calculateRevenueSplitForLane(totalPriceCents, lane)
}

function toPublicTransaction(tx: SaleTransactionRecord): SaleTransaction {
  const status = tx.status === 'pending' && isEscrowReleased(tx) ? 'cleared' : tx.status

  return {
    id: tx.id,
    itemId: tx.itemId,
    itemTitle: tx.itemTitle,
    buyerEmail: tx.buyerEmail,
    amountCents: tx.amountCents,
    creatorCents: tx.creatorCents,
    platformCents: tx.platformCents,
    status,
    createdAt: tx.createdAt.toISOString(),
  }
}

/**
 * Real earnings metrics — never fabricate sales from downloads.
 */
export async function getCreatorEarningsSummary(userId: string): Promise<CreatorEarningsSummary> {
  const [account, records] = await Promise.all([
    getCreatorPayoutAccount(userId),
    listCreatorTransactions(userId),
  ])

  const balances = computeCreatorBalances(records)
  const transactions = records.map(toPublicTransaction)

  return {
    payoutsEnabled: account ? account.payoutsEnabled : false,
    stripeAccountId: account ? account.stripeAccountId : null,
    currency: account ? (account.defaultCurrency || 'usd').toLowerCase() : 'usd',
    availableBalanceCents: balances.availableBalanceCents,
    pendingBalanceCents: balances.pendingBalanceCents,
    lifetimeEarningsCents: balances.lifetimeEarningsCents,
    lifetimeSalesCount: balances.lifetimeSalesCount,
    transactions,
  }
}
