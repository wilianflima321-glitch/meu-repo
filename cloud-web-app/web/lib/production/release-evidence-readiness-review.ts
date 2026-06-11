import {
  mergeAgenticProductionState,
  type MissionLedgerEntry,
  type ProductionGraphNode,
} from '@/lib/production/agentic-production-state'
import type {
  ReleaseEvidenceReviewDecisionInput,
  ReleaseEvidenceReviewDecisionResult,
  ReleaseEvidenceReviewRequestInput,
  ReleaseEvidenceReviewRequestResult,
} from '@/lib/production/release-evidence-readiness.contracts'

export function mergeReleaseEvidenceReviewRequestIntoProductionState(
  input: ReleaseEvidenceReviewRequestInput,
): ReleaseEvidenceReviewRequestResult {
  const reviewRequestId = 'release-evidence-review-request'
  const requestedAt = input.requestedAt ?? new Date().toISOString()
  const blockers = unique([
    ...input.snapshot.blockers,
    ...input.snapshot.missingEvidence,
    ...(!input.snapshot.canRequestHumanReview ? ['Non-human release evidence lanes must be covered before human review can be requested.'] : []),
    ...(input.snapshot.status === 'blocked' ? ['Release evidence package is blocked and cannot enter review yet.'] : []),
  ], 160)

  if (!input.snapshot.canRequestHumanReview || input.snapshot.status === 'blocked') {
    return {
      accepted: false,
      state: input.state,
      reviewRequestId,
      releaseReady: false,
      blockers,
      nextAction: blockers[0] ?? input.snapshot.nextAction,
    }
  }

  const evidenceRefs = unique([
    `release-evidence-readiness:${input.snapshot.scorePercent}`,
    `release-evidence-review-request:${requestedAt}`,
    ...input.snapshot.evidenceRefs,
  ], 180)
  const ledgerEntry: MissionLedgerEntry = {
    id: reviewRequestId,
    phase: 'Release evidence review request',
    ownerAgent: input.requestedBy,
    state: 'needs-approval',
    summary: `Release evidence review requested with ${input.snapshot.scorePercent}% evidence coverage.`,
    acceptance: [
      'Evidence package generated',
      'Non-human release evidence lanes covered',
      'Human owner approval required before final/public claims',
    ],
    evidenceRefs,
    rollbackPlan: 'Reject the review request, preserve evidence, and return to the last approved checkpoint.',
    nextAction: 'Owner must approve or reject the evidence package; no automatic publish occurs.',
    estimatedCostUsd: 0,
    updatedAt: requestedAt,
  }
  const releaseNode: ProductionGraphNode = {
    id: reviewRequestId,
    label: 'Release evidence review request',
    status: 'needs-review',
    ownerAgent: 'Release Manager Agent',
    evidenceRefs,
    blockers: ['Human release approval evidence is required before release can be marked ready.'],
    updatedAt: requestedAt,
  }
  const nextState = mergeAgenticProductionState(
    input.state,
    {
      ledger: [
        ledgerEntry,
        ...input.state.ledger.filter((entry) => entry.id !== reviewRequestId),
      ].slice(0, 50),
      graphs: {
        releaseGraph: [
          releaseNode,
          ...input.state.graphs.releaseGraph.filter((node) => node.id !== reviewRequestId),
        ].slice(0, 40),
      },
      runtimePolicy: {
        requiresHumanApproval: true,
      },
    },
    requestedAt,
  )

  return {
    accepted: true,
    state: nextState,
    reviewRequestId,
    releaseReady: false,
    blockers: releaseNode.blockers,
    nextAction: ledgerEntry.nextAction,
  }
}

export function mergeReleaseEvidenceReviewDecisionIntoProductionState(
  input: ReleaseEvidenceReviewDecisionInput,
): ReleaseEvidenceReviewDecisionResult {
  const decisionId = `release-evidence-review-${input.decision}`
  const decidedAt = input.decidedAt ?? new Date().toISOString()
  const hasReviewRequest =
    input.state.ledger.some((entry) => entry.id === 'release-evidence-review-request') ||
    input.state.graphs.releaseGraph.some((node) => node.id === 'release-evidence-review-request')
  const blockers = unique([
    ...(!hasReviewRequest ? ['A release evidence review request must be recorded before a decision.'] : []),
    ...(input.snapshot.status === 'blocked' ? ['Release evidence package is blocked and cannot receive a human decision yet.'] : []),
  ], 80)

  if (!hasReviewRequest || input.snapshot.status === 'blocked') {
    return {
      accepted: false,
      state: input.state,
      decisionId,
      decision: input.decision,
      releaseReady: false,
      blockers,
      nextAction: blockers[0] ?? input.snapshot.nextAction,
    }
  }

  const approvalEvidenceRefs = input.decision === 'approved'
    ? [
        `human-approval:release-evidence:${decidedAt}`,
        `approval-record:release-evidence:${decidedAt}`,
      ]
    : [`release-review-rejected:${decidedAt}`]
  const evidenceRefs = unique([
    ...approvalEvidenceRefs,
    `release-evidence-decision:${input.decision}:${decidedAt}`,
    ...input.snapshot.evidenceRefs,
  ], 180)
  const approved = input.decision === 'approved'
  const summary = approved
    ? 'Human owner approval evidence was attached to the release evidence package.'
    : 'Human owner rejected the release evidence package; release remains blocked.'
  const nextAction = approved
    ? 'Approval evidence is recorded. A separate manual publish action is still required.'
    : 'Resolve the rejection note and request a new release evidence review.'
  const ledgerEntry: MissionLedgerEntry = {
    id: decisionId,
    phase: 'Human release evidence decision',
    ownerAgent: input.decidedBy,
    state: approved ? 'complete' : 'blocked',
    summary: input.note ? `${summary} Note: ${input.note}` : summary,
    acceptance: approved
      ? [
          'Human approval evidence attached',
          'Release package remains evidence-backed only',
          'No automatic publish was triggered',
        ]
      : [
          'Human rejection recorded',
          'Release package remains held',
          'A new review is required after remediation',
        ],
    evidenceRefs,
    rollbackPlan: approved
      ? 'Revoke approval evidence and return the package to needs-review.'
      : 'Resolve rejection blockers and request review again.',
    nextAction,
    estimatedCostUsd: 0,
    updatedAt: decidedAt,
  }
  const decisionNode: ProductionGraphNode = {
    id: decisionId,
    label: approved ? 'Human approval evidence' : 'Human rejection evidence',
    status: approved ? 'ready' : 'blocked',
    ownerAgent: 'Release Manager Agent',
    evidenceRefs,
    blockers: approved ? [] : [input.note || 'Human owner rejected the release evidence package.'],
    updatedAt: decidedAt,
  }
  const nextState = mergeAgenticProductionState(
    input.state,
    {
      ledger: [
        ledgerEntry,
        ...input.state.ledger.filter((entry) => entry.id !== decisionId),
      ].slice(0, 50),
      graphs: {
        releaseGraph: [
          decisionNode,
          ...input.state.graphs.releaseGraph.filter((node) => node.id !== decisionId),
        ].slice(0, 40),
      },
      runtimePolicy: {
        requiresHumanApproval: true,
      },
    },
    decidedAt,
  )

  return {
    accepted: true,
    state: nextState,
    decisionId,
    decision: input.decision,
    releaseReady: false,
    blockers: decisionNode.blockers,
    nextAction,
  }
}

function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}
