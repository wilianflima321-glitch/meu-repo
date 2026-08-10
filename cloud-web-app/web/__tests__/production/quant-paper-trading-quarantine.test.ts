/**
 * N2 — Paper-trading kernel + quarantine gate tests.
 */

import { describe, expect, it } from 'vitest'

import {
  QUANT_RISK_ACCEPTANCE_PHRASE,
  recordEulaRiskAcceptance,
} from '@/lib/server/quant/eula-risk-acceptance'
import {
  DEFAULT_LIVE_ENABLED,
  attemptEnableLive,
  createPaperTradingSession,
  createQuarantineGate,
  evaluateWalkForwardQuarantine,
  submitPaperOrder,
} from '@/lib/server/quant/paper-trading-kernel'

describe('paper trading quarantine (N2)', () => {
  it('defaults live=false and blocks live enable without quarantine PASS', () => {
    const session = createPaperTradingSession({
      projectId: 'proj-paper-1',
      strategyId: 'strat-alpha',
    })
    const gate = createQuarantineGate('strat-alpha')

    expect(session.liveEnabled).toBe(DEFAULT_LIVE_ENABLED)
    expect(session.mode).toBe('paper')
    expect(gate.liveUnlocked).toBe(false)

    const blocked = attemptEnableLive(session, gate)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.code).toBe('quarantine_not_passed')
    }
  })

  it('allows policy live enable only after quarantine PASS + EULA; broker stays HELD', () => {
    const session = createPaperTradingSession({
      projectId: 'proj-paper-2',
      strategyId: 'strat-beta',
    })
    const failGate = evaluateWalkForwardQuarantine({
      strategyId: 'strat-beta',
      windowCount: 1,
      passRate: 0.9,
    })
    expect(failGate.status).toBe('FAIL')
    expect(attemptEnableLive(session, failGate).ok).toBe(false)

    const passGate = evaluateWalkForwardQuarantine({
      strategyId: 'strat-beta',
      windowCount: 5,
      passRate: 0.75,
    })
    expect(passGate.status).toBe('PASS')
    expect(passGate.liveUnlocked).toBe(true)

    const withoutEula = attemptEnableLive(session, passGate)
    expect(withoutEula.ok).toBe(false)
    if (!withoutEula.ok) {
      expect(withoutEula.code).toBe('eula_not_accepted')
    }

    const eula = recordEulaRiskAcceptance({
      accountId: 'acct-beta',
      hwid: 'hw-beta',
      ipAddress: '127.0.0.1',
      typedPhrase: QUANT_RISK_ACCEPTANCE_PHRASE,
      now: '2026-08-10T15:00:00.000Z',
    })
    expect(eula.ok).toBe(true)
    if (!eula.ok) return

    const allowed = attemptEnableLive(session, passGate, eula.value)
    expect(allowed.ok).toBe(true)
    if (allowed.ok) {
      expect(allowed.value.liveBrokerReady).toBe(false)
    }
  })

  it('routes orders to paper only after N5 risk_check — never live broker path', () => {
    const session = createPaperTradingSession({
      projectId: 'proj-paper-3',
      strategyId: 'strat-gamma',
    })
    const receipt = submitPaperOrder(
      session,
      {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        limitPrice: 150,
      },
      {
        notionalUsd: 1500,
        leverageX100: 100,
        currentDrawdownBps: 0,
      },
    )
    expect(receipt.ok).toBe(true)
    if (receipt.ok) {
      expect(receipt.value.mode).toBe('paper')
      expect(receipt.value.riskCheck).toBe('pass')
    }
  })

  it('rejects paper submit when N5 risk envelope fails', () => {
    const session = createPaperTradingSession({
      projectId: 'proj-paper-4',
      strategyId: 'strat-delta',
    })
    const blocked = submitPaperOrder(
      session,
      { symbol: 'AAPL', side: 'buy', quantity: 1, limitPrice: 10 },
      { notionalUsd: 10, leverageX100: 9999, currentDrawdownBps: 0 },
    )
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.code).toBe('risk_leverage_exceeded')
    }
  })
})
