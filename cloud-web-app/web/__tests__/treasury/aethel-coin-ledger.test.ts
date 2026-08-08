/**
 * H.1+ — Aethel Coins append-only mint/burn ledger.
 */

import { describe, expect, it } from 'vitest'

import {
  burnAethelCoins,
  computeAethelCoinBalance,
  createMemoryAethelCoinLedgerStore,
  mintAethelCoins,
  probeAethelCoinLedgerReady,
} from '@/lib/treasury/aethel-coin-ledger'

describe('aethel-coin-ledger', () => {
  it('mints and burns append-only with balance', async () => {
    const store = createMemoryAethelCoinLedgerStore()
    const mint = await mintAethelCoins(store, {
      userId: 'u1',
      amount: 100,
      reference: 'stripe:pi_1',
    })
    expect(mint.ok).toBe(true)
    expect(await computeAethelCoinBalance(store, 'u1')).toBe(100)

    const burn = await burnAethelCoins(store, {
      userId: 'u1',
      amount: 30,
      reference: 'spend:promo',
    })
    expect(burn.ok).toBe(true)
    expect(await computeAethelCoinBalance(store, 'u1')).toBe(70)
    expect(store.entries).toHaveLength(2)
    expect(store.entries[0]!.amount).toBe(100)
    expect(Object.isFrozen(store.entries[0]!)).toBe(true)
  })

  it('fails closed on overdraft and missing reference', async () => {
    const store = createMemoryAethelCoinLedgerStore()
    await mintAethelCoins(store, { userId: 'u1', amount: 10, reference: 'r' })
    const over = await burnAethelCoins(store, {
      userId: 'u1',
      amount: 50,
      reference: 'too_much',
    })
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.code).toBe('INSUFFICIENT_BALANCE')

    const noRef = await mintAethelCoins(store, {
      userId: 'u1',
      amount: 1,
      reference: '',
    })
    expect(noRef.ok).toBe(false)
  })

  it('rejects duplicate append ids (append-only integrity)', async () => {
    const store = createMemoryAethelCoinLedgerStore()
    const first = await mintAethelCoins(store, {
      userId: 'u1',
      amount: 5,
      reference: 'r',
      id: 'fixed-id',
    })
    expect(first.ok).toBe(true)
    const dup = await mintAethelCoins(store, {
      userId: 'u1',
      amount: 5,
      reference: 'r2',
      id: 'fixed-id',
    })
    expect(dup.ok).toBe(false)
  })

  it('behavioral probe passes', () => {
    expect(probeAethelCoinLedgerReady()).toBe(true)
  })
})
