/**
 * N2 — Paper-trading kernel + walk-forward quarantine.
 * Fail-closed: Maestro dual-mode (mode+timeframe) then N5 risk before any submit.
 * liveBrokerReady always false — no broker / ORT RPA.
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import type { EulaAcceptanceRecord } from '@/lib/server/quant/eula-risk-acceptance'
import {
  evaluateMaestroExecutionGuard,
  type DualModeTradeIntent,
  type ExecutionMode,
  type MaestroExecutionGuardVerdict,
  type TradeFrequencyClass,
} from '@/lib/server/quant/dual-mode-execution'
import type { ExchangeKeyRef } from '@/lib/server/quant/non-custodial-invariants'
import {
  createRiskEnvelopeLimits,
  evaluateRisk,
  type RiskEnvelopeLimits,
  type RiskRejectCode,
} from '@/lib/server/quant/risk-envelope'

const log = createComponentLogger('paper-trading-kernel')

export const DEFAULT_LIVE_ENABLED = false as const

export type QuarantineStatus = 'QUARANTINED' | 'PASS' | 'FAIL'
export type TradingExecutionMode = 'paper' | 'live'

export interface WalkForwardEvidence {
  strategyId: string
  windowCount: number
  passRate: number
  minPassRate: number
  evaluatedAt: string
  evidenceHash: string
}

export interface PaperOrderIntent {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  limitPrice: number | null
}

/** Dual-Mode context required on every paper/live-intent submit. */
export interface DualModeSubmitContext {
  mode: ExecutionMode
  frequency: TradeFrequencyClass
  chartTimeframeMinutes: number
  maestroTimelineCount?: number
  sameBrowserProfile?: boolean
  claimsMsExecution?: boolean
  localApiKeyRef?: ExchangeKeyRef | string | null
  quarantine?: QuarantineGateState | null
  eula?: EulaAcceptanceRecord | null
}

export interface PaperOrderReceipt {
  receiptId: string
  mode: 'paper'
  intent: PaperOrderIntent
  filledAt: string
  maestroCheck: 'pass'
  maestroVerdict: MaestroExecutionGuardVerdict
  riskCheck: 'pass'
  notionalUsd: number
  liveBrokerReady: false
}

/** Live-intent reject shape — always fail-closed; no broker / ORT RPA. */
export interface LiveIntentRejectReceipt {
  mode: 'live'
  riskCheck: 'fail'
  liveBrokerReady: false
  liveOrtRpaReady: false
  investmentGrade: false
  code: string
  message: string
}

export interface PaperRiskCheckInput {
  limits?: RiskEnvelopeLimits
  notionalUsd: number
  leverageX100: number
  currentDrawdownBps: number
}

export interface QuarantineGateState {
  strategyId: string
  status: QuarantineStatus
  walkForward: WalkForwardEvidence | null
  liveUnlocked: boolean
}

export interface PaperTradingSession {
  sessionId: string
  projectId: string
  strategyId: string
  mode: 'paper'
  liveEnabled: typeof DEFAULT_LIVE_ENABLED
  createdAt: string
}

export type PaperTradingResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string }

const MIN_WALK_FORWARD_WINDOWS = 3
const DEFAULT_MIN_PASS_RATE = 0.6

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function hashWalkForwardEvidence(input: {
  strategyId: string
  windowCount: number
  passRate: number
  minPassRate: number
  evaluatedAt: string
}): string {
  return digest(
    `${input.strategyId}|${input.windowCount}|${input.passRate}|${input.minPassRate}|${input.evaluatedAt}`,
  )
}

/** Default Manus RPA swing/position ≥15m dual-mode context for paper probes/tests. */
export function defaultPaperManusDualMode(
  overrides?: Partial<DualModeSubmitContext>,
): DualModeSubmitContext {
  return {
    mode: 'manus_rpa_browser',
    frequency: 'swing_or_position',
    chartTimeframeMinutes: 15,
    maestroTimelineCount: 1,
    sameBrowserProfile: false,
    ...overrides,
  }
}

function toDualModeIntent(dualMode: DualModeSubmitContext): DualModeTradeIntent {
  return {
    mode: dualMode.mode,
    frequency: dualMode.frequency,
    chartTimeframeMinutes: dualMode.chartTimeframeMinutes,
    maestroTimelineCount: dualMode.maestroTimelineCount,
    sameBrowserProfile: dualMode.sameBrowserProfile,
    claimsMsExecution: dualMode.claimsMsExecution,
    localApiKeyRef: dualMode.localApiKeyRef,
  }
}

function requireDualModeContext(
  dualMode: DualModeSubmitContext | null | undefined,
): PaperTradingResult<DualModeSubmitContext> {
  if (
    !dualMode ||
    (dualMode.mode !== 'manus_rpa_browser' && dualMode.mode !== 'vanguard_hft_api') ||
    !Number.isFinite(dualMode.chartTimeframeMinutes)
  ) {
    return {
      ok: false,
      code: 'maestro_context_required',
      message: 'Dual-Mode context required — mode + frequency + chartTimeframeMinutes before submit',
    }
  }
  return { ok: true, value: dualMode }
}

export function createPaperTradingSession(input: {
  projectId: string
  strategyId: string
  now?: string
}): PaperTradingSession {
  return {
    sessionId: randomUUID(),
    projectId: input.projectId,
    strategyId: input.strategyId,
    mode: 'paper',
    liveEnabled: DEFAULT_LIVE_ENABLED,
    createdAt: input.now ?? new Date().toISOString(),
  }
}

export function createQuarantineGate(strategyId: string): QuarantineGateState {
  return {
    strategyId,
    status: 'QUARANTINED',
    walkForward: null,
    liveUnlocked: false,
  }
}

export function evaluateWalkForwardQuarantine(input: {
  strategyId: string
  windowCount: number
  passRate: number
  minPassRate?: number
  now?: string
}): QuarantineGateState {
  const minPassRate = input.minPassRate ?? DEFAULT_MIN_PASS_RATE
  const evaluatedAt = input.now ?? new Date().toISOString()
  const evidenceHash = hashWalkForwardEvidence({
    strategyId: input.strategyId,
    windowCount: input.windowCount,
    passRate: input.passRate,
    minPassRate,
    evaluatedAt,
  })
  const status: QuarantineStatus =
    input.windowCount < MIN_WALK_FORWARD_WINDOWS || input.passRate < minPassRate
      ? 'FAIL'
      : 'PASS'
  const walkForward: WalkForwardEvidence = {
    strategyId: input.strategyId,
    windowCount: input.windowCount,
    passRate: input.passRate,
    minPassRate,
    evaluatedAt,
    evidenceHash,
  }
  const gate: QuarantineGateState = {
    strategyId: input.strategyId,
    status,
    walkForward,
    liveUnlocked: status === 'PASS',
  }
  log.info('walk_forward_quarantine_evaluated', {
    strategyId: input.strategyId,
    status: gate.status,
    liveUnlocked: gate.liveUnlocked,
  })
  return gate
}

/** Paper submit — Maestro (mode+timeframe) then N5; never live broker. */
export function submitPaperOrder(
  session: PaperTradingSession,
  intent: PaperOrderIntent,
  risk: PaperRiskCheckInput,
  dualMode: DualModeSubmitContext,
  now?: string,
): PaperTradingResult<PaperOrderReceipt> {
  if (session.mode !== 'paper' || session.liveEnabled !== false) {
    return { ok: false, code: 'live_mode_blocked', message: 'paper kernel rejects non-paper sessions' }
  }

  const ctx = requireDualModeContext(dualMode)
  if (!ctx.ok) return ctx

  const maestro = evaluateMaestroExecutionGuard(ctx.value.mode, toDualModeIntent(ctx.value), {
    quarantine: ctx.value.quarantine,
    eula: ctx.value.eula,
  })
  if (!maestro.ok) {
    log.info('paper_submit_rejected_by_maestro', {
      strategyId: session.strategyId,
      code: maestro.code,
      mode: ctx.value.mode,
      chartTimeframeMinutes: ctx.value.chartTimeframeMinutes,
    })
    return {
      ok: false,
      code: `maestro_${maestro.code}`,
      message: `Maestro execution guard rejected: ${maestro.message}`,
    }
  }

  if (intent.quantity <= 0 || !Number.isFinite(intent.quantity)) {
    return { ok: false, code: 'invalid_intent', message: 'quantity must be positive' }
  }
  if (
    !Number.isFinite(risk.notionalUsd) ||
    risk.notionalUsd <= 0 ||
    !Number.isFinite(risk.leverageX100) ||
    !Number.isFinite(risk.currentDrawdownBps)
  ) {
    return {
      ok: false,
      code: 'invalid_risk_context',
      message: 'N5 risk context required — notional/leverage/drawdown must be finite',
    }
  }

  const limits = risk.limits ?? createRiskEnvelopeLimits()
  const verdict = evaluateRisk(limits, {
    strategyId: session.strategyId,
    notionalUsd: risk.notionalUsd,
    leverageX100: risk.leverageX100,
    currentDrawdownBps: risk.currentDrawdownBps,
    wantsLive: false,
  })
  if (!verdict.ok) {
    log.info('paper_submit_rejected_by_n5', { strategyId: session.strategyId, code: verdict.code })
    return {
      ok: false,
      code: `risk_${verdict.code}` as `risk_${RiskRejectCode}`,
      message: `N5 risk envelope rejected: ${verdict.reason}`,
    }
  }

  return {
    ok: true,
    value: {
      receiptId: randomUUID(),
      mode: 'paper',
      intent,
      filledAt: now ?? new Date().toISOString(),
      maestroCheck: 'pass',
      maestroVerdict: maestro.value,
      riskCheck: 'pass',
      notionalUsd: risk.notionalUsd,
      liveBrokerReady: false,
    },
  }
}

/** Live-intent — Maestro then N5 wantsLive; always reject (no broker / RPA CV). */
export function submitLiveIntent(
  session: PaperTradingSession,
  intent: PaperOrderIntent,
  risk: PaperRiskCheckInput,
  dualMode: DualModeSubmitContext,
  now?: string,
): PaperTradingResult<never> {
  void intent
  void now
  const ctx = requireDualModeContext(dualMode)
  if (!ctx.ok) return { ok: false, code: ctx.code, message: ctx.message }

  const maestro = evaluateMaestroExecutionGuard(ctx.value.mode, toDualModeIntent(ctx.value), {
    quarantine: ctx.value.quarantine,
    eula: ctx.value.eula,
  })
  if (!maestro.ok) {
    log.info('live_intent_rejected_by_maestro', {
      strategyId: session.strategyId,
      code: maestro.code,
      mode: ctx.value.mode,
      chartTimeframeMinutes: ctx.value.chartTimeframeMinutes,
    })
    return {
      ok: false,
      code: `maestro_${maestro.code}`,
      message: `Maestro execution guard rejected live intent: ${maestro.message}`,
    }
  }

  const limits = risk.limits ?? createRiskEnvelopeLimits()
  const verdict = evaluateRisk(limits, {
    strategyId: session.strategyId,
    notionalUsd: risk.notionalUsd,
    leverageX100: risk.leverageX100,
    currentDrawdownBps: risk.currentDrawdownBps,
    wantsLive: true,
  })
  const code = verdict.ok ? 'live_broker_held' : `risk_${verdict.code}`
  const message = verdict.ok
    ? 'live intent blocked — no broker adapter (liveBrokerReady=false)'
    : `live intent blocked by N5: ${verdict.reason}`
  log.warn('live_intent_fail_closed', {
    strategyId: session.strategyId,
    liveBrokerReady: false,
    liveOrtRpaReady: false,
    investmentGrade: false,
    code,
  })
  return { ok: false, code, message }
}

/** Live enable policy — quarantine PASS + EULA; broker still HELD. */
export function attemptEnableLive(
  session: PaperTradingSession,
  gate: QuarantineGateState,
  eula?: EulaAcceptanceRecord | null,
): PaperTradingResult<{
  liveEnabled: true
  evidenceHash: string
  eulaAttestationHash: string
  liveBrokerReady: false
}> {
  if (session.strategyId !== gate.strategyId) {
    return { ok: false, code: 'strategy_mismatch', message: 'quarantine gate strategyId must match session' }
  }
  if (gate.status !== 'PASS' || !gate.liveUnlocked || gate.walkForward === null) {
    return {
      ok: false,
      code: 'quarantine_not_passed',
      message: 'live capital blocked — walk-forward quarantine has not passed',
    }
  }
  if (!eula || !eula.attestationHash) {
    return {
      ok: false,
      code: 'eula_not_accepted',
      message: 'live capital blocked — EULA risk-acceptance phrase required (§23)',
    }
  }
  log.warn('live_enable_policy_gates_passed_broker_held', {
    strategyId: gate.strategyId,
    evidenceHash: gate.walkForward.evidenceHash,
    liveBrokerReady: false,
  })
  return {
    ok: true,
    value: {
      liveEnabled: true,
      evidenceHash: gate.walkForward.evidenceHash,
      eulaAttestationHash: eula.attestationHash,
      liveBrokerReady: false,
    },
  }
}

export interface PaperTradingKernel {
  createSession(projectId: string, strategyId: string): PaperTradingSession
  submitPaper(
    session: PaperTradingSession,
    intent: PaperOrderIntent,
    risk: PaperRiskCheckInput,
    dualMode: DualModeSubmitContext,
  ): PaperTradingResult<PaperOrderReceipt>
  submitLive(
    session: PaperTradingSession,
    intent: PaperOrderIntent,
    risk: PaperRiskCheckInput,
    dualMode: DualModeSubmitContext,
  ): PaperTradingResult<never>
  evaluateQuarantine(strategyId: string, windowCount: number, passRate: number): QuarantineGateState
  requestLiveEnable(
    session: PaperTradingSession,
    gate: QuarantineGateState,
    eula?: EulaAcceptanceRecord | null,
  ): PaperTradingResult<{
    liveEnabled: true
    evidenceHash: string
    eulaAttestationHash: string
    liveBrokerReady: false
  }>
}

export function createPaperTradingKernel(): PaperTradingKernel {
  return {
    createSession: (projectId, strategyId) => createPaperTradingSession({ projectId, strategyId }),
    submitPaper: (session, intent, risk, dualMode) =>
      submitPaperOrder(session, intent, risk, dualMode),
    submitLive: (session, intent, risk, dualMode) =>
      submitLiveIntent(session, intent, risk, dualMode),
    evaluateQuarantine: (strategyId, windowCount, passRate) =>
      evaluateWalkForwardQuarantine({ strategyId, windowCount, passRate }),
    requestLiveEnable: (session, gate, eula) => attemptEnableLive(session, gate, eula),
  }
}
