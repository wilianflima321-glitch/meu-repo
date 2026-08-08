/**
 * H.1+ — TreasurySpendRouter reserve/settle.
 */

import { describe, expect, it } from 'vitest'

import {
  computeAethelCoinBalance,
  createMemoryAethelCoinLedgerStore,
  mintAethelCoins,
} from '@/lib/treasury/aethel-coin-ledger'
import {
  createTreasurySpendRouter,
  probeTreasurySpendRouterReady,
  smokeTreasurySpendRouter,
} from '@/lib/treasury/treasury-spend-router'

describe('treasury-spend-router', () => {
  it('reserves then settles against coin ledger', async () => {
    const coinStore = createMemoryAethelCoinLedgerStore()
    await mintAethelCoins(coinStore, {
      userId: 'creator',
      amount: 100,
      reference: 'earn:1',
      entryType: 'earn',
    })
    const router = createTreasurySpendRouter({ coinStore })
    const reserved = await router.reserveSpend({
      userId: 'creator',
      amount: 40,
      lane: 'hub_promotion',
      reference: 'boost:week',
    })
    expect(reserved.ok).toBe(true)
    expect(await router.availableBalance('creator')).toBe(60)

    if (!reserved.ok) return
    const settled = await router.settleSpend(reserved.value.reservationId)
    expect(settled.ok).toBe(true)
    expect(await computeAethelCoinBalance(coinStore, 'creator')).toBe(60)
  })

  it('fails closed without reservation and on insufficient available', async () => {
    const coinStore = createMemoryAethelCoinLedgerStore()
    await mintAethelCoins(coinStore, {
      userId: 'creator',
      amount: 10,
      reference: 'earn:1',
    })
    const router = createTreasurySpendRouter({ coinStore })
    const missing = await router.settleSpend('nope')
    expect(missing.ok).toBe(false)

    const tooMuch = await router.reserveSpend({
      userId: 'creator',
      amount: 50,
      lane: 'subscription',
      reference: 'sub',
    })
    expect(tooMuch.ok).toBe(false)

    const first = await router.reserveSpend({
      userId: 'creator',
      amount: 8,
      lane: 'subscription',
      reference: 'sub',
    })
    expect(first.ok).toBe(true)
    const second = await router.reserveSpend({
      userId: 'creator',
      amount: 5,
      lane: 'subscription',
      reference: 'sub2',
    })
    expect(second.ok).toBe(false)
  })

  it('cancel releases hold without burn', async () => {
    const coinStore = createMemoryAethelCoinLedgerStore()
    await mintAethelCoins(coinStore, {
      userId: 'creator',
      amount: 20,
      reference: 'earn:1',
    })
    const router = createTreasurySpendRouter({ coinStore })
    const reserved = await router.reserveSpend({
      userId: 'creator',
      amount: 15,
      lane: 'universal_license',
      reference: 'lic',
    })
    expect(reserved.ok).toBe(true)
    if (!reserved.ok) return
    const cancelled = await router.cancelSpend(reserved.value.reservationId)
    expect(cancelled.ok).toBe(true)
    expect(await router.availableBalance('creator')).toBe(20)
    expect(await computeAethelCoinBalance(coinStore, 'creator')).toBe(20)
  })

  it('behavioral probe + async smoke pass', async () => {
    expect(probeTreasurySpendRouterReady()).toBe(true)
    expect(await smokeTreasurySpendRouter()).toBe(true)
  })
})
