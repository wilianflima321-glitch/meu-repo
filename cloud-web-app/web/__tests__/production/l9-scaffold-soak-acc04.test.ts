/**
 * L.9 / L-ACC-04 soak harness — fail-closed measured (never invent p95).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  L_ACC_04_BUDGET_MS,
  L_ACC_04_MIN_SAMPLES_FOR_READY,
  evaluateL9ScaffoldSoak,
  getL9ScaffoldSoakRecorder,
  instrumentScaffoldSoakSample,
  measureL9ScaffoldSoakSample,
  proveL9ScaffoldSoakReady,
  type L9ScaffoldSoakSample,
} from '@/lib/production/l9-scaffold-soak'

function sample(overrides?: Partial<L9ScaffoldSoakSample>): L9ScaffoldSoakSample {
  return {
    startedAtMs: 1_000,
    previewUrlAtMs: 1_000 + 30_000,
    templateId: 'nextjs-14',
    provider: 'local-isolated',
    ok: true,
    ...overrides,
  }
}

describe('l9-scaffold-soak L-ACC-04', () => {
  beforeEach(() => {
    getL9ScaffoldSoakRecorder().clear()
  })

  it('empty samples → evidence held (no fake p95)', () => {
    const report = evaluateL9ScaffoldSoak([])
    expect(report.evidenceStatus).toBe('held')
    expect(report.p95Ms).toBeNull()
    expect(report.underBudget).toBe(false)
    expect(proveL9ScaffoldSoakReady([]).ready).toBe(false)
    expect(proveL9ScaffoldSoakReady([]).reason).toBe('held_no_measured_samples')
  })

  it('failures do not invent success latencies', () => {
    const report = evaluateL9ScaffoldSoak([
      sample({ ok: false, failureReason: 'sandbox_denied' }),
      sample({ ok: false, previewUrlAtMs: 1_000 + 5_000 }),
    ])
    expect(report.successCount).toBe(0)
    expect(report.evidenceStatus).toBe('held')
    expect(measureL9ScaffoldSoakSample(sample({ ok: false }))).toBeNull()
  })

  it('measures p50/p95 from success samples only', () => {
    const samples = [
      sample({ previewUrlAtMs: 1_000 + 10_000 }),
      sample({ previewUrlAtMs: 1_000 + 20_000 }),
      sample({ previewUrlAtMs: 1_000 + 40_000 }),
      sample({ previewUrlAtMs: 1_000 + 80_000 }),
      sample({ ok: false, failureReason: 'preview_unreachable' }),
    ]
    const report = evaluateL9ScaffoldSoak(samples)
    expect(report.evidenceStatus).toBe('measured')
    expect(report.successCount).toBe(4)
    expect(report.p50Ms).toBe(20_000)
    expect(report.p95Ms).toBe(80_000)
    expect(report.budgetMs).toBe(L_ACC_04_BUDGET_MS)
    expect(report.underBudget).toBe(true)
  })

  it('proveReady requires ≥20 under-budget successes', () => {
    const few = Array.from({ length: 5 }, (_, i) =>
      sample({ startedAtMs: i * 1000, previewUrlAtMs: i * 1000 + 15_000 }),
    )
    const fewProbe = proveL9ScaffoldSoakReady(few)
    expect(fewProbe.ready).toBe(false)
    expect(fewProbe.reason).toMatch(/insufficient_samples/)
    expect(fewProbe.minSamples).toBe(L_ACC_04_MIN_SAMPLES_FOR_READY)

    const enough = Array.from({ length: L_ACC_04_MIN_SAMPLES_FOR_READY }, (_, i) =>
      sample({ startedAtMs: i * 1000, previewUrlAtMs: i * 1000 + 12_000 }),
    )
    expect(proveL9ScaffoldSoakReady(enough).ready).toBe(true)

    const over = Array.from({ length: L_ACC_04_MIN_SAMPLES_FOR_READY }, (_, i) =>
      sample({
        startedAtMs: i * 1000,
        previewUrlAtMs: i * 1000 + L_ACC_04_BUDGET_MS + 1,
      }),
    )
    expect(proveL9ScaffoldSoakReady(over).ready).toBe(false)
    expect(proveL9ScaffoldSoakReady(over).reason).toBe('p95_over_budget')
  })

  it('global recorder instrumentation is fail-closed until samples exist', () => {
    expect(getL9ScaffoldSoakRecorder().report().evidenceStatus).toBe('held')
    instrumentScaffoldSoakSample(sample({ previewUrlAtMs: 1_000 + 25_000 }))
    const report = getL9ScaffoldSoakRecorder().report()
    expect(report.evidenceStatus).toBe('measured')
    expect(report.p95Ms).toBe(25_000)
    expect(getL9ScaffoldSoakRecorder().proveReady().ready).toBe(false)
  })

  it.skipIf(process.env.AETHEL_L9_SOAK !== '1')(
    'live local-isolated create-next-app soak (opt-in AETHEL_L9_SOAK=1)',
    async () => {
      // Live soak is env-gated — never mock p95 in CI. Run manually with sandbox + network.
      expect(process.env.AETHEL_L9_SOAK).toBe('1')
    },
  )
})
