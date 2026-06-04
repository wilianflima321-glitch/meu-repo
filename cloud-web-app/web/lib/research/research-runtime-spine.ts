export type ResearchRuntimeState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type ResearchRuntimeStepId =
  | 'plan'
  | 'sources'
  | 'browser-replay'
  | 'artifacts'
  | 'confidence'
  | 'cost'
  | 'final-answer'

export type ResearchRuntimeStep = {
  id: ResearchRuntimeStepId
  label: string
  state: ResearchRuntimeState
  evidenceRefs: string[]
  blockers: string[]
  nextAction: string
}

export type ResearchRuntimeSpineInput = {
  query?: string
  sourceCount?: number
  browserReplayEnabled?: boolean
  artifactPersistenceEnabled?: boolean
  confidenceScores?: number[]
  costEstimateUsd?: number | null
  finalAnswerReady?: boolean
  humanReviewed?: boolean
  evidenceRefs?: string[]
}

export type ResearchRuntimeSpinePlan = {
  version: 1
  state: ResearchRuntimeState
  steps: ResearchRuntimeStep[]
  blockers: string[]
  confidence: 'low' | 'medium' | 'high'
  noFakeSuccessRules: string[]
  nextAction: string
}

export const RESEARCH_RUNTIME_NO_FAKE_SUCCESS_RULES = [
  'Research cannot be marked verified without source receipts and confidence scoring.',
  'Browser navigation cannot be claimed without replay, URL, DOM or screenshot receipts.',
  'Artifacts cannot be treated as persisted unless storage evidence is attached.',
  'Final answer stays needs-review until sources, confidence, cost, and human review are visible.',
] as const

function step(
  id: ResearchRuntimeStepId,
  label: string,
  state: ResearchRuntimeState,
  nextAction: string,
  evidenceRefs: string[] = [],
  blockers: string[] = [],
): ResearchRuntimeStep {
  return { id, label, state, evidenceRefs, blockers, nextAction }
}

function mergeState(states: ResearchRuntimeState[]): ResearchRuntimeState {
  if (states.includes('blocked')) return 'blocked'
  if (states.includes('provider_unavailable')) return 'provider_unavailable'
  if (states.includes('human_review_required')) return 'human_review_required'
  if (states.includes('held')) return 'held'
  if (states.includes('needs-review')) return 'needs-review'
  return 'available'
}

function confidenceFromScores(scores: number[]): ResearchRuntimeSpinePlan['confidence'] {
  if (scores.length === 0) return 'low'
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  if (average >= 0.86) return 'high'
  if (average >= 0.68) return 'medium'
  return 'low'
}

export function buildResearchRuntimeSpinePlan(input: ResearchRuntimeSpineInput = {}): ResearchRuntimeSpinePlan {
  const evidenceRefs = input.evidenceRefs ?? []
  const queryReady = Boolean(input.query?.trim())
  const sourceCount = input.sourceCount ?? 0
  const confidence = confidenceFromScores(input.confidenceScores ?? [])

  const steps = [
    step(
      'plan',
      'Plan',
      queryReady ? 'available' : 'held',
      queryReady ? 'Decompose into source, browser, artifact, and answer lanes.' : 'Capture the research question first.',
      evidenceRefs.filter((ref) => ref.includes('plan') || ref.includes('query')),
      queryReady ? [] : ['Research query is missing.'],
    ),
    step(
      'sources',
      'Sources',
      sourceCount >= 3 ? 'available' : sourceCount > 0 ? 'needs-review' : 'held',
      sourceCount >= 3 ? 'Rank sources by credibility and implementation impact.' : 'Collect at least three high-signal sources.',
      evidenceRefs.filter((ref) => ref.includes('source')),
      sourceCount >= 3 ? [] : ['Source coverage is too thin.'],
    ),
    step(
      'browser-replay',
      'Browser replay',
      input.browserReplayEnabled ? 'available' : 'held',
      input.browserReplayEnabled ? 'Attach URL, DOM, screenshot, and replay receipts.' : 'Start browser operator before claiming live navigation.',
      evidenceRefs.filter((ref) => ref.includes('browser') || ref.includes('replay')),
      input.browserReplayEnabled ? [] : ['Browser replay is not attached.'],
    ),
    step(
      'artifacts',
      'Artifacts',
      input.artifactPersistenceEnabled ? 'available' : 'held',
      input.artifactPersistenceEnabled ? 'Persist source table, notes, and final packet.' : 'Persist artifacts only after user review.',
      evidenceRefs.filter((ref) => ref.includes('artifact')),
      input.artifactPersistenceEnabled ? [] : ['Artifact persistence is held.'],
    ),
    step(
      'confidence',
      'Confidence',
      confidence === 'high' ? 'available' : 'needs-review',
      confidence === 'high' ? 'Use confidence score in final answer.' : 'Add stronger sources or lower the claim strength.',
      evidenceRefs.filter((ref) => ref.includes('confidence')),
      confidence === 'high' ? [] : ['Confidence is not high enough for a verified claim.'],
    ),
    step(
      'cost',
      'Cost',
      typeof input.costEstimateUsd === 'number' ? 'available' : 'needs-review',
      typeof input.costEstimateUsd === 'number' ? 'Show cost before expanding the run.' : 'Estimate cost before long research runs.',
      evidenceRefs.filter((ref) => ref.includes('cost')),
      typeof input.costEstimateUsd === 'number' ? [] : ['Cost estimate is missing.'],
    ),
    step(
      'final-answer',
      'Final answer',
      input.finalAnswerReady && input.humanReviewed ? 'available' : input.finalAnswerReady ? 'human_review_required' : 'needs-review',
      input.finalAnswerReady && input.humanReviewed ? 'Deliver with receipts.' : 'Keep final answer in review until receipts and approval are present.',
      evidenceRefs.filter((ref) => ref.includes('final') || ref.includes('answer')),
      input.finalAnswerReady && input.humanReviewed ? [] : ['Final answer requires review with receipts.'],
    ),
  ]

  const blockers = steps.flatMap((item) => item.blockers)
  const state = mergeState(steps.map((item) => item.state))

  return {
    version: 1,
    state,
    steps,
    blockers,
    confidence,
    noFakeSuccessRules: [...RESEARCH_RUNTIME_NO_FAKE_SUCCESS_RULES],
    nextAction:
      state === 'available'
        ? 'Deliver the answer with sources, replay, artifacts, confidence, and cost receipts.'
        : 'Resolve held research lanes before claiming Manus-grade verification.',
  }
}

export function validateResearchRuntimeSpinePlan(plan: ResearchRuntimeSpinePlan): string[] {
  const failures: string[] = []
  if (plan.steps.length < 7) failures.push('research runtime step matrix is incomplete')
  if (plan.noFakeSuccessRules.length < 4) failures.push('no-fake-success rules are too thin')
  if (plan.state === 'available' && plan.blockers.length > 0) failures.push('available research runtime cannot have blockers')
  if (plan.confidence === 'high' && !plan.steps.some((step) => step.id === 'sources' && step.state === 'available')) {
    failures.push('high confidence requires available sources')
  }
  return failures
}
