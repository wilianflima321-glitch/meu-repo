/**
 * Law XVI Trava I — CreativeCostGuard
 * Reserve/settle BEFORE any paid provider call. Zero platform pay on free tier without BYOK.
 * Multi-stage contract: reserve holds the estimate → settle debits actual capped at
 * estimated × settleCeilingMultiplier (evidence on cap) → settleZero/cancel refunds the hold.
 * Path: lib/production/creative-cost-guard.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { randomUUID } from 'crypto'
import { appendFile, mkdir, readFile } from 'fs/promises'
import path from 'path'

const log = createComponentLogger('creative-cost-guard')

/** Default settle ceiling: actual never exceeds the reserved estimate (parity with wallet hold-at-estimate). */
export const DEFAULT_SETTLE_CEILING_MULTIPLIER = 1
/** Hard abuse guard — no caller may raise the settle ceiling above this multiple of the estimate. */
export const MAX_SETTLE_CEILING_MULTIPLIER = 5

/**
 * Durable reservation journal (Trava I hardening). Reservations hold real money
 * and must survive process restarts: without a journal, a crash between reserve
 * and settle leaks a held balance forever. The journal is an append-only JSONL
 * event log — reserve / settle / settle_zero / cancel — replayed on boot so the
 * reservation state machine is reconstructible (last event per reservation wins).
 *
 * Fail-closed honesty: with no `CREATIVE_COST_GUARD_JOURNAL_PATH`, durability is
 * `memory-only` (reported, never claimed as durable). A journal write failure
 * never breaks the reserve path — it is surfaced via `journalWritesOk=false`.
 */
export const CREATIVE_COST_GUARD_JOURNAL_ENV = 'CREATIVE_COST_GUARD_JOURNAL_PATH'

type JournalEventKind = 'reserved' | 'settled' | 'settle_zero' | 'cancelled'

interface JournalEvent {
  event: JournalEventKind
  reservation: CreativeCostReservation
  at: string
}

export interface CostGuardDurabilityStatus {
  durable: boolean
  journalPath: string | null
  journalWritesOk: boolean
  reason: 'journal-configured' | 'journal-writes-failing' | 'memory-only'
}

let journalWriteChain: Promise<void> = Promise.resolve()
let journalWritesOk = true

function resolveJournalPath(): string | null {
  const raw = process.env[CREATIVE_COST_GUARD_JOURNAL_ENV]
  return raw && raw.trim() !== '' ? raw.trim() : null
}

async function journalDirReady(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true })
  } catch {
    // best-effort — appendFile will surface the real failure
  }
}

function appendJournalEvent(event: JournalEvent): Promise<void> {
  const journalPath = resolveJournalPath()
  if (!journalPath) return Promise.resolve()
  const line = `${JSON.stringify(event)}\n`
  const write = journalWriteChain
    .then(async () => {
      await journalDirReady(path.dirname(journalPath))
      await appendFile(journalPath, line, 'utf8')
      journalWritesOk = true
    })
    .catch((err) => {
      journalWritesOk = false
      log.error('cost_guard_journal_write_failed', { journalPath, message: String(err) })
    })
  journalWriteChain = write
  return write
}

/**
 * Journals the transition and AWAITS the append: the terminal event must be
 * durable before the caller is allowed to treat the money movement as final.
 * A crash window between adapter debit and journal append would otherwise
 * resurrect a `reserved` hold on replay and enable a double refund.
 */
async function journalEvent(event: JournalEventKind, reservation: CreativeCostReservation): Promise<void> {
  await appendJournalEvent({ event, reservation, at: new Date().toISOString() })
}

export function getCostGuardDurabilityStatus(): CostGuardDurabilityStatus {
  const journalPath = resolveJournalPath()
  const durable = Boolean(journalPath) && journalWritesOk
  return {
    durable,
    // Redacted to the basename: the status surface must not disclose the
    // server's directory layout to ops/health consumers.
    journalPath: journalPath ? path.basename(journalPath) : null,
    journalWritesOk,
    reason: !journalPath ? 'memory-only' : journalWritesOk ? 'journal-configured' : 'journal-writes-failing',
  }
}

export interface CostGuardJournalRecoveryResult {
  replayed: number
  recoveredReservations: number
  malformedLines: number
  terminalEventsIgnored: number
  unconfirmedPoolHoldsCancelled: number
  /** True when any journal line was unparseable — partial state, reconcile required. */
  incomplete: boolean
}

const JOURNAL_EVENT_KINDS: ReadonlySet<string> = new Set(['reserved', 'settled', 'settle_zero', 'cancelled'])
const RESERVATION_STATUSES: ReadonlySet<string> = new Set(['reserved', 'settled', 'cancelled', 'settle_zero'])
const RESERVATION_FUNDINGS: ReadonlySet<string> = new Set(['byok', 'usage_bucket', 'wallet'])

function validJournalReservation(res: unknown): res is CreativeCostReservation {
  if (!res || typeof res !== 'object') return false
  const r = res as Record<string, unknown>
  if (typeof r.reservationId !== 'string' || r.reservationId === '') return false
  if (typeof r.userId !== 'string' || typeof r.projectId !== 'string' || typeof r.domain !== 'string') return false
  if (typeof r.estimatedTokenWeight !== 'number' || !Number.isFinite(r.estimatedTokenWeight) || r.estimatedTokenWeight <= 0) {
    return false
  }
  if (typeof r.settleCeilingMultiplier !== 'number' || !Number.isFinite(r.settleCeilingMultiplier)) return false
  if (typeof r.funding !== 'string' || !RESERVATION_FUNDINGS.has(r.funding)) return false
  if (typeof r.status !== 'string' || !RESERVATION_STATUSES.has(r.status)) return false
  if (typeof r.createdAt !== 'string') return false
  return true
}

/**
 * Replays the append-only journal into the in-memory reservation map. Later
 * events win per reservation (append order). Malformed lines are counted and
 * skipped — never trusted, never replayed — and surfaced via `incomplete`.
 * Pool-funded holds recovered after a restart are NOT trusted by default: the
 * adapter is asked to confirm the hold persisted (`hasHold`); without
 * confirmation they fail closed to `cancelled` so a recovered hold can never
 * refund a balance this process never debited.
 */
export async function recoverCostGuardReservationsFromJournal(
  adapter?: CostGuardLedgerAdapter,
): Promise<CostGuardJournalRecoveryResult> {
  const journalPath = resolveJournalPath()
  const result: CostGuardJournalRecoveryResult = {
    replayed: 0,
    recoveredReservations: 0,
    malformedLines: 0,
    terminalEventsIgnored: 0,
    unconfirmedPoolHoldsCancelled: 0,
    incomplete: false,
  }
  if (!journalPath) return result
  let raw: string
  try {
    raw = await readFile(journalPath, 'utf8')
  } catch {
    // No journal yet (first boot) — nothing to recover.
    return result
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    let ev: JournalEvent
    try {
      ev = JSON.parse(trimmed) as JournalEvent
      if (
        !ev ||
        typeof ev.event !== 'string' ||
        !JOURNAL_EVENT_KINDS.has(ev.event) ||
        !validJournalReservation(ev.reservation)
      ) {
        throw new Error('invalid journal record shape')
      }
    } catch {
      result.malformedLines += 1
      result.incomplete = true
      continue
    }
    result.replayed += 1
    const id = ev.reservation.reservationId
    // Replay re-clamps the settle ceiling — a corrupt line can never bypass
    // the reserve-time abuse guard, even if it passed shape validation.
    const reservation: CreativeCostReservation = {
      ...ev.reservation,
      settleCeilingMultiplier: Math.min(
        MAX_SETTLE_CEILING_MULTIPLIER,
        Math.max(1, ev.reservation.settleCeilingMultiplier),
      ),
    }
    if (ev.event === 'reserved') {
      memoryReservations.set(id, reservation)
    } else if (memoryReservations.has(id)) {
      // Terminal event after an earlier reserve in this journal.
      const current = memoryReservations.get(id)
      if (current) current.status = reservation.status
      result.terminalEventsIgnored += 1
    }
  }
  // Fail-closed confirmation for pool-funded holds recovered from the journal.
  for (const res of Array.from(memoryReservations.values())) {
    if (res.status !== 'reserved') continue
    if (res.funding === 'byok') {
      result.recoveredReservations += 1
      continue
    }
    let confirmed = false
    if (adapter?.hasHold) {
      try {
        confirmed = await adapter.hasHold(res.reservationId)
      } catch {
        confirmed = false
      }
    }
    if (confirmed) {
      result.recoveredReservations += 1
    } else {
      res.status = 'cancelled'
      result.unconfirmedPoolHoldsCancelled += 1
    }
  }
  return result
}

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
  /**
   * Settle ceiling as a multiple of estimatedTokenWeight (default 1 = actual never exceeds the
   * estimate). Clamped to [1, MAX_SETTLE_CEILING_MULTIPLIER]. Runaway actuals are capped at the
   * ceiling and surfaced via cost_guard_settle_capped evidence — never silently absorbed or overdrawn.
   */
  settleCeilingMultiplier?: number
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
  /** Immutable settle ceiling (multiple of estimate) captured at reserve time. */
  settleCeilingMultiplier: number
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
  /**
   * Optional hold-confirmation capability: a durable adapter reports whether
   * the debit for `reservationId` still exists after a restart. Recovery uses
   * it to decide whether a journal-recovered pool hold is backed by real
   * money — without it, recovered pool holds fail closed to `cancelled`.
   */
  hasHold?(reservationId: string): Promise<boolean>
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
      } else if (delta < 0) {
        // Bounded overage (actual > estimate, within the settle ceiling) is debited — parity
        // with spend-resolver's actual-weighted debit. Never silently absorbed.
        const overage = -delta
        const current = balances.get(res.userId) ?? 0
        balances.set(res.userId, Math.max(0, current - overage))
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
  // Immutable settle ceiling captured at reserve time — clamped so no caller can raise it unboundedly.
  const settleCeilingMultiplier = Math.min(
    MAX_SETTLE_CEILING_MULTIPLIER,
    Math.max(1, input.settleCeilingMultiplier ?? DEFAULT_SETTLE_CEILING_MULTIPLIER),
  )

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
      settleCeilingMultiplier,
      funding: 'byok',
      createdAt: new Date().toISOString(),
      status: 'reserved',
    }
    memoryReservations.set(reservation.reservationId, reservation)
    await journalEvent('reserved', reservation)
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
    settleCeilingMultiplier,
    funding: pool.funding,
    createdAt: new Date().toISOString(),
    status: 'reserved',
  }
  memoryReservations.set(reservation.reservationId, reservation)
  await journalEvent('reserved', reservation)
  log.info('cost_guard_reserved_pool', {
    reservationId: reservation.reservationId,
    funding: pool.funding,
    estimatedTokenWeight: input.estimatedTokenWeight,
  })
  return { ok: true, reservation }
}

/**
 * Result of a settle — surfaces whether the provider's actual was capped by the reservation's
 * immutable settle ceiling, so callers (e.g. CreativeBridge) can thread the cap into the evidence
 * ledger instead of letting a runaway settle silently.
 */
export interface SettleCreativeCostResult {
  capped: boolean
  rawActual: number
  cappedActual: number
}

export async function settleCreativeCost(
  reservationId: string,
  actualTokenWeight: number,
  adapter: CostGuardLedgerAdapter,
): Promise<SettleCreativeCostResult> {
  const res = memoryReservations.get(reservationId)
  if (!res || res.status !== 'reserved') {
    log.warn('settle_skipped_missing_reservation', { reservationId })
    return { capped: false, rawActual: 0, cappedActual: 0 }
  }
  if (res.funding === 'byok') {
    res.status = 'settled'
    await journalEvent('settled', { ...res, status: 'settled' })
    return { capped: false, rawActual: actualTokenWeight, cappedActual: actualTokenWeight }
  }
  const rawActual = Math.max(0, actualTokenWeight)
  // Overrun ceiling: actual may never exceed estimate × ceiling. Runaway actuals are capped and
  // surfaced as cost_guard_settle_capped evidence instead of silently absorbed or overdrawn.
  const cappedActual = Math.min(rawActual, res.estimatedTokenWeight * res.settleCeilingMultiplier)
  if (cappedActual < rawActual) {
    log.warn('cost_guard_settle_capped', {
      reservationId,
      estimatedTokenWeight: res.estimatedTokenWeight,
      settleCeilingMultiplier: res.settleCeilingMultiplier,
      actualTokenWeight: rawActual,
      cappedActual,
    })
  }
  await adapter.settlePool(reservationId, cappedActual)
  res.status = 'settled'
  await journalEvent('settled', { ...res, status: 'settled' })
  log.info('cost_guard_settled', { reservationId, actualTokenWeight: cappedActual })
  return { capped: cappedActual < rawActual, rawActual, cappedActual }
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
  await journalEvent('settle_zero', { ...res, status: 'settle_zero' })
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
  await journalEvent('cancelled', { ...res, status: 'cancelled' })
}

export function getCreativeCostReservation(reservationId: string): CreativeCostReservation | undefined {
  return memoryReservations.get(reservationId)
}

/** Test helper — clear module reservation map */
export function __resetCreativeCostGuardForTests(): void {
  memoryReservations.clear()
}

/** Await all queued journal appends (evidence flush — tests and shutdown). */
export function flushCostGuardJournal(): Promise<void> {
  return journalWriteChain
}
