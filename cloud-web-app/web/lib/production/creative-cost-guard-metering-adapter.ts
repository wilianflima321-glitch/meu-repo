/**
 * @deprecated Single-phase metering adapter — FAIL-CLOSED. Use createSpendResolverCostGuardAdapter
 * (lib/production/creative-cost-guard-spend-adapter) for the refundable two-phase metering path.
 *
 * The old single-phase design consumed UsageBucket on reserve and could NOT refund on settleZero —
 * a silent-billing liability under Law XVI Trava I. Block 6A (spend-resolver) ships the correct
 * path: reserve holds quota, settle debits UsageBucket, settleZero charges $0. This adapter no
 * longer consumes anything: reserve refuses, so no path can bill UsageBucket without a refundable
 * reservation.
 */

import { type MeteringDecision } from '@/lib/metering'
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
 * @deprecated Fail-closed — do not use. Single-phase reserve consumed UsageBucket and could not
 * refund on settleZero. Migrate to createSpendResolverCostGuardAdapter (refundable two-phase).
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
      const reason: CostGuardBlockReason = 'cost_guard_denied'
      log.warn('metering_adapter_deprecated_fail_closed', {
        userId: input.userId,
        estimatedTokenWeight: input.estimatedTokenWeight,
        reason,
        message: 'use createSpendResolverCostGuardAdapter (refundable two-phase spend-resolver)',
      })
      return { ok: false, reason }
    },
    async settlePool() {
      // Fail-closed: reserve never created a hold — nothing to settle.
    },
    async cancelPool() {
      // Fail-closed: reserve never created a hold — nothing to refund.
    },
  }
}
