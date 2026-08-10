/**
 * N5 — Risk envelope tests (web mirror; Rust kernel is canonical).
 */

import { describe, expect, it } from 'vitest'

import {
  LIVE_TRADING_ENABLED,
  armKillSwitch,
  createRiskEnvelopeLimits,
  evaluateRisk,
  probeRiskEnvelopeReadiness,
} from '@/lib/server/quant/risk-envelope'

describe('risk envelope (N5)', () => {
  it('passes paper orders within limits', () => {
    const limits = createRiskEnvelopeLimits()
    const v = evaluateRisk(limits, {
      strategyId: 's1',
      notionalUsd: 500,
      leverageX100: 100,
      currentDrawdownBps: 10,
      wantsLive: false,
    })
    expect(v.ok).toBe(true)
  })

  it('never enables live trading', () => {
    expect(LIVE_TRADING_ENABLED).toBe(false)
    const limits = createRiskEnvelopeLimits()
    const v = evaluateRisk(limits, {
      strategyId: 's1',
      notionalUsd: 100,
      leverageX100: 100,
      currentDrawdownBps: 0,
      wantsLive: true,
    })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('live_trading_disabled')
  })

  it('kill-switch rejects all orders', () => {
    const limits = armKillSwitch(createRiskEnvelopeLimits())
    const v = evaluateRisk(limits, {
      strategyId: 's1',
      notionalUsd: 50,
      leverageX100: 100,
      currentDrawdownBps: 0,
      wantsLive: false,
    })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('kill_switch')
  })

  it('enforces drawdown and leverage gates', () => {
    const limits = createRiskEnvelopeLimits()
    const dd = evaluateRisk(limits, {
      strategyId: 's1',
      notionalUsd: 100,
      leverageX100: 100,
      currentDrawdownBps: 10_001,
      wantsLive: false,
    })
    expect(dd.ok).toBe(false)
    if (!dd.ok) expect(dd.code).toBe('drawdown_exceeded')

    const lev = evaluateRisk(limits, {
      strategyId: 's1',
      notionalUsd: 100,
      leverageX100: 9999,
      currentDrawdownBps: 0,
      wantsLive: false,
    })
    expect(lev.ok).toBe(false)
    if (!lev.ok) expect(lev.code).toBe('leverage_exceeded')
  })

  it('probe stays investmentGrade false', () => {
    const p = probeRiskEnvelopeReadiness()
    expect(p.ready).toBe(true)
    expect(p.liveTradingEnabled).toBe(false)
    expect(p.investmentGrade).toBe(false)
    expect(p.rustPath).toContain('risk_envelope.rs')
  })
})
