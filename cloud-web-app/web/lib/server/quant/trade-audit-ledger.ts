/**
 * N3 — Append-only trade audit ledger (intent → risk → paper/live).
 * Distinct from AI task-evidence-ledger — MiFID-style trade lifecycle only.
 * Optional SF2 WORM sink for durable signed evidence (local always; cloud consent-gated).
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  appendWormEvidenceWithConsentGate,
  type SignedWormStore,
  type WormResult,
  type WormSigningMaterial,
} from '@/lib/production/signed-worm-evidence-store'

const log = createComponentLogger('trade-audit-ledger')

export type TradeAuditPhase =
  | 'intent'
  | 'risk_check'
  | 'paper_submit'
  | 'live_submit'
  | 'reject'

export type TradeRiskVerdict = 'pass' | 'fail'

export interface TradeOrderIntentSnapshot {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  limitPrice: number | null
  strategyId: string
}

export interface TradeAuditEntry {
  id: string
  sequence: number
  phase: TradeAuditPhase
  projectId: string
  strategyId: string
  orderIntent: TradeOrderIntentSnapshot
  riskVerdict: TradeRiskVerdict | null
  executionMode: 'paper' | 'live' | 'none'
  /** Observed clock drift vs exchange/server anchor (ms). */
  clockDriftMs: number
  prevHash: string
  entryHash: string
  createdAt: string
  note: string
}

export interface TradeAuditLedger {
  version: 1
  ledgerId: string
  projectId: string
  genesisHash: string
  entries: readonly TradeAuditEntry[]
  headHash: string
  createdAt: string
  updatedAt: string
}

export type TradeAuditResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

const GENESIS = 'trade-audit-genesis'

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function entryPayload(entry: Omit<TradeAuditEntry, 'entryHash'>): string {
  return [
    entry.id,
    entry.sequence,
    entry.phase,
    entry.projectId,
    entry.strategyId,
    entry.orderIntent.symbol,
    entry.orderIntent.side,
    entry.orderIntent.quantity,
    entry.orderIntent.limitPrice ?? 'market',
    entry.riskVerdict ?? 'none',
    entry.executionMode,
    entry.clockDriftMs,
    entry.prevHash,
    entry.createdAt,
    entry.note,
  ].join('|')
}

function hashEntry(entry: Omit<TradeAuditEntry, 'entryHash'>): string {
  return digest(entryPayload(entry))
}

export function createTradeAuditLedger(input: {
  projectId: string
  ledgerId?: string
  now?: string
}): TradeAuditLedger {
  const now = input.now ?? new Date().toISOString()
  const ledgerId = input.ledgerId ?? randomUUID()
  const genesisHash = digest(`${GENESIS}|${ledgerId}|${input.projectId}`)
  return {
    version: 1,
    ledgerId,
    projectId: input.projectId,
    genesisHash,
    entries: [],
    headHash: genesisHash,
    createdAt: now,
    updatedAt: now,
  }
}

export function appendTradeAuditEntry(
  ledger: TradeAuditLedger,
  input: {
    phase: TradeAuditPhase
    strategyId: string
    orderIntent: TradeOrderIntentSnapshot
    riskVerdict?: TradeRiskVerdict | null
    executionMode: TradeAuditEntry['executionMode']
    clockDriftMs: number
    note: string
    now?: string
  },
): TradeAuditResult<TradeAuditLedger> {
  const createdAt = input.now ?? new Date().toISOString()
  const sequence = ledger.entries.length + 1
  const prevHash = ledger.headHash
  const id = `${ledger.ledgerId}:${sequence}:${input.phase}`

  const withoutHash: Omit<TradeAuditEntry, 'entryHash'> = {
    id,
    sequence,
    phase: input.phase,
    projectId: ledger.projectId,
    strategyId: input.strategyId,
    orderIntent: input.orderIntent,
    riskVerdict: input.riskVerdict ?? null,
    executionMode: input.executionMode,
    clockDriftMs: input.clockDriftMs,
    prevHash,
    createdAt,
    note: input.note,
  }

  const entry: TradeAuditEntry = {
    ...withoutHash,
    entryHash: hashEntry(withoutHash),
  }

  const next: TradeAuditLedger = {
    ...ledger,
    entries: Object.freeze([...ledger.entries, Object.freeze(entry)]),
    headHash: entry.entryHash,
    updatedAt: createdAt,
  }

  log.info('trade_audit_appended', {
    ledgerId: ledger.ledgerId,
    phase: input.phase,
    sequence,
  })

  return { ok: true, value: Object.freeze(next) }
}

export function verifyTradeAuditChain(ledger: TradeAuditLedger): {
  valid: boolean
  reason?: string
  fingerprint: string
} {
  const fingerprint = fingerprintTradeAuditLedger(ledger)
  let expectedPrev = ledger.genesisHash

  for (const entry of ledger.entries) {
    if (entry.prevHash !== expectedPrev) {
      return {
        valid: false,
        reason: `broken prevHash at sequence ${entry.sequence}`,
        fingerprint,
      }
    }
    const recomputed = hashEntry({
      id: entry.id,
      sequence: entry.sequence,
      phase: entry.phase,
      projectId: entry.projectId,
      strategyId: entry.strategyId,
      orderIntent: entry.orderIntent,
      riskVerdict: entry.riskVerdict,
      executionMode: entry.executionMode,
      clockDriftMs: entry.clockDriftMs,
      prevHash: entry.prevHash,
      createdAt: entry.createdAt,
      note: entry.note,
    })
    if (recomputed !== entry.entryHash) {
      return {
        valid: false,
        reason: `entry hash mismatch at sequence ${entry.sequence}`,
        fingerprint,
      }
    }
    expectedPrev = entry.entryHash
  }

  if (ledger.headHash !== expectedPrev) {
    return { valid: false, reason: 'headHash does not match chain tail', fingerprint }
  }

  return { valid: true, fingerprint }
}

export function fingerprintTradeAuditLedger(ledger: TradeAuditLedger): string {
  let chain = ledger.genesisHash
  for (const entry of ledger.entries) {
    chain = digest(`${chain}|${entry.entryHash}`)
  }
  return chain
}

/** Record full intent → risk → execution lifecycle (paper or live). */
export function recordTradeLifecycle(input: {
  ledger: TradeAuditLedger
  strategyId: string
  orderIntent: TradeOrderIntentSnapshot
  riskVerdict: TradeRiskVerdict
  executionMode: 'paper' | 'live' | 'none'
  clockDriftMs: number
  now?: string
}): TradeAuditResult<TradeAuditLedger> {
  let ledger = input.ledger

  const intentAppend = appendTradeAuditEntry(ledger, {
    phase: 'intent',
    strategyId: input.strategyId,
    orderIntent: input.orderIntent,
    executionMode: 'none',
    clockDriftMs: input.clockDriftMs,
    note: 'order intent captured',
    now: input.now,
  })
  if (!intentAppend.ok) return intentAppend
  ledger = intentAppend.value

  const riskAppend = appendTradeAuditEntry(ledger, {
    phase: 'risk_check',
    strategyId: input.strategyId,
    orderIntent: input.orderIntent,
    riskVerdict: input.riskVerdict,
    executionMode: 'none',
    clockDriftMs: input.clockDriftMs,
    note: `risk ${input.riskVerdict}`,
    now: input.now,
  })
  if (!riskAppend.ok) return riskAppend
  ledger = riskAppend.value

  if (input.riskVerdict === 'fail') {
    return appendTradeAuditEntry(ledger, {
      phase: 'reject',
      strategyId: input.strategyId,
      orderIntent: input.orderIntent,
      riskVerdict: 'fail',
      executionMode: 'none',
      clockDriftMs: input.clockDriftMs,
      note: 'risk kernel rejected before submit',
      now: input.now,
    })
  }

  const submitPhase: TradeAuditPhase =
    input.executionMode === 'live' ? 'live_submit' : 'paper_submit'

  return appendTradeAuditEntry(ledger, {
    phase: submitPhase,
    strategyId: input.strategyId,
    orderIntent: input.orderIntent,
    riskVerdict: 'pass',
    executionMode: input.executionMode,
    clockDriftMs: input.clockDriftMs,
    note: `${input.executionMode} submit recorded`,
    now: input.now,
  })
}

/** Optional SF2 sink options — local durable always allowed; cloud mirror needs consent. */
export type TradeAuditWormSinkOptions = {
  store: SignedWormStore
  signing: WormSigningMaterial
  /** When true, attempt cloud mirror path (fail-closed without explicit consent). */
  cloudMirror?: boolean
  cloudConsent?: boolean | null
  accountId?: string
}

/**
 * Sink a single trade-audit entry into SF2 signed WORM.
 * Local append always; cloudMirror requires consent === true (no silent telemetry).
 */
export function sinkTradeAuditEntryToWorm(
  entry: TradeAuditEntry,
  options: TradeAuditWormSinkOptions,
): WormResult<SignedWormStore> {
  const kind =
    entry.phase === 'reject' || entry.riskVerdict === 'fail'
      ? ('risk-reject' as const)
      : ('trade-lifecycle' as const)

  return appendWormEvidenceWithConsentGate(
    options.store,
    options.signing,
    {
      payload: {
        kind,
        title: `trade-audit:${entry.phase}`,
        summary: [
          entry.phase,
          entry.strategyId,
          entry.orderIntent.symbol,
          entry.riskVerdict ?? 'none',
          entry.executionMode,
          `drift=${entry.clockDriftMs}ms`,
          entry.note,
        ].join('|'),
        refs: [entry.id, entry.entryHash, entry.projectId],
        actor: entry.strategyId,
      },
      cloudMirror: options.cloudMirror === true,
      cloudConsent: options.cloudConsent,
      accountId: options.accountId,
    },
  )
}

/**
 * Record lifecycle and optionally sink each new entry to SF2 WORM.
 * In-memory N3 ledger is always updated; WORM is opt-in via wormSink.
 */
export function recordTradeLifecycleWithOptionalWorm(input: {
  ledger: TradeAuditLedger
  strategyId: string
  orderIntent: TradeOrderIntentSnapshot
  riskVerdict: TradeRiskVerdict
  executionMode: 'paper' | 'live' | 'none'
  clockDriftMs: number
  now?: string
  wormSink?: TradeAuditWormSinkOptions
}): TradeAuditResult<{ ledger: TradeAuditLedger; wormStore: SignedWormStore | null }> {
  const recorded = recordTradeLifecycle({
    ledger: input.ledger,
    strategyId: input.strategyId,
    orderIntent: input.orderIntent,
    riskVerdict: input.riskVerdict,
    executionMode: input.executionMode,
    clockDriftMs: input.clockDriftMs,
    now: input.now,
  })
  if (!recorded.ok) return recorded

  let wormStore: SignedWormStore | null = input.wormSink?.store ?? null
  if (input.wormSink) {
    const prevCount = input.ledger.entries.length
    const newEntries = recorded.value.entries.slice(prevCount)
    let store = input.wormSink.store
    for (const entry of newEntries) {
      const sunk = sinkTradeAuditEntryToWorm(entry, { ...input.wormSink, store })
      if (!sunk.ok) {
        return { ok: false, code: sunk.code, message: sunk.message }
      }
      store = sunk.value
    }
    wormStore = store
    log.info('trade_audit_sunk_to_sf2', {
      ledgerId: recorded.value.ledgerId,
      wormEntries: newEntries.length,
      cloudMirror: input.wormSink.cloudMirror === true,
    })
  }

  return { ok: true, value: { ledger: recorded.value, wormStore } }
}
