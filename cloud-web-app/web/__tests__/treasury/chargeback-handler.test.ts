/**
 * H.1+ — Chargeback reverse path (items + coins).
 */

import { describe, expect, it } from 'vitest'

import {
  computeAethelCoinBalance,
  createMemoryAethelCoinLedgerStore,
  mintAethelCoins,
} from '@/lib/treasury/aethel-coin-ledger'
import {
  createChargebackHandler,
  probeChargebackHandlerReady,
  smokeChargebackHandler,
} from '@/lib/treasury/chargeback-handler'
import {
  createMemoryItemCustodyStore,
  placeItemInCustody,
} from '@/lib/treasury/item-custody-escrow'

describe('chargeback-handler', () => {
  it('revokes custodial items and reverses coin mint; idempotent by disputeId', async () => {
    const coinStore = createMemoryAethelCoinLedgerStore()
    const custodyStore = createMemoryItemCustodyStore()
    await mintAethelCoins(coinStore, {
      userId: 'buyer',
      amount: 40,
      reference: 'purchase:pi_x',
      entryType: 'purchase',
    })
    const placed = await placeItemInCustody(custodyStore, {
      userId: 'buyer',
      marketplaceItemId: 'item_x',
      contentHash: 'cas:x',
      purchaseReference: 'purchase:pi_x',
    })
    expect(placed.ok).toBe(true)

    const handler = createChargebackHandler({ coinStore, custodyStore })
    const first = await handler.handleChargeback({
      disputeId: 'dp_1',
      kind: 'stripe_dispute',
      userId: 'buyer',
      purchaseReference: 'purchase:pi_x',
      coinMintAmount: 40,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.value.status).toBe('applied')
    expect(first.value.revokedItemIds).toHaveLength(1)
    expect(first.value.coinsReversed).toBe(40)
    expect(await computeAethelCoinBalance(coinStore, 'buyer')).toBe(0)

    const second = await handler.handleChargeback({
      disputeId: 'dp_1',
      kind: 'stripe_dispute',
      userId: 'buyer',
      purchaseReference: 'purchase:pi_x',
      coinMintAmount: 40,
    })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.value.status).toBe('already_applied')
    expect(second.value.coinsReversed).toBe(0)
  })

  it('fails closed without dispute id', async () => {
    const handler = createChargebackHandler({
      coinStore: createMemoryAethelCoinLedgerStore(),
      custodyStore: createMemoryItemCustodyStore(),
    })
    const bad = await handler.handleChargeback({
      disputeId: '',
      kind: 'manual_reversal',
      userId: 'buyer',
      purchaseReference: 'pi',
    })
    expect(bad.ok).toBe(false)
  })

  it('behavioral probe + async smoke pass', async () => {
    expect(probeChargebackHandlerReady()).toBe(true)
    const smoke = await smokeChargebackHandler()
    expect(smoke.ok).toBe(true)
    expect(smoke.coins).toBe(0)
  })
})
