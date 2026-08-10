/**
 * N5 — Risk envelope (web mirror of Rust kernel gates).
 * Fail-closed: live trading never enabled. Pairs with N3 trade audit.
 * Canonical reject-before-network lives in `aethel-kernel-rust::risk_envelope`.
 * Distinct from Hub Coins / Creative CostGuard.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('risk-envelope')

/** Hard-disabled — investment-grade HELD. */
export const LIVE_TRADING_ENABLED = false as const

export const DEFAULT_MAX_DRAWDOWN_BPS = 1000
export const DEFAULT_MAX_LEVERAGE_X100 = 200
export const DEFAULT_MAX_NOTIONAL_USD = 100_000

export type RiskRejectCode =
  | 'kill_switch'
  | 'live_trading_disabled'
  | 'drawdown_exceeded'
  | 'leverage_exceeded'
  | 'notional_exceeded'
  | 'invalid_request'

export interface RiskEnvelopeLimits {
  maxDrawdownBps: number
  maxLeverageX100: number
  maxNotionalUsd: number
  killSwitchArmed: boolean
  liveTradingEnabled: typeof LIVE_TRADING_ENABLED
}

export interface RiskCheckRequest {
  strategyId: string
  notionalUsd: number
  leverageX100: number
  currentDrawdownBps: number
  wantsLive: boolean
}

export type RiskVerdict =
  | { ok: true }
  | { ok: false; code: RiskRejectCode; reason: string }

export function createRiskEnvelopeLimits(
  overrides?: Partial<Omit<RiskEnvelopeLimits, 'liveTradingEnabled'>>,
): RiskEnvelopeLimits {
  return {
    maxDrawdownBps: overrides?.maxDrawdownBps ?? DEFAULT_MAX_DRAWDOWN_BPS,
    maxLeverageX100: overrides?.maxLeverageX100 ?? DEFAULT_MAX_LEVERAGE_X100,
    maxNotionalUsd: overrides?.maxNotionalUsd ?? DEFAULT_MAX_NOTIONAL_USD,
    killSwitchArmed: overrides?.killSwitchArmed ?? false,
    liveTradingEnabled: LIVE_TRADING_ENABLED,
  }
}

export function armKillSwitch(limits: RiskEnvelopeLimits): RiskEnvelopeLimits {
  return { ...limits, killSwitchArmed: true }
}

export function disarmKillSwitch(limits: RiskEnvelopeLimits): RiskEnvelopeLimits {
  return { ...limits, killSwitchArmed: false, liveTradingEnabled: LIVE_TRADING_ENABLED }
}

/** Evaluate order against envelope — reject before broker/network. */
export function evaluateRisk(
  limits: RiskEnvelopeLimits,
  req: RiskCheckRequest,
): RiskVerdict {
  if (
    !req.strategyId.trim() ||
    !Number.isFinite(req.notionalUsd) ||
    req.notionalUsd <= 0
  ) {
    return { ok: false, code: 'invalid_request', reason: 'strategyId empty or notional invalid' }
  }

  if (limits.killSwitchArmed) {
    return { ok: false, code: 'kill_switch', reason: 'kill-switch armed — all orders rejected' }
  }

  if (req.wantsLive || limits.liveTradingEnabled) {
    return {
      ok: false,
      code: 'live_trading_disabled',
      reason: 'live trading disabled — paper/sandbox only',
    }
  }

  if (req.currentDrawdownBps > limits.maxDrawdownBps) {
    return {
      ok: false,
      code: 'drawdown_exceeded',
      reason: `drawdown ${req.currentDrawdownBps} bps exceeds max ${limits.maxDrawdownBps} bps`,
    }
  }

  if (req.leverageX100 > limits.maxLeverageX100) {
    return {
      ok: false,
      code: 'leverage_exceeded',
      reason: `leverage ${req.leverageX100}x100 exceeds max ${limits.maxLeverageX100}x100`,
    }
  }

  if (req.notionalUsd > limits.maxNotionalUsd) {
    return {
      ok: false,
      code: 'notional_exceeded',
      reason: `notional ${req.notionalUsd} exceeds max ${limits.maxNotionalUsd}`,
    }
  }

  return { ok: true }
}

export type RiskEnvelopeProbeResult = {
  ready: boolean
  liveTradingEnabled: false
  investmentGrade: false
  killSwitchRejects: boolean
  liveIntentRejects: boolean
  drawdownGateWorks: boolean
  leverageGateWorks: boolean
  paperPassWithinLimits: boolean
  path: string
  rustPath: string
  note: string
}

/** Probe N5 readiness — web mirror + documented Rust kernel path. */
export function probeRiskEnvelopeReadiness(): RiskEnvelopeProbeResult {
  let limits = createRiskEnvelopeLimits()

  const paperPassWithinLimits = evaluateRisk(limits, {
    strategyId: 'probe-paper',
    notionalUsd: 1000,
    leverageX100: 100,
    currentDrawdownBps: 50,
    wantsLive: false,
  }).ok

  const liveIntentRejects =
    evaluateRisk(limits, {
      strategyId: 'probe-live',
      notionalUsd: 1000,
      leverageX100: 100,
      currentDrawdownBps: 0,
      wantsLive: true,
    }).ok === false

  const drawdownGateWorks =
    evaluateRisk(limits, {
      strategyId: 'probe-dd',
      notionalUsd: 1000,
      leverageX100: 100,
      currentDrawdownBps: limits.maxDrawdownBps + 1,
      wantsLive: false,
    }).ok === false

  const leverageGateWorks =
    evaluateRisk(limits, {
      strategyId: 'probe-lev',
      notionalUsd: 1000,
      leverageX100: limits.maxLeverageX100 + 1,
      currentDrawdownBps: 0,
      wantsLive: false,
    }).ok === false

  limits = armKillSwitch(limits)
  const killSwitchRejects =
    evaluateRisk(limits, {
      strategyId: 'probe-kill',
      notionalUsd: 100,
      leverageX100: 100,
      currentDrawdownBps: 0,
      wantsLive: false,
    }).ok === false

  const ready =
    paperPassWithinLimits &&
    liveIntentRejects &&
    drawdownGateWorks &&
    leverageGateWorks &&
    killSwitchRejects &&
    !LIVE_TRADING_ENABLED

  log.info('risk_envelope_probed', {
    ready,
    liveTradingEnabled: LIVE_TRADING_ENABLED,
    investmentGrade: false,
  })

  return {
    ready,
    liveTradingEnabled: false,
    investmentGrade: false,
    killSwitchRejects,
    liveIntentRejects,
    drawdownGateWorks,
    leverageGateWorks,
    paperPassWithinLimits,
    path: 'lib/server/quant/risk-envelope.ts',
    rustPath: 'packages/aethel-kernel-rust/src/risk_envelope.rs',
    note: ready
      ? 'N5 PARTIAL — drawdown/leverage/kill-switch fail-closed; live hard-disabled; Rust kernel + web mirror; investmentGrade false'
      : 'N5 risk envelope probe failed',
  }
}
