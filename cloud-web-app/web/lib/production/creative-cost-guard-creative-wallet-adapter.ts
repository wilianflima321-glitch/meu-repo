/**
 * Block 6F.3 — CostGuard adapter that debits Creative Wallet only.
 * Never calls consumeMeteredUsage / LLM Fast·Premium pools.
 */

import type { CostGuardLedgerAdapter, CostGuardBlockReason } from './creative-cost-guard'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  cancelCreativeReservation,
  getCreativeCreditBalance,
  reserveCreativeCredits,
  settleCreativeCredits,
  weightedTokensToCreativeCredits,
} from '@/lib/billing/creative-wallet'

const log = createComponentLogger('creative-wallet-cost-guard-adapter')

const holds = new Map<string, { credits: number; userId: string }>()

export function createCreativeWalletCostGuardAdapter(options: {
  hasByok: (userId: string, byokProfileId?: string) => Promise<boolean>
  modality?: string
}): CostGuardLedgerAdapter & {
  getLastReservationId: () => string | null
} {
  let lastReservationId: string | null = null

  return {
    getLastReservationId() {
      return lastReservationId
    },
    async hasByok(userId, byokProfileId) {
      return options.hasByok(userId, byokProfileId)
    },
    async reservePool(input) {
      const credits = weightedTokensToCreativeCredits(input.estimatedTokenWeight)
      const hold = await reserveCreativeCredits({
        userId: input.userId,
        credits,
        modality: options.modality,
        weightedTokens: input.estimatedTokenWeight,
        reference: `creative-${options.modality || 'job'}`,
      })
      if (!hold) {
        const bal = await getCreativeCreditBalance(input.userId)
        log.warn('creative_wallet_reserve_denied', {
          userId: input.userId,
          need: credits,
          balance: bal,
        })
        const reason: CostGuardBlockReason = 'credits_exhausted'
        return { ok: false, reason }
      }
      lastReservationId = hold.reservationId
      holds.set(hold.reservationId, { credits: hold.credits, userId: input.userId })
      log.info('creative_wallet_reserve_ok', {
        reservationId: hold.reservationId,
        credits: hold.credits,
        weighted: input.estimatedTokenWeight,
      })
      return {
        ok: true,
        funding: 'wallet',
        reservationId: hold.reservationId,
      }
    },
    async settlePool(reservationId, actualTokenWeight) {
      const hold = holds.get(reservationId)
      const actualCredits = weightedTokensToCreativeCredits(actualTokenWeight)
      await settleCreativeCredits({
        reservationId,
        actualCredits: hold ? Math.min(hold.credits, actualCredits) : actualCredits,
        weightedTokens: actualTokenWeight,
      })
      holds.delete(reservationId)
    },
    async cancelPool(reservationId) {
      await cancelCreativeReservation(reservationId)
      holds.delete(reservationId)
      log.info('creative_wallet_cancel', { reservationId })
    },
  }
}
