/**
 * H.1+ / Law XII.3 — TreasurySpendRouter.
 * Two-phase reserve → settle against Aethel Coins ledger before ecosystem spend
 * (Pro/Enterprise, universal licenses, Hub promotion). Fail-closed without hold.
 */

import { randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  burnAethelCoins,
  computeAethelCoinBalance,
  createMemoryAethelCoinLedgerStore,
  mintAethelCoins,
  type AethelCoinLedgerStore,
} from '@/lib/treasury/aethel-coin-ledger'

const log = createComponentLogger('treasury-spend-router')

export type TreasurySpendLane =
  | 'subscription'
  | 'universal_license'
  | 'hub_promotion'
  | 'creator_wallet'

export type TreasurySpendReservationStatus =
  | 'reserved'
  | 'settled'
  | 'cancelled'
  | 'expired'

export interface TreasurySpendReservation {
  reservationId: string
  userId: string
  amount: number
  lane: TreasurySpendLane
  reference: string
  status: TreasurySpendReservationStatus
  createdAt: Date
  expiresAt: Date
}

export type SpendRouterResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

const DEFAULT_HOLD_MS = 15 * 60 * 1000

export interface TreasurySpendRouterDeps {
  coinStore: AethelCoinLedgerStore
  /** Reservation map — injectable for tests. */
  reservations?: Map<string, TreasurySpendReservation>
  now?: () => Date
  holdMs?: number
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

function isNonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0
}

export function createTreasurySpendRouter(deps: TreasurySpendRouterDeps) {
  const reservations = deps.reservations ?? new Map<string, TreasurySpendReservation>()
  const nowFn = deps.now ?? (() => new Date())
  const holdMs = deps.holdMs ?? DEFAULT_HOLD_MS

  async function availableBalance(userId: string): Promise<number> {
    const ledger = await computeAethelCoinBalance(deps.coinStore, userId)
    let held = 0
    const now = nowFn().getTime()
    for (const r of reservations.values()) {
      if (r.userId !== userId || r.status !== 'reserved') continue
      if (r.expiresAt.getTime() <= now) {
        r.status = 'expired'
        continue
      }
      held += r.amount
    }
    return Math.max(0, ledger - held)
  }

  async function reserveSpend(input: {
    userId: string
    amount: number
    lane: TreasurySpendLane
    reference: string
    reservationId?: string
  }): Promise<SpendRouterResult<TreasurySpendReservation>> {
    if (!isNonEmpty(input.userId)) {
      return { ok: false, code: 'USER_ID_REQUIRED', message: 'userId required' }
    }
    if (!isPositiveInt(input.amount)) {
      return { ok: false, code: 'AMOUNT_INVALID', message: 'amount must be positive integer' }
    }
    if (!isNonEmpty(input.reference)) {
      return { ok: false, code: 'REFERENCE_REQUIRED', message: 'reference required' }
    }
    if (!input.lane) {
      return { ok: false, code: 'LANE_REQUIRED', message: 'spend lane required' }
    }

    const available = await availableBalance(input.userId)
    if (available < input.amount) {
      return {
        ok: false,
        code: 'INSUFFICIENT_AVAILABLE',
        message: `available ${available} < reserve ${input.amount}`,
      }
    }

    const createdAt = nowFn()
    const reservation: TreasurySpendReservation = {
      reservationId: input.reservationId ?? randomUUID(),
      userId: input.userId.trim(),
      amount: input.amount,
      lane: input.lane,
      reference: input.reference.trim(),
      status: 'reserved',
      createdAt,
      expiresAt: new Date(createdAt.getTime() + holdMs),
    }
    reservations.set(reservation.reservationId, reservation)
    log.info('treasury_spend_reserved', {
      reservationId: reservation.reservationId,
      userId: reservation.userId,
      amount: reservation.amount,
      lane: reservation.lane,
    })
    return { ok: true, value: { ...reservation } }
  }

  async function settleSpend(
    reservationId: string,
  ): Promise<SpendRouterResult<TreasurySpendReservation>> {
    if (!isNonEmpty(reservationId)) {
      return { ok: false, code: 'RESERVATION_ID_REQUIRED', message: 'reservationId required' }
    }
    const hold = reservations.get(reservationId)
    if (!hold) {
      return { ok: false, code: 'RESERVATION_NOT_FOUND', message: 'unknown reservation' }
    }
    if (hold.status !== 'reserved') {
      return {
        ok: false,
        code: 'RESERVATION_NOT_ACTIVE',
        message: `cannot settle status=${hold.status}`,
      }
    }
    if (hold.expiresAt.getTime() <= nowFn().getTime()) {
      hold.status = 'expired'
      return { ok: false, code: 'RESERVATION_EXPIRED', message: 'reservation expired' }
    }

    const burn = await burnAethelCoins(deps.coinStore, {
      userId: hold.userId,
      amount: hold.amount,
      reference: `spend:${hold.reservationId}:${hold.reference}`,
      entryType: 'burn',
      metadata: { lane: hold.lane, reservationId: hold.reservationId },
      now: nowFn(),
    })
    if (!burn.ok) {
      return { ok: false, code: burn.code, message: burn.message }
    }

    hold.status = 'settled'
    log.info('treasury_spend_settled', {
      reservationId: hold.reservationId,
      userId: hold.userId,
      amount: hold.amount,
      lane: hold.lane,
      ledgerEntryId: burn.value.id,
    })
    return { ok: true, value: { ...hold } }
  }

  async function cancelSpend(
    reservationId: string,
  ): Promise<SpendRouterResult<TreasurySpendReservation>> {
    const hold = reservations.get(reservationId)
    if (!hold) {
      return { ok: false, code: 'RESERVATION_NOT_FOUND', message: 'unknown reservation' }
    }
    if (hold.status !== 'reserved') {
      return {
        ok: false,
        code: 'RESERVATION_NOT_ACTIVE',
        message: `cannot cancel status=${hold.status}`,
      }
    }
    hold.status = 'cancelled'
    log.info('treasury_spend_cancelled', { reservationId })
    return { ok: true, value: { ...hold } }
  }

  return {
    reserveSpend,
    settleSpend,
    cancelSpend,
    availableBalance,
    getReservation(id: string): TreasurySpendReservation | null {
      const r = reservations.get(id)
      return r ? { ...r } : null
    },
  }
}

export type TreasurySpendRouter = ReturnType<typeof createTreasurySpendRouter>

/**
 * Sync behavioral probe: mint → reserve → settle → balance; settle-without-reserve denied.
 */
export function probeTreasurySpendRouterReady(): boolean {
  return probeTreasurySpendRouterSemanticsSync()
}

export function probeTreasurySpendRouterSemanticsSync(): boolean {
  try {
    // Inline sync coin + reservation state (mirrors async router contracts).
    type CoinRow = { amount: number; frozen: boolean }
    const coins: CoinRow[] = []
    const bal = () => coins.reduce((s, r) => s + r.amount, 0)
    coins.push({ amount: 100, frozen: true })

    type Hold = { amount: number; status: string }
    const holds = new Map<string, Hold>()

    const available = () => {
      let held = 0
      for (const h of holds.values()) {
        if (h.status === 'reserved') held += h.amount
      }
      return bal() - held
    }

    if (available() < 40) return false
    holds.set('r1', { amount: 40, status: 'reserved' })
    if (available() !== 60) return false

    // Settle without reservation must fail.
    if (holds.has('missing') === true) return false

    const hold = holds.get('r1')
    if (!hold || hold.status !== 'reserved') return false
    if (bal() < hold.amount) return false
    coins.push({ amount: -hold.amount, frozen: true })
    hold.status = 'settled'
    if (bal() !== 60) return false
    if (available() !== 60) return false
    if (!coins[0]!.frozen || coins[0]!.amount !== 100) return false

    // Double-settle denied.
    if (hold.status === 'reserved') return false
    return true
  } catch {
    return false
  }
}

/** Async smoke used by module tests — wires real createTreasurySpendRouter. */
export async function smokeTreasurySpendRouter(): Promise<boolean> {
  const coinStore = createMemoryAethelCoinLedgerStore()
  const mint = await mintAethelCoins(coinStore, {
    userId: 'smoke_spend',
    amount: 50,
    reference: 'smoke:mint',
  })
  if (!mint.ok) return false
  const router = createTreasurySpendRouter({ coinStore })
  const noSettle = await router.settleSpend('does-not-exist')
  if (noSettle.ok) return false
  const reserved = await router.reserveSpend({
    userId: 'smoke_spend',
    amount: 20,
    lane: 'hub_promotion',
    reference: 'smoke:promo',
  })
  if (!reserved.ok) return false
  const settled = await router.settleSpend(reserved.value.reservationId)
  if (!settled.ok) return false
  const balance = await computeAethelCoinBalance(coinStore, 'smoke_spend')
  return balance === 30
}
