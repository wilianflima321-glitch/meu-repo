import type { ResearchIntelligencePacket } from '@/lib/production/research-intelligence-bridge'
import {
  buildResearchRuntimeSpinePlan,
  validateResearchRuntimeSpinePlan,
  type ResearchRuntimeSpinePlan,
} from '@/lib/research/research-runtime-spine'
import type { BrowserOperatorRun } from '@/lib/server/browser-operator-recorder'

export const RESEARCH_EVIDENCE_PACKAGE_CAPABILITY = 'AETHEL_RESEARCH_EVIDENCE_PACKAGE'

export type ResearchEvidencePackageStatus = 'blocked' | 'needs-review'

export interface ResearchEvidencePackageInput {
  packet: ResearchIntelligencePacket
  browserRuns?: BrowserOperatorRun[]
  artifactRefs?: string[]
  costEstimateUsd?: number | null
  finalAnswerReady?: boolean
  humanReviewed?: boolean
  generatedBy?: string
  generatedAt?: string
}

export interface ResearchEvidencePackage {
  version: 1
  capability: typeof RESEARCH_EVIDENCE_PACKAGE_CAPABILITY
  packageId: string
  generatedAt: string
  generatedBy: string
  mission: string
  sourceReceiptCount: number
  browserReplayReceiptCount: number
  artifactRefs: string[]
  confidence: ResearchRuntimeSpinePlan['confidence']
  costEstimateUsd: number | null
  runtimePlan: ResearchRuntimeSpinePlan
  status: ResearchEvidencePackageStatus
  researchVerified: false
  finalAnswerReleaseReady: false
  humanApprovalRequired: true
  manualPublishRequired: true
  blockers: string[]
  evidenceRefs: string[]
  browserReplay: {
    required: boolean
    attached: boolean
    timelineHashes: string[]
    takeoverControlsRequired: true
  }
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  nextAction: string
}

export interface ResearchEvidencePackageVerification {
  valid: boolean
  researchVerified: false
  finalAnswerReleaseReady: false
  manualPublishRequired: true
  errors: string[]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function includesEvidence(ref: string, pattern: RegExp): boolean {
  return pattern.test(ref.toLowerCase())
}

function packetEvidenceRefs(packet: ResearchIntelligencePacket): string[] {
  return unique([
    `research-intelligence:${packet.id}`,
    ...packet.sources.map((source) => `research-source:${source.id}`),
    ...packet.claims.flatMap((claim) => claim.evidenceRefs),
    ...packet.claims.map((claim) => `research-claim:${claim.id}`),
  ])
}

function browserReplayRequired(packet: ResearchIntelligencePacket): boolean {
  return packet.sources.some((source) => source.sourceKind === 'browser-operator' || source.requiresBrowserReplay)
}

function browserReplayAttached(input: { packet: ResearchIntelligencePacket; browserRuns: BrowserOperatorRun[]; evidenceRefs: string[] }): boolean {
  if (input.browserRuns.some((run) => run.steps.length > 0 && run.timelineHash && run.status !== 'cancelled')) return true
  return input.evidenceRefs.some((ref) => includesEvidence(ref, /browser|replay|dom|screenshot/))
}

function confidenceScores(packet: ResearchIntelligencePacket): number[] {
  return [...packet.sources.map((source) => source.confidence), ...packet.claims.map((claim) => claim.confidence)]
}

function statusFor(blockers: string[]): ResearchEvidencePackageStatus {
  return blockers.length > 0 ? 'blocked' : 'needs-review'
}

export function buildResearchEvidencePackage(input: ResearchEvidencePackageInput): ResearchEvidencePackage {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const artifactRefs = unique(input.artifactRefs ?? [])
  const evidenceRefs = packetEvidenceRefs(input.packet)
  const replayRequired = browserReplayRequired(input.packet)
  const replayAttached = browserReplayAttached({
    packet: input.packet,
    browserRuns: input.browserRuns ?? [],
    evidenceRefs,
  })
  const runtimePlan = buildResearchRuntimeSpinePlan({
    query: input.packet.mission,
    sourceCount: input.packet.sources.length,
    browserReplayEnabled: !replayRequired || replayAttached,
    artifactPersistenceEnabled: artifactRefs.length > 0 || evidenceRefs.some((ref) => includesEvidence(ref, /artifact|packet/)),
    confidenceScores: confidenceScores(input.packet),
    costEstimateUsd: input.costEstimateUsd,
    finalAnswerReady: input.finalAnswerReady,
    humanReviewed: input.humanReviewed,
    evidenceRefs: unique([...evidenceRefs, ...artifactRefs]),
  })
  const runtimeFailures = validateResearchRuntimeSpinePlan(runtimePlan)
  const blockers = unique([
    ...runtimePlan.blockers,
    ...runtimeFailures,
    ...input.packet.risks
      .filter((risk) => risk.severity === 'blocker' || risk.severity === 'high')
      .map((risk) => risk.title),
    ...(replayRequired && !replayAttached ? ['Browser replay receipts are required before live-navigation claims.'] : []),
    ...(typeof input.costEstimateUsd === 'number' ? [] : ['Research cost estimate is missing.']),
    ...(input.humanReviewed ? [] : ['Human review is required before final research claims.']),
    'Research delivery cannot be marked verified automatically.',
  ])
  const browserRuns = input.browserRuns ?? []

  return {
    version: 1,
    capability: RESEARCH_EVIDENCE_PACKAGE_CAPABILITY,
    packageId: `research-evidence:${input.packet.projectId}:${input.packet.id}:${generatedAt}`,
    generatedAt,
    generatedBy: input.generatedBy ?? 'Aethel Research Evidence Package',
    mission: input.packet.mission,
    sourceReceiptCount: input.packet.sources.length,
    browserReplayReceiptCount: browserRuns.filter((run) => run.steps.length > 0).length,
    artifactRefs,
    confidence: runtimePlan.confidence,
    costEstimateUsd: typeof input.costEstimateUsd === 'number' ? input.costEstimateUsd : null,
    runtimePlan,
    status: statusFor(blockers),
    researchVerified: false,
    finalAnswerReleaseReady: false,
    humanApprovalRequired: true,
    manualPublishRequired: true,
    blockers,
    evidenceRefs: unique([
      ...evidenceRefs,
      ...artifactRefs,
      ...browserRuns.map((run) => `browser-run:${run.runId}`),
      ...browserRuns.map((run) => `browser-timeline:${run.timelineHash}`),
    ]),
    browserReplay: {
      required: replayRequired,
      attached: replayAttached,
      timelineHashes: unique(browserRuns.map((run) => run.timelineHash)),
      takeoverControlsRequired: true,
    },
    claimPolicy: {
      allowedClaims: [
        'research evidence package generated',
        'sources attached',
        'browser replay receipt attached when available',
        'final answer can be reviewed when blockers are cleared',
      ],
      prohibitedClaims: [
        'research verified',
        'final answer approved',
        'Manus-grade verified',
        'autonomous web navigation complete',
        'production ready',
      ],
    },
    nextAction:
      blockers.length > 1
        ? 'Attach missing sources, replay, artifacts, cost, and human review before final research delivery.'
        : 'Research evidence is packaged; request human review before final delivery claims.',
  }
}

export function verifyResearchEvidencePackage(evidencePackage: ResearchEvidencePackage): ResearchEvidencePackageVerification {
  const errors = unique([
    ...(evidencePackage.capability === RESEARCH_EVIDENCE_PACKAGE_CAPABILITY
      ? []
      : ['Package capability is not research evidence.']),
    ...(evidencePackage.researchVerified === false ? [] : ['Research evidence package cannot set researchVerified=true.']),
    ...(evidencePackage.finalAnswerReleaseReady === false
      ? []
      : ['Research evidence package cannot set finalAnswerReleaseReady=true.']),
    ...(evidencePackage.manualPublishRequired ? [] : ['Research evidence package must require manual publish.']),
    ...(evidencePackage.humanApprovalRequired ? [] : ['Research evidence package must require human approval.']),
    ...(evidencePackage.claimPolicy.prohibitedClaims.includes('research verified')
      ? []
      : ['Claim policy must prohibit research verified claims.']),
    ...(evidencePackage.browserReplay.required && !evidencePackage.browserReplay.attached
      ? ['Required browser replay receipts are missing.']
      : []),
  ])

  return {
    valid: errors.length === 0,
    researchVerified: false,
    finalAnswerReleaseReady: false,
    manualPublishRequired: true,
    errors,
  }
}
