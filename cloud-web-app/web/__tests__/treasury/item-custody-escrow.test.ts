/**
 * H.1+ — Item custody escrow (48h Backpack).
 */

import { describe, expect, it } from 'vitest'

import {
  createMemoryItemCustodyStore,
  isItemInBackpack,
  ITEM_CUSTODY_WINDOW_MS,
  placeItemInCustody,
  probeItemCustodyEscrowReady,
  releaseItemFromCustody,
  revokeItemCustody,
} from '@/lib/treasury/item-custody-escrow'

describe('item-custody-escrow', () => {
  it('places custodial revocable items in Backpack', async () => {
    const store = createMemoryItemCustodyStore()
    const t0 = new Date('2026-08-08T00:00:00.000Z')
    const placed = await placeItemInCustody(store, {
      userId: 'buyer',
      marketplaceItemId: 'skin_1',
      contentHash: 'cas:hash',
      purchaseReference: 'pi_1',
      now: t0,
    })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    expect(placed.value.status).toBe('custodial')
    expect(placed.value.revocable).toBe(true)
    expect(placed.value.revocableUntil?.getTime()).toBe(t0.getTime() + ITEM_CUSTODY_WINDOW_MS)
    expect(isItemInBackpack(placed.value)).toBe(true)
  })

  it('fails release inside window; releases after 48h', async () => {
    const store = createMemoryItemCustodyStore()
    const t0 = new Date('2026-08-08T00:00:00.000Z')
    const placed = await placeItemInCustody(store, {
      userId: 'buyer',
      marketplaceItemId: 'skin_1',
      contentHash: 'cas:hash',
      purchaseReference: 'pi_1',
      now: t0,
    })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return

    const early = await releaseItemFromCustody(
      store,
      placed.value.id,
      new Date(t0.getTime() + 60_000),
    )
    expect(early.ok).toBe(false)
    if (!early.ok) expect(early.code).toBe('CUSTODY_WINDOW_OPEN')

    const late = await releaseItemFromCustody(
      store,
      placed.value.id,
      new Date(t0.getTime() + ITEM_CUSTODY_WINDOW_MS + 1),
    )
    expect(late.ok).toBe(true)
    if (!late.ok) return
    expect(late.value.status).toBe('owned')
    expect(late.value.revocable).toBe(false)
  })

  it('revokes custodial items; blocks revoke after owned clear', async () => {
    const store = createMemoryItemCustodyStore()
    const t0 = new Date('2026-08-08T00:00:00.000Z')
    const placed = await placeItemInCustody(store, {
      userId: 'buyer',
      marketplaceItemId: 'skin_1',
      contentHash: 'cas:hash',
      purchaseReference: 'pi_1',
      now: t0,
    })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return

    const revoked = await revokeItemCustody(store, placed.value.id, 'dispute:1', t0)
    expect(revoked.ok).toBe(true)
    if (!revoked.ok) return
    expect(revoked.value.status).toBe('revoked')
    expect(isItemInBackpack(revoked.value)).toBe(false)

    const ownedStore = createMemoryItemCustodyStore()
    const placed2 = await placeItemInCustody(ownedStore, {
      userId: 'buyer',
      marketplaceItemId: 'skin_2',
      contentHash: 'cas:h2',
      purchaseReference: 'pi_2',
      now: t0,
    })
    expect(placed2.ok).toBe(true)
    if (!placed2.ok) return
    await releaseItemFromCustody(
      ownedStore,
      placed2.value.id,
      new Date(t0.getTime() + ITEM_CUSTODY_WINDOW_MS + 1),
    )
    const past = await revokeItemCustody(ownedStore, placed2.value.id, 'dispute:2', t0)
    expect(past.ok).toBe(false)
    if (!past.ok) expect(past.code).toBe('CUSTODY_CLEARED')
  })

  it('behavioral probe passes', () => {
    expect(probeItemCustodyEscrowReady()).toBe(true)
  })
})
