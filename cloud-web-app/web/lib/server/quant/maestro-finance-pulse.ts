/**
 * N7 — Maestro finance pulse scheduler (fail-closed).
 * Maestro may veto pulse windows; Mini-IA MUST NOT submit orders from pulse alone.
 * No live broker / FIX / RPA CV theater.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  createMathematicalEvidenceReport,
  type MathematicalEvidenceReport,
} from '@/lib/server/quant/mathematical-evidence'

const log = createComponentLogger('maestro-finance-pulse')

export type FinanceRegime = 'calm' | 'elevated' | 'stress' | 'unknown'

export interface MaestroFinancePulseInput {
  projectId: string
  strategyId: string
  /** Proxy VPIN / toxicity score in [0,1] — not exchange-certified */
  vpinProxy: number
  regime?: FinanceRegime
  /** Wall/sim pulse interval ms — scheduling only */
  intervalMs?: number
  now?: string
}

export type FinancePulseRejectCode =
  | 'invalid_input'
  | 'mini_ia_submit_forbidden'
  | 'pulse_vetoed'
  | 'investment_grade_blocked'

export type FinancePulseResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: FinancePulseRejectCode; message: string; evidence?: MathematicalEvidenceReport }

export interface MaestroFinancePulseVerdict {
  allowed: boolean
  vetoed: boolean
  regime: FinanceRegime
  vpinProxy: number
  /** Mini-IA never gets submit authority from this pulse */
  miniIaMaySubmit: false
  investmentGrade: false
  liveBrokerReady: false
  reasons: string[]
  evidence: MathematicalEvidenceReport
  nextPulseAtMs: number
}

const DEFAULT_INTERVAL_MS = 60_000
const VPIN_VETO_THRESHOLD = 0.72

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

export function resolveFinanceRegime(vpinProxy: number, hinted?: FinanceRegime): FinanceRegime {
  if (hinted && hinted !== 'unknown') return hinted
  const v = clamp01(vpinProxy)
  if (v >= 0.85) return 'stress'
  if (v >= VPIN_VETO_THRESHOLD) return 'elevated'
  if (v >= 0.35) return 'calm'
  return 'calm'
}

/**
 * Evaluate one Maestro finance pulse. Veto under elevated/stress VPIN proxy.
 * Explicitly rejects any Mini-IA submit attempt.
 */
export function evaluateMaestroFinancePulse(
  input: MaestroFinancePulseInput,
  options?: { miniIaAttemptSubmit?: boolean },
): FinancePulseResult<MaestroFinancePulseVerdict> {
  if (!input.projectId?.trim() || !input.strategyId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'projectId and strategyId required' }
  }
  if (typeof input.vpinProxy !== 'number' || !Number.isFinite(input.vpinProxy)) {
    return { ok: false, code: 'invalid_input', message: 'vpinProxy must be a finite number' }
  }

  if (options?.miniIaAttemptSubmit === true) {
    const evidence = createMathematicalEvidenceReport({
      kind: 'pulse_veto',
      projectId: input.projectId,
      strategyId: input.strategyId,
      summary: 'Mini-IA submit attempt rejected — Maestro veto only; Mini-IA has no order authority',
      metrics: { vpinProxy: clamp01(input.vpinProxy), miniIaSubmit: 1 },
      refs: ['n7:mini-ia-forbidden'],
      createdAt: input.now,
    })
    return {
      ok: false,
      code: 'mini_ia_submit_forbidden',
      message: 'Mini-IA must not submit orders from finance pulse — Maestro veto-only path',
      evidence: evidence.ok ? evidence.value : undefined,
    }
  }

  const vpinProxy = clamp01(input.vpinProxy)
  const regime = resolveFinanceRegime(vpinProxy, input.regime)
  const intervalMs =
    typeof input.intervalMs === 'number' && Number.isFinite(input.intervalMs) && input.intervalMs >= 1000
      ? input.intervalMs
      : DEFAULT_INTERVAL_MS
  const nowMs = input.now ? Date.parse(input.now) : Date.now()
  const vetoed = regime === 'elevated' || regime === 'stress' || vpinProxy >= VPIN_VETO_THRESHOLD

  const evidenceResult = createMathematicalEvidenceReport({
    kind: vetoed ? 'pulse_veto' : 'regime_flag',
    projectId: input.projectId,
    strategyId: input.strategyId,
    summary: vetoed
      ? `Maestro finance pulse VETO — regime=${regime} vpinProxy=${vpinProxy.toFixed(3)}`
      : `Maestro finance pulse ALLOW (paper/research only) — regime=${regime}`,
    metrics: { vpinProxy, intervalMs, veto: vetoed ? 1 : 0 },
    refs: ['n7:maestro-pulse', `regime:${regime}`],
    createdAt: input.now ?? new Date(nowMs).toISOString(),
  })
  if (!evidenceResult.ok) {
    return { ok: false, code: 'invalid_input', message: evidenceResult.message }
  }

  const verdict: MaestroFinancePulseVerdict = {
    allowed: !vetoed,
    vetoed,
    regime,
    vpinProxy,
    miniIaMaySubmit: false,
    investmentGrade: false,
    liveBrokerReady: false,
    reasons: vetoed
      ? [
          'Maestro vetoed pulse window (elevated/stress VPIN proxy)',
          'Mini-IA may not submit',
          'liveBrokerReady=false — no FIX',
          'investmentGrade=false',
        ]
      : [
          'Pulse window open for paper/research signals only',
          'Mini-IA may not submit',
          'liveBrokerReady=false — no FIX',
          'investmentGrade=false',
        ],
    evidence: evidenceResult.value,
    nextPulseAtMs: nowMs + intervalMs,
  }

  log.info('maestro_finance_pulse', {
    projectId: input.projectId,
    vetoed,
    regime,
    vpinProxy,
  })

  if (vetoed) {
    return {
      ok: false,
      code: 'pulse_vetoed',
      message: 'Maestro finance pulse vetoed this window',
      evidence: evidenceResult.value,
    }
  }

  return { ok: true, value: verdict }
}

export function probeMaestroFinancePulseReadiness(): {
  id: 'N7'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  path: string
  note: string
  investmentGrade: false
  miniIaMaySubmit: false
} {
  const allow = evaluateMaestroFinancePulse({
    projectId: 'probe',
    strategyId: 's1',
    vpinProxy: 0.2,
    now: '2026-08-10T12:00:00.000Z',
  })
  const veto = evaluateMaestroFinancePulse({
    projectId: 'probe',
    strategyId: 's1',
    vpinProxy: 0.9,
    now: '2026-08-10T12:00:00.000Z',
  })
  const mini = evaluateMaestroFinancePulse(
    {
      projectId: 'probe',
      strategyId: 's1',
      vpinProxy: 0.1,
      now: '2026-08-10T12:00:00.000Z',
    },
    { miniIaAttemptSubmit: true },
  )

  const ready =
    allow.ok === true &&
    allow.value.miniIaMaySubmit === false &&
    allow.value.investmentGrade === false &&
    veto.ok === false &&
    veto.code === 'pulse_vetoed' &&
    mini.ok === false &&
    mini.code === 'mini_ia_submit_forbidden'

  return {
    id: 'N7',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    path: 'lib/server/quant/maestro-finance-pulse.ts',
    note: ready
      ? 'Maestro finance pulse + Mathematical Evidence; veto-only; Mini-IA submit forbidden; Cap\'n Proto HELD.'
      : 'Maestro finance pulse probe failed.',
    investmentGrade: false,
    miniIaMaySubmit: false,
  }
}
