/**
 * L.8 / L-ACC-08 E2B remote HMR soak harness — fail-closed measured (never invent p95).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  L_ACC_08_BUDGET_MS,
  L_ACC_08_MIN_SAMPLES_FOR_READY,
  evaluateL8E2BHmrSoak,
  getL8E2BHmrSoakRecorder,
  instrumentE2BRemoteHmrSoakSample,
  measureL8E2BHmrSoakSample,
  proveL8E2BHmrSoakReady,
  type L8E2BHmrSoakSample,
} from '@/lib/production/l8-e2b-hmr-soak'

function sample(overrides?: Partial<L8E2BHmrSoakSample>): L8E2BHmrSoakSample {
  return {
    startedAtMs: 1_000,
    confirmedAtMs: 1_000 + 5_000,
    sessionId: 'sess_test',
    provider: 'e2b',
    remoteHmrConfirmed: true,
    reason: 'ready',
    engine: 'vite',
    previewUrl: 'https://preview.e2b.test',
    ...overrides,
  }
}

describe('l8-e2b-hmr-soak L-ACC-08', () => {
  beforeEach(() => {
    getL8E2BHmrSoakRecorder().clear()
  })

  it('empty samples → evidence held (no fake p95)', () => {
    const report = evaluateL8E2BHmrSoak([])
    expect(report.evidenceStatus).toBe('held')
    expect(report.p95Ms).toBeNull()
    expect(report.underBudget).toBe(false)
    expect(proveL8E2BHmrSoakReady([]).ready).toBe(false)
    expect(proveL8E2BHmrSoakReady([]).reason).toBe('held_no_measured_samples')
  })

  it('unconfirmed remote HMR does not invent success latencies', () => {
    const report = evaluateL8E2BHmrSoak([
      sample({ remoteHmrConfirmed: false, reason: 'e2b_api_key_missing' }),
      sample({ remoteHmrConfirmed: false, reason: 'hmr_surface_unreachable' }),
    ])
    expect(report.successCount).toBe(0)
    expect(report.evidenceStatus).toBe('held')
    expect(measureL8E2BHmrSoakSample(sample({ remoteHmrConfirmed: false }))).toBeNull()
  })

  it('measures p50/p95 from confirmed samples only', () => {
    const samples = [
      sample({ confirmedAtMs: 1_000 + 3_000 }),
      sample({ confirmedAtMs: 1_000 + 6_000 }),
      sample({ confirmedAtMs: 1_000 + 9_000 }),
      sample({ confirmedAtMs: 1_000 + 12_000 }),
      sample({ remoteHmrConfirmed: false, reason: 'preview_host_unresolved' }),
    ]
    const report = evaluateL8E2BHmrSoak(samples)
    expect(report.evidenceStatus).toBe('measured')
    expect(report.successCount).toBe(4)
    expect(report.p50Ms).toBe(6_000)
    expect(report.p95Ms).toBe(12_000)
    expect(report.budgetMs).toBe(L_ACC_08_BUDGET_MS)
    expect(report.underBudget).toBe(true)
  })

  it('proveReady requires ≥10 under-budget confirmations', () => {
    const few = Array.from({ length: 5 }, (_, i) =>
      sample({ startedAtMs: i * 1000, confirmedAtMs: i * 1000 + 4_000 }),
    )
    expect(proveL8E2BHmrSoakReady(few).ready).toBe(false)
    expect(proveL8E2BHmrSoakReady(few).reason).toMatch(/insufficient_samples/)

    const enough = Array.from({ length: L_ACC_08_MIN_SAMPLES_FOR_READY }, (_, i) =>
      sample({ startedAtMs: i * 1000, confirmedAtMs: i * 1000 + 5_000 }),
    )
    expect(proveL8E2BHmrSoakReady(enough).ready).toBe(true)

    const over = Array.from({ length: L_ACC_08_MIN_SAMPLES_FOR_READY }, (_, i) =>
      sample({
        startedAtMs: i * 1000,
        confirmedAtMs: i * 1000 + L_ACC_08_BUDGET_MS + 1,
      }),
    )
    expect(proveL8E2BHmrSoakReady(over).ready).toBe(false)
    expect(proveL8E2BHmrSoakReady(over).reason).toBe('p95_over_budget')
  })

  it('global recorder instrumentation is fail-closed until confirmations exist', () => {
    expect(getL8E2BHmrSoakRecorder().report().evidenceStatus).toBe('held')
    instrumentE2BRemoteHmrSoakSample(sample({ confirmedAtMs: 1_000 + 7_000 }))
    const report = getL8E2BHmrSoakRecorder().report()
    expect(report.evidenceStatus).toBe('measured')
    expect(report.p95Ms).toBe(7_000)
    expect(getL8E2BHmrSoakRecorder().proveReady().ready).toBe(false)
  })

  it.skipIf(process.env.AETHEL_L8_E2B_SOAK !== '1')(
    'live E2B remote HMR soak (opt-in AETHEL_L8_E2B_SOAK=1)',
    async () => {
      expect(process.env.AETHEL_L8_E2B_SOAK).toBe('1')
    },
  )
})
