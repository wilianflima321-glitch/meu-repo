/**
 * Block 6A.1 — Spend resolver (single debit path)
 * Order: BYOK → subscription pools (Fast/Premium) → wallet → block
 * Two-phase: reserve (hold) → settle (debit) | settleZero/cancel (no charge)
 * Weights: model-cost-weights.ts (1× / 40× / 200×)
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  applyTokenWeight,
  getModelTokenWeight,
  isUltraModel,
} from '@/lib/ai/model-cost-weights'
import { PREMIUM_TOKEN_WEIGHT } from '@/lib/plan-ai-quotas'
import { paygUsdCentsForCredits } from '@/lib/billing/payg-policy'

const log = createComponentLogger('spend-resolver')

/** Minimal plan slice — compatible with plans.ts + plan-limits.ts */
export interface SpendPlanLimits {
  tokensPerMonth: number
  tokensFastPerMonth: number
  tokensPremiumRawPerMonth: number
  aiPoolMode: 'single_fast' | 'dual'
}

export type SpendLane = 'byok' | 'subscription_fast' | 'subscription_premium' | 'wallet' | 'payg' | 'blocked'

export type SpendBlockCode =
  | 'ULTRA_REQUIRES_WALLET'
  | 'QUOTA_EXCEEDED'
  | 'PREMIUM_POOL_EXHAUSTED'
  | 'WALLET_INSUFFICIENT'
  | 'PAYG_CAP_REACHED'
  | 'PAYG_NOT_ENABLED'
  | 'INVALID_ESTIMATE'
  | 'RESERVATION_NOT_FOUND'
  | 'ALREADY_FINALIZED'

export interface SpendPoolSnapshot {
  tokensFastUsed: number
  tokensPremiumRawUsed: number
  tokensWeightedUsed: number
  walletBalance: number
}

export interface SpendPaygContext {
  enabled: boolean
  spendCapUsdCents: number | null
  accruedUsdCents: number
}

export interface SpendReserveInput {
  userId: string
  planId: string
  planLimits: SpendPlanLimits
  modelId: string
  estimatedRawTokens: number
  byok?: boolean
  allowWalletFallback?: boolean
  /** Wallet credits equivalent to estimated weighted tokens (caller converts) */
  estimatedWalletCredits?: number
  /** Block 6C — optional PAYG snapshot; when absent PAYG lane is unavailable */
  payg?: SpendPaygContext
  usage: SpendPoolSnapshot
}

export interface SpendReservation {
  reservationId: string
  userId: string
  planId: string
  modelId: string
  lane: Exclude<SpendLane, 'blocked'>
  estimatedRawTokens: number
  estimatedWeightedTokens: number
  estimatedWalletCredits: number
  estimatedPaygUsdCents: number
  fallbackFromPremium: boolean
  status: 'reserved' | 'settled' | 'cancelled' | 'settle_zero'
  createdAt: string
}

export type SpendReserveResult =
  | { ok: true; reservation: SpendReservation; noticeCode?: 'PREMIUM_POOL_EXHAUSTED' }
  | { ok: false; code: SpendBlockCode; message: string; lane: 'blocked' }

export interface SpendSettleInput {
  reservationId: string
  actualRawTokens: number
}

/** Ledger adapter — production wires UsageBucket + credit wallet */
export interface SpendLedgerAdapter {
  debitSubscription(input: {
    userId: string
    lane: 'subscription_fast' | 'subscription_premium'
    rawTokens: number
    weightedTokens: number
    modelId: string
  }): Promise<void>
  debitWallet(input: {
    userId: string
    credits: number
    reservationId: string
  }): Promise<void>
  /** Block 6C — accrue on-demand USD cents (invoice flush is separate / HELD) */
  debitPayg?(input: {
    userId: string
    usdCents: number
    reservationId: string
  }): Promise<void>
  /** Optional refund hooks — no-op until ledger supports decrement */
  refundSubscription?(input: {
    userId: string
    lane: 'subscription_fast' | 'subscription_premium'
    rawTokens: number
    weightedTokens: number
  }): Promise<void>
  refundWallet?(input: { userId: string; credits: number; reservationId: string }): Promise<void>
}

const reservations = new Map<string, SpendReservation>()
/** Soft-hold: pending weighted / raw per user until settle or cancel */
const pendingByUser = new Map<
  string,
  { weighted: number; fastRaw: number; premiumRaw: number; wallet: number; paygUsdCents: number }
>()

function getPending(userId: string) {
  return (
    pendingByUser.get(userId) ?? {
      weighted: 0,
      fastRaw: 0,
      premiumRaw: 0,
      wallet: 0,
      paygUsdCents: 0,
    }
  )
}

function addPending(
  userId: string,
  delta: {
    weighted?: number
    fastRaw?: number
    premiumRaw?: number
    wallet?: number
    paygUsdCents?: number
  },
) {
  const cur = getPending(userId)
  pendingByUser.set(userId, {
    weighted: cur.weighted + (delta.weighted ?? 0),
    fastRaw: cur.fastRaw + (delta.fastRaw ?? 0),
    premiumRaw: cur.premiumRaw + (delta.premiumRaw ?? 0),
    wallet: cur.wallet + (delta.wallet ?? 0),
    paygUsdCents: cur.paygUsdCents + (delta.paygUsdCents ?? 0),
  })
}

function unlimited(limit: number): boolean {
  return limit === -1
}

function isPremiumWeight(modelId: string): boolean {
  const w = getModelTokenWeight(modelId)
  return w >= PREMIUM_TOKEN_WEIGHT && w < 200
}

/**
 * After pools + wallet fail: try PAYG under mandatory cap (6C).
 */
function tryPaygLane(
  input: SpendReserveInput,
  walletCredits: number,
  fallbackFromPremium: boolean,
):
  | { ok: true; lane: 'payg'; fallbackFromPremium: boolean }
  | { ok: false; code: SpendBlockCode; message: string; lane: 'blocked' } {
  const payg = input.payg
  if (!payg?.enabled) {
    return {
      ok: false,
      code: 'QUOTA_EXCEEDED',
      message: 'AI quotas and wallet exhausted — enable PAYG with a spend cap, buy credits, or use BYOK',
      lane: 'blocked',
    }
  }
  if (payg.spendCapUsdCents == null || payg.spendCapUsdCents <= 0) {
    return {
      ok: false,
      code: 'PAYG_NOT_ENABLED',
      message: 'PAYG is on but has no spend cap — set a cap in Billing',
      lane: 'blocked',
    }
  }

  const pending = getPending(input.userId)
  const estimatedUsdCents = paygUsdCentsForCredits(walletCredits)
  const next = payg.accruedUsdCents + pending.paygUsdCents + estimatedUsdCents
  if (next > payg.spendCapUsdCents) {
    return {
      ok: false,
      code: 'PAYG_CAP_REACHED',
      message: `PAYG spend cap of $${(payg.spendCapUsdCents / 100).toFixed(2)} reached for this period`,
      lane: 'blocked',
    }
  }

  return { ok: true, lane: 'payg', fallbackFromPremium }
}

/**
 * Pure decision: which lane funds this call (no side effects).
 */
export function decideSpendLane(
  input: SpendReserveInput,
): SpendReserveResult | { ok: true; lane: Exclude<SpendLane, 'blocked'>; fallbackFromPremium: boolean; noticeCode?: 'PREMIUM_POOL_EXHAUSTED' } {
  const raw = Math.max(0, Math.floor(input.estimatedRawTokens))
  if (!Number.isFinite(raw) || raw <= 0) {
    return { ok: false, code: 'INVALID_ESTIMATE', message: 'estimatedRawTokens must be positive', lane: 'blocked' }
  }

  if (input.byok) {
    return { ok: true, lane: 'byok', fallbackFromPremium: false }
  }

  if (isUltraModel(input.modelId)) {
    if (input.allowWalletFallback !== false && input.usage.walletBalance > 0) {
      return { ok: true, lane: 'wallet', fallbackFromPremium: false }
    }
    const credits = Math.max(1, Math.floor(input.estimatedWalletCredits ?? applyTokenWeight(raw, input.modelId)))
    const paygTry = tryPaygLane(input, credits, false)
    if (paygTry.ok) return paygTry
    if (paygTry.code === 'PAYG_CAP_REACHED' || paygTry.code === 'PAYG_NOT_ENABLED') {
      return paygTry
    }
    return {
      ok: false,
      code: 'ULTRA_REQUIRES_WALLET',
      message: 'Ultra models (200×) require Credit Wallet, PAYG, or BYOK — blocked on subscription path',
      lane: 'blocked',
    }
  }

  const pending = getPending(input.userId)
  const limits = input.planLimits
  const usage = input.usage

  if (unlimited(limits.tokensPerMonth)) {
    const lane = isPremiumWeight(input.modelId) ? 'subscription_premium' : 'subscription_fast'
    return { ok: true, lane, fallbackFromPremium: false }
  }

  if (isPremiumWeight(input.modelId) && limits.aiPoolMode === 'dual' && limits.tokensPremiumRawPerMonth > 0) {
    const premiumAfter = usage.tokensPremiumRawUsed + pending.premiumRaw + raw
    if (premiumAfter > limits.tokensPremiumRawPerMonth) {
      const fastRemaining = Math.max(
        0,
        limits.tokensFastPerMonth - usage.tokensFastUsed - pending.fastRaw,
      )
      if (fastRemaining > 0) {
        return {
          ok: true,
          lane: 'subscription_fast',
          fallbackFromPremium: true,
          noticeCode: 'PREMIUM_POOL_EXHAUSTED',
        }
      }
      if (input.allowWalletFallback !== false && input.usage.walletBalance > 0) {
        return { ok: true, lane: 'wallet', fallbackFromPremium: true }
      }
      const credits = Math.max(1, Math.floor(input.estimatedWalletCredits ?? applyTokenWeight(raw, input.modelId)))
      return tryPaygLane(input, credits, true)
    }
    return { ok: true, lane: 'subscription_premium', fallbackFromPremium: false }
  }

  // Fast / single pool
  const weight = getModelTokenWeight(input.modelId)
  const weighted = applyTokenWeight(raw, input.modelId)
  if (weight <= 1) {
    const fastAfter = usage.tokensFastUsed + pending.fastRaw + raw
    if (!unlimited(limits.tokensFastPerMonth) && fastAfter > limits.tokensFastPerMonth) {
      if (input.allowWalletFallback !== false && input.usage.walletBalance > 0) {
        return { ok: true, lane: 'wallet', fallbackFromPremium: false }
      }
      const credits = Math.max(1, Math.floor(input.estimatedWalletCredits ?? weighted))
      return tryPaygLane(input, credits, false)
    }
  }

  const totalAfter = usage.tokensWeightedUsed + pending.weighted + weighted
  if (!unlimited(limits.tokensPerMonth) && totalAfter > limits.tokensPerMonth) {
    if (input.allowWalletFallback !== false && input.usage.walletBalance > 0) {
      return { ok: true, lane: 'wallet', fallbackFromPremium: false }
    }
    const credits = Math.max(1, Math.floor(input.estimatedWalletCredits ?? weighted))
    return tryPaygLane(input, credits, false)
  }

  return {
    ok: true,
    lane: weight <= 1 ? 'subscription_fast' : 'subscription_premium',
    fallbackFromPremium: false,
  }
}

export async function reserveSpend(input: SpendReserveInput): Promise<SpendReserveResult> {
  const decision = decideSpendLane(input)
  if (!decision.ok || !('lane' in decision)) return decision as SpendReserveResult

  const raw = Math.max(1, Math.floor(input.estimatedRawTokens))
  const weighted = applyTokenWeight(raw, input.modelId)
  const walletCredits = Math.max(0, Math.floor(input.estimatedWalletCredits ?? weighted))
  const paygUsdCents =
    decision.lane === 'payg' ? paygUsdCentsForCredits(Math.max(1, walletCredits)) : 0

  if (decision.lane === 'wallet') {
    if (input.usage.walletBalance < walletCredits) {
      return {
        ok: false,
        code: 'WALLET_INSUFFICIENT',
        message: 'Wallet balance insufficient for this AI spend',
        lane: 'blocked',
      }
    }
  }

  const reservation: SpendReservation = {
    reservationId: randomUUID(),
    userId: input.userId,
    planId: input.planId,
    modelId: input.modelId,
    lane: decision.lane,
    estimatedRawTokens: raw,
    estimatedWeightedTokens: weighted,
    estimatedWalletCredits: walletCredits,
    estimatedPaygUsdCents: paygUsdCents,
    fallbackFromPremium: decision.fallbackFromPremium,
    status: 'reserved',
    createdAt: new Date().toISOString(),
  }

  reservations.set(reservation.reservationId, reservation)

  if (decision.lane === 'subscription_fast') {
    addPending(input.userId, { weighted, fastRaw: raw })
  } else if (decision.lane === 'subscription_premium') {
    addPending(input.userId, { weighted, premiumRaw: raw })
  } else if (decision.lane === 'wallet') {
    addPending(input.userId, { wallet: walletCredits })
  } else if (decision.lane === 'payg') {
    addPending(input.userId, { paygUsdCents })
  }
  // byok: no pending platform hold

  log.info('spend_reserved', {
    reservationId: reservation.reservationId,
    lane: reservation.lane,
    weighted,
    noticeCode: 'noticeCode' in decision ? decision.noticeCode : undefined,
  })

  return {
    ok: true,
    reservation,
    noticeCode: 'noticeCode' in decision ? decision.noticeCode : undefined,
  }
}

function releasePending(res: SpendReservation) {
  if (res.lane === 'subscription_fast') {
    addPending(res.userId, {
      weighted: -res.estimatedWeightedTokens,
      fastRaw: -res.estimatedRawTokens,
    })
  } else if (res.lane === 'subscription_premium') {
    addPending(res.userId, {
      weighted: -res.estimatedWeightedTokens,
      premiumRaw: -res.estimatedRawTokens,
    })
  } else if (res.lane === 'wallet') {
    addPending(res.userId, { wallet: -res.estimatedWalletCredits })
  } else if (res.lane === 'payg') {
    addPending(res.userId, { paygUsdCents: -res.estimatedPaygUsdCents })
  }
}

export async function settleSpend(
  input: SpendSettleInput,
  adapter: SpendLedgerAdapter,
): Promise<{ ok: true; actualWeighted: number } | { ok: false; code: SpendBlockCode; message: string }> {
  const res = reservations.get(input.reservationId)
  if (!res) {
    return { ok: false, code: 'RESERVATION_NOT_FOUND', message: 'Unknown spend reservation' }
  }
  if (res.status !== 'reserved') {
    return { ok: false, code: 'ALREADY_FINALIZED', message: `Reservation already ${res.status}` }
  }

  const actualRaw = Math.max(0, Math.floor(input.actualRawTokens))
  const actualWeighted = applyTokenWeight(actualRaw || 1, res.modelId)
  releasePending(res)

  if (res.lane === 'byok') {
    res.status = 'settled'
    return { ok: true, actualWeighted: 0 }
  }

  if (res.lane === 'wallet') {
    const credits = Math.max(1, Math.ceil((actualWeighted / res.estimatedWeightedTokens) * res.estimatedWalletCredits) || res.estimatedWalletCredits)
    await adapter.debitWallet({
      userId: res.userId,
      credits,
      reservationId: res.reservationId,
    })
  } else if (res.lane === 'payg') {
    const usdCents = Math.max(
      1,
      Math.ceil((actualWeighted / res.estimatedWeightedTokens) * res.estimatedPaygUsdCents) ||
        res.estimatedPaygUsdCents,
    )
    if (!adapter.debitPayg) {
      return {
        ok: false,
        code: 'PAYG_NOT_ENABLED',
        message: 'PAYG ledger adapter missing — cannot settle on-demand spend',
      }
    }
    await adapter.debitPayg({
      userId: res.userId,
      usdCents,
      reservationId: res.reservationId,
    })
  } else {
    await adapter.debitSubscription({
      userId: res.userId,
      lane: res.lane,
      rawTokens: actualRaw || res.estimatedRawTokens,
      weightedTokens: actualWeighted,
      modelId: res.modelId,
    })
  }

  res.status = 'settled'
  log.info('spend_settled', { reservationId: res.reservationId, actualWeighted, lane: res.lane })
  return { ok: true, actualWeighted }
}

export async function settleSpendZero(
  reservationId: string,
  _adapter?: SpendLedgerAdapter,
): Promise<void> {
  const res = reservations.get(reservationId)
  if (!res || res.status !== 'reserved') return
  releasePending(res)
  res.status = 'settle_zero'
  log.info('spend_settle_zero', { reservationId })
}

export async function cancelSpend(reservationId: string): Promise<void> {
  const res = reservations.get(reservationId)
  if (!res || res.status !== 'reserved') return
  releasePending(res)
  res.status = 'cancelled'
  log.info('spend_cancelled', { reservationId })
}

export function getSpendReservation(reservationId: string): SpendReservation | undefined {
  return reservations.get(reservationId)
}

/** Test isolation */
export function __resetSpendResolverForTests(): void {
  reservations.clear()
  pendingByUser.clear()
}

/** Memory adapter for unit tests — tracks debits without Prisma */
export function createMemorySpendLedger(): SpendLedgerAdapter & {
  subscriptionDebits: Array<{ userId: string; weightedTokens: number; lane: string }>
  walletDebits: Array<{ userId: string; credits: number }>
  paygDebits: Array<{ userId: string; usdCents: number }>
} {
  const subscriptionDebits: Array<{ userId: string; weightedTokens: number; lane: string }> = []
  const walletDebits: Array<{ userId: string; credits: number }> = []
  const paygDebits: Array<{ userId: string; usdCents: number }> = []
  return {
    subscriptionDebits,
    walletDebits,
    paygDebits,
    async debitSubscription(input) {
      subscriptionDebits.push({
        userId: input.userId,
        weightedTokens: input.weightedTokens,
        lane: input.lane,
      })
    },
    async debitWallet(input) {
      walletDebits.push({ userId: input.userId, credits: input.credits })
    },
    async debitPayg(input) {
      paygDebits.push({ userId: input.userId, usdCents: input.usdCents })
    },
  }
}
