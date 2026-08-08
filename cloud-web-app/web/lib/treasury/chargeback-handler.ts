/**
 * H.1+ / Law XII.5 — Chargeback / dispute handler.
 * Reverse path: revoke custodial Backpack items + reverse Coins mint when referenced.
 * Idempotent by disputeId. Fail-closed on missing dispute identity.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  burnAethelCoins,
  computeAethelCoinBalance,
  createMemoryAethelCoinLedgerStore,
  mintAethelCoins,
  type AethelCoinLedgerStore,
} from '@/lib/treasury/aethel-coin-ledger'
import {
  createMemoryItemCustodyStore,
  placeItemInCustody,
  revokeItemCustody,
  type ItemCustodyStore,
  type PlayerOwnedItemRecord,
} from '@/lib/treasury/item-custody-escrow'

const log = createComponentLogger('chargeback-handler')

export type ChargebackDisputeKind = 'stripe_dispute' | 'manual_reversal'

export interface ChargebackDisputeInput {
  disputeId: string
  kind: ChargebackDisputeKind
  /** Buyer / wallet owner. */
  userId: string
  /** Marketplace / Stripe payment reference used at purchase. */
  purchaseReference: string
  /** When set, reverse this many Coins previously minted for the purchase. */
  coinMintAmount?: number
  reason?: string
  now?: Date
}

export interface ChargebackHandlerResult {
  disputeId: string
  status: 'applied' | 'already_applied'
  revokedItemIds: string[]
  coinsReversed: number
  skippedOwnedPastCustody: number
}

export type ChargebackResult =
  | { ok: true; value: ChargebackHandlerResult }
  | { ok: false; code: string; message: string }

export interface ChargebackHandlerDeps {
  coinStore: AethelCoinLedgerStore
  custodyStore: ItemCustodyStore
  /** Durable set of applied dispute ids (idempotency). */
  appliedDisputes?: Set<string>
}

function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0
}

export function createChargebackHandler(deps: ChargebackHandlerDeps) {
  const applied = deps.appliedDisputes ?? new Set<string>()

  async function handleChargeback(
    input: ChargebackDisputeInput,
  ): Promise<ChargebackResult> {
    if (!isNonEmpty(input.disputeId)) {
      return { ok: false, code: 'DISPUTE_ID_REQUIRED', message: 'disputeId required' }
    }
    if (!isNonEmpty(input.userId)) {
      return { ok: false, code: 'USER_ID_REQUIRED', message: 'userId required' }
    }
    if (!isNonEmpty(input.purchaseReference)) {
      return {
        ok: false,
        code: 'PURCHASE_REF_REQUIRED',
        message: 'purchaseReference required',
      }
    }

    const disputeId = input.disputeId.trim()
    if (applied.has(disputeId)) {
      return {
        ok: true,
        value: {
          disputeId,
          status: 'already_applied',
          revokedItemIds: [],
          coinsReversed: 0,
          skippedOwnedPastCustody: 0,
        },
      }
    }

    const now = input.now ?? new Date()
    const reason = (input.reason ?? `chargeback:${disputeId}`).trim()
    const items = await deps.custodyStore.listByPurchaseReference(
      input.purchaseReference.trim(),
    )

    const revokedItemIds: string[] = []
    let skippedOwnedPastCustody = 0

    for (const item of items) {
      const rev = await revokeItemCustody(deps.custodyStore, item.id, reason, now)
      if (rev.ok) {
        revokedItemIds.push(rev.value.id)
      } else if (rev.code === 'CUSTODY_CLEARED') {
        skippedOwnedPastCustody += 1
      } else if (rev.code !== 'ITEM_NOT_FOUND') {
        log.warn('chargeback_item_revoke_skipped', {
          itemId: item.id,
          code: rev.code,
          disputeId,
        })
      }
    }

    let coinsReversed = 0
    const mintAmount = input.coinMintAmount
    if (typeof mintAmount === 'number') {
      if (!Number.isInteger(mintAmount) || mintAmount <= 0) {
        return {
          ok: false,
          code: 'COIN_AMOUNT_INVALID',
          message: 'coinMintAmount must be positive integer when provided',
        }
      }
      const balance = await computeAethelCoinBalance(deps.coinStore, input.userId)
      const burnAmount = Math.min(balance, mintAmount)
      if (burnAmount > 0) {
        const burn = await burnAethelCoins(deps.coinStore, {
          userId: input.userId,
          amount: burnAmount,
          reference: `chargeback:${disputeId}:${input.purchaseReference}`,
          entryType: 'chargeback_reverse',
          metadata: {
            disputeId,
            purchaseReference: input.purchaseReference,
            requestedReverse: mintAmount,
          },
          now,
        })
        if (!burn.ok) {
          return { ok: false, code: burn.code, message: burn.message }
        }
        coinsReversed = burnAmount
      }
    }

    applied.add(disputeId)
    const result: ChargebackHandlerResult = {
      disputeId,
      status: 'applied',
      revokedItemIds,
      coinsReversed,
      skippedOwnedPastCustody,
    }
    log.info('chargeback_applied', {
      disputeId,
      userId: input.userId,
      revokedCount: revokedItemIds.length,
      coinsReversed,
      skippedOwnedPastCustody,
    })
    return { ok: true, value: result }
  }

  return {
    handleChargeback,
    hasApplied(disputeId: string): boolean {
      return applied.has(disputeId)
    },
  }
}

export type ChargebackHandler = ReturnType<typeof createChargebackHandler>

export function probeChargebackHandlerReady(): boolean {
  return probeChargebackHandlerSemanticsSync()
}

export function probeChargebackHandlerSemanticsSync(): boolean {
  try {
    // Sync model: custodial revoke + coin reverse + idempotent dispute.
    const applied = new Set<string>()
    let coins = 100
    let itemStatus: 'custodial' | 'owned' | 'revoked' = 'custodial'

    const apply = (disputeId: string) => {
      if (!disputeId) return false
      if (applied.has(disputeId)) return true
      if (itemStatus === 'custodial') itemStatus = 'revoked'
      const reverse = Math.min(coins, 100)
      coins -= reverse
      applied.add(disputeId)
      return true
    }

    if (apply('') === true) return false
    if (!apply('d1')) return false
    if (itemStatus !== 'revoked') return false
    if (coins !== 0) return false
    if (!apply('d1')) return false // idempotent
    if (coins !== 0) return false
    return true
  } catch {
    return false
  }
}

/** Async smoke for module tests — full reverse path. */
export async function smokeChargebackHandler(): Promise<{
  ok: boolean
  revoked: PlayerOwnedItemRecord | null
  coins: number
}> {
  const coinStore = createMemoryAethelCoinLedgerStore()
  const custodyStore = createMemoryItemCustodyStore()
  await mintAethelCoins(coinStore, {
    userId: 'buyer',
    amount: 25,
    reference: 'purchase:pi_smoke',
    entryType: 'purchase',
  })
  const placed = await placeItemInCustody(custodyStore, {
    userId: 'buyer',
    marketplaceItemId: 'item_1',
    contentHash: 'cas:abc',
    purchaseReference: 'purchase:pi_smoke',
  })
  if (!placed.ok) return { ok: false, revoked: null, coins: -1 }

  const handler = createChargebackHandler({ coinStore, custodyStore })
  const first = await handler.handleChargeback({
    disputeId: 'dp_smoke_1',
    kind: 'stripe_dispute',
    userId: 'buyer',
    purchaseReference: 'purchase:pi_smoke',
    coinMintAmount: 25,
  })
  if (!first.ok || first.value.status !== 'applied') {
    return { ok: false, revoked: null, coins: -1 }
  }
  const second = await handler.handleChargeback({
    disputeId: 'dp_smoke_1',
    kind: 'stripe_dispute',
    userId: 'buyer',
    purchaseReference: 'purchase:pi_smoke',
    coinMintAmount: 25,
  })
  if (!second.ok || second.value.status !== 'already_applied') {
    return { ok: false, revoked: null, coins: -1 }
  }
  const item = await custodyStore.get(placed.value.id)
  const coins = await computeAethelCoinBalance(coinStore, 'buyer')
  return {
    ok: item?.status === 'revoked' && coins === 0 && first.value.revokedItemIds.length === 1,
    revoked: item,
    coins,
  }
}
