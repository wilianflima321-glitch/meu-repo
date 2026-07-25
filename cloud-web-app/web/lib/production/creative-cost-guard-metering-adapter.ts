/**
 * CostGuard ↔ live metering adapter (Focus 1A → Block 6 bridge)
 * Routes subscription-pool reserves through consumeMeteredUsage.
 * Full spend-resolver (single debit path) remains Block 6A.
 */

import {
  consumeMeteredUsage,
  type MeteringDecision,
} from '@/lib/metering'
import type { PlanLimits } from '@/lib/plans'
import type { CostGuardLedgerAdapter, CostGuardBlockReason } from './creative-cost-guard'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('creative-cost-guard-metering-adapter')

export interface MeteringCostGuardOptions {
  getPlanLimits: (userId: string) => Promise<PlanLimits>
  hasByok: (userId: string, byokProfileId?: string) => Promise<boolean>
}

export type MeteringCostGuardAdapter = CostGuardLedgerAdapter & {
  getLastDecision: () => MeteringDecision | null
}

/**
 * Adapter that debits weighted tokens from UsageBucket on reserve.
 * Settle/cancel are best-effort no-ops until spend-resolver ships (6A) —
 * reserve already consumed; settleZero cannot refund UsageBucket without ledger.
 * Callers must prefer BYOK or wallet for refundable paths until 6A.
 */
export function createMeteringCostGuardAdapter(
  options: MeteringCostGuardOptions,
): MeteringCostGuardAdapter {
  let lastDecision: MeteringDecision | null = null

  return {
    getLastDecision() {
      return lastDecision
    },
    async hasByok(userId, byokProfileId) {
      return options.hasByok(userId, byokProfileId)
    },
    async reservePool(input) {
      try {
        const limits = await options.getPlanLimits(input.userId)
        const decision: MeteringDecision = await consumeMeteredUsage({
          userId: input.userId,
          limits,
          cost: { requests: 1, tokens: input.estimatedTokenWeight },
        })
        lastDecision = decision
        log.info('metering_reserve_ok', {
          userId: input.userId,
          estimatedTokenWeight: input.estimatedTokenWeight,
          remainingMonth: decision.remaining?.tokensPerMonth,
        })
        return { ok: true, funding: 'usage_bucket' }
      } catch (err) {
        const reason: CostGuardBlockReason = 'credits_exhausted'
        log.warn('metering_reserve_denied', {
          userId: input.userId,
          message: err instanceof Error ? err.message : 'denied',
        })
        return { ok: false, reason }
      }
    },
    async settlePool() {
      // UsageBucket already incremented on reserve — true settle/refund needs spend-resolver (6A)
    },
    async cancelPool() {
      // Cannot safely refund UsageBucket without reservation ledger — Block 6A
      log.warn('metering_cancel_noop_until_spend_resolver', {})
    },
  }
}
