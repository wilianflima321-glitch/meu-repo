/**
 * Block 6B.4 / 6B.6 — wallet packs + O(1) creditBalance cache.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => {
  const state = {
    users: new Map<string, { creditBalance: number; creditBalanceSyncedAt: Date | null }>(),
    ledger: [] as Array<{
      id: string
      userId: string
      amount: number
      entryType: string
      reference: string
      metadata: Record<string, unknown> | null
    }>,
  }

  const api: any = {
    __state: state,
    user: {
      findUnique: vi.fn(async ({ where, select }: any) => {
        const row = state.users.get(where.id)
        if (!row) return null
        if (select) {
          const out: Record<string, unknown> = {}
          for (const key of Object.keys(select)) {
            if (select[key]) out[key] = (row as any)[key]
          }
          return out
        }
        return { id: where.id, ...row }
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const prev = state.users.get(where.id) || { creditBalance: 0, creditBalanceSyncedAt: null }
        const next = {
          creditBalance: data.creditBalance ?? prev.creditBalance,
          creditBalanceSyncedAt: data.creditBalanceSyncedAt ?? prev.creditBalanceSyncedAt,
        }
        state.users.set(where.id, next)
        return { id: where.id, ...next }
      }),
    },
    creditLedgerEntry: {
      aggregate: vi.fn(async ({ where }: any) => {
        const userId = where.userId
        const sum = state.ledger
          .filter((e) => e.userId === userId)
          .filter((e) => {
            const settled = e.metadata?.settled
            return settled !== false
          })
          .reduce((s, e) => s + e.amount, 0)
        return { _sum: { amount: sum } }
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return state.ledger.filter((e) => {
          if (e.userId !== where.userId) return false
          if (where.entryType && e.entryType !== where.entryType) return false
          if (where.metadata?.path?.[0] === 'settled' && where.metadata.equals === false) {
            return e.metadata?.settled === false
          }
          return true
        })
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          state.ledger.find((e) => {
            if (where.reference && e.reference !== where.reference) return false
            if (where.entryType && e.entryType !== where.entryType) return false
            if (where.metadata?.equals === false && e.metadata?.settled !== false) return false
            return true
          }) || null
        )
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `cle_${state.ledger.length + 1}`,
          userId: data.userId,
          amount: data.amount,
          entryType: data.entryType,
          reference: data.reference,
          metadata: data.metadata ?? null,
        }
        state.ledger.push(row)
        return row
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = state.ledger.find((e) => e.id === where.id)
        if (!row) throw new Error('missing')
        if (data.metadata) row.metadata = data.metadata
        return row
      }),
      delete: vi.fn(async ({ where }: any) => {
        const idx = state.ledger.findIndex((e) => e.id === where.id)
        if (idx >= 0) state.ledger.splice(idx, 1)
        return { id: where.id }
      }),
    },
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(async (fn: any) => {
      if (typeof fn === 'function') return fn(api)
      throw new Error('array transactions not used in this test')
    }),
  }
  return api
})

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import {
  addCredits,
  applyCreditBalanceDelta,
  cancelReservation,
  computeCreditBalanceFromLedger,
  getCreditBalance,
  reserveCredits,
  settleCredits,
} from '@/lib/credit-wallet'
import {
  WALLET_CREDIT_PACKS,
  WALLET_CUSTOM_TOPUP,
  creditsForCustomUsd,
  getWalletCreditPack,
  parseCustomUsdAmount,
  totalCreditsForPack,
} from '@/lib/billing/wallet-credit-packs'

describe('wallet-credit-packs (6B.4)', () => {
  it('exposes four canonical packs with Stripe cents', () => {
    expect(WALLET_CREDIT_PACKS).toHaveLength(4)
    expect(getWalletCreditPack('pack-1500')?.unitAmountCents).toBe(2499)
    expect(totalCreditsForPack(getWalletCreditPack('pack-5000')!)).toBe(5500)
  })

  it('custom USD clamps and converts at Starter retail rate', () => {
    expect(parseCustomUsdAmount(4.99)).toBeNull()
    expect(parseCustomUsdAmount(5)).toBe(5)
    expect(creditsForCustomUsd(9.99)).toBe(500)
    expect(WALLET_CUSTOM_TOPUP.minUsd).toBe(5)
  })
})

describe('creditBalance O(1) cache (6B.6)', () => {
  beforeEach(() => {
    mockPrisma.__state.users.clear()
    mockPrisma.__state.ledger.length = 0
    mockPrisma.__state.users.set('u1', { creditBalance: 0, creditBalanceSyncedAt: null })
    vi.clearAllMocks()
  })

  it('hydrates cache from ledger on first getCreditBalance', async () => {
    mockPrisma.__state.ledger.push({
      id: 'a',
      userId: 'u1',
      amount: 1000,
      entryType: 'PURCHASE',
      reference: 'p1',
      metadata: { settled: true },
    })

    const balance = await getCreditBalance('u1')
    expect(balance).toBe(1000)
    expect(mockPrisma.__state.users.get('u1')?.creditBalanceSyncedAt).toBeInstanceOf(Date)
    expect(mockPrisma.__state.users.get('u1')?.creditBalance).toBe(1000)

    mockPrisma.creditLedgerEntry.aggregate.mockClear()
    mockPrisma.creditLedgerEntry.findMany.mockClear()

    const cached = await getCreditBalance('u1')
    expect(cached).toBe(1000)
    expect(mockPrisma.creditLedgerEntry.aggregate).not.toHaveBeenCalled()
    expect(mockPrisma.creditLedgerEntry.findMany).not.toHaveBeenCalled()
  })

  it('addCredits updates ledger and O(1) cache', async () => {
    await addCredits('u1', 250, 'PURCHASE', 'stripe_1')
    expect(await getCreditBalance('u1')).toBe(250)
    expect(mockPrisma.__state.users.get('u1')?.creditBalance).toBe(250)
  })

  it('reserve → settle same cost keeps cache; cancel restores', async () => {
    await addCredits('u1', 100, 'GRANT', 'g1')
    const hold = await reserveCredits('u1', 'chat', 40, 'ref')
    expect(hold).not.toBeNull()
    expect(await getCreditBalance('u1')).toBe(60)

    await settleCredits(hold!.reservationId, 40)
    expect(await getCreditBalance('u1')).toBe(60)

    const hold2 = await reserveCredits('u1', 'chat', 20, 'ref2')
    expect(await getCreditBalance('u1')).toBe(40)
    await cancelReservation(hold2!.reservationId)
    expect(await getCreditBalance('u1')).toBe(60)
  })

  it('settle with higher actual cost adjusts cache', async () => {
    await addCredits('u1', 100, 'GRANT', 'g2')
    const hold = await reserveCredits('u1', 'chat', 30, 'ref3')
    await settleCredits(hold!.reservationId, 45)
    expect(await getCreditBalance('u1')).toBe(55)
    expect(await computeCreditBalanceFromLedger('u1')).toBe(55)
  })

  it('applyCreditBalanceDelta rebuilds when unsynced instead of trusting zero', async () => {
    mockPrisma.__state.ledger.push({
      id: 'b',
      userId: 'u1',
      amount: 80,
      entryType: 'PURCHASE',
      reference: 'p2',
      metadata: { settled: true },
    })
    mockPrisma.__state.users.set('u1', { creditBalance: 0, creditBalanceSyncedAt: null })

    const next = await applyCreditBalanceDelta('u1', -10)
    expect(next).toBe(80)
  })
})
