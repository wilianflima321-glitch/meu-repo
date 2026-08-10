/**
 * SF3 — Monotonic timebase / tick isolation.
 * Sim-tick vs wall-clock isolation; optional exchange timestamp hook.
 * Fail-closed: non-monotonic advances rejected; no PTP / live exchange ingest claim.
 * Dual-use substrate (games SimulationTick + finance event-time ordering).
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('monotonic-timebase')

export const SF3_DEFAULT_SIM_DT_MS = 1000 / 60

export type TimebaseAuthority = 'sim_tick' | 'wall_clock' | 'exchange_timestamp'

export type TimebaseRejectCode =
  | 'non_monotonic_sim'
  | 'non_monotonic_wall'
  | 'non_monotonic_exchange'
  | 'invalid_dt'
  | 'exchange_hook_not_attached'
  | 'authority_mismatch'

export type TimebaseResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: TimebaseRejectCode; message: string }

export interface MonotonicTimebaseState {
  version: 1
  /** Which clock is authoritative for event ordering. */
  authority: TimebaseAuthority
  tickIndex: number
  simTimeMs: number
  wallTimeMs: number
  /** Last exchange timestamp when hook attached; null otherwise. */
  exchangeTimeMs: number | null
  exchangeHookAttached: boolean
  /** Resolved event time under current authority. */
  eventTimeMs: number
  /** PTP / exchange ingest never claimed ready here. */
  ptpReady: false
  exchangeIngestReady: false
  investmentGrade: false
}

export type MonotonicTimebase = MonotonicTimebaseState

function resolveEventTime(state: {
  authority: TimebaseAuthority
  simTimeMs: number
  wallTimeMs: number
  exchangeTimeMs: number | null
  exchangeHookAttached: boolean
}): number {
  if (state.authority === 'sim_tick') return state.simTimeMs
  if (state.authority === 'wall_clock') return state.wallTimeMs
  if (state.exchangeHookAttached && state.exchangeTimeMs !== null) {
    return state.exchangeTimeMs
  }
  // Fail-soft resolve for read — callers must check attach before authority=exchange
  return state.wallTimeMs
}

export function createMonotonicTimebase(input?: {
  authority?: TimebaseAuthority
  wallTimeMs?: number
  simDtMs?: number
}): MonotonicTimebase {
  const authority = input?.authority ?? 'sim_tick'
  const wallTimeMs = input?.wallTimeMs ?? 0
  const state: MonotonicTimebase = {
    version: 1,
    authority,
    tickIndex: 0,
    simTimeMs: 0,
    wallTimeMs,
    exchangeTimeMs: null,
    exchangeHookAttached: false,
    eventTimeMs: 0,
    ptpReady: false,
    exchangeIngestReady: false,
    investmentGrade: false,
  }
  state.eventTimeMs = resolveEventTime(state)
  return state
}

/** Advance simulation tick — dt must be finite and > 0; sim time strictly increases. */
export function advanceSimTick(
  state: MonotonicTimebase,
  dtMs: number = SF3_DEFAULT_SIM_DT_MS,
): TimebaseResult<MonotonicTimebase> {
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return {
      ok: false,
      code: 'invalid_dt',
      message: 'sim dtMs must be a finite positive number',
    }
  }
  const nextSim = state.simTimeMs + dtMs
  if (!(nextSim > state.simTimeMs)) {
    return {
      ok: false,
      code: 'non_monotonic_sim',
      message: 'sim tick advance must be strictly monotonic',
    }
  }
  const next: MonotonicTimebase = {
    ...state,
    tickIndex: state.tickIndex + 1,
    simTimeMs: nextSim,
    ptpReady: false,
    exchangeIngestReady: false,
    investmentGrade: false,
  }
  next.eventTimeMs = resolveEventTime(next)
  return { ok: true, value: next }
}

/** Sample wall clock — must be >= previous wall sample (fail-closed on regress). */
export function sampleWallClock(
  state: MonotonicTimebase,
  wallTimeMs: number,
): TimebaseResult<MonotonicTimebase> {
  if (!Number.isFinite(wallTimeMs)) {
    return {
      ok: false,
      code: 'invalid_dt',
      message: 'wallTimeMs must be finite',
    }
  }
  if (wallTimeMs < state.wallTimeMs) {
    return {
      ok: false,
      code: 'non_monotonic_wall',
      message: 'wall clock sample regresses — rejected',
    }
  }
  const next: MonotonicTimebase = {
    ...state,
    wallTimeMs,
    ptpReady: false,
    exchangeIngestReady: false,
    investmentGrade: false,
  }
  next.eventTimeMs = resolveEventTime(next)
  return { ok: true, value: next }
}

/**
 * Optional exchange timestamp hook — attach before pushing exchange times.
 * Does NOT flip exchangeIngestReady / ptpReady (licensed feed still HELD).
 */
export function attachExchangeTimestampHook(
  state: MonotonicTimebase,
): MonotonicTimebase {
  return {
    ...state,
    exchangeHookAttached: true,
    ptpReady: false,
    exchangeIngestReady: false,
    investmentGrade: false,
  }
}

export function pushExchangeTimestamp(
  state: MonotonicTimebase,
  exchangeTimeMs: number,
): TimebaseResult<MonotonicTimebase> {
  if (!state.exchangeHookAttached) {
    return {
      ok: false,
      code: 'exchange_hook_not_attached',
      message: 'attachExchangeTimestampHook required before exchange timestamps',
    }
  }
  if (!Number.isFinite(exchangeTimeMs)) {
    return {
      ok: false,
      code: 'invalid_dt',
      message: 'exchangeTimeMs must be finite',
    }
  }
  if (state.exchangeTimeMs !== null && exchangeTimeMs < state.exchangeTimeMs) {
    return {
      ok: false,
      code: 'non_monotonic_exchange',
      message: 'exchange timestamp regresses — rejected',
    }
  }
  const next: MonotonicTimebase = {
    ...state,
    exchangeTimeMs,
    ptpReady: false,
    /** Hook accepted timestamps — still not a licensed L2 ingest claim. */
    exchangeIngestReady: false,
    investmentGrade: false,
  }
  next.eventTimeMs = resolveEventTime(next)
  return { ok: true, value: next }
}

/** Switch authority — exchange authority requires attached hook. */
export function setTimebaseAuthority(
  state: MonotonicTimebase,
  authority: TimebaseAuthority,
): TimebaseResult<MonotonicTimebase> {
  if (authority === 'exchange_timestamp' && !state.exchangeHookAttached) {
    return {
      ok: false,
      code: 'authority_mismatch',
      message: 'exchange_timestamp authority requires attachExchangeTimestampHook',
    }
  }
  if (authority === 'exchange_timestamp' && state.exchangeTimeMs === null) {
    return {
      ok: false,
      code: 'authority_mismatch',
      message: 'exchange_timestamp authority requires at least one pushExchangeTimestamp',
    }
  }
  const next: MonotonicTimebase = {
    ...state,
    authority,
    ptpReady: false,
    exchangeIngestReady: false,
    investmentGrade: false,
  }
  next.eventTimeMs = resolveEventTime(next)
  return { ok: true, value: next }
}

/**
 * Event-time for ordering (paper/live intent stamping, tape anchors).
 * Prefer current authority; never invent exchange time without hook.
 */
export function readEventTimeMs(state: MonotonicTimebase): number {
  return resolveEventTime(state)
}

export type MonotonicTimebaseProbeResult = {
  ready: boolean
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  path: string
  ptpReady: false
  exchangeIngestReady: false
  investmentGrade: false
  simTickIsolationWorks: boolean
  wallClockMonotonicWorks: boolean
  exchangeHookFailClosed: boolean
  note: string
}

/** Honesty probe — PARTIAL when isolation gates pass; PTP/ingest stay false. */
export function probeMonotonicTimebaseReadiness(): MonotonicTimebaseProbeResult {
  let tb = createMonotonicTimebase({ authority: 'sim_tick', wallTimeMs: 1_000 })
  const t1 = advanceSimTick(tb, SF3_DEFAULT_SIM_DT_MS)
  const t2 = t1.ok ? advanceSimTick(t1.value, SF3_DEFAULT_SIM_DT_MS) : t1
  const regressSim = t2.ok
    ? advanceSimTick({ ...t2.value, simTimeMs: t2.value.simTimeMs }, 0)
    : t2
  const simTickIsolationWorks =
    t1.ok &&
    t2.ok &&
    t2.value.tickIndex === 2 &&
    t2.value.simTimeMs > t1.value.simTimeMs &&
    regressSim.ok === false

  const wallOk = sampleWallClock(tb, 2_000)
  const wallRegress = wallOk.ok ? sampleWallClock(wallOk.value, 1_500) : wallOk
  const wallClockMonotonicWorks = wallOk.ok === true && wallRegress.ok === false

  const noHook = pushExchangeTimestamp(tb, 9_000)
  const hooked = attachExchangeTimestampHook(tb)
  const push1 = pushExchangeTimestamp(hooked, 9_000)
  const pushRegress = push1.ok ? pushExchangeTimestamp(push1.value, 8_000) : push1
  const authWithoutHook = setTimebaseAuthority(tb, 'exchange_timestamp')
  const exchangeHookFailClosed =
    noHook.ok === false &&
    push1.ok === true &&
    pushRegress.ok === false &&
    authWithoutHook.ok === false &&
    push1.value.ptpReady === false &&
    push1.value.exchangeIngestReady === false

  const ready =
    simTickIsolationWorks && wallClockMonotonicWorks && exchangeHookFailClosed

  log.info('monotonic_timebase_probed', {
    ready,
    ptpReady: false,
    exchangeIngestReady: false,
    investmentGrade: false,
  })

  return {
    ready,
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    path: 'lib/production/monotonic-timebase.ts',
    ptpReady: false,
    exchangeIngestReady: false,
    investmentGrade: false,
    simTickIsolationWorks,
    wallClockMonotonicWorks,
    exchangeHookFailClosed,
    note: ready
      ? 'SF3 PARTIAL — sim-tick vs wall isolation + optional exchange hook fail-closed; PTP / licensed exchange ingest HELD; investmentGrade false'
      : 'SF3 monotonic timebase probe failed',
  }
}
