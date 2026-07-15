/**
 * I.1 — Discovery content moderation pipeline.
 * Deterministic deny-list / safety policy first; optional BYOK LLM critic via CostGuard.
 * Free tier without BYOK never invents platform-paid LLM — fail-closed (Trava I).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  findDiscoveryDenyTagHits,
  findDiscoveryDenyTermHits,
} from '@/lib/hub/discovery-moderation-denylist'
import {
  getDiscoveryModeration,
  upsertDiscoveryModeration,
  type DiscoveryModerationRecord,
  type DiscoveryModerationStatus,
} from '@/lib/hub/discovery-moderation-authority'
import type { DiscoveryModerationLlmProvider } from '@/lib/hub/discovery-moderation-llm-provider'
import {
  cancelCreativeCost,
  reserveCreativeCost,
  settleCreativeCost,
  type CostGuardLedgerAdapter,
} from '@/lib/production/creative-cost-guard'

const log = createComponentLogger('discovery-moderation-engine')

export const DISCOVERY_MODERATION_DOMAIN = 'hub-discovery-moderation'
export const DISCOVERY_MODERATION_LLM_ESTIMATE_TOKENS = 48
export const DISCOVERY_MODERATION_ENGINE_VERSION = 'i1-discovery-mod-v1'

export interface DiscoveryContentModerationInput {
  gameId: string
  title: string
  description?: string | null
  tags?: string[]
}

export interface DiscoveryContentModerationResult {
  status: DiscoveryModerationStatus
  codes: string[]
  reasons: string[]
  deterministic: true
  matchedDenyTerms: string[]
  matchedDenyTags: string[]
  engineVersion: typeof DISCOVERY_MODERATION_ENGINE_VERSION
}

/**
 * Pure deterministic gate — deny list + empty/title policy.
 * Clean listings → approved; deny hits → rejected; thin borderline → manual_review.
 */
export function evaluateDiscoveryContentModeration(
  input: DiscoveryContentModerationInput,
): DiscoveryContentModerationResult {
  const gameId = String(input.gameId || '').trim()
  const title = String(input.title || '').trim()
  const description = input.description ?? null
  const tags = Array.isArray(input.tags) ? input.tags : []
  const codes: string[] = []
  const reasons: string[] = []

  if (!gameId) {
    return {
      status: 'rejected',
      codes: ['GAME_ID_REQUIRED'],
      reasons: ['gameId required for discovery moderation'],
      deterministic: true,
      matchedDenyTerms: [],
      matchedDenyTags: [],
      engineVersion: DISCOVERY_MODERATION_ENGINE_VERSION,
    }
  }

  if (!title) {
    return {
      status: 'rejected',
      codes: ['TITLE_REQUIRED'],
      reasons: ['Title required for discovery moderation'],
      deterministic: true,
      matchedDenyTerms: [],
      matchedDenyTags: [],
      engineVersion: DISCOVERY_MODERATION_ENGINE_VERSION,
    }
  }

  const matchedDenyTerms = findDiscoveryDenyTermHits({ title, description })
  const matchedDenyTags = findDiscoveryDenyTagHits(tags)

  if (matchedDenyTerms.length > 0 || matchedDenyTags.length > 0) {
    codes.push('DENY_LIST')
    if (matchedDenyTerms.length) {
      codes.push('DENY_TERM')
      reasons.push(`Deny term hit: ${matchedDenyTerms.join(', ')}`)
    }
    if (matchedDenyTags.length) {
      codes.push('DENY_TAG')
      reasons.push(`Deny tag hit: ${matchedDenyTags.join(', ')}`)
    }
    return {
      status: 'rejected',
      codes,
      reasons,
      deterministic: true,
      matchedDenyTerms,
      matchedDenyTags,
      engineVersion: DISCOVERY_MODERATION_ENGINE_VERSION,
    }
  }

  // Borderline: very short title with no description → human / optional LLM, not auto-approve.
  if (title.length < 3 && !String(description || '').trim()) {
    codes.push('THIN_LISTING')
    reasons.push('Title too thin without description — manual_review')
    return {
      status: 'manual_review',
      codes,
      reasons,
      deterministic: true,
      matchedDenyTerms: [],
      matchedDenyTags: [],
      engineVersion: DISCOVERY_MODERATION_ENGINE_VERSION,
    }
  }

  codes.push('DETERMINISTIC_CLEAR')
  reasons.push('Passed deterministic safety policy')
  return {
    status: 'approved',
    codes,
    reasons,
    deterministic: true,
    matchedDenyTerms: [],
    matchedDenyTags: [],
    engineVersion: DISCOVERY_MODERATION_ENGINE_VERSION,
  }
}

export async function persistDiscoveryContentModeration(
  input: DiscoveryContentModerationInput,
  options: { nowMs?: number; forceReevaluate?: boolean } = {},
): Promise<{
  record: DiscoveryModerationRecord
  evaluation: DiscoveryContentModerationResult
  reused: boolean
}> {
  if (!options.forceReevaluate) {
    const existing = await getDiscoveryModeration(input.gameId)
    if (existing) {
      return {
        record: existing,
        evaluation: {
          status: existing.status,
          codes: existing.codes,
          reasons: existing.reasons,
          deterministic: true,
          matchedDenyTerms: existing.matchedDenyTerms ?? [],
          matchedDenyTags: existing.matchedDenyTags ?? [],
          engineVersion: DISCOVERY_MODERATION_ENGINE_VERSION,
        },
        reused: true,
      }
    }
  }

  const evaluation = evaluateDiscoveryContentModeration(input)
  const record = await upsertDiscoveryModeration({
    gameId: input.gameId,
    status: evaluation.status,
    codes: evaluation.codes,
    reasons: evaluation.reasons,
    source: 'deterministic',
    matchedDenyTerms: evaluation.matchedDenyTerms,
    matchedDenyTags: evaluation.matchedDenyTags,
    titleSnapshot: String(input.title || '').trim(),
    nowMs: options.nowMs,
  })
  return { record, evaluation, reused: false }
}

/**
 * Resolve statuses for feed candidates — load disk or run deterministic + persist.
 * Fail-closed: missing gameId/title → pending (not invented approved).
 */
export async function resolveDiscoveryModerationStatuses(
  candidates: DiscoveryContentModerationInput[],
  options: { nowMs?: number; persist?: boolean } = {},
): Promise<Map<string, DiscoveryModerationStatus>> {
  const persist = options.persist !== false
  const out = new Map<string, DiscoveryModerationStatus>()
  for (const candidate of candidates) {
    const gameId = String(candidate.gameId || '').trim()
    if (!gameId) continue
    if (persist) {
      const { record } = await persistDiscoveryContentModeration(candidate, {
        nowMs: options.nowMs,
      })
      out.set(gameId, record.status)
    } else {
      const existing = await getDiscoveryModeration(gameId)
      if (existing) {
        out.set(gameId, existing.status)
      } else {
        const evaluation = evaluateDiscoveryContentModeration(candidate)
        out.set(gameId, evaluation.status)
      }
    }
  }
  return out
}

export type DiscoveryLlmReviewOutcome =
  | {
      ok: true
      status: DiscoveryModerationStatus
      record: DiscoveryModerationRecord
      funding: 'byok' | 'usage_bucket' | 'wallet'
      provider: string
    }
  | {
      ok: false
      status: DiscoveryModerationStatus
      reason: string
      code:
        | 'LLM_NOT_NEEDED'
        | 'PROVIDER_MISSING'
        | 'COST_GUARD_DENIED'
        | 'BYOK_REQUIRED'
        | 'LLM_FAILED'
      record?: DiscoveryModerationRecord | null
    }

/**
 * Optional LLM critic — only for manual_review / flagged borderline.
 * Requires injected provider (mock in tests) + CostGuard; free without BYOK fails closed.
 */
export async function runDiscoveryModerationLlmReview(input: {
  candidate: DiscoveryContentModerationInput
  adapter: CostGuardLedgerAdapter
  provider?: DiscoveryModerationLlmProvider | null
  userId: string
  projectId?: string
  planId?: string
  byokProfileId?: string
  allowPlatformPay?: boolean
  nowMs?: number
}): Promise<DiscoveryLlmReviewOutcome> {
  const evaluation = evaluateDiscoveryContentModeration(input.candidate)
  if (evaluation.status !== 'manual_review' && evaluation.status !== 'flagged') {
    const record = await upsertDiscoveryModeration({
      gameId: input.candidate.gameId,
      status: evaluation.status,
      codes: evaluation.codes,
      reasons: evaluation.reasons,
      source: 'deterministic',
      matchedDenyTerms: evaluation.matchedDenyTerms,
      matchedDenyTags: evaluation.matchedDenyTags,
      titleSnapshot: String(input.candidate.title || '').trim(),
      nowMs: input.nowMs,
    })
    return {
      ok: false,
      status: evaluation.status,
      reason: 'Deterministic path already decided — LLM critic skipped',
      code: 'LLM_NOT_NEEDED',
      record,
    }
  }

  if (!input.provider) {
    const record = await upsertDiscoveryModeration({
      gameId: input.candidate.gameId,
      status: evaluation.status,
      codes: [...evaluation.codes, 'LLM_PROVIDER_MISSING'],
      reasons: [...evaluation.reasons, 'Optional LLM critic unavailable — stay fail-closed'],
      source: 'deterministic',
      matchedDenyTerms: evaluation.matchedDenyTerms,
      matchedDenyTags: evaluation.matchedDenyTags,
      titleSnapshot: String(input.candidate.title || '').trim(),
      nowMs: input.nowMs,
    })
    return {
      ok: false,
      status: evaluation.status,
      reason: 'No LLM provider injected — fail-closed (no free platform invent)',
      code: 'PROVIDER_MISSING',
      record,
    }
  }

  const guard = await reserveCreativeCost(
    {
      userId: input.userId,
      projectId: input.projectId ?? 'hub-discovery',
      domain: DISCOVERY_MODERATION_DOMAIN,
      estimatedTokenWeight: DISCOVERY_MODERATION_LLM_ESTIMATE_TOKENS,
      planId: input.planId ?? 'free',
      byokProfileId: input.byokProfileId,
      allowPlatformPay: input.allowPlatformPay === true,
    },
    input.adapter,
  )

  if (!guard.ok) {
    log.warn('discovery_moderation_llm_cost_guard_denied', {
      reason: guard.reason,
      gameId: input.candidate.gameId,
    })
    const record = await upsertDiscoveryModeration({
      gameId: input.candidate.gameId,
      status: evaluation.status,
      codes: [...evaluation.codes, 'COST_GUARD', guard.reason],
      reasons: [...evaluation.reasons, guard.message],
      source: 'deterministic',
      matchedDenyTerms: evaluation.matchedDenyTerms,
      matchedDenyTags: evaluation.matchedDenyTags,
      titleSnapshot: String(input.candidate.title || '').trim(),
      nowMs: input.nowMs,
    })
    return {
      ok: false,
      status: evaluation.status,
      reason: guard.message,
      code:
        guard.reason === 'free_tier_platform_pay_forbidden' || guard.reason === 'byok_missing'
          ? 'BYOK_REQUIRED'
          : 'COST_GUARD_DENIED',
      record,
    }
  }

  try {
    const llm = await input.provider.review({
      gameId: input.candidate.gameId,
      title: input.candidate.title,
      description: input.candidate.description,
      tags: input.candidate.tags,
      deterministicStatus: evaluation.status,
      deterministicCodes: evaluation.codes,
    })
    await settleCreativeCost(guard.reservation.reservationId, llm.tokenWeight, input.adapter)
    const status: DiscoveryModerationStatus = llm.verdict
    const record = await upsertDiscoveryModeration({
      gameId: input.candidate.gameId,
      status,
      codes: [...evaluation.codes, 'LLM_CRITIC', llm.verdict.toUpperCase()],
      reasons: [...evaluation.reasons, llm.reason],
      source: 'llm',
      matchedDenyTerms: evaluation.matchedDenyTerms,
      matchedDenyTags: evaluation.matchedDenyTags,
      titleSnapshot: String(input.candidate.title || '').trim(),
      nowMs: input.nowMs,
    })
    return {
      ok: true,
      status,
      record,
      funding: guard.reservation.funding,
      provider: llm.provider,
    }
  } catch (err) {
    await cancelCreativeCost(guard.reservation.reservationId, input.adapter)
    log.error('discovery_moderation_llm_failed', err)
    const record = await upsertDiscoveryModeration({
      gameId: input.candidate.gameId,
      status: evaluation.status,
      codes: [...evaluation.codes, 'LLM_FAILED'],
      reasons: [
        ...evaluation.reasons,
        err instanceof Error ? err.message : 'LLM critic failed',
      ],
      source: 'deterministic',
      matchedDenyTerms: evaluation.matchedDenyTerms,
      matchedDenyTags: evaluation.matchedDenyTags,
      titleSnapshot: String(input.candidate.title || '').trim(),
      nowMs: input.nowMs,
    })
    return {
      ok: false,
      status: evaluation.status,
      reason: err instanceof Error ? err.message : 'LLM critic failed',
      code: 'LLM_FAILED',
      record,
    }
  }
}

/** Smoke used by capability probe — deterministic clear title must approve. */
export function smokeDiscoveryModerationPipeline(): boolean {
  const clear = evaluateDiscoveryContentModeration({
    gameId: 'smoke-clear',
    title: 'Neon Runner',
    tags: ['f2p', 'sci-fi'],
  })
  const denied = evaluateDiscoveryContentModeration({
    gameId: 'smoke-deny',
    title: 'phishing kit demo',
    tags: ['f2p'],
  })
  return clear.status === 'approved' && denied.status === 'rejected'
}
