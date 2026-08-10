/**
 * N2 — Paper-trading kernel interface + walk-forward quarantine gate.
 * Fail-closed: live capital stays disabled until quarantine PASS evidence exists.
 * Every paper submit must pass N5 risk envelope (drawdown / leverage / kill-switch).
 */

import { createHash, randomUUID } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import type { EulaAcceptanceRecord } from '@/lib/server/quant/eula-risk-acceptance'
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

export interface PaperOrderReceipt {
  receiptId: string
  mode: 'paper'
  intent: PaperOrderIntent
  filledAt: string
  /** N5 risk envelope passed before fill. */
  riskCheck: 'pass'
  notionalUsd: number
}

/** N5 inputs required on every paper submit (fail-closed — no bypass). */
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
  /** Only true after explicit PASS — never defaulted. */
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

/**
 * Walk-forward quarantine — requires minimum windows and pass rate.
 * Does not unlock live on partial or synthetic Math.random books.
 */
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

  const insufficientWindows = input.windowCount < MIN_WALK_FORWARD_WINDOWS
  const insufficientPassRate = input.passRate < minPassRate
  const status: QuarantineStatus =
    insufficientWindows || insufficientPassRate ? 'FAIL' : 'PASS'

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

/** Paper-only submit — N5 risk_check first; never routes to a live broker adapter. */
export function submitPaperOrder(
  session: PaperTradingSession,
  intent: PaperOrderIntent,
  risk: PaperRiskCheckInput,
  now?: string,
): PaperTradingResult<PaperOrderReceipt> {
  if (session.mode !== 'paper' || session.liveEnabled !== false) {
    return {
      ok: false,
      code: 'live_mode_blocked',
      message: 'paper kernel rejects non-paper sessions',
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
    log.info('paper_submit_rejected_by_n5', {
      strategyId: session.strategyId,
      code: verdict.code,
    })
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
      riskCheck: 'pass',
      notionalUsd: risk.notionalUsd,
    },
  }
}

/**
 * Fail-closed live enable — requires N2 quarantine PASS + §23 EULA acceptance.
 * Even when policy gates pass, no live broker adapter exists (liveBrokerReady=false).
 * Default live=false forever until both gates pass; broker still HELD.
 */
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
    return {
      ok: false,
      code: 'strategy_mismatch',
      message: 'quarantine gate strategyId must match session',
    }
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
    eulaAttestationHash: eula.attestationHash.slice(0, 16),
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
  ): PaperTradingResult<PaperOrderReceipt>
  evaluateQuarantine(
    strategyId: string,
    windowCount: number,
    passRate: number,
  ): QuarantineGateState
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
    submitPaper: (session, intent, risk) => submitPaperOrder(session, intent, risk),
    evaluateQuarantine: (strategyId, windowCount, passRate) =>
      evaluateWalkForwardQuarantine({ strategyId, windowCount, passRate }),
    requestLiveEnable: (session, gate, eula) => attemptEnableLive(session, gate, eula),
  }
}
