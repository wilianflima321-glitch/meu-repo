/**
 * SF1 — Unified session tape: fixed-tick event log with hash chain.
 * Dual-use substrate for sim ticks (games) and paper-trade events (Onda N).
 * Extends trade-audit / task-evidence chain patterns — not a mock ledger.
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import type { TradeOrderIntentSnapshot } from '@/lib/server/quant/trade-audit-ledger'

const log = createComponentLogger('unified-session-tape')

export const SESSION_TAPE_TICK_HZ = 60 as const

export type SessionTapeEventKind = 'sim_tick' | 'paper_trade' | 'market_tick'

export interface SimTickPayload {
  stateFingerprint: string
  entityCount: number
}

export interface PaperTradeTapePayload {
  strategyId: string
  orderIntent: TradeOrderIntentSnapshot
  executionMode: 'paper' | 'live' | 'none'
}

export interface MarketTickTapePayload {
  symbol: string
  price: number
  source: 'licensed_feed' | 'synthetic_fixture'
  fixtureLabel?: string
}

export type SessionTapePayload =
  | { kind: 'sim_tick'; data: SimTickPayload }
  | { kind: 'paper_trade'; data: PaperTradeTapePayload }
  | { kind: 'market_tick'; data: MarketTickTapePayload }

export interface SessionTapeEntry {
  id: string
  tickIndex: number
  kind: SessionTapeEventKind
  payloadDigest: string
  prevHash: string
  entryHash: string
  eventTimeMs: number
  note: string
}

export interface UnifiedSessionTape {
  version: 1
  sessionId: string
  tickHz: typeof SESSION_TAPE_TICK_HZ
  genesisHash: string
  entries: readonly SessionTapeEntry[]
  headHash: string
  createdAt: string
  updatedAt: string
}

export type SessionTapeResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

const GENESIS = 'unified-session-tape-genesis'

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function payloadDigest(payload: SessionTapePayload): string {
  return digest(JSON.stringify(payload))
}

function entryPayload(entry: Omit<SessionTapeEntry, 'entryHash'>): string {
  return [
    entry.id,
    entry.tickIndex,
    entry.kind,
    entry.payloadDigest,
    entry.prevHash,
    entry.eventTimeMs,
    entry.note,
  ].join('|')
}

function hashEntry(entry: Omit<SessionTapeEntry, 'entryHash'>): string {
  return digest(entryPayload(entry))
}

export function createUnifiedSessionTape(input?: {
  sessionId?: string
  now?: string
}): UnifiedSessionTape {
  const now = input?.now ?? new Date().toISOString()
  const sessionId = input?.sessionId ?? randomUUID()
  const genesisHash = digest(`${GENESIS}|${sessionId}|${SESSION_TAPE_TICK_HZ}`)
  return {
    version: 1,
    sessionId,
    tickHz: SESSION_TAPE_TICK_HZ,
    genesisHash,
    entries: [],
    headHash: genesisHash,
    createdAt: now,
    updatedAt: now,
  }
}

function expectedTickIndex(tape: UnifiedSessionTape): number {
  return tape.entries.length
}

export function appendSessionTapeEntry(
  tape: UnifiedSessionTape,
  input: {
    kind: SessionTapeEventKind
    payload: SessionTapePayload
    eventTimeMs: number
    note: string
    tickIndex?: number
  },
): SessionTapeResult<UnifiedSessionTape> {
  if (input.payload.kind !== input.kind) {
    return { ok: false, code: 'KIND_MISMATCH', message: 'payload kind must match entry kind' }
  }

  const tickIndex = input.tickIndex ?? expectedTickIndex(tape)
  const expected = expectedTickIndex(tape)
  if (tickIndex !== expected) {
    return {
      ok: false,
      code: 'TICK_GAP',
      message: `expected tickIndex ${expected}, got ${tickIndex}`,
    }
  }

  const createdAt = new Date().toISOString()
  const prevHash = tape.headHash
  const id = `${tape.sessionId}:${tickIndex}:${input.kind}`
  const pd = payloadDigest(input.payload)

  const withoutHash: Omit<SessionTapeEntry, 'entryHash'> = {
    id,
    tickIndex,
    kind: input.kind,
    payloadDigest: pd,
    prevHash,
    eventTimeMs: input.eventTimeMs,
    note: input.note,
  }

  const entry: SessionTapeEntry = {
    ...withoutHash,
    entryHash: hashEntry(withoutHash),
  }

  const next: UnifiedSessionTape = {
    ...tape,
    entries: Object.freeze([...tape.entries, Object.freeze(entry)]),
    headHash: entry.entryHash,
    updatedAt: createdAt,
  }

  log.info('session_tape_appended', { sessionId: tape.sessionId, kind: input.kind, tickIndex })

  return { ok: true, value: Object.freeze(next) }
}

export function verifySessionTapeChain(tape: UnifiedSessionTape): {
  valid: boolean
  reason?: string
  fingerprint: string
  entryCount: number
} {
  const fingerprint = fingerprintSessionTape(tape)
  let expectedPrev = tape.genesisHash

  for (let i = 0; i < tape.entries.length; i++) {
    const entry = tape.entries[i]!
    if (entry.tickIndex !== i) {
      return {
        valid: false,
        reason: `tickIndex gap at position ${i}`,
        fingerprint,
        entryCount: tape.entries.length,
      }
    }
    if (entry.prevHash !== expectedPrev) {
      return {
        valid: false,
        reason: `broken prevHash at tick ${entry.tickIndex}`,
        fingerprint,
        entryCount: tape.entries.length,
      }
    }
    const recomputed = hashEntry({
      id: entry.id,
      tickIndex: entry.tickIndex,
      kind: entry.kind,
      payloadDigest: entry.payloadDigest,
      prevHash: entry.prevHash,
      eventTimeMs: entry.eventTimeMs,
      note: entry.note,
    })
    if (recomputed !== entry.entryHash) {
      return {
        valid: false,
        reason: `entry hash mismatch at tick ${entry.tickIndex}`,
        fingerprint,
        entryCount: tape.entries.length,
      }
    }
    expectedPrev = entry.entryHash
  }

  if (tape.headHash !== expectedPrev) {
    return {
      valid: false,
      reason: 'headHash does not match chain tail',
      fingerprint,
      entryCount: tape.entries.length,
    }
  }

  return { valid: true, fingerprint, entryCount: tape.entries.length }
}

export function fingerprintSessionTape(tape: UnifiedSessionTape): string {
  let chain = tape.genesisHash
  for (const entry of tape.entries) {
    chain = digest(`${chain}|${entry.entryHash}`)
  }
  return chain
}

/** Record one fixed-tick sim state snapshot on the tape. */
export function recordSimTickOnTape(
  tape: UnifiedSessionTape,
  input: {
    stateFingerprint: string
    entityCount: number
    eventTimeMs: number
    note?: string
  },
): SessionTapeResult<UnifiedSessionTape> {
  return appendSessionTapeEntry(tape, {
    kind: 'sim_tick',
    payload: {
      kind: 'sim_tick',
      data: {
        stateFingerprint: input.stateFingerprint,
        entityCount: input.entityCount,
      },
    },
    eventTimeMs: input.eventTimeMs,
    note: input.note ?? 'sim tick recorded',
  })
}

/** Record paper-trade lifecycle anchor on the unified tape (pairs with N3 audit). */
export function recordPaperTradeOnTape(
  tape: UnifiedSessionTape,
  input: {
    strategyId: string
    orderIntent: TradeOrderIntentSnapshot
    executionMode: 'paper' | 'live' | 'none'
    eventTimeMs: number
    note?: string
  },
): SessionTapeResult<UnifiedSessionTape> {
  return appendSessionTapeEntry(tape, {
    kind: 'paper_trade',
    payload: {
      kind: 'paper_trade',
      data: {
        strategyId: input.strategyId,
        orderIntent: input.orderIntent,
        executionMode: input.executionMode,
      },
    },
    eventTimeMs: input.eventTimeMs,
    note: input.note ?? `${input.executionMode} trade anchor`,
  })
}

/** Probe SF1 session tape readiness — chain verify on minimal sim+paper sample. */
export function probeSessionTapeReadiness(): {
  ready: boolean
  chainValid: boolean
  tickHz: number
  entryCount: number
  fingerprint: string
} {
  let tape = createUnifiedSessionTape({ sessionId: 'sf1-probe', now: '2026-08-10T14:00:00.000Z' })

  const t0 = appendSessionTapeEntry(tape, {
    kind: 'sim_tick',
    payload: {
      kind: 'sim_tick',
      data: { stateFingerprint: 'probe-baseline', entityCount: 1 },
    },
    eventTimeMs: 0,
    note: 'probe sim tick 0',
  })
  if (!t0.ok) {
    return { ready: false, chainValid: false, tickHz: SESSION_TAPE_TICK_HZ, entryCount: 0, fingerprint: '' }
  }
  tape = t0.value

  const t1 = recordPaperTradeOnTape(tape, {
    strategyId: 'probe-strat',
    orderIntent: { symbol: 'PROBE', side: 'buy', quantity: 1, limitPrice: 100, strategyId: 'probe-strat' },
    executionMode: 'paper',
    eventTimeMs: 16,
    note: 'probe paper anchor',
  })
  if (!t1.ok) {
    return { ready: false, chainValid: false, tickHz: SESSION_TAPE_TICK_HZ, entryCount: 0, fingerprint: '' }
  }
  tape = t1.value

  const verify = verifySessionTapeChain(tape)
  return {
    ready: verify.valid && verify.entryCount >= 2,
    chainValid: verify.valid,
    tickHz: SESSION_TAPE_TICK_HZ,
    entryCount: verify.entryCount,
    fingerprint: verify.fingerprint,
  }
}
