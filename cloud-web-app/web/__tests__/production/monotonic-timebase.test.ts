/**
 * SF3 — Monotonic timebase isolation tests.
 */

import { describe, expect, it } from 'vitest'

import {
  SF3_DEFAULT_SIM_DT_MS,
  advanceSimTick,
  attachExchangeTimestampHook,
  createMonotonicTimebase,
  probeMonotonicTimebaseReadiness,
  pushExchangeTimestamp,
  readEventTimeMs,
  sampleWallClock,
  setTimebaseAuthority,
} from '@/lib/production/monotonic-timebase'
import { probeSharedSubstrateHonesty } from '@/lib/production/shared-substrate-honesty'
import {
  QUANT_FINANCE_INVESTMENT_GRADE,
  probeQuantFinanceHonesty,
} from '@/lib/production/quant-finance-honesty'

describe('SF3 monotonic timebase', () => {
  it('advances sim ticks monotonically and rejects invalid dt', () => {
    let tb = createMonotonicTimebase({ authority: 'sim_tick' })
    const a = advanceSimTick(tb, SF3_DEFAULT_SIM_DT_MS)
    expect(a.ok).toBe(true)
    if (!a.ok) return
    tb = a.value
    expect(tb.tickIndex).toBe(1)
    expect(tb.simTimeMs).toBe(SF3_DEFAULT_SIM_DT_MS)
    expect(readEventTimeMs(tb)).toBe(tb.simTimeMs)

    const zero = advanceSimTick(tb, 0)
    expect(zero.ok).toBe(false)
    if (!zero.ok) expect(zero.code).toBe('invalid_dt')
  })

  it('rejects wall-clock regression and exchange push without hook', () => {
    let tb = createMonotonicTimebase({ authority: 'wall_clock', wallTimeMs: 1000 })
    const wall = sampleWallClock(tb, 2000)
    expect(wall.ok).toBe(true)
    if (!wall.ok) return
    tb = wall.value

    const regress = sampleWallClock(tb, 1500)
    expect(regress.ok).toBe(false)
    if (!regress.ok) expect(regress.code).toBe('non_monotonic_wall')

    const noHook = pushExchangeTimestamp(tb, 9000)
    expect(noHook.ok).toBe(false)
    if (!noHook.ok) expect(noHook.code).toBe('exchange_hook_not_attached')

    tb = attachExchangeTimestampHook(tb)
    const push = pushExchangeTimestamp(tb, 9000)
    expect(push.ok).toBe(true)
    if (!push.ok) return
    expect(push.value.ptpReady).toBe(false)
    expect(push.value.exchangeIngestReady).toBe(false)
    expect(push.value.investmentGrade).toBe(false)

    const pushBack = pushExchangeTimestamp(push.value, 8000)
    expect(pushBack.ok).toBe(false)
    if (!pushBack.ok) expect(pushBack.code).toBe('non_monotonic_exchange')

    const auth = setTimebaseAuthority(push.value, 'exchange_timestamp')
    expect(auth.ok).toBe(true)
    if (auth.ok) {
      expect(readEventTimeMs(auth.value)).toBe(9000)
      expect(auth.value.ptpReady).toBe(false)
    }
  })

  it('probe stays PARTIAL with investmentGrade/ptp/ingest false; honesty wires SF3', () => {
    const probe = probeMonotonicTimebaseReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.ptpReady).toBe(false)
    expect(probe.exchangeIngestReady).toBe(false)
    expect(probe.investmentGrade).toBe(false)

    expect(QUANT_FINANCE_INVESTMENT_GRADE).toBe(false)
    const quant = probeQuantFinanceHonesty()
    expect(quant.investmentGrade).toBe(false)
    expect(quant.substrateSf3.status).toBe('PARTIAL')
    expect(quant.substrateSf3.ready).toBe(true)

    const shared = probeSharedSubstrateHonesty()
    expect(shared.sf3MonotonicTimebaseReady).toBe(true)
    expect(shared.sf3Status).toBe('PARTIAL')
    expect(shared.monotonicTimebaseReady).toBe(true)
    expect(shared.vanguardQuantFinanceReady).toBe(false)
  })
})
