/**
 * Block 6A.2 — Single chat spend session
 * ONE path: spend-resolver (sub pools → wallet → block). No parallel
 * consumeMeteredUsage + reserveCredits on the same request.
 */

import { NextResponse } from 'next/server'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  applyTokenWeight,
} from '@/lib/ai/model-cost-weights'
import {
  cancelSpend,
  reserveSpend,
  settleSpend,
  settleSpendZero,
  type SpendLane,
  type SpendLedgerAdapter,
  type SpendPlanLimits,
  type SpendReservation,
} from '@/lib/ai/spend-resolver'
import { getCurrentUsage } from '@/lib/plan-limits'
import {
  cancelReservation,
  calculateTokenCost,
  getCreditBalance,
  reserveCredits,
  settleCredits,
} from '@/lib/credit-wallet'
import { consumeMeteredUsage } from '@/lib/metering'
import type { PlanLimits as PlansPlanLimits } from '@/lib/plans'
import { accruePaygUsage, loadPaygSnapshot } from '@/lib/billing/payg-policy'

const log = createComponentLogger('chat-spend-session')

export interface ChatSpendSession {
  reservationId: string
  lane: Exclude<SpendLane, 'blocked'>
  modelId: string
  noticeCode?: 'PREMIUM_POOL_EXHAUSTED'
  headers: Record<string, string>
  settle: (actualRawTokens: number) => Promise<void>
  cancel: () => Promise<void>
  settleZero: () => Promise<void>
}

export type BeginChatSpendResult =
  | { ok: true; session: ChatSpendSession }
  | { ok: false; response: NextResponse }

function mapBlockToResponse(input: {
  code: string
  message: string
  planId: string
  paygEnabled?: boolean
}): NextResponse {
  const status = 402
  const paygCta = input.paygEnabled
    ? { id: 'enable_payg', label: 'Manage PAYG cap', href: '/billing?tab=payg', held: false }
    : { id: 'enable_payg', label: 'Enable PAYG with spend cap', href: '/billing?tab=payg', held: false }

  return NextResponse.json(
    {
      error: input.code,
      message: input.message,
      plan: input.planId,
      upgradeUrl: '/pricing',
      walletUrl: '/billing',
      byokUrl: '/settings?tab=byok',
      ctas: [
        { id: 'buy_credits', label: 'Buy AI credits', href: '/billing' },
        paygCta,
        { id: 'connect_byok', label: 'Connect BYOK', href: '/settings?tab=byok' },
        { id: 'upgrade', label: 'Upgrade plan', href: '/pricing' },
      ],
      ideLocked: false,
      spendResolver: true,
    },
    { status },
  )
}

function createSessionLedger(input: {
  planLimits: PlansPlanLimits
  getCreditHold: () => string | null
  clearCreditHold: () => void
}): SpendLedgerAdapter {
  return {
    async debitSubscription(debit) {
      await consumeMeteredUsage({
        userId: debit.userId,
        limits: input.planLimits,
        cost: { requests: 1, tokens: debit.weightedTokens },
      })
    },
    async debitWallet(debit) {
      const hold = input.getCreditHold()
      if (hold) {
        await settleCredits(hold, debit.credits, { actualTokens: debit.credits })
        input.clearCreditHold()
        return
      }
      const reserved = await reserveCredits(debit.userId, 'chat', debit.credits)
      if (!reserved) {
        throw new Error('WALLET_INSUFFICIENT')
      }
      await settleCredits(reserved.reservationId, debit.credits, { actualTokens: debit.credits })
    },
    async debitPayg(debit) {
      await accruePaygUsage(debit.userId, debit.usdCents)
    },
  }
}

/**
 * Begin a chat spend session. Caller MUST settle, cancel, or settleZero.
 */
export async function beginChatSpendSession(input: {
  userId: string
  planId: string
  planLimits: SpendPlanLimits & PlansPlanLimits
  modelId: string
  estimatedRawTokens: number
  byok?: boolean
  operationType?: 'chat' | 'chat_advanced'
}): Promise<BeginChatSpendResult> {
  const modelId = input.modelId || 'openai/gpt-4o-mini'
  const operationType = input.operationType ?? 'chat'
  const estimatedRaw = Math.max(1, Math.floor(input.estimatedRawTokens))

  if (input.byok) {
    const reserved = await reserveSpend({
      userId: input.userId,
      planId: input.planId,
      planLimits: input.planLimits,
      modelId,
      estimatedRawTokens: estimatedRaw,
      byok: true,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    if (!reserved.ok) {
      return {
        ok: false,
        response: mapBlockToResponse({
          code: reserved.code,
          message: reserved.message,
          planId: input.planId,
        }),
      }
    }
    return {
      ok: true,
      session: wrapSession({
        reservation: reserved.reservation,
        planLimits: input.planLimits,
        creditHoldId: null,
        noticeCode: reserved.noticeCode,
        operationType,
      }),
    }
  }

  const [usage, walletBalance, paygSnap] = await Promise.all([
    getCurrentUsage(input.userId),
    getCreditBalance(input.userId),
    loadPaygSnapshot(input.userId),
  ])

  const weightedEstimate = applyTokenWeight(estimatedRaw, modelId)
  const estimatedWalletCredits = Math.max(
    1,
    calculateTokenCost(operationType, weightedEstimate),
  )

  const reserved = await reserveSpend({
    userId: input.userId,
    planId: input.planId,
    planLimits: input.planLimits,
    modelId,
    estimatedRawTokens: estimatedRaw,
    byok: false,
    allowWalletFallback: true,
    estimatedWalletCredits,
    payg: paygSnap
      ? {
          enabled: paygSnap.enabled,
          spendCapUsdCents: paygSnap.spendCapUsdCents,
          accruedUsdCents: paygSnap.accruedUsdCents,
        }
      : undefined,
    usage: {
      tokensFastUsed: usage.tokensFastUsed,
      tokensPremiumRawUsed: usage.tokensPremiumRawUsed,
      tokensWeightedUsed: usage.tokensUsed,
      walletBalance,
    },
  })

  if (!reserved.ok) {
    log.warn('chat_spend_blocked', { code: reserved.code, userId: input.userId })
    return {
      ok: false,
      response: mapBlockToResponse({
        code: reserved.code,
        message: reserved.message,
        planId: input.planId,
        paygEnabled: paygSnap?.enabled,
      }),
    }
  }

  let creditHoldId: string | null = null
  if (reserved.reservation.lane === 'wallet') {
    const hold = await reserveCredits(input.userId, operationType, estimatedWalletCredits)
    if (!hold) {
      await cancelSpend(reserved.reservation.reservationId)
      return {
        ok: false,
        response: mapBlockToResponse({
          code: 'WALLET_INSUFFICIENT',
          message: 'Insufficient wallet credits for this AI request',
          planId: input.planId,
        }),
      }
    }
    creditHoldId = hold.reservationId
  }

  log.info('chat_spend_begun', {
    reservationId: reserved.reservation.reservationId,
    lane: reserved.reservation.lane,
    noticeCode: reserved.noticeCode,
  })

  const fastRemaining =
    input.planLimits.tokensFastPerMonth === -1
      ? -1
      : Math.max(0, input.planLimits.tokensFastPerMonth - usage.tokensFastUsed)
  const premiumRemaining =
    input.planLimits.tokensPremiumRawPerMonth === -1
      ? -1
      : Math.max(0, input.planLimits.tokensPremiumRawPerMonth - usage.tokensPremiumRawUsed)

  return {
    ok: true,
    session: wrapSession({
      reservation: reserved.reservation,
      planLimits: input.planLimits,
      creditHoldId,
      noticeCode: reserved.noticeCode,
      operationType,
      usageHeaders: {
        'X-Usage-Fast-Remaining': String(fastRemaining),
        'X-Usage-Premium-Remaining': String(premiumRemaining),
        'X-Usage-Wallet-Balance': String(walletBalance),
      },
    }),
  }
}

function wrapSession(input: {
  reservation: SpendReservation
  planLimits: PlansPlanLimits
  creditHoldId: string | null
  noticeCode?: 'PREMIUM_POOL_EXHAUSTED'
  operationType: 'chat' | 'chat_advanced'
  usageHeaders?: Record<string, string>
}): ChatSpendSession {
  let creditHoldId = input.creditHoldId
  let finalized = false
  const reservationId = input.reservation.reservationId

  const ledger = createSessionLedger({
    planLimits: input.planLimits,
    getCreditHold: () => creditHoldId,
    clearCreditHold: () => {
      creditHoldId = null
    },
  })

  const headers: Record<string, string> = {
    'X-Aethel-Spend-Resolver': '1',
    'X-Aethel-Spend-Lane': input.reservation.lane,
  }
  if (input.noticeCode) {
    headers['X-Aethel-Spend-Notice'] = input.noticeCode
  }
  if (input.usageHeaders) {
    Object.assign(headers, input.usageHeaders)
  }

  return {
    reservationId,
    lane: input.reservation.lane,
    modelId: input.reservation.modelId,
    noticeCode: input.noticeCode,
    headers,
    async settle(actualRawTokens) {
      if (finalized) return
      finalized = true
      const actualRaw = Math.max(0, Math.floor(actualRawTokens))

      if (input.reservation.lane === 'wallet') {
        const weighted = applyTokenWeight(actualRaw || 1, input.reservation.modelId)
        const credits = Math.max(1, calculateTokenCost(input.operationType, weighted))
        if (creditHoldId) {
          await settleCredits(creditHoldId, credits, { actualTokens: actualRaw })
          creditHoldId = null
        }
        // Clear soft-hold; wallet already settled — no second debit
        await settleSpend(
          { reservationId, actualRawTokens: actualRaw || 1 },
          {
            async debitSubscription() {},
            async debitWallet() {},
          },
        )
        return
      }

      const result = await settleSpend({ reservationId, actualRawTokens: actualRaw || 1 }, ledger)
      if (!result.ok) {
        log.warn('chat_spend_settle_fail', { code: result.code, reservationId })
      }
    },
    async cancel() {
      if (finalized) return
      finalized = true
      if (creditHoldId) {
        await cancelReservation(creditHoldId).catch(() => {})
        creditHoldId = null
      }
      await cancelSpend(reservationId)
    },
    async settleZero() {
      if (finalized) return
      finalized = true
      if (creditHoldId) {
        await cancelReservation(creditHoldId).catch(() => {})
        creditHoldId = null
      }
      await settleSpendZero(reservationId)
    },
  }
}
