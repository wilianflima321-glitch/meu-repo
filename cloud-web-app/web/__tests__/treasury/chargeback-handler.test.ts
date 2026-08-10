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

  it('reverses partial coins when balance < mintAmount (platform absorbs remainder)', async () => {
    const coinStore = createMemoryAethelCoinLedgerStore()
    const custodyStore = createMemoryItemCustodyStore()
    await mintAethelCoins(coinStore, {
      userId: 'buyer',
      amount: 10,
      reference: 'purchase:pi_partial',
      entryType: 'purchase',
    })
    const placed = await placeItemInCustody(custodyStore, {
      userId: 'buyer',
      marketplaceItemId: 'item_partial',
      contentHash: 'cas:partial',
      purchaseReference: 'purchase:pi_partial',
    })
    expect(placed.ok).toBe(true)

    const handler = createChargebackHandler({ coinStore, custodyStore })
    const result = await handler.handleChargeback({
      disputeId: 'dp_partial',
      kind: 'stripe_dispute',
      userId: 'buyer',
      purchaseReference: 'purchase:pi_partial',
      coinMintAmount: 40,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.coinsReversed).toBe(10)
    expect(await computeAethelCoinBalance(coinStore, 'buyer')).toBe(0)
  })

  it('skips owned past-custody items and reports skippedOwnedPastCustody', async () => {
    const coinStore = createMemoryAethelCoinLedgerStore()
    const custodyStore = createMemoryItemCustodyStore()
    const placed = await placeItemInCustody(custodyStore, {
      userId: 'buyer',
      marketplaceItemId: 'item_owned',
      contentHash: 'cas:owned',
      purchaseReference: 'purchase:pi_owned',
    })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return

    const owned: typeof placed.value = {
      ...placed.value,
      status: 'owned',
      revocable: false,
      revocableUntil: null,
    }
    await custodyStore.put(owned)

    const handler = createChargebackHandler({ coinStore, custodyStore })
    const result = await handler.handleChargeback({
      disputeId: 'dp_owned',
      kind: 'stripe_dispute',
      userId: 'buyer',
      purchaseReference: 'purchase:pi_owned',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.revokedItemIds).toHaveLength(0)
    expect(result.value.skippedOwnedPastCustody).toBe(1)
  })

  it('revokes multiple custodial items on same purchase reference', async () => {
    const coinStore = createMemoryAethelCoinLedgerStore()
    const custodyStore = createMemoryItemCustodyStore()
    const ref = 'purchase:pi_multi'
    for (const id of ['item_a', 'item_b']) {
      const placed = await placeItemInCustody(custodyStore, {
        userId: 'buyer',
        marketplaceItemId: id,
        contentHash: `cas:${id}`,
        purchaseReference: ref,
      })
      expect(placed.ok).toBe(true)
    }

    const handler = createChargebackHandler({ coinStore, custodyStore })
    const result = await handler.handleChargeback({
      disputeId: 'dp_multi',
      kind: 'stripe_dispute',
      userId: 'buyer',
      purchaseReference: ref,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.revokedItemIds).toHaveLength(2)
  })
})
