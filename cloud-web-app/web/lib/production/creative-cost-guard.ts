/**
 * Law XVI Trava I — CreativeCostGuard
 * Reserve/settle BEFORE any paid provider call. Zero platform pay on free tier without BYOK.
 * Path: lib/production/creative-cost-guard.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { randomUUID } from 'crypto'

const log = createComponentLogger('creative-cost-guard')

export type CostGuardBlockReason =
  /** BYOK is technically required for the requested provider/domain on a paid plan but was not supplied. */
  | 'byok_missing'
  | 'credits_exhausted'
  | 'cost_guard_denied'
  | 'invalid_estimate'
  /** Free tier with no BYOK — platform policy refuses to absorb provider cost (not a technical key gap). */
  | 'free_tier_platform_pay_forbidden'

export interface CreativeCostGuardInput {
  userId: string
  projectId: string
  domain: string
  estimatedTokenWeight: number
  /** BYOK profile — if set, platform UsageBucket is not debited for LLM path */
  byokProfileId?: string
  /** Prefer subscription pool when no BYOK */
  usageBucketId?: string
  /** Free tier without BYOK must fail-closed for paid providers */
  planId?: string
  allowPlatformPay?: boolean
}

export interface CreativeCostReservation {
  reservationId: string
  userId: string
  projectId: string
  domain: string
  estimatedTokenWeight: number
  funding: 'byok' | 'usage_bucket' | 'wallet'
  createdAt: string
  status: 'reserved' | 'settled' | 'cancelled' | 'settle_zero'
}

export interface CostGuardReserveResult {
  ok: true
  reservation: CreativeCostReservation
}

export interface CostGuardDenyResult {
  ok: false
  reason: CostGuardBlockReason
  message: string
}

export type CostGuardResult = CostGuardReserveResult | CostGuardDenyResult

export interface CostGuardLedgerAdapter {
  hasByok(userId: string, byokProfileId?: string): Promise<boolean>
  reservePool(input: {
    userId: string
    estimatedTokenWeight: number
    usageBucketId?: string
  }): Promise<
    | { ok: true; funding: 'usage_bucket' | 'wallet'; reservationId?: string }
    | { ok: false; reason: CostGuardBlockReason }
  >
  settlePool(reservationId: string, actualTokenWeight: number): Promise<void>
  cancelPool(reservationId: string): Promise<void>
}

/** In-memory adapter for unit tests and local fail-closed demos */
export function createMemoryCostGuardLedger(): CostGuardLedgerAdapter & {
  balances: Map<string, number>
  grant(userId: string, amount: number): void
  enableByok(userId: string): void
} {
  const balances = new Map<string, number>()
  const byokUsers = new Set<string>()

  return {
    balances,
    grant(userId, amount) {
      balances.set(userId, (balances.get(userId) ?? 0) + amount)
    },
    enableByok(userId) {
      byokUsers.add(userId)
    },
    async hasByok(userId, byokProfileId) {
      return Boolean(byokProfileId) || byokUsers.has(userId)
    },
    async reservePool(input) {
      const bal = balances.get(input.userId) ?? 0
      if (bal < input.estimatedTokenWeight) {
        return { ok: false, reason: 'credits_exhausted' }
      }
      balances.set(input.userId, bal - input.estimatedTokenWeight)
      return { ok: true, funding: 'usage_bucket' }
    },
    async settlePool(reservationId, actualTokenWeight) {
      const res = memoryReservations.get(reservationId)
      if (!res) return
      const delta = res.estimatedTokenWeight - actualTokenWeight
      if (delta > 0) {
        balances.set(res.userId, (balances.get(res.userId) ?? 0) + delta)
      }
    },
    async cancelPool(reservationId) {
      const res = memoryReservations.get(reservationId)
      if (!res) return
      balances.set(res.userId, (balances.get(res.userId) ?? 0) + res.estimatedTokenWeight)
    },
  }
}

const memoryReservations = new Map<string, CreativeCostReservation>()

export async function reserveCreativeCost(
  input: CreativeCostGuardInput,
  adapter: CostGuardLedgerAdapter,
): Promise<CostGuardResult> {
  if (!Number.isFinite(input.estimatedTokenWeight) || input.estimatedTokenWeight <= 0) {
    return {
      ok: false,
      reason: 'invalid_estimate',
      message: 'estimatedTokenWeight must be a positive finite number',
    }
  }

  const planId = (input.planId || '').toLowerCase()
  const isFree = planId === 'free' || planId === ''
  const hasByok = await adapter.hasByok(input.userId, input.byokProfileId)

  if (isFree && !hasByok && input.allowPlatformPay !== true) {
    // Policy denial, not a technical key gap: platform refuses to absorb cost on free tier.
    log.warn('free_tier_platform_pay_forbidden', { userId: input.userId, domain: input.domain })
    return {
      ok: false,
      reason: 'free_tier_platform_pay_forbidden',
      message: 'Free tier requires BYOK for paid creative providers — platform does not absorb cost',
    }
  }

  if (hasByok) {
    const reservation: CreativeCostReservation = {
      reservationId: randomUUID(),
      userId: input.userId,
      projectId: input.projectId,
      domain: input.domain,
      estimatedTokenWeight: input.estimatedTokenWeight,
      funding: 'byok',
      createdAt: new Date().toISOString(),
      status: 'reserved',
    }
    memoryReservations.set(reservation.reservationId, reservation)
    log.info('cost_guard_reserved_byok', {
      reservationId: reservation.reservationId,
      domain: input.domain,
    })
    return { ok: true, reservation }
  }

  const pool = await adapter.reservePool({
    userId: input.userId,
    estimatedTokenWeight: input.estimatedTokenWeight,
    usageBucketId: input.usageBucketId,
  })

  if (!pool.ok) {
    return {
      ok: false,
      reason: pool.reason,
      message: 'Insufficient credits or usage pool for creative dispatch',
    }
  }

  const reservation: CreativeCostReservation = {
    reservationId: pool.reservationId || randomUUID(),
    userId: input.userId,
    projectId: input.projectId,
    domain: input.domain,
    estimatedTokenWeight: input.estimatedTokenWeight,
    funding: pool.funding,
    createdAt: new Date().toISOString(),
    status: 'reserved',
  }
  memoryReservations.set(reservation.reservationId, reservation)
  log.info('cost_guard_reserved_pool', {
    reservationId: reservation.reservationId,
    funding: pool.funding,
    estimatedTokenWeight: input.estimatedTokenWeight,
  })
  return { ok: true, reservation }
}

export async function settleCreativeCost(
  reservationId: string,
  actualTokenWeight: number,
  adapter: CostGuardLedgerAdapter,
): Promise<void> {
  const res = memoryReservations.get(reservationId)
  if (!res || res.status !== 'reserved') {
    log.warn('settle_skipped_missing_reservation', { reservationId })
    return
  }
  if (res.funding === 'byok') {
    res.status = 'settled'
    return
  }
  await adapter.settlePool(reservationId, Math.max(0, actualTokenWeight))
  res.status = 'settled'
  log.info('cost_guard_settled', { reservationId, actualTokenWeight })
}

/** Lazy-reject / aborted provider — refund estimate, charge user $0 for that leg */
export async function settleCreativeCostZero(
  reservationId: string,
  adapter: CostGuardLedgerAdapter,
): Promise<void> {
  const res = memoryReservations.get(reservationId)
  if (!res || res.status !== 'reserved') return
  if (res.funding !== 'byok') {
    await adapter.cancelPool(reservationId)
  }
  res.status = 'settle_zero'
  log.info('cost_guard_settle_zero', { reservationId })
}

export async function cancelCreativeCost(
  reservationId: string,
  adapter: CostGuardLedgerAdapter,
): Promise<void> {
  const res = memoryReservations.get(reservationId)
  if (!res || res.status !== 'reserved') return
  if (res.funding !== 'byok') {
    await adapter.cancelPool(reservationId)
  }
  res.status = 'cancelled'
}

export function getCreativeCostReservation(reservationId: string): CreativeCostReservation | undefined {
  return memoryReservations.get(reservationId)
}

/** Test helper — clear module reservation map */
export function __resetCreativeCostGuardForTests(): void {
  memoryReservations.clear()
}
