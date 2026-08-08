/**
 * L.9 / L-ACC-04 — scaffold→preview soak harness (fail-closed measured).
 *
 * Spec budget: prompt → preview URL p95 < 120s.
 * Empty samples → evidenceStatus 'held' (never invent p95).
 * Pattern mirrors `fs-watch-latency.ts`.
 */

export const L_ACC_04_BUDGET_MS = 120_000 as const
/** Minimum measured successes before Universal IDE marketing may cite L-ACC-04. */
export const L_ACC_04_MIN_SAMPLES_FOR_READY = 20 as const

export type L9ScaffoldSoakSample = {
  /** Wall clock when scaffoldAndPreviewProject started. */
  startedAtMs: number
  /** Wall clock when preview URL became available (success path). */
  previewUrlAtMs: number
  templateId: string
  provider: 'e2b' | 'local-isolated' | 'firecracker' | 'unknown'
  ok: boolean
  /** Optional failure code — failures never invent under-budget p95. */
  failureReason?: string
}

export type L9ScaffoldSoakReport = {
  sampleCount: number
  successCount: number
  p50Ms: number | null
  p95Ms: number | null
  maxMs: number | null
  budgetMs: typeof L_ACC_04_BUDGET_MS
  underBudget: boolean
  evidenceStatus: 'measured' | 'held'
  notes: string[]
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]!
}

/** Duration for a single successful sample (preview ready − start). */
export function measureL9ScaffoldSoakSample(sample: L9ScaffoldSoakSample): number | null {
  if (!sample.ok) return null
  if (!Number.isFinite(sample.startedAtMs) || !Number.isFinite(sample.previewUrlAtMs)) return null
  if (sample.previewUrlAtMs < sample.startedAtMs) return null
  return Math.max(0, sample.previewUrlAtMs - sample.startedAtMs)
}

/**
 * Aggregate soak samples into L-ACC-04 budget report.
 * Fail-closed: zero success samples → held (no fake p95).
 */
export function evaluateL9ScaffoldSoak(samples: readonly L9ScaffoldSoakSample[]): L9ScaffoldSoakReport {
  const latencies = samples
    .map(measureL9ScaffoldSoakSample)
    .filter((ms): ms is number => typeof ms === 'number' && Number.isFinite(ms))
    .sort((a, b) => a - b)

  if (latencies.length === 0) {
    return {
      sampleCount: samples.length,
      successCount: 0,
      p50Ms: null,
      p95Ms: null,
      maxMs: null,
      budgetMs: L_ACC_04_BUDGET_MS,
      underBudget: false,
      evidenceStatus: 'held',
      notes: [
        'No successful L.9 scaffold→preview samples — L-ACC-04 p95 unproven (HELD)',
        'Record via L9ScaffoldSoakRecorder / instrumentScaffoldSoakSample; never invent p95',
      ],
    }
  }

  const p50Ms = percentile(latencies, 50)
  const p95Ms = percentile(latencies, 95)
  const maxMs = latencies[latencies.length - 1]!
  const underBudget = (p95Ms ?? maxMs) < L_ACC_04_BUDGET_MS

  return {
    sampleCount: samples.length,
    successCount: latencies.length,
    p50Ms,
    p95Ms,
    maxMs,
    budgetMs: L_ACC_04_BUDGET_MS,
    underBudget,
    evidenceStatus: 'measured',
    notes: [
      underBudget
        ? `p95=${p95Ms}ms under ${L_ACC_04_BUDGET_MS}ms L-ACC-04 budget (n=${latencies.length})`
        : `p95=${p95Ms}ms exceeds ${L_ACC_04_BUDGET_MS}ms L-ACC-04 budget (n=${latencies.length})`,
    ],
  }
}

export type L9ScaffoldSoakReadyProbe = {
  ready: boolean
  report: L9ScaffoldSoakReport
  minSamples: typeof L_ACC_04_MIN_SAMPLES_FOR_READY
  reason: string
}

/**
 * Marketing / Universal IDE gate — ready only with measured under-budget p95
 * and at least L_ACC_04_MIN_SAMPLES_FOR_READY successes.
 */
export function proveL9ScaffoldSoakReady(
  samples: readonly L9ScaffoldSoakSample[],
): L9ScaffoldSoakReadyProbe {
  const report = evaluateL9ScaffoldSoak(samples)
  if (report.evidenceStatus !== 'measured') {
    return {
      ready: false,
      report,
      minSamples: L_ACC_04_MIN_SAMPLES_FOR_READY,
      reason: 'held_no_measured_samples',
    }
  }
  if (report.successCount < L_ACC_04_MIN_SAMPLES_FOR_READY) {
    return {
      ready: false,
      report,
      minSamples: L_ACC_04_MIN_SAMPLES_FOR_READY,
      reason: `insufficient_samples:${report.successCount}/${L_ACC_04_MIN_SAMPLES_FOR_READY}`,
    }
  }
  if (!report.underBudget) {
    return {
      ready: false,
      report,
      minSamples: L_ACC_04_MIN_SAMPLES_FOR_READY,
      reason: 'p95_over_budget',
    }
  }
  return {
    ready: true,
    report,
    minSamples: L_ACC_04_MIN_SAMPLES_FOR_READY,
    reason: 'l_acc_04_measured_under_budget',
  }
}

/** In-memory recorder for engine instrumentation + tests. */
export class L9ScaffoldSoakRecorder {
  private samples: L9ScaffoldSoakSample[] = []

  record(sample: L9ScaffoldSoakSample): number | null {
    this.samples.push(sample)
    return measureL9ScaffoldSoakSample(sample)
  }

  report(): L9ScaffoldSoakReport {
    return evaluateL9ScaffoldSoak(this.samples)
  }

  proveReady(): L9ScaffoldSoakReadyProbe {
    return proveL9ScaffoldSoakReady(this.samples)
  }

  list(): readonly L9ScaffoldSoakSample[] {
    return this.samples
  }

  clear(): void {
    this.samples = []
  }
}

/** Process-wide recorder used by fullstack-scaffold-engine (tests may clear). */
const globalRecorder = new L9ScaffoldSoakRecorder()

export function getL9ScaffoldSoakRecorder(): L9ScaffoldSoakRecorder {
  return globalRecorder
}

export function instrumentScaffoldSoakSample(sample: L9ScaffoldSoakSample): number | null {
  return globalRecorder.record(sample)
}
