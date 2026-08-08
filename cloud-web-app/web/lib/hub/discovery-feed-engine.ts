/**
 * I.1 — Discovery Feed engine CORE (Law XIV.1).
 * Deterministic eligibility: 30-day launch window + Compression Mandate + 2k impression budget.
 * AI moderation gate enforces approved status when discovery-moderation path is ready.
 * Impression ledger is real served counts (disk) — never invents inflated CAC.
 * Lane C (Coins promoted) stays HELD.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  RETENTION_SCORER_VERSION,
  scoreRetention,
  type RetentionScoreResult,
} from '@/lib/hub/retention-scorer'
import {
  evaluateLaunchImpressionBudgetGate,
  IMPRESSION_LEDGER_BUDGET,
  type ImpressionBudgetSnapshot,
} from '@/lib/hub/impression-ledger-authority'

const log = createComponentLogger('discovery-feed-engine')

/** Discovery 2k launch window — cursorrules / Law XIV.1 */
export const DISCOVERY_LAUNCH_WINDOW_DAYS = 30

/** Law XII Compression Mandate — Hub demo / web bundle budget (XIV.3 / I-ACC-03). */
export const DISCOVERY_MAX_DEMO_BUNDLE_BYTES = 150 * 1024 * 1024

/** Policy budget for Lane A — enforced by impression-ledger-authority when ready. */
export const DISCOVERY_LAUNCH_IMPRESSION_BUDGET = IMPRESSION_LEDGER_BUDGET

export type DiscoveryLane = 'launch' | 'retention' | 'promoted'

export type DiscoveryCapabilityStatus =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'NOT_IMPLEMENTED'
  | 'HELD'

export interface DiscoveryCandidate {
  gameId: string
  title: string
  tags?: string[]
  publishedAt?: string | null
  plays?: number
  /** Public + playable listing — fail-closed otherwise. */
  status?: string
  visibility?: string
  playUrl?: string | null
  /**
   * Compression Mandate evidence (cook Draco/KTX2/LOD or demo ≤150MB receipt).
   * Missing / false → ineligible for discovery ranking.
   */
  compressionMandatePassed?: boolean
  /** Optional measured demo/web bundle bytes. */
  demoBundleBytes?: number | null
  /** When Hub AI moderation path is live. */
  aiModerationStatus?: 'approved' | 'pending' | 'rejected' | 'flagged' | 'manual_review' | null
  /** Viewer cohort tag overlap for niche launch targeting. */
  tagOverlap?: number
  medianSessionMinutes?: number | null
  d1ReturnRate?: number | null
  completionRate?: number | null
  /** Optional preloaded ledger snapshot (API path). */
  impressionBudget?: ImpressionBudgetSnapshot | null
}

export interface DiscoveryEligibilityResult {
  eligible: boolean
  lanes: DiscoveryLane[]
  reasons: string[]
  codes: string[]
  inLaunchWindow: boolean
  compressionPassed: boolean
  aiModerationPassed: boolean | null
  launchBudgetRemaining: number | null
}

export interface DiscoveryFeedItem {
  gameId: string
  title: string
  tags: string[]
  publishedAt: string | null
  plays: number
  lane: DiscoveryLane
  rankScore: number
  retention: RetentionScoreResult
  /** Remaining Lane A budget when ledger live; policy constant when HELD. */
  launchImpressionBudget: number | null
  /** Real served unique impressions when ledger live; null when HELD. */
  impressionsLogged: number | null
  impressionLedger: 'HELD' | 'IMPLEMENTED'
  badges: string[]
}

export interface DiscoveryFeedResult {
  generatedAt: string
  mock: false
  engine: 'i1-discovery-feed'
  scorerVersion: typeof RETENTION_SCORER_VERSION
  items: DiscoveryFeedItem[]
  empty: boolean
  emptyCopy: string
  lanes: {
    launch: number
    retention: number
    promoted: number
  }
  gates: {
    launchWindowDays: number
    maxDemoBundleBytes: number
    launchImpressionBudget: number
    aiModerationClaim: 'HELD' | 'IMPLEMENTED'
    impressionLedger: 'HELD' | 'IMPLEMENTED'
    promotedLane: 'HELD'
  }
  notes: string[]
}

export interface DiscoveryFeedEngineProbe {
  /**
   * True only when the deterministic Compression Mandate gate smoke-verifies
   * fail-closed (see `smokeCompressionMandateGate`). Never a bare literal —
   * a regression in the gate correctly flips discovery HELD.
   */
  ready: boolean
  aiModerationReady: boolean
  impressionLedgerReady: boolean
  promotedLaneReady: boolean
  /** Same smoke-verified value as `ready` — kept as a distinct field for readability at call sites. */
  compressionGateReady: boolean
  launchWindowDays: number
  claim: string
  productCopy: string
}

export interface BuildDiscoveryFeedOptions {
  nowMs?: number
  /** When false (default), AI mod is claim-HELD; candidates not excluded solely for missing AI. */
  aiModerationReady?: boolean
  /**
   * When true (default once ledger ships), ranking respects remaining 2k budget.
   * Pass false only for held-legacy tests.
   */
  impressionLedgerReady?: boolean
  /** Preloaded budgets keyed by gameId. */
  impressionBudgets?: Map<string, ImpressionBudgetSnapshot> | Record<string, ImpressionBudgetSnapshot>
  /** Cohort tags for launch niche overlap (optional). */
  cohortTags?: string[]
  limit?: number
  /** When true, only titles with remaining Lane A budget (empty-honest if none). */
  launchBudgetOnly?: boolean
}

function daysSince(publishedAt: string | null | undefined, nowMs: number): number | null {
  if (!publishedAt) return null
  const t = Date.parse(publishedAt)
  if (!Number.isFinite(t)) return null
  return Math.max(0, (nowMs - t) / (24 * 60 * 60 * 1000))
}

function budgetMapFromOptions(
  budgets: BuildDiscoveryFeedOptions['impressionBudgets'],
): Map<string, ImpressionBudgetSnapshot> {
  if (!budgets) return new Map()
  if (budgets instanceof Map) return budgets
  return new Map(Object.entries(budgets))
}

/**
 * Compression Mandate gate — fail-closed without cook/demo evidence.
 */
export function evaluateCompressionMandateGate(input: {
  compressionMandatePassed?: boolean
  demoBundleBytes?: number | null
} = {}): { passed: boolean; code?: string; reason: string } {
  if (input.compressionMandatePassed !== true) {
    return {
      passed: false,
      code: 'COMPRESSION_MANDATE',
      reason: 'Compression Mandate evidence missing — discovery ineligible',
    }
  }
  if (
    input.demoBundleBytes != null &&
    Number.isFinite(input.demoBundleBytes) &&
    input.demoBundleBytes > DISCOVERY_MAX_DEMO_BUNDLE_BYTES
  ) {
    return {
      passed: false,
      code: 'DEMO_BUNDLE_OVERSIZE',
      reason: `Demo bundle ${input.demoBundleBytes}B exceeds ${DISCOVERY_MAX_DEMO_BUNDLE_BYTES}B Compression Mandate`,
    }
  }
  return { passed: true, reason: 'compression_mandate_passed' }
}

/**
 * 30-day post-launch window for Lane A launch guarantee eligibility.
 */
export function evaluateLaunchWindowGate(input: {
  publishedAt?: string | null
  nowMs?: number
  windowDays?: number
} = {}): { inWindow: boolean; ageDays: number | null; code?: string; reason: string } {
  const windowDays = input.windowDays ?? DISCOVERY_LAUNCH_WINDOW_DAYS
  const nowMs = input.nowMs ?? Date.now()
  const ageDays = daysSince(input.publishedAt, nowMs)
  if (ageDays === null) {
    return {
      inWindow: false,
      ageDays: null,
      code: 'PUBLISH_DATE_MISSING',
      reason: 'publishedAt required for launch-window eligibility',
    }
  }
  if (ageDays > windowDays) {
    return {
      inWindow: false,
      ageDays,
      code: 'LAUNCH_WINDOW_EXPIRED',
      reason: `Outside ${windowDays}-day post-launch window (age ${ageDays.toFixed(1)}d)`,
    }
  }
  return {
    inWindow: true,
    ageDays,
    reason: 'within_launch_window',
  }
}

/**
 * AI moderation gate.
 * When moderator path missing → claimHeld; does not block deterministic eligibility.
 * When ready → require approved status.
 */
export function evaluateDiscoveryAiModerationGate(input: {
  aiModerationReady?: boolean
  aiModerationStatus?: DiscoveryCandidate['aiModerationStatus']
} = {}): {
  passed: boolean | null
  claimHeld: boolean
  code?: string
  reason: string
} {
  if (input.aiModerationReady !== true) {
    return {
      passed: null,
      claimHeld: true,
      code: 'AI_MODERATION_HELD',
      reason:
        'Hub AI moderation path [HELD] — feed uses compression + launch window only; no AI-mod marketing',
    }
  }
  if (input.aiModerationStatus === 'approved') {
    return {
      passed: true,
      claimHeld: false,
      reason: 'ai_moderation_approved',
    }
  }
  return {
    passed: false,
    claimHeld: false,
    code: 'AI_MODERATION_BLOCK',
    reason: `AI moderation status=${input.aiModerationStatus ?? 'missing'} — not approved`,
  }
}

/**
 * Real smoke check for the Compression Mandate gate — not a hardcoded literal.
 * Verifies the deterministic fail-closed contract still holds at runtime:
 * missing/false evidence must reject, oversize bundles must reject, valid
 * evidence must pass. `compressionGateReady` on the probe is derived from
 * this so a code regression correctly flips discovery HELD instead of
 * silently keeping a stale "true".
 */
export function smokeCompressionMandateGate(): boolean {
  const missing = evaluateCompressionMandateGate({})
  const explicitFalse = evaluateCompressionMandateGate({ compressionMandatePassed: false })
  const oversize = evaluateCompressionMandateGate({
    compressionMandatePassed: true,
    demoBundleBytes: DISCOVERY_MAX_DEMO_BUNDLE_BYTES + 1,
  })
  const clean = evaluateCompressionMandateGate({
    compressionMandatePassed: true,
    demoBundleBytes: 12 * 1024 * 1024,
  })
  return (
    missing.passed === false &&
    explicitFalse.passed === false &&
    oversize.passed === false &&
    clean.passed === true
  )
}

/**
 * Real smoke check for the 30-day launch window gate — not a hardcoded literal.
 * Binding: Discovery 2k requires DISCOVERY_LAUNCH_WINDOW_DAYS === 30 plus
 * fail-closed reject for missing/expired publish dates.
 */
export function smokeLaunchWindowGate(): boolean {
  if (DISCOVERY_LAUNCH_WINDOW_DAYS !== 30) return false
  const nowMs = Date.parse('2026-07-13T12:00:00.000Z')
  const inWindow = evaluateLaunchWindowGate({
    publishedAt: '2026-07-01T12:00:00.000Z',
    nowMs,
  })
  const expired = evaluateLaunchWindowGate({
    publishedAt: '2026-05-01T12:00:00.000Z',
    nowMs,
  })
  const missing = evaluateLaunchWindowGate({ publishedAt: null, nowMs })
  return (
    inWindow.inWindow === true &&
    expired.inWindow === false &&
    missing.inWindow === false
  )
}

/**
 * Arcade / Hub UI unlock — fail-closed.
 * Never OR-bypass marketing honesty with a raw engine-ready flag.
 */
export function isDiscoveryFeedUiUnlocked(input: {
  marketingDiscoveryAllowed?: boolean
}): boolean {
  return input.marketingDiscoveryAllowed === true
}

function isListable(candidate: DiscoveryCandidate): boolean {
  const visibility = (candidate.visibility ?? 'public').toLowerCase()
  if (visibility !== 'public') return false
  const status = (candidate.status ?? '').toLowerCase()
  if (status && !['playable', 'pending', 'building'].includes(status)) return false
  return Boolean(candidate.gameId?.trim() && candidate.title?.trim())
}

/**
 * Evaluate which discovery lanes a candidate may enter.
 */
export function evaluateDiscoveryEligibility(
  candidate: DiscoveryCandidate,
  options: {
    nowMs?: number
    aiModerationReady?: boolean
    impressionLedgerReady?: boolean
    impressionBudget?: ImpressionBudgetSnapshot | null
  } = {},
): DiscoveryEligibilityResult {
  const reasons: string[] = []
  const codes: string[] = []
  const lanes: DiscoveryLane[] = []
  const impressionLedgerReady = options.impressionLedgerReady === true

  if (!isListable(candidate)) {
    return {
      eligible: false,
      lanes: [],
      reasons: ['Not a public Hub listing'],
      codes: ['NOT_LISTABLE'],
      inLaunchWindow: false,
      compressionPassed: false,
      aiModerationPassed: null,
      launchBudgetRemaining: null,
    }
  }

  const compression = evaluateCompressionMandateGate({
    compressionMandatePassed: candidate.compressionMandatePassed,
    demoBundleBytes: candidate.demoBundleBytes,
  })
  if (!compression.passed) {
    codes.push(compression.code ?? 'COMPRESSION_MANDATE')
    reasons.push(compression.reason)
    return {
      eligible: false,
      lanes: [],
      reasons,
      codes,
      inLaunchWindow: false,
      compressionPassed: false,
      aiModerationPassed: null,
      launchBudgetRemaining: null,
    }
  }

  const ai = evaluateDiscoveryAiModerationGate({
    aiModerationReady: options.aiModerationReady,
    aiModerationStatus: candidate.aiModerationStatus,
  })
  if (ai.passed === false) {
    codes.push(ai.code ?? 'AI_MODERATION_BLOCK')
    reasons.push(ai.reason)
    return {
      eligible: false,
      lanes: [],
      reasons,
      codes,
      inLaunchWindow: false,
      compressionPassed: true,
      aiModerationPassed: false,
      launchBudgetRemaining: null,
    }
  }

  const budget =
    options.impressionBudget ??
    candidate.impressionBudget ??
    null
  const remaining = impressionLedgerReady
    ? (budget?.remaining ?? DISCOVERY_LAUNCH_IMPRESSION_BUDGET)
    : null

  const launch = evaluateLaunchWindowGate({
    publishedAt: candidate.publishedAt,
    nowMs: options.nowMs,
  })
  if (launch.inWindow) {
    if (impressionLedgerReady) {
      const budgetGate = evaluateLaunchImpressionBudgetGate({
        impressionLedgerReady: true,
        remaining,
      })
      if (budgetGate.allowed) {
        lanes.push('launch')
        reasons.push(launch.reason)
        reasons.push(`launch_budget_remaining=${remaining}`)
      } else {
        codes.push(budgetGate.code ?? 'BUDGET_EXHAUSTED')
        reasons.push(budgetGate.reason)
      }
    } else {
      lanes.push('launch')
      reasons.push(launch.reason)
    }
  } else if (launch.code) {
    reasons.push(launch.reason)
  }

  // Lane B: any compression-passed title may enter retention ranking
  // (including launch-window titles whose 2k budget is exhausted — graceful decay).
  lanes.push('retention')

  // Lane C promoted — Coins checkout not audited; never auto-promote.
  return {
    eligible: lanes.length > 0,
    lanes,
    reasons,
    codes,
    inLaunchWindow: launch.inWindow,
    compressionPassed: true,
    aiModerationPassed: ai.passed,
    launchBudgetRemaining: remaining,
  }
}

function computeTagOverlap(candidateTags: string[], cohortTags: string[]): number {
  if (cohortTags.length === 0) return 0
  const set = new Set(candidateTags.map((t) => t.toLowerCase()))
  return cohortTags.filter((t) => set.has(t.toLowerCase())).length
}

/**
 * Build ranked discovery feed from real catalog candidates.
 * Empty array → empty-honest result (never invent rows or fake impression counts).
 */
export function buildDiscoveryFeed(
  candidates: DiscoveryCandidate[],
  options: BuildDiscoveryFeedOptions = {},
): DiscoveryFeedResult {
  const nowMs = options.nowMs ?? Date.now()
  const aiModerationReady = options.aiModerationReady === true
  const impressionLedgerReady = options.impressionLedgerReady !== false
  const limit = Math.min(Math.max(options.limit ?? 48, 1), 96)
  const cohortTags = options.cohortTags ?? []
  const budgets = budgetMapFromOptions(options.impressionBudgets)
  const launchBudgetOnly = options.launchBudgetOnly === true

  const scored: DiscoveryFeedItem[] = []

  for (const candidate of candidates) {
    const impressionBudget =
      budgets.get(candidate.gameId) ?? candidate.impressionBudget ?? null
    const eligibility = evaluateDiscoveryEligibility(candidate, {
      nowMs,
      aiModerationReady,
      impressionLedgerReady,
      impressionBudget,
    })
    if (!eligibility.eligible) continue
    if (launchBudgetOnly && !eligibility.lanes.includes('launch')) continue

    const tags = Array.isArray(candidate.tags) ? candidate.tags : []
    const tagOverlap =
      candidate.tagOverlap ?? computeTagOverlap(tags, cohortTags)
    const retention = scoreRetention({
      plays: candidate.plays,
      publishedAt: candidate.publishedAt,
      tagOverlap,
      medianSessionMinutes: candidate.medianSessionMinutes,
      d1ReturnRate: candidate.d1ReturnRate,
      completionRate: candidate.completionRate,
      nowMs,
    })

    const prefersLaunch = eligibility.lanes.includes('launch')
    const lane: DiscoveryLane = prefersLaunch ? 'launch' : 'retention'
    // Launch window boost — only when budget remains (honest CAC).
    const launchBoost = prefersLaunch ? 35 : 0
    const rankScore = Math.min(100, retention.score + launchBoost)

    const badges: string[] = []
    if (prefersLaunch) badges.push('Launch window')
    if (
      impressionLedgerReady &&
      eligibility.inLaunchWindow &&
      !prefersLaunch &&
      eligibility.codes.includes('BUDGET_EXHAUSTED')
    ) {
      badges.push('Launch budget exhausted')
    }
    if (eligibility.compressionPassed) badges.push('Compression Mandate')
    if (aiModerationReady && eligibility.aiModerationPassed === true) {
      badges.push('AI moderated')
    } else {
      badges.push('AI moderation [HELD]')
    }
    if (retention.provisional) badges.push('Provisional retention')
    if (impressionLedgerReady) {
      badges.push('2k impression ledger')
    } else {
      badges.push('Impression ledger [HELD]')
    }

    const impressionsLogged = impressionLedgerReady
      ? (impressionBudget?.impressionsLogged ?? 0)
      : null
    const remaining = impressionLedgerReady
      ? (impressionBudget?.remaining ?? DISCOVERY_LAUNCH_IMPRESSION_BUDGET)
      : prefersLaunch
        ? DISCOVERY_LAUNCH_IMPRESSION_BUDGET
        : null

    scored.push({
      gameId: candidate.gameId,
      title: candidate.title,
      tags,
      publishedAt: candidate.publishedAt ?? null,
      plays: Math.max(0, Math.floor(candidate.plays ?? 0)),
      lane,
      rankScore: Math.round(rankScore * 1000) / 1000,
      retention,
      launchImpressionBudget: prefersLaunch || (impressionLedgerReady && eligibility.inLaunchWindow)
        ? remaining
        : prefersLaunch
          ? DISCOVERY_LAUNCH_IMPRESSION_BUDGET
          : null,
      impressionsLogged,
      impressionLedger: impressionLedgerReady ? 'IMPLEMENTED' : 'HELD',
      badges,
    })
  }

  scored.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0
    if (tb !== ta) return tb - ta
    return a.gameId.localeCompare(b.gameId)
  })

  const items = scored.slice(0, limit)
  const lanes = {
    launch: items.filter((i) => i.lane === 'launch').length,
    retention: items.filter((i) => i.lane === 'retention').length,
    promoted: 0,
  }

  const empty = items.length === 0
  const emptyCopy = empty
    ? launchBudgetOnly
      ? 'No titles have remaining launch impression budget (2k / 30d). Empty is honest — no fake Lane A rows.'
      : aiModerationReady
        ? impressionLedgerReady
          ? 'No titles pass discovery gates yet (AI moderation + 30-day launch window + Compression Mandate + impression budget). Empty is honest — no fake ranked rows.'
          : 'No titles pass discovery gates yet (AI moderation + 30-day launch window + Compression Mandate). Empty is honest — no fake ranked rows.'
        : impressionLedgerReady
          ? 'No titles pass discovery gates yet (30-day launch window + Compression Mandate + impression budget). Empty is honest — no fake ranked rows.'
          : 'No titles pass discovery gates yet (30-day launch window + Compression Mandate). Empty is honest — no fake ranked rows.'
    : ''

  const result: DiscoveryFeedResult = {
    generatedAt: new Date().toISOString(),
    mock: false,
    engine: 'i1-discovery-feed',
    scorerVersion: RETENTION_SCORER_VERSION,
    items,
    empty,
    emptyCopy,
    lanes,
    gates: {
      launchWindowDays: DISCOVERY_LAUNCH_WINDOW_DAYS,
      maxDemoBundleBytes: DISCOVERY_MAX_DEMO_BUNDLE_BYTES,
      launchImpressionBudget: DISCOVERY_LAUNCH_IMPRESSION_BUDGET,
      aiModerationClaim: aiModerationReady ? 'IMPLEMENTED' : 'HELD',
      impressionLedger: impressionLedgerReady ? 'IMPLEMENTED' : 'HELD',
      promotedLane: 'HELD',
    },
    notes: [
      'Ranked from real Arcade catalog signals only',
      impressionLedgerReady
        ? '2k impression ledger live — unique served counts within 30d; exhausted titles lose Lane A boost'
        : 'Impression ledger / 2k served counts [HELD] — budget is policy, not a fake counter',
      'Lane C Promoted [HELD] until Hub Coins checkout audited',
      aiModerationReady
        ? 'AI moderation path live — unapproved titles excluded'
        : 'AI moderation claim [HELD] — deterministic compression + launch-window eligibility only',
    ],
  }

  log.info('discovery_feed_built', {
    candidates: candidates.length,
    eligible: items.length,
    launch: lanes.launch,
    retention: lanes.retention,
    aiModerationReady,
    impressionLedgerReady,
  })

  return result
}

/**
 * Server probe — engine CORE + impression ledger + AI moderation when substrates ready.
 * Promoted stays fail-closed honest.
 *
 * Fail-closed defaults (never hardcoded true):
 * - `ready` / `compressionGateReady` from real gate smokes (30d + Compression Mandate)
 * - `impressionLedgerReady` only when caller proves writable ledger
 * - `aiModerationReady` only when durable moderation path is proven
 */
export function probeDiscoveryFeedEngine(input: {
  impressionLedgerWritable?: boolean
  /** Durable discovery-moderation root writable + pipeline smoke (capability). */
  discoveryModerationWritable?: boolean
  /**
   * Injection point for tests only — production always runs the real
   * `smokeCompressionMandateGate()` check rather than trusting a literal.
   */
  compressionGateSmokePassed?: boolean
  /**
   * Injection point for tests only — production always runs the real
   * `smokeLaunchWindowGate()` check rather than trusting a literal.
   */
  launchWindowSmokePassed?: boolean
} = {}): DiscoveryFeedEngineProbe {
  // Opt-in only — never default the 2k ledger claim to true.
  const impressionLedgerReady = input.impressionLedgerWritable === true
  const aiModerationReady = input.discoveryModerationWritable === true
  const compressionGateReady =
    typeof input.compressionGateSmokePassed === 'boolean'
      ? input.compressionGateSmokePassed
      : smokeCompressionMandateGate()
  const launchWindowReady =
    typeof input.launchWindowSmokePassed === 'boolean'
      ? input.launchWindowSmokePassed
      : smokeLaunchWindowGate()
  const ready = compressionGateReady && launchWindowReady
  return {
    ready,
    aiModerationReady,
    impressionLedgerReady,
    promotedLaneReady: false,
    compressionGateReady,
    launchWindowDays: DISCOVERY_LAUNCH_WINDOW_DAYS,
    claim: aiModerationReady
      ? impressionLedgerReady
        ? 'I.1 Discovery Feed + 2k impression ledger + AI moderation live — 30d + Compression Mandate + honest CAC; Promoted [HELD]'
        : 'I.1 Discovery Feed + AI moderation live — 30d + Compression Mandate; impression ledger / Promoted [HELD]'
      : impressionLedgerReady
        ? 'I.1 Discovery Feed + 2k impression ledger live — 30d + Compression Mandate + honest served CAC; AI-mod / Promoted [HELD]'
        : 'I.1 Discovery Feed engine live — 30d + Compression Mandate ranking; AI-mod / impression ledger / Promoted [HELD]',
    productCopy: aiModerationReady
      ? impressionLedgerReady
        ? 'New & Rising ranks AI-moderated publishes (deny-list + approved status + compression + launch window + remaining 2k impressions). Coins Promoted stays [HELD].'
        : 'New & Rising ranks AI-moderated publishes (deny-list + approved status + compression + launch window). Coins Promoted stays [HELD].'
      : impressionLedgerReady
        ? 'New & Rising ranks eligible publishes (compression + launch window + remaining 2k impressions). Real served counts only. AI moderation marketing and Coins Promoted stay [HELD].'
        : 'New & Rising ranks eligible publishes (compression + launch window). No fake impression counts. AI moderation marketing and Coins Promoted stay [HELD].',
  }
}

export function evaluateDiscoveryFeedCapability(
  probe: DiscoveryFeedEngineProbe = probeDiscoveryFeedEngine(),
): {
  status: DiscoveryCapabilityStatus
  connectable: boolean
  discoveryFeedReady: boolean
  marketingDiscoveryAllowed: boolean
  marketingLaunchImpressionsAllowed: boolean
  marketingAiModeratedDiscoveryAllowed: boolean
  notes: string[]
  heldReason?: string
} {
  if (!probe.ready || !probe.compressionGateReady) {
    return {
      status: 'HELD',
      connectable: false,
      discoveryFeedReady: false,
      marketingDiscoveryAllowed: false,
      marketingLaunchImpressionsAllowed: false,
      marketingAiModeratedDiscoveryAllowed: false,
      notes: ['Discovery feed engine not ready — 30d launch window + Compression Mandate smoke required'],
      heldReason: 'discovery_feed_held',
    }
  }

  // Ranking may ship with AI-mod [HELD]; AI-moderated *marketing* stays a separate flag.
  // Never hardcode marketingDiscoveryAllowed — only derived from smoke-verified probe.ready
  // (Compression Mandate + 30-day launch window gates).
  const marketingDiscoveryAllowed = probe.ready === true

  return {
    status: 'IMPLEMENTED',
    connectable: true,
    discoveryFeedReady: true,
    marketingDiscoveryAllowed,
    marketingLaunchImpressionsAllowed: probe.impressionLedgerReady === true,
    marketingAiModeratedDiscoveryAllowed: probe.aiModerationReady === true,
    notes: [
      'Deterministic 30-day + Compression Mandate ranking live',
      probe.aiModerationReady
        ? 'AI moderation path live'
        : 'AI moderation marketing [HELD]',
      probe.impressionLedgerReady
        ? '2k impression ledger live — unique served counts within 30d'
        : '2k impression ledger [HELD] — no fake served counts',
      probe.promotedLaneReady
        ? 'Promoted lane live'
        : 'Lane C Promoted [HELD] until Hub Coins',
    ],
  }
}
