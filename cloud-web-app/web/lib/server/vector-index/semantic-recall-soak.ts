/**
 * J.4 — BYOK / vector semantic recall certification soak (fail-closed measured).
 *
 * Measures recall@1 on fixture queries after index build.
 * Empty or zero-hit samples → evidenceStatus 'held' (never invent recall).
 */

import type { VectorEmbedProviderKind } from './types'

/** Minimum recall@1 rate before marketing may cite J.4 semantic certification. */
export const J4_SEMANTIC_RECALL_MIN_RATE = 0.8 as const
/** Minimum measured query samples before certification may flip ready. */
export const J4_SEMANTIC_RECALL_MIN_SAMPLES = 5 as const

export type SemanticRecallSample = {
  query: string
  /** Expected substring in top-1 hit filePath (e.g. 'physics.ts'). */
  expectedFilePathIncludes: string
  topHitFilePath: string | null
  embedProvider: VectorEmbedProviderKind
  /** True when top hit matches expected path substring. */
  recallHit: boolean
}

export type SemanticRecallSoakReport = {
  sampleCount: number
  hitCount: number
  recallAt1: number | null
  minRecallRate: typeof J4_SEMANTIC_RECALL_MIN_RATE
  evidenceStatus: 'measured' | 'held'
  notes: string[]
}

/**
 * Score a single recall sample — top hit must include expected path fragment.
 */
export function scoreSemanticRecallSample(
  query: string,
  expectedFilePathIncludes: string,
  topHitFilePath: string | null,
  embedProvider: VectorEmbedProviderKind,
): SemanticRecallSample {
  const recallHit =
    typeof topHitFilePath === 'string' &&
    topHitFilePath.includes(expectedFilePathIncludes.trim())
  return {
    query,
    expectedFilePathIncludes,
    topHitFilePath,
    embedProvider,
    recallHit,
  }
}

/**
 * Aggregate recall samples. Fail-closed: zero samples → held (no fake recall rate).
 */
export function evaluateSemanticRecallSoak(
  samples: readonly SemanticRecallSample[],
): SemanticRecallSoakReport {
  if (samples.length === 0) {
    return {
      sampleCount: 0,
      hitCount: 0,
      recallAt1: null,
      minRecallRate: J4_SEMANTIC_RECALL_MIN_RATE,
      evidenceStatus: 'held',
      notes: [
        'No J.4 semantic recall samples — recall@1 unproven (HELD)',
        'Record via SemanticRecallSoakRecorder after reindex+search; never invent recall',
      ],
    }
  }

  const hitCount = samples.filter((s) => s.recallHit).length
  const recallAt1 = hitCount / samples.length

  return {
    sampleCount: samples.length,
    hitCount,
    recallAt1,
    minRecallRate: J4_SEMANTIC_RECALL_MIN_RATE,
    evidenceStatus: 'measured',
    notes: [
      `recall@1=${(recallAt1 * 100).toFixed(1)}% (n=${samples.length}, hits=${hitCount})`,
    ],
  }
}

export type SemanticRecallReadyProbe = {
  ready: boolean
  report: SemanticRecallSoakReport
  minSamples: typeof J4_SEMANTIC_RECALL_MIN_SAMPLES
  reason: string
}

/**
 * J.4 semantic certification gate — ready only with measured recall@1 ≥ threshold
 * and at least J4_SEMANTIC_RECALL_MIN_SAMPLES queries.
 */
export function proveSemanticRecallReady(
  samples: readonly SemanticRecallSample[],
): SemanticRecallReadyProbe {
  const report = evaluateSemanticRecallSoak(samples)
  if (report.evidenceStatus !== 'measured') {
    return {
      ready: false,
      report,
      minSamples: J4_SEMANTIC_RECALL_MIN_SAMPLES,
      reason: 'held_no_measured_samples',
    }
  }
  if (report.sampleCount < J4_SEMANTIC_RECALL_MIN_SAMPLES) {
    return {
      ready: false,
      report,
      minSamples: J4_SEMANTIC_RECALL_MIN_SAMPLES,
      reason: `insufficient_samples:${report.sampleCount}/${J4_SEMANTIC_RECALL_MIN_SAMPLES}`,
    }
  }
  if (report.recallAt1 === null || report.recallAt1 < J4_SEMANTIC_RECALL_MIN_RATE) {
    return {
      ready: false,
      report,
      minSamples: J4_SEMANTIC_RECALL_MIN_SAMPLES,
      reason: 'recall_below_threshold',
    }
  }
  return {
    ready: true,
    report,
    minSamples: J4_SEMANTIC_RECALL_MIN_SAMPLES,
    reason: 'j4_semantic_recall_certified',
  }
}

/** In-memory recorder for certification runs + tests. */
export class SemanticRecallSoakRecorder {
  private samples: SemanticRecallSample[] = []

  record(sample: SemanticRecallSample): void {
    this.samples.push(sample)
  }

  recordFromSearch(input: {
    query: string
    expectedFilePathIncludes: string
    topHitFilePath: string | null
    embedProvider: VectorEmbedProviderKind
  }): SemanticRecallSample {
    const sample = scoreSemanticRecallSample(
      input.query,
      input.expectedFilePathIncludes,
      input.topHitFilePath,
      input.embedProvider,
    )
    this.record(sample)
    return sample
  }

  report(): SemanticRecallSoakReport {
    return evaluateSemanticRecallSoak(this.samples)
  }

  proveReady(): SemanticRecallReadyProbe {
    return proveSemanticRecallReady(this.samples)
  }

  list(): readonly SemanticRecallSample[] {
    return this.samples
  }

  clear(): void {
    this.samples = []
  }
}

const globalRecorder = new SemanticRecallSoakRecorder()

export function getSemanticRecallSoakRecorder(): SemanticRecallSoakRecorder {
  return globalRecorder
}
