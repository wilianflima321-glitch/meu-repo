/**
 * SF1 — Unified session tape tests.
 */

import { describe, expect, it } from 'vitest'

import {
  SESSION_TAPE_TICK_HZ,
  appendSessionTapeEntry,
  createUnifiedSessionTape,
  probeSessionTapeReadiness,
  recordPaperTradeOnTape,
  recordSimTickOnTape,
  verifySessionTapeChain,
} from '@/lib/production/unified-session-tape'

describe('unified session tape (SF1)', () => {
  it('records sim ticks and paper trades on fixed tick indices', () => {
    let tape = createUnifiedSessionTape({ sessionId: 'test-session', now: '2026-08-10T14:00:00.000Z' })

    const sim = recordSimTickOnTape(tape, {
      stateFingerprint: 'abc123',
      entityCount: 4,
      eventTimeMs: 0,
    })
    expect(sim.ok).toBe(true)
    if (!sim.ok) return
    tape = sim.value

    const trade = recordPaperTradeOnTape(tape, {
      strategyId: 'strat-a',
      orderIntent: {
        symbol: 'TEST',
        side: 'buy',
        quantity: 10,
        limitPrice: 50,
        strategyId: 'strat-a',
      },
      executionMode: 'paper',
      eventTimeMs: 16,
    })
    expect(trade.ok).toBe(true)
    if (!trade.ok) return
    tape = trade.value

    const verify = verifySessionTapeChain(tape)
    expect(verify.valid).toBe(true)
    expect(verify.entryCount).toBe(2)
    expect(tape.tickHz).toBe(SESSION_TAPE_TICK_HZ)
    expect(tape.entries[0]?.kind).toBe('sim_tick')
    expect(tape.entries[1]?.kind).toBe('paper_trade')
  })

  it('rejects tick index gaps fail-closed', () => {
    const tape = createUnifiedSessionTape({ sessionId: 'gap-test' })
    const gap = appendSessionTapeEntry(tape, {
      kind: 'sim_tick',
      payload: {
        kind: 'sim_tick',
        data: { stateFingerprint: 'x', entityCount: 1 },
      },
      eventTimeMs: 0,
      note: 'skip tick 0',
      tickIndex: 1,
    })
    expect(gap.ok).toBe(false)
    if (gap.ok) return
    expect(gap.code).toBe('TICK_GAP')
  })

  it('detects tampered chain links', () => {
    let tape = createUnifiedSessionTape({ sessionId: 'tamper-test' })
    const sim = recordSimTickOnTape(tape, {
      stateFingerprint: 'baseline',
      entityCount: 1,
      eventTimeMs: 0,
    })
    expect(sim.ok).toBe(true)
    if (!sim.ok) return
    tape = sim.value

    const entries = [...tape.entries]
    entries[0] = { ...entries[0]!, prevHash: 'deadbeef' }
    const tampered = { ...tape, entries: Object.freeze(entries) }
    const verify = verifySessionTapeChain(tampered)
    expect(verify.valid).toBe(false)
  })

  it('probe passes minimal sim+paper sample', () => {
    const probe = probeSessionTapeReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.chainValid).toBe(true)
    expect(probe.fingerprint.length).toBeGreaterThan(0)
  })
})
