/**
 * L.8 / L-ACC-08 — E2B remote HMR detect soak harness (fail-closed measured).
 *
 * Spec budget: sandbox provision → remote HMR surface confirmed p95 < 15s.
 * Empty samples → evidenceStatus 'held' (never invent p95).
 * Pattern mirrors `l9-scaffold-soak.ts`.
 */

import type { E2BRemoteHmrReason, PreviewHmrEngine } from '@/lib/production/e2b-remote-hmr'

export const L_ACC_08_BUDGET_MS = 15_000 as const
/** Minimum measured remote-HMR confirmations before Universal IDE may cite L-ACC-08. */
export const L_ACC_08_MIN_SAMPLES_FOR_READY = 10 as const

export type L8E2BHmrSoakSample = {
  /** Wall clock when detectE2BRemoteHmr started. */
  startedAtMs: number
  /** Wall clock when remote HMR confirmed (success path). */
  confirmedAtMs: number
  sessionId: string
  provider: 'e2b'
  /** True only when remoteHmrConfirmed from live detect path. */
  remoteHmrConfirmed: boolean
  reason: E2BRemoteHmrReason
  engine: PreviewHmrEngine
  previewUrl: string | null
  /** Optional failure detail — failures never invent under-budget p95. */
  failureReason?: string
}

export type L8E2BHmrSoakReport = {
  sampleCount: number
  successCount: number
  p50Ms: number | null
  p95Ms: number | null
  maxMs: number | null
  budgetMs: typeof L_ACC_08_BUDGET_MS
  underBudget: boolean
  evidenceStatus: 'measured' | 'held'
  notes: string[]
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]!
}

/** Duration for a single successful remote-HMR confirmation (confirmed − start). */
export function measureL8E2BHmrSoakSample(sample: L8E2BHmrSoakSample): number | null {
  if (!sample.remoteHmrConfirmed) return null
  if (!Number.isFinite(sample.startedAtMs) || !Number.isFinite(sample.confirmedAtMs)) return null
  if (sample.confirmedAtMs < sample.startedAtMs) return null
  return Math.max(0, sample.confirmedAtMs - sample.startedAtMs)
}

/**
 * Aggregate soak samples into L-ACC-08 budget report.
 * Fail-closed: zero confirmed samples → held (no fake p95).
 */
export function evaluateL8E2BHmrSoak(
  samples: readonly L8E2BHmrSoakSample[],
): L8E2BHmrSoakReport {
  const latencies = samples
    .map(measureL8E2BHmrSoakSample)
    .filter((ms): ms is number => typeof ms === 'number' && Number.isFinite(ms))
    .sort((a, b) => a - b)

  if (latencies.length === 0) {
    return {
      sampleCount: samples.length,
      successCount: 0,
      p50Ms: null,
      p95Ms: null,
      maxMs: null,
      budgetMs: L_ACC_08_BUDGET_MS,
      underBudget: false,
      evidenceStatus: 'held',
      notes: [
        'No successful L.8 E2B remote HMR confirmations — L-ACC-08 p95 unproven (HELD)',
        'Record via L8E2BHmrSoakRecorder / instrumentE2BRemoteHmrSoakSample; never invent p95',
      ],
    }
  }

  const p50Ms = percentile(latencies, 50)
  const p95Ms = percentile(latencies, 95)
  const maxMs = latencies[latencies.length - 1]!
  const underBudget = (p95Ms ?? maxMs) < L_ACC_08_BUDGET_MS

  return {
    sampleCount: samples.length,
    successCount: latencies.length,
    p50Ms,
    p95Ms,
    maxMs,
    budgetMs: L_ACC_08_BUDGET_MS,
    underBudget,
    evidenceStatus: 'measured',
    notes: [
      underBudget
        ? `p95=${p95Ms}ms under ${L_ACC_08_BUDGET_MS}ms L-ACC-08 budget (n=${latencies.length})`
        : `p95=${p95Ms}ms exceeds ${L_ACC_08_BUDGET_MS}ms L-ACC-08 budget (n=${latencies.length})`,
    ],
  }
}

export type L8E2BHmrSoakReadyProbe = {
  ready: boolean
  report: L8E2BHmrSoakReport
  minSamples: typeof L_ACC_08_MIN_SAMPLES_FOR_READY
  reason: string
}

/**
 * Marketing / Universal IDE gate — ready only with measured under-budget p95
 * and at least L_ACC_08_MIN_SAMPLES_FOR_READY remote HMR confirmations.
 */
export function proveL8E2BHmrSoakReady(
  samples: readonly L8E2BHmrSoakSample[],
): L8E2BHmrSoakReadyProbe {
  const report = evaluateL8E2BHmrSoak(samples)
  if (report.evidenceStatus !== 'measured') {
    return {
      ready: false,
      report,
      minSamples: L_ACC_08_MIN_SAMPLES_FOR_READY,
      reason: 'held_no_measured_samples',
    }
  }
  if (report.successCount < L_ACC_08_MIN_SAMPLES_FOR_READY) {
    return {
      ready: false,
      report,
      minSamples: L_ACC_08_MIN_SAMPLES_FOR_READY,
      reason: `insufficient_samples:${report.successCount}/${L_ACC_08_MIN_SAMPLES_FOR_READY}`,
    }
  }
  if (!report.underBudget) {
    return {
      ready: false,
      report,
      minSamples: L_ACC_08_MIN_SAMPLES_FOR_READY,
      reason: 'p95_over_budget',
    }
  }
  return {
    ready: true,
    report,
    minSamples: L_ACC_08_MIN_SAMPLES_FOR_READY,
    reason: 'l_acc_08_measured_under_budget',
  }
}

/** In-memory recorder for engine instrumentation + tests. */
export class L8E2BHmrSoakRecorder {
  private samples: L8E2BHmrSoakSample[] = []

  record(sample: L8E2BHmrSoakSample): number | null {
    this.samples.push(sample)
    return measureL8E2BHmrSoakSample(sample)
  }

  report(): L8E2BHmrSoakReport {
    return evaluateL8E2BHmrSoak(this.samples)
  }

  proveReady(): L8E2BHmrSoakReadyProbe {
    return proveL8E2BHmrSoakReady(this.samples)
  }

  list(): readonly L8E2BHmrSoakSample[] {
    return this.samples
  }

  clear(): void {
    this.samples = []
  }
}

const globalRecorder = new L8E2BHmrSoakRecorder()

export function getL8E2BHmrSoakRecorder(): L8E2BHmrSoakRecorder {
  return globalRecorder
}

export function instrumentE2BRemoteHmrSoakSample(sample: L8E2BHmrSoakSample): number | null {
  return globalRecorder.record(sample)
}
