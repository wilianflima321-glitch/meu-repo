/**
 * I.1 — Retention scorer (organic Lane B).
 * Scores only from real Arcade catalog signals — never invents D1/completion.
 * Full Law II retention (median session, D1 return) stays HELD until F.2 aggregates ship.
 */

export const RETENTION_SCORER_VERSION = 'i1-provisional-v1' as const

/** Max plays used for normalization — avoids runaway play-count dominance. */
export const RETENTION_PLAYS_CAP = 10_000

export interface RetentionScoreInput {
  /** Verified catalog play counter (PublishedGame.plays) — not client-reported. */
  plays?: number
  /** ISO publish timestamp — used for gentle recency decay only. */
  publishedAt?: string | null
  /** Tag overlap count with viewer cohort (0 when unknown). */
  tagOverlap?: number
  /** Optional F.2 median session minutes when available. */
  medianSessionMinutes?: number | null
  /** Optional F.2 D1 return rate 0..1 when available. */
  d1ReturnRate?: number | null
  /** Optional completion rate 0..1 when available. */
  completionRate?: number | null
  /** Wall clock for deterministic tests. */
  nowMs?: number
}

export interface RetentionScoreResult {
  score: number
  provisional: boolean
  signals: {
    playsComponent: number
    recencyComponent: number
    tagComponent: number
    advancedComponent: number
  }
  notes: string[]
  heldSignals: string[]
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n <= 0) return 0
  if (n >= 1) return 1
  return n
}

function daysSince(publishedAt: string | null | undefined, nowMs: number): number | null {
  if (!publishedAt) return null
  const t = Date.parse(publishedAt)
  if (!Number.isFinite(t)) return null
  return Math.max(0, (nowMs - t) / (24 * 60 * 60 * 1000))
}

/**
 * Compute organic retention rank score in [0, 100].
 * Provisional when advanced F.2 retention signals are missing.
 */
export function scoreRetention(input: RetentionScoreInput = {}): RetentionScoreResult {
  const nowMs = input.nowMs ?? Date.now()
  const plays = Math.max(0, Math.floor(input.plays ?? 0))
  const playsComponent = clamp01(plays / RETENTION_PLAYS_CAP) * 40

  const ageDays = daysSince(input.publishedAt, nowMs)
  // Soft decay over ~90 days — older titles keep some organic weight via plays.
  const recencyComponent =
    ageDays === null ? 0 : clamp01(1 - ageDays / 90) * 25

  const tagOverlap = Math.max(0, Math.floor(input.tagOverlap ?? 0))
  const tagComponent = clamp01(tagOverlap / 5) * 10

  const heldSignals: string[] = []
  let advanced = 0
  let advancedWeight = 0

  if (
    input.medianSessionMinutes != null &&
    Number.isFinite(input.medianSessionMinutes) &&
    input.medianSessionMinutes >= 0
  ) {
    advanced += clamp01(input.medianSessionMinutes / 30) * 15
    advancedWeight += 15
  } else {
    heldSignals.push('median_session_minutes')
  }

  if (
    input.d1ReturnRate != null &&
    Number.isFinite(input.d1ReturnRate)
  ) {
    advanced += clamp01(input.d1ReturnRate) * 15
    advancedWeight += 15
  } else {
    heldSignals.push('d1_return_rate')
  }

  if (
    input.completionRate != null &&
    Number.isFinite(input.completionRate)
  ) {
    advanced += clamp01(input.completionRate) * 10
    advancedWeight += 10
  } else {
    heldSignals.push('completion_rate')
  }

  const provisional = heldSignals.length > 0
  // When advanced signals missing, redistribute their weight into plays+recency (provisional).
  const redistribution = provisional && advancedWeight > 0
    ? 0
    : provisional
      ? 25
      : 0
  const redistributedPlays = redistribution * 0.6
  const redistributedRecency = redistribution * 0.4

  const score = Math.min(
    100,
    playsComponent +
      recencyComponent +
      tagComponent +
      advanced +
      redistributedPlays +
      redistributedRecency,
  )

  const notes: string[] = [
    provisional
      ? 'Provisional score from catalog plays + publish recency — F.2 D1/completion [HELD]'
      : 'Full retention signals present',
  ]

  return {
    score: Math.round(score * 1000) / 1000,
    provisional,
    signals: {
      playsComponent: Math.round(playsComponent * 1000) / 1000,
      recencyComponent: Math.round(recencyComponent * 1000) / 1000,
      tagComponent: Math.round(tagComponent * 1000) / 1000,
      advancedComponent: Math.round(advanced * 1000) / 1000,
    },
    notes,
    heldSignals,
  }
}
