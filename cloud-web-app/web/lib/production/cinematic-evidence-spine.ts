export type CinematicEvidenceLaneId =
  | 'storyboard'
  | 'shot-blocking'
  | 'animatic-draft'
  | 'ai-video-reference'
  | 'engine-render-pass'
  | 'release-footage-review'

export type CinematicEvidenceStatus = 'available' | 'held' | 'blocked' | 'needs-review'
export type CinematicProductionScope = 'prototype' | 'demo' | 'vertical-slice' | 'complete-game-plan'

export interface CinematicEvidenceLane {
  id: CinematicEvidenceLaneId
  label: string
  status: CinematicEvidenceStatus
  ownerAgent: string
  purpose: string
  requiredEvidence: string[]
  blockers: string[]
  runtimeLane: 'browser-review' | 'studio-local' | 'cloud-video-provider' | 'cloud-stream'
  userVisibleCopy: string
}

export interface CinematicEvidencePlan {
  id: string
  state: CinematicEvidenceStatus
  noFinalFootageClaim: true
  route: '/api/ai/video/generate'
  statusRoute: '/api/ai/video/status'
  lanes: CinematicEvidenceLane[]
  requiredEvidence: string[]
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
  copy: {
    draftWarning: 'Draft videos are not final'
    providerRequired: 'Video provider required'
    cloudCost: 'Cloud/video generation cost applies'
    humanReview: 'Human review required'
  }
}

export const CINEMATIC_EVIDENCE_REQUIRED_EVIDENCE = [
  'cinematic intent brief',
  'shot list',
  'storyboard frames',
  'animatic prompt',
  'AI video provider status',
  'draft video review',
  'cutscene continuity receipt',
  'engine render or cloud stream capture',
  'human cinematic approval',
]

function evidenceMissing(requiredEvidence: string[], evidenceRefs: string[]): string[] {
  const evidence = new Set(evidenceRefs)
  return requiredEvidence.filter((item) => !evidence.has(item))
}

function laneStatus(input: {
  evidenceRefs: string[]
  requiredEvidence: string[]
  blockers: string[]
  reviewOnly?: boolean
}): CinematicEvidenceStatus {
  if (input.blockers.length > 0) return 'blocked'
  if (evidenceMissing(input.requiredEvidence, input.evidenceRefs).length > 0) return 'held'
  return input.reviewOnly ? 'needs-review' : 'available'
}

function buildLane(input: {
  id: CinematicEvidenceLaneId
  label: string
  ownerAgent: string
  purpose: string
  requiredEvidence: string[]
  blockers?: string[]
  evidenceRefs: string[]
  runtimeLane: CinematicEvidenceLane['runtimeLane']
  userVisibleCopy: string
  reviewOnly?: boolean
}): CinematicEvidenceLane {
  const blockers = input.blockers ?? []
  return {
    id: input.id,
    label: input.label,
    ownerAgent: input.ownerAgent,
    purpose: input.purpose,
    requiredEvidence: input.requiredEvidence,
    blockers,
    status: laneStatus({
      evidenceRefs: input.evidenceRefs,
      requiredEvidence: input.requiredEvidence,
      blockers,
      reviewOnly: input.reviewOnly,
    }),
    runtimeLane: input.runtimeLane,
    userVisibleCopy: input.userVisibleCopy,
  }
}

export function buildCinematicEvidencePlan(input: {
  scope: CinematicProductionScope
  evidenceRefs?: string[]
  videoProviderConfigured?: boolean
  cloudStreamConfigured?: boolean
}): CinematicEvidencePlan {
  const evidenceRefs = input.evidenceRefs ?? []
  const videoProviderConfigured = input.videoProviderConfigured === true
  const cloudStreamConfigured = input.cloudStreamConfigured === true
  const lanes: CinematicEvidenceLane[] = [
    buildLane({
      id: 'storyboard',
      label: 'Storyboard',
      ownerAgent: 'Cinematic Director Agent',
      purpose: 'Lock intent, camera language, emotional beat, and gameplay handoff before expensive video generation.',
      requiredEvidence: ['cinematic intent brief', 'shot list', 'storyboard frames'],
      evidenceRefs,
      runtimeLane: 'browser-review',
      userVisibleCopy: 'Plan the scene before generating footage.',
    }),
    buildLane({
      id: 'shot-blocking',
      label: 'Shot blocking',
      ownerAgent: 'Cinematic Director Agent',
      purpose: 'Block camera, subject, lens, motion, and handoff timing against the gameplay loop.',
      requiredEvidence: ['shot list', 'cutscene continuity receipt'],
      evidenceRefs,
      runtimeLane: 'studio-local',
      userVisibleCopy: 'Studio Local should own heavy shot assembly when available.',
    }),
    buildLane({
      id: 'animatic-draft',
      label: 'Animatic draft',
      ownerAgent: 'Video Evidence Agent',
      purpose: 'Create cheap timing evidence before high-cost render or final provider calls.',
      requiredEvidence: ['animatic prompt', 'draft video review'],
      evidenceRefs,
      runtimeLane: 'browser-review',
      userVisibleCopy: 'Draft videos are not final.',
    }),
    buildLane({
      id: 'ai-video-reference',
      label: 'AI video reference',
      ownerAgent: 'Video Evidence Agent',
      purpose: 'Use /api/ai/video/generate as a governed reference lane for mood, timing, camera and trailer studies.',
      requiredEvidence: ['AI video provider status', 'animatic prompt', 'draft video review', 'cutscene continuity receipt'],
      blockers: videoProviderConfigured ? [] : ['Video provider required'],
      evidenceRefs,
      runtimeLane: 'cloud-video-provider',
      userVisibleCopy: 'Cloud/video generation cost applies; generated clips require human review.',
      reviewOnly: true,
    }),
    buildLane({
      id: 'engine-render-pass',
      label: 'Engine render pass',
      ownerAgent: 'Technical Cinematic Artist Agent',
      purpose: 'Capture evidence from the actual playable scene so cinematics match gameplay, assets, lighting and performance.',
      requiredEvidence: ['engine render or cloud stream capture', 'cutscene continuity receipt'],
      evidenceRefs,
      runtimeLane: 'studio-local',
      userVisibleCopy: 'Engine footage beats standalone prompt footage when validating the actual game.',
      reviewOnly: true,
    }),
    buildLane({
      id: 'release-footage-review',
      label: 'Release footage review',
      ownerAgent: 'Release Producer Agent',
      purpose: 'Hold public footage until provenance, runtime capture, continuity and human approval are attached.',
      requiredEvidence: ['engine render or cloud stream capture', 'human cinematic approval'],
      blockers: cloudStreamConfigured || input.scope === 'prototype' ? [] : ['Cloud Stream is held until configured for final review.'],
      evidenceRefs,
      runtimeLane: 'cloud-stream',
      userVisibleCopy: 'Human review required before release footage.',
      reviewOnly: true,
    }),
  ]

  const requiredEvidence = Array.from(new Set(lanes.flatMap((lane) => lane.requiredEvidence)))
  const missingEvidence = evidenceMissing(requiredEvidence, evidenceRefs)
  const blockers = lanes.flatMap((lane) => lane.blockers.map((blocker) => `${lane.label}: ${blocker}`))
  const state: CinematicEvidenceStatus =
    blockers.length > 0
      ? 'blocked'
      : missingEvidence.length > 0
        ? 'held'
        : 'needs-review'

  return {
    id: `${input.scope}:cinematic-evidence:v1`,
    state,
    noFinalFootageClaim: true,
    route: '/api/ai/video/generate',
    statusRoute: '/api/ai/video/status',
    lanes,
    requiredEvidence,
    missingEvidence,
    blockers,
    nextAction:
      state === 'blocked'
        ? 'Resolve provider/runtime blockers before agents create cinematic evidence.'
        : state === 'held'
          ? 'Attach storyboard, animatic, provider, continuity, runtime capture, and review evidence before cinematic claims.'
          : 'Request human cinematic approval before public footage or trailer claims.',
    copy: {
      draftWarning: 'Draft videos are not final',
      providerRequired: 'Video provider required',
      cloudCost: 'Cloud/video generation cost applies',
      humanReview: 'Human review required',
    },
  }
}
