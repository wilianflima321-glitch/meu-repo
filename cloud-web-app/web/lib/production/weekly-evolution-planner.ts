/**
 * Letter cx — Weekly Evolution Planner (L.6 cadence).
 * Proposes root-cause Master Plan evolution — not if-null band-aids.
 * Founder approve/reject via FounderEvolutionInbox (IDE only).
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ForgeWorkDomain } from '@/lib/ai/domain-economic-router-policy'
import type { ForgeCadence } from '@/lib/production/hot-fix-event-bus'

const log = createComponentLogger('weekly-evolution-planner')

export const WEEKLY_EVOLUTION_LETTER = 'cx' as const
export const WEEKLY_EVOLUTION_WIRED = true as const

export type EvolutionProposalStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'blocked'

export type EvolutionRootCauseKind =
  | 'architecture-debt'
  | 'repeated-hotfix'
  | 'honesty-gate-gap'
  | 'lazy-pattern-cluster'
  | 'context-pack-amnesia'
  | 'cost-burn-misroute'

export interface WeeklyEvolutionProposal {
  proposalId: string
  projectId: string
  title: string
  /** Root-cause refactor intent — never “add null check” band-aids */
  rootCause: EvolutionRootCauseKind
  rationale: string
  targetPaths: string[]
  domain: ForgeWorkDomain
  cadence: 'weekly-evolution'
  status: EvolutionProposalStatus
  createdAt: string
  /** MultiSurface / RepoGraph debate refs (L.14 / L.12) */
  contextPackId?: string
  repoGraphSliceRef?: string
  /** CostGuard — estimate only until approved */
  estimatedTokenWeight: number
  settleZeroOnReject: true
  /** Band-aid ban — proposals that look like null-guards are rejected at propose time */
  bandAidForbidden: true
}

export interface ProposeWeeklyEvolutionInput {
  projectId: string
  title: string
  rootCause: EvolutionRootCauseKind
  rationale: string
  targetPaths: string[]
  domain: ForgeWorkDomain
  contextPackId?: string
  repoGraphSliceRef?: string
  estimatedTokenWeight?: number
}

const inbox = new Map<string, WeeklyEvolutionProposal>()

const BAND_AID_RE =
  /\b(if\s*-?\s*null|null\s*check|optional\s*chaining\s*only|bandaid|band-aid|quick\s*fix|todo\b|fixme\b)\b/i

export function __resetWeeklyEvolutionPlannerForTests(): void {
  inbox.clear()
}

export function listEvolutionProposals(projectId?: string): WeeklyEvolutionProposal[] {
  const all = [...inbox.values()]
  if (!projectId) return all
  return all.filter((p) => p.projectId === projectId)
}

export function getEvolutionProposal(proposalId: string): WeeklyEvolutionProposal | undefined {
  return inbox.get(proposalId)
}

/**
 * Propose a weekly Master Plan evolution. Fail-closed on band-aid language.
 */
export function proposeWeeklyEvolution(
  input: ProposeWeeklyEvolutionInput,
):
  | { ok: true; proposal: WeeklyEvolutionProposal }
  | { ok: false; reason: 'band_aid_forbidden' | 'empty_paths' | 'empty_rationale'; settleZero: true } {
  const title = input.title.trim()
  const rationale = input.rationale.trim()
  if (!rationale || !title) {
    return { ok: false, reason: 'empty_rationale', settleZero: true }
  }
  if (!input.targetPaths.length) {
    return { ok: false, reason: 'empty_paths', settleZero: true }
  }
  if (BAND_AID_RE.test(title) || BAND_AID_RE.test(rationale)) {
    log.warn('weekly_evolution_band_aid_rejected', { projectId: input.projectId, title })
    return { ok: false, reason: 'band_aid_forbidden', settleZero: true }
  }

  const proposal: WeeklyEvolutionProposal = {
    proposalId: randomUUID(),
    projectId: input.projectId,
    title,
    rootCause: input.rootCause,
    rationale,
    targetPaths: [...input.targetPaths],
    domain: input.domain,
    cadence: 'weekly-evolution',
    status: 'proposed',
    createdAt: new Date().toISOString(),
    contextPackId: input.contextPackId,
    repoGraphSliceRef: input.repoGraphSliceRef,
    estimatedTokenWeight: Math.max(1, input.estimatedTokenWeight ?? 8_000),
    settleZeroOnReject: true,
    bandAidForbidden: true,
  }
  inbox.set(proposal.proposalId, proposal)
  log.info('weekly_evolution_proposed', {
    proposalId: proposal.proposalId,
    rootCause: proposal.rootCause,
    letter: WEEKLY_EVOLUTION_LETTER,
  })
  return { ok: true, proposal }
}

export function approveEvolutionProposal(proposalId: string): WeeklyEvolutionProposal | null {
  const p = inbox.get(proposalId)
  if (!p || p.status !== 'proposed') return null
  p.status = 'approved'
  return p
}

export function rejectEvolutionProposal(proposalId: string): {
  proposal: WeeklyEvolutionProposal | null
  settleZero: true
} {
  const p = inbox.get(proposalId)
  if (!p || (p.status !== 'proposed' && p.status !== 'approved')) {
    return { proposal: null, settleZero: true }
  }
  p.status = 'rejected'
  return { proposal: p, settleZero: true }
}

export function markEvolutionApplied(proposalId: string): WeeklyEvolutionProposal | null {
  const p = inbox.get(proposalId)
  if (!p || p.status !== 'approved') return null
  p.status = 'applied'
  return p
}

export function weeklyCadenceLabel(): ForgeCadence {
  return 'weekly-evolution'
}
