/**
 * Dual-Mode Execution — fail-closed policy + Maestro guard tests.
 */

import { describe, expect, it } from 'vitest'
import {
  QUANT_FINANCE_INVESTMENT_GRADE,
  probeQuantFinanceHonesty,
} from '@/lib/production/quant-finance-honesty'
import {
  MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES,
  evaluateMaestroExecutionGuard,
  evaluateManusRpaIntent,
  evaluateVanguardHftIntent,
  getManusRpaPolicy,
  getVanguardHftPolicy,
  probeDualModeExecutionReadiness,
} from '@/lib/server/quant/dual-mode-execution'
import { QUANT_RISK_ACCEPTANCE_PHRASE, recordEulaRiskAcceptance } from '@/lib/server/quant/eula-risk-acceptance'
import { mintLocalExchangeKeyRef } from '@/lib/server/quant/non-custodial-invariants'
import { evaluateWalkForwardQuarantine } from '@/lib/server/quant/paper-trading-kernel'

describe('quant dual-mode execution', () => {
  it('Manus RPA rejects HFT and scalping intents', () => {
    const hft = evaluateManusRpaIntent({
      mode: 'manus_rpa_browser',
      frequency: 'hft',
      chartTimeframeMinutes: 15,
    })
    expect(hft.ok).toBe(false)
    if (!hft.ok) expect(hft.code).toBe('rpa_hft_blocked')

    const scalp = evaluateMaestroExecutionGuard('manus_rpa_browser', {
      mode: 'manus_rpa_browser',
      frequency: 'scalping',
      chartTimeframeMinutes: 15,
    })
    expect(scalp.ok).toBe(false)
    if (!scalp.ok) expect(scalp.code).toBe('rpa_scalping_blocked')

    const shortTf = evaluateManusRpaIntent({
      mode: 'manus_rpa_browser',
      frequency: 'swing_or_position',
      chartTimeframeMinutes: 5,
    })
    expect(shortTf.ok).toBe(false)
    if (!shortTf.ok) expect(shortTf.code).toBe('rpa_timeframe_too_short')
  })

  it('Manus RPA allows swing/position on ≥15m charts and exposes policy floor', () => {
    const policy = getManusRpaPolicy()
    expect(policy.maxFrequency).toBe('swing_or_position')
    expect(policy.minChartTimeframeMinutes).toBe(MANUS_RPA_MIN_CHART_TIMEFRAME_MINUTES)
    expect(policy.liveOrtRpaReady).toBe(false)
    expect(policy.investmentGrade).toBe(false)

    const ok = evaluateMaestroExecutionGuard('manus_rpa_browser', {
      mode: 'manus_rpa_browser',
      frequency: 'swing_or_position',
      chartTimeframeMinutes: 60,
      maestroTimelineCount: 2,
      sameBrowserProfile: false,
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.value.liveOrtRpaReady).toBe(false)
      expect(ok.value.investmentGrade).toBe(false)
      expect(ok.value.claimsMsExecutionWorks).toBe(false)
    }
  })

  it('Maestro blocks multi-timeline RPA on the same browser profile', () => {
    const unsafe = evaluateMaestroExecutionGuard('manus_rpa_browser', {
      mode: 'manus_rpa_browser',
      frequency: 'swing_or_position',
      chartTimeframeMinutes: 15,
      maestroTimelineCount: 3,
      sameBrowserProfile: true,
    })
    expect(unsafe.ok).toBe(false)
    if (!unsafe.ok) expect(unsafe.code).toBe('maestro_multi_timeline_unsafe')
  })

  it('Vanguard HFT without EULA or quarantine is rejected', () => {
    const key = mintLocalExchangeKeyRef('local-probe-handle-hft')
    expect(key.ok).toBe(true)
    if (!key.ok) return

    const noQuarantine = evaluateVanguardHftIntent({
      intent: {
        mode: 'vanguard_hft_api',
        frequency: 'hft',
        chartTimeframeMinutes: 1,
        localApiKeyRef: key.value,
      },
      quarantine: null,
      eula: null,
    })
    expect(noQuarantine.ok).toBe(false)
    if (!noQuarantine.ok) expect(noQuarantine.code).toBe('hft_quarantine_not_passed')

    const quarantine = evaluateWalkForwardQuarantine({
      strategyId: 'dual-hft',
      windowCount: 5,
      passRate: 0.9,
    })
    expect(quarantine.status).toBe('PASS')

    const noEula = evaluateMaestroExecutionGuard(
      'vanguard_hft_api',
      {
        mode: 'vanguard_hft_api',
        frequency: 'hft',
        chartTimeframeMinutes: 1,
        localApiKeyRef: key.value,
      },
      { quarantine, eula: null },
    )
    expect(noEula.ok).toBe(false)
    if (!noEula.ok) expect(noEula.code).toBe('hft_eula_not_accepted')

    const noKey = evaluateVanguardHftIntent({
      intent: {
        mode: 'vanguard_hft_api',
        frequency: 'hft',
        chartTimeframeMinutes: 1,
        localApiKeyRef: null,
      },
      quarantine,
      eula: null,
    })
    expect(noKey.ok).toBe(false)
    if (!noKey.ok) expect(noKey.code).toBe('hft_missing_local_api_key')
  })

  it('Vanguard HFT with key+quarantine+EULA still keeps liveBrokerReady false and rejects ms claims', () => {
    const key = mintLocalExchangeKeyRef('local-probe-handle-hft-ok')
    expect(key.ok).toBe(true)
    if (!key.ok) return

    const quarantine = evaluateWalkForwardQuarantine({
      strategyId: 'dual-hft-ok',
      windowCount: 4,
      passRate: 0.85,
    })
    const eula = recordEulaRiskAcceptance({
      accountId: 'acct_dual_mode',
      hwid: 'hwid-dual-mode-test-001',
      ipAddress: '203.0.113.10',
      typedPhrase: QUANT_RISK_ACCEPTANCE_PHRASE,
    })
    expect(eula.ok).toBe(true)
    if (!eula.ok) return

    const msClaim = evaluateVanguardHftIntent({
      intent: {
        mode: 'vanguard_hft_api',
        frequency: 'hft',
        chartTimeframeMinutes: 1,
        localApiKeyRef: key.value,
        claimsMsExecution: true,
      },
      quarantine,
      eula: eula.value,
    })
    expect(msClaim.ok).toBe(false)
    if (!msClaim.ok) expect(msClaim.code).toBe('hft_ms_claim_forbidden')

    const gated = evaluateMaestroExecutionGuard(
      'vanguard_hft_api',
      {
        mode: 'vanguard_hft_api',
        frequency: 'hft',
        chartTimeframeMinutes: 1,
        localApiKeyRef: key.value,
      },
      { quarantine, eula: eula.value },
    )
    expect(gated.ok).toBe(true)
    if (gated.ok) {
      expect(gated.value.liveBrokerReady).toBe(false)
      expect(gated.value.claimsMsExecutionWorks).toBe(false)
      expect(gated.value.investmentGrade).toBe(false)
    }

    const policy = getVanguardHftPolicy()
    expect(policy.liveBrokerReady).toBe(false)
    expect(policy.claimsMsExecutionWorks).toBe(false)
    expect(policy.investmentGrade).toBe(false)
    expect(policy.colocationRequiredForMsClaims).toBe(true)
  })

  it('dual-mode honesty probe never claims investmentGrade; honesty report stays false', () => {
    const dual = probeDualModeExecutionReadiness()
    expect(dual.investmentGrade).toBe(false)
    expect(dual.vanguardHftApi.investmentGrade).toBe(false)
    expect(dual.manusRpaBrowser.investmentGrade).toBe(false)
    expect(dual.vanguardHftApi.liveBrokerReady).toBe(false)
    expect(dual.manusRpaBrowser.liveOrtRpaReady).toBe(false)
    expect(dual.maestroGuardWired).toBe(true)
    expect(dual.maestroGuardOnSubmitPath).toBe('paper-trading-kernel.submitPaper|submitLive')
    expect(dual.vanguardHftApi.status).toBe('PARTIAL')
    expect(dual.manusRpaBrowser.status).toBe('PARTIAL')

    expect(QUANT_FINANCE_INVESTMENT_GRADE).toBe(false)
    const report = probeQuantFinanceHonesty()
    expect(report.investmentGrade).toBe(false)
    expect(report.dualModeExecution.investmentGrade).toBe(false)
    expect(report.dualModeExecution.vanguardHftApi.claimsMsExecutionWorks).toBe(false)
    const byId = Object.fromEntries(report.capabilities.map((c) => [c.id, c]))
    expect(byId['dual-mode-vanguard-hft']?.status).toBe('PARTIAL')
    expect(byId['dual-mode-manus-rpa']?.status).toBe('PARTIAL')
  })
})
