/**
 * DEPRECATED parallel CostGuard — Law XVI Trava I lives in production only.
 *
 * Thin re-export so accidental `@/lib/ai/creative-cost-guard` imports still hit
 * the single reserve/settle choke. Old class API fails closed (no Prisma/chat
 * dual path that could skip free-tier platform-pay deny).
 *
 * Canonical: `@/lib/production/creative-cost-guard`
 */

export {
  cancelCreativeCost,
  createMemoryCostGuardLedger,
  reserveCreativeCost,
  settleCreativeCost,
  settleCreativeCostZero,
  type CostGuardBlockReason,
  type CostGuardDenyResult,
  type CostGuardLedgerAdapter,
  type CostGuardReserveResult,
  type CostGuardResult,
  type CreativeCostGuardInput,
  type CreativeCostReservation,
} from '@/lib/production/creative-cost-guard'

export const CREATIVE_COST_GUARD_CANONICAL = 'lib/production/creative-cost-guard' as const

const DEPRECATION =
  '[Law XVI] lib/ai/CreativeCostGuard class is deprecated. Use reserveCreativeCost / settleCreativeCost from @/lib/production/creative-cost-guard.'

/**
 * @deprecated Fail-closed. Does not reserve credits — forces callers onto production API.
 */
export class CreativeCostGuard {
  static async reserveTokens(..._args: unknown[]): Promise<never> {
    throw new Error(DEPRECATION)
  }

  static async settleReservation(..._args: unknown[]): Promise<never> {
    throw new Error(DEPRECATION)
  }

  static async rollbackReservation(..._args: unknown[]): Promise<never> {
    throw new Error(DEPRECATION)
  }
}
