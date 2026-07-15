/**
 * Block 9 — FS watch latency measurement helper (DESK-003 budget <500ms).
 * Records notify→UI samples; without samples, latency evidence stays HELD.
 */

export const FS_WATCH_LATENCY_BUDGET_MS = 500 as const

export interface FsWatchLatencySample {
  /** When the native watcher observed the event (ms epoch). */
  observedAtMs: number
  /** When the UI handler received the event (ms epoch). */
  receivedAtMs: number
  path?: string
}

export interface FsWatchLatencyReport {
  sampleCount: number
  p50Ms: number | null
  p95Ms: number | null
  maxMs: number | null
  budgetMs: typeof FS_WATCH_LATENCY_BUDGET_MS
  underBudget: boolean
  evidenceStatus: 'measured' | 'held'
  notes: string[]
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]!
}

/** Compute latency for a single sample (received − observed). */
export function measureFsWatchLatencySample(sample: FsWatchLatencySample): number {
  return Math.max(0, sample.receivedAtMs - sample.observedAtMs)
}

/**
 * Aggregate samples into a budget report.
 * Empty samples → evidenceStatus held (honest; do not invent <500ms).
 */
export function evaluateFsWatchLatency(
  samples: FsWatchLatencySample[],
): FsWatchLatencyReport {
  const latencies = samples
    .map(measureFsWatchLatencySample)
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b)

  if (latencies.length === 0) {
    return {
      sampleCount: 0,
      p50Ms: null,
      p95Ms: null,
      maxMs: null,
      budgetMs: FS_WATCH_LATENCY_BUDGET_MS,
      underBudget: false,
      evidenceStatus: 'held',
      notes: [
        'No fs_watch latency samples — <500ms budget unproven (HELD evidence)',
        'Emit path may still be live; attach samples via measureFsWatchLatencySample',
      ],
    }
  }

  const p50Ms = percentile(latencies, 50)
  const p95Ms = percentile(latencies, 95)
  const maxMs = latencies[latencies.length - 1]!
  const underBudget = (p95Ms ?? maxMs) < FS_WATCH_LATENCY_BUDGET_MS

  return {
    sampleCount: latencies.length,
    p50Ms,
    p95Ms,
    maxMs,
    budgetMs: FS_WATCH_LATENCY_BUDGET_MS,
    underBudget,
    evidenceStatus: 'measured',
    notes: [
      underBudget
        ? `p95=${p95Ms}ms under ${FS_WATCH_LATENCY_BUDGET_MS}ms budget`
        : `p95=${p95Ms}ms exceeds ${FS_WATCH_LATENCY_BUDGET_MS}ms budget`,
    ],
  }
}

/** In-memory recorder for Studio Local / bridge tests. */
export class FsWatchLatencyRecorder {
  private samples: FsWatchLatencySample[] = []

  record(sample: FsWatchLatencySample): number {
    this.samples.push(sample)
    return measureFsWatchLatencySample(sample)
  }

  /** Convenience when native event lacks observedAt — uses receive-only delta 0 (not evidence). */
  recordReceiveOnly(path?: string): number {
    const now = Date.now()
    return this.record({ observedAtMs: now, receivedAtMs: now, path })
  }

  report(): FsWatchLatencyReport {
    return evaluateFsWatchLatency(this.samples)
  }

  clear(): void {
    this.samples = []
  }
}
