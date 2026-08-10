/**
 * Dual-Mode Execution — Vanguard HFT (API) vs Manus RPA (Browser).
 * Fail-closed policy + Maestro guard. No live broker / ORT RPA / FIX.
 * investmentGrade stays false; never claim ms execution on home Wi-Fi.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { EulaAcceptanceRecord } from '@/lib/server/quant/eula-risk-acceptance'
import {
  isOpaqueExchangeKeyRef,
  type ExchangeKeyRef,
} from '@/lib/server/quant/non-custodial-invariants'
import type { QuarantineGateState } from '@/lib/server/quant/paper-trading-kernel'

const log = createComponentLogger('quant-dual-mode-execution')

/** Canonical execution modes — API path vs browser RPA path. */
export type ExecutionMode = 'vanguard_hft_api' | 'manus_rpa_browser'

/** Intent frequency classes for Maestro / Mini-IA orchestration. */
export type TradeFrequencyClass =
  | 'hft'
  | 'scalping'
  | 'intraday'
  | 'swing_or_position'

export type MaxFrequencyPolicy = 'swing_or_position'

/** Chart timeframe floor for Manus RPA (~800ms click latency OK). */
export const MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES = 15 as const

/** Honest click-latency bound for browser RPA — not HFT. */
export const MANUS_RPA_CLICK_LATENCY_MS_BOUND = 800 as const

export type DualModeRejectCode =
  | 'rpa_hft_blocked'
  | 'rpa_scalping_blocked'
  | 'rpa_timeframe_too_short'
  | 'rpa_intraday_below_floor'
  | 'hft_missing_local_api_key'
  | 'hft_quarantine_not_passed'
  | 'hft_eula_not_accepted'
  | 'hft_ms_claim_forbidden'
  | 'maestro_multi_timeline_unsafe'
  | 'mode_mismatch'
  | 'invalid_intent'

export type DualModeResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: DualModeRejectCode; message: string }

export interface ManusRpaPolicy {
  mode: 'manus_rpa_browser'
  maxFrequency: MaxFrequencyPolicy
  minChartTimeframeMinutes: typeof MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES
  /** ~800ms DOM/CV click path — HFT auto-blocked. */
  clickLatencyMsBound: typeof MANUS_RPA_CLICK_LATENCY_MS_BOUND
  liveOrtRpaReady: false
  investmentGrade: false
}

export interface VanguardHftPolicy {
  mode: 'vanguard_hft_api'
  /** Non-custodial local key ref required — never platform DB secret. */
  requiresLocalApiKeyRef: true
  requiresN2QuarantinePass: true
  requiresSection23Eula: true
  /** Live adapter always false until FIX + legal + soak. */
  liveBrokerReady: false
  /** Never claim millisecond arbitrage works on retail home Wi-Fi. */
  claimsMsExecutionWorks: false
  investmentGrade: false
  colocationRequiredForMsClaims: true
}

export interface DualModeTradeIntent {
  mode: ExecutionMode
  frequency: TradeFrequencyClass
  /** Chart timeframe in minutes (candle size the strategy targets). */
  chartTimeframeMinutes: number
  /**
   * When true, caller asserts millisecond-class execution will succeed.
   * Always rejected for honesty — home Wi-Fi ≠ colocation.
   */
  claimsMsExecution?: boolean
  /**
   * Maestro / Mini-IA parallel timelines in the same browser profile.
   * Without process/profile isolation this is unsafe for RPA click paths.
   */
  maestroTimelineCount?: number
  /** Same browser profile / session cookie jar shared across timelines. */
  sameBrowserProfile?: boolean
  /** Opaque local Blind Brain key ref (HFT API mode only). */
  localApiKeyRef?: ExchangeKeyRef | string | null
}

export interface MaestroExecutionGuardVerdict {
  allowed: boolean
  mode: ExecutionMode
  maxFrequency: MaxFrequencyPolicy | 'api_path_gated'
  liveBrokerReady: false
  liveOrtRpaReady: false
  investmentGrade: false
  claimsMsExecutionWorks: false
  reasons: string[]
}

const MANUS_RPA_POLICY: ManusRpaPolicy = {
  mode: 'manus_rpa_browser',
  maxFrequency: 'swing_or_position',
  minChartTimeframeMinutes: MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES,
  clickLatencyMsBound: MANUS_RPA_CLICK_LATENCY_MS_BOUND,
  liveOrtRpaReady: false,
  investmentGrade: false,
}

const VANGUARD_HFT_POLICY: VanguardHftPolicy = {
  mode: 'vanguard_hft_api',
  requiresLocalApiKeyRef: true,
  requiresN2QuarantinePass: true,
  requiresSection23Eula: true,
  liveBrokerReady: false,
  claimsMsExecutionWorks: false,
  investmentGrade: false,
  colocationRequiredForMsClaims: true,
}

export function getManusRpaPolicy(): ManusRpaPolicy {
  return { ...MANUS_RPA_POLICY }
}

export function getVanguardHftPolicy(): VanguardHftPolicy {
  return { ...VANGUARD_HFT_POLICY }
}

export function getDualModePolicy(mode: ExecutionMode): ManusRpaPolicy | VanguardHftPolicy {
  return mode === 'manus_rpa_browser' ? getManusRpaPolicy() : getVanguardHftPolicy()
}

function isFinitePositiveMinutes(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/**
 * Manus RPA — browser CV/DOM path.
 * Maestro MUST auto-block HFT/scalping; only swing/position on ≥15m charts.
 */
export function evaluateManusRpaIntent(
  intent: DualModeTradeIntent,
): DualModeResult<{
  policy: ManusRpaPolicy
  frequency: 'swing_or_position'
  chartTimeframeMinutes: number
}> {
  if (intent.mode !== 'manus_rpa_browser') {
    return {
      ok: false,
      code: 'mode_mismatch',
      message: 'Manus RPA evaluator requires mode=manus_rpa_browser',
    }
  }
  if (!isFinitePositiveMinutes(intent.chartTimeframeMinutes)) {
    return {
      ok: false,
      code: 'invalid_intent',
      message: 'chartTimeframeMinutes must be a finite positive number',
    }
  }
  if (intent.frequency === 'hft') {
    log.warn('manus_rpa_hft_blocked', { frequency: intent.frequency })
    return {
      ok: false,
      code: 'rpa_hft_blocked',
      message:
        'Manus RPA auto-blocks High Frequency — ~800ms click latency cannot support HFT; use Vanguard API + colocation for institutional paths',
    }
  }
  if (intent.frequency === 'scalping') {
    return {
      ok: false,
      code: 'rpa_scalping_blocked',
      message: 'Manus RPA rejects scalping — maxFrequency=swing_or_position only',
    }
  }
  if (intent.frequency === 'intraday') {
    return {
      ok: false,
      code: 'rpa_intraday_below_floor',
      message: 'Manus RPA rejects intraday intents below swing/position floor',
    }
  }
  if (intent.chartTimeframeMinutes < MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES) {
    return {
      ok: false,
      code: 'rpa_timeframe_too_short',
      message: `Manus RPA requires chart timeframe ≥ ${MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES} minutes`,
    }
  }
  if (intent.claimsMsExecution === true) {
    return {
      ok: false,
      code: 'hft_ms_claim_forbidden',
      message: 'RPA path must not claim millisecond execution',
    }
  }

  return {
    ok: true,
    value: {
      policy: getManusRpaPolicy(),
      frequency: 'swing_or_position',
      chartTimeframeMinutes: intent.chartTimeframeMinutes,
    },
  }
}

export interface VanguardHftGateInput {
  intent: DualModeTradeIntent
  quarantine?: QuarantineGateState | null
  eula?: EulaAcceptanceRecord | null
}

/**
 * Vanguard HFT API — requires local opaque API key + N2 quarantine + §23 EULA.
 * Even when gates pass: liveBrokerReady=false; never claim ms execution works.
 */
export function evaluateVanguardHftIntent(
  input: VanguardHftGateInput,
): DualModeResult<{
  policy: VanguardHftPolicy
  localApiKeyRef: ExchangeKeyRef
  liveBrokerReady: false
  claimsMsExecutionWorks: false
}> {
  const { intent, quarantine, eula } = input
  if (intent.mode !== 'vanguard_hft_api') {
    return {
      ok: false,
      code: 'mode_mismatch',
      message: 'Vanguard HFT evaluator requires mode=vanguard_hft_api',
    }
  }
  if (intent.claimsMsExecution === true) {
    return {
      ok: false,
      code: 'hft_ms_claim_forbidden',
      message:
        'Millisecond execution claims forbidden on retail/home paths — colocation required; never market ms arbitrage as shipped',
    }
  }
  if (!isOpaqueExchangeKeyRef(intent.localApiKeyRef ?? null)) {
    return {
      ok: false,
      code: 'hft_missing_local_api_key',
      message: 'Vanguard HFT requires local opaque Blind Brain API key ref (non-custodial)',
    }
  }
  if (
    !quarantine ||
    quarantine.status !== 'PASS' ||
    !quarantine.liveUnlocked ||
    quarantine.walkForward === null
  ) {
    return {
      ok: false,
      code: 'hft_quarantine_not_passed',
      message: 'Vanguard HFT blocked — N2 walk-forward quarantine has not passed',
    }
  }
  if (!eula || !eula.attestationHash) {
    return {
      ok: false,
      code: 'hft_eula_not_accepted',
      message: 'Vanguard HFT blocked — §23 EULA risk-acceptance required',
    }
  }

  log.info('vanguard_hft_policy_gates_passed_broker_held', {
    localApiKeyRef: intent.localApiKeyRef.slice(0, 24),
    quarantineEvidence: quarantine.walkForward.evidenceHash,
    liveBrokerReady: false,
  })

  return {
    ok: true,
    value: {
      policy: getVanguardHftPolicy(),
      localApiKeyRef: intent.localApiKeyRef,
      liveBrokerReady: false,
      claimsMsExecutionWorks: false,
    },
  }
}

/**
 * Maestro guard — blocks unsafe mode×intent combos and unsafe multi-timeline RPA.
 * Multiple timelines in the same browser profile without isolation = blocked for RPA.
 */
export function evaluateMaestroExecutionGuard(
  mode: ExecutionMode,
  intent: DualModeTradeIntent,
  gates?: {
    quarantine?: QuarantineGateState | null
    eula?: EulaAcceptanceRecord | null
  },
): DualModeResult<MaestroExecutionGuardVerdict> {
  if (intent.mode !== mode) {
    return {
      ok: false,
      code: 'mode_mismatch',
      message: 'Maestro guard mode must match intent.mode',
    }
  }

  const timelineCount = intent.maestroTimelineCount ?? 1
  const sameProfile = intent.sameBrowserProfile === true

  if (mode === 'manus_rpa_browser') {
    if (timelineCount > 1 && sameProfile) {
      return {
        ok: false,
        code: 'maestro_multi_timeline_unsafe',
        message:
          'Maestro multi-timeline RPA in the same browser profile is unsafe without isolation (shared cookies/DOM race) — isolate profiles or serialize clicks',
      }
    }

    const rpa = evaluateManusRpaIntent(intent)
    if (!rpa.ok) {
      return rpa
    }

    return {
      ok: true,
      value: {
        allowed: true,
        mode,
        maxFrequency: 'swing_or_position',
        liveBrokerReady: false,
        liveOrtRpaReady: false,
        investmentGrade: false,
        claimsMsExecutionWorks: false,
        reasons: [
          'RPA swing/position ≥15m allowed under policy',
          'live ORT/CV click automation HELD',
          'Broker ToS / market-abuse risk remains user-borne — not cleared by this guard',
        ],
      },
    }
  }

  const hft = evaluateVanguardHftIntent({
    intent,
    quarantine: gates?.quarantine,
    eula: gates?.eula,
  })
  if (!hft.ok) {
    return hft
  }

  return {
    ok: true,
    value: {
      allowed: true,
      mode,
      maxFrequency: 'api_path_gated',
      liveBrokerReady: false,
      liveOrtRpaReady: false,
      investmentGrade: false,
      claimsMsExecutionWorks: false,
      reasons: [
        'API key + N2 quarantine + §23 EULA policy gates passed',
        'liveBrokerReady remains false — no FIX / live adapter',
        'ms arbitrage / spoofing-detect claims require colocation — not home Wi-Fi',
      ],
    },
  }
}

export type DualModeReadinessStatus = 'PARTIAL' | 'HELD'

export interface DualModeReadinessProbe {
  vanguardHftApi: {
    status: DualModeReadinessStatus
    ready: boolean
    liveBrokerReady: false
    claimsMsExecutionWorks: false
    investmentGrade: false
    path: string
    note: string
  }
  manusRpaBrowser: {
    status: DualModeReadinessStatus
    ready: boolean
    liveOrtRpaReady: false
    maxFrequency: MaxFrequencyPolicy
    minChartTimeframeMinutes: typeof MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES
    investmentGrade: false
    path: string
    note: string
  }
  maestroGuardWired: boolean
  investmentGrade: false
}

/**
 * Honesty probe — both modes PARTIAL/HELD appropriately; never investmentGrade.
 */
export function probeDualModeExecutionReadiness(): DualModeReadinessProbe {
  const rpaBlock = evaluateMaestroExecutionGuard('manus_rpa_browser', {
    mode: 'manus_rpa_browser',
    frequency: 'hft',
    chartTimeframeMinutes: 1,
  })
  const rpaOk = evaluateMaestroExecutionGuard('manus_rpa_browser', {
    mode: 'manus_rpa_browser',
    frequency: 'swing_or_position',
    chartTimeframeMinutes: 15,
    maestroTimelineCount: 2,
    sameBrowserProfile: false,
  })
  const hftNoKey = evaluateMaestroExecutionGuard('vanguard_hft_api', {
    mode: 'vanguard_hft_api',
    frequency: 'hft',
    chartTimeframeMinutes: 1,
    localApiKeyRef: null,
  })

  const guardWired = rpaBlock.ok === false && rpaOk.ok === true && hftNoKey.ok === false

  return {
    vanguardHftApi: {
      status: 'PARTIAL',
      ready: guardWired,
      liveBrokerReady: false,
      claimsMsExecutionWorks: false,
      investmentGrade: false,
      path: 'lib/server/quant/dual-mode-execution.ts',
      note: guardWired
        ? 'Policy gates wired (local key + N2 + EULA); live broker / FIX / ms claims HELD — home Wi-Fi ≠ colocation.'
        : 'Vanguard HFT dual-mode probe failed.',
    },
    manusRpaBrowser: {
      status: 'PARTIAL',
      ready: guardWired,
      liveOrtRpaReady: false,
      maxFrequency: 'swing_or_position',
      minChartTimeframeMinutes: MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES,
      investmentGrade: false,
      path: 'lib/server/quant/dual-mode-execution.ts',
      note: guardWired
        ? 'Maestro auto-blocks HFT/scalping; ≥15m swing/position only; live ORT/CV RPA HELD (ToS/market-abuse risk).'
        : 'Manus RPA dual-mode probe failed.',
    },
    maestroGuardWired: guardWired,
    investmentGrade: false,
  }
}
