/**
 * CostGuard ↔ SpendResolver adapter (Focus 1A → Block 6A)
 * Two-phase: reserve holds quota → settle debits UsageBucket → settleZero charges $0
 */

import { consumeMeteredUsage, type MeteringDecision } from '@/lib/metering'
import type { PlanLimits as PlansPlanLimits } from '@/lib/plans'
import type { CostGuardLedgerAdapter, CostGuardBlockReason } from './creative-cost-guard'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  createMemorySpendLedger,
  reserveSpend,
  settleSpend,
  settleSpendZero,
  type SpendLedgerAdapter,
  type SpendPlanLimits,
  type SpendPoolSnapshot,
} from '@/lib/ai/spend-resolver'

const log = createComponentLogger('creative-cost-guard-spend-adapter')

export interface SpendResolverCostGuardOptions {
  getPlanId: (userId: string) => Promise<string>
  getPlanLimits: (userId: string) => Promise<SpendPlanLimits>
  getUsage: (userId: string) => Promise<SpendPoolSnapshot>
  hasByok: (userId: string, byokProfileId?: string) => Promise<boolean>
  /** Defaults to live UsageBucket debit on settle */
  ledger?: SpendLedgerAdapter
}

export type SpendResolverCostGuardAdapter = CostGuardLedgerAdapter & {
  getLastDecision: () => MeteringDecision | null
  getLastReservationId: () => string | null
}

function createLiveSubscriptionLedger(): SpendLedgerAdapter {
  return {
    async debitSubscription(input) {
      // Tokens already weighted by spend-resolver — do not pass modelId (avoids double 40×).
      await consumeMeteredUsage({
        userId: input.userId,
        limits: {
          tokensPerMonth: -1,
          tokensFastPerMonth: -1,
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
        } satisfies PlansPlanLimits,
        cost: { requests: 1, tokens: input.weightedTokens },
      })
    },
    async debitWallet(input) {
      const { reserveCredits, settleCredits } = await import('@/lib/credit-wallet')
      const hold = await reserveCredits(input.userId, 'chat', input.credits, input.reservationId)
      if (!hold) {
        throw new Error('WALLET_INSUFFICIENT')
      }
      await settleCredits(hold.reservationId, input.credits, { actualTokens: input.credits })
      log.info('wallet_debit_ok', {
        userId: input.userId,
        credits: input.credits,
        reservationId: input.reservationId,
      })
    },
  }
}

/**
 * Preferred CostGuard adapter: refundable settleZero via spend-resolver holds.
 */
export function createSpendResolverCostGuardAdapter(
  options: SpendResolverCostGuardOptions,
): SpendResolverCostGuardAdapter {
  let lastDecision: MeteringDecision | null = null
  let lastReservationId: string | null = null
  const ledger = options.ledger ?? createLiveSubscriptionLedger()

  return {
    getLastDecision() {
      return lastDecision
    },
    getLastReservationId() {
      return lastReservationId
    },
    async hasByok(userId, byokProfileId) {
      return options.hasByok(userId, byokProfileId)
    },
    async reservePool(input) {
      try {
        const [planId, limits, usage] = await Promise.all([
          options.getPlanId(input.userId),
          options.getPlanLimits(input.userId),
          options.getUsage(input.userId),
        ])
        const reserved = await reserveSpend({
          userId: input.userId,
          planId,
          planLimits: limits,
          modelId: 'aethel/creative-metered',
          estimatedRawTokens: input.estimatedTokenWeight,
          byok: false,
          allowWalletFallback: false,
          usage,
        })
        if (!reserved.ok) {
          const reason: CostGuardBlockReason =
            reserved.code === 'QUOTA_EXCEEDED' || reserved.code === 'PREMIUM_POOL_EXHAUSTED'
              ? 'credits_exhausted'
              : 'cost_guard_denied'
          return { ok: false, reason }
        }
        lastReservationId = reserved.reservation.reservationId
        lastDecision = {
          allowed: true,
          remaining: {
            tokensPerMonth:
              limits.tokensPerMonth === -1
                ? -1
                : Math.max(
                    0,
                    limits.tokensPerMonth -
                      usage.tokensWeightedUsed -
                      reserved.reservation.estimatedWeightedTokens,
                  ),
          },
        }
        log.info('spend_adapter_reserve_ok', {
          spendReservationId: reserved.reservation.reservationId,
          weighted: reserved.reservation.estimatedWeightedTokens,
        })
        return {
          ok: true,
          funding: 'usage_bucket',
          reservationId: reserved.reservation.reservationId,
        }
      } catch (err) {
        log.warn('spend_adapter_reserve_fail', {
          message: err instanceof Error ? err.message : 'fail',
        })
        return { ok: false, reason: 'credits_exhausted' }
      }
    },
    async settlePool(reservationId, actualTokenWeight) {
      const settled = await settleSpend(
        { reservationId, actualRawTokens: actualTokenWeight },
        ledger,
      )
      if (!settled.ok) {
        log.warn('spend_adapter_settle_fail', { code: settled.code, reservationId })
      }
    },
    async cancelPool(reservationId) {
      await settleSpendZero(reservationId, ledger)
      log.info('spend_adapter_settle_zero', { reservationId })
    },
  }
}

/** Test helper — memory spend ledger + CostGuard adapter */
export function createMemorySpendResolverCostGuardAdapter(
  options: Omit<SpendResolverCostGuardOptions, 'ledger'> & {
    ledger?: ReturnType<typeof createMemorySpendLedger>
  },
): SpendResolverCostGuardAdapter & { ledger: ReturnType<typeof createMemorySpendLedger> } {
  const ledger = options.ledger ?? createMemorySpendLedger()
  const adapter = createSpendResolverCostGuardAdapter({ ...options, ledger })
  return Object.assign(adapter, { ledger })
}
