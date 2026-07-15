import type { AgenticProductionState } from '@/lib/production/agentic-production-state'
import type { EvidenceRefCoverageReport } from '@/lib/production/evidence-ref-coverage'
import type { RuntimeJobReceiptState } from '@/lib/production/runtime-job-receipts'

export const RELEASE_EVIDENCE_READINESS_CAPABILITY = 'AETHEL_RELEASE_EVIDENCE_READINESS'

export type ReleaseEvidenceReadinessStatus = 'blocked' | 'needs-review' | 'evidence-backed'
export type ReleaseEvidenceLaneStatus = 'covered' | 'missing' | 'needs-review' | 'blocked'

export type ReleaseEvidenceReadinessLaneId =
  | 'production-state'
  | 'evidence-coverage'
  | 'runtime-receipts'
  | 'asset-final'
  | 'playtest'
  | 'human-approval'

export interface ReleaseEvidenceReadinessLane {
  id: ReleaseEvidenceReadinessLaneId
  label: string
  required: boolean
  status: ReleaseEvidenceLaneStatus
  evidenceRefs: string[]
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
}

export interface ReleaseEvidenceReadinessSnapshot {
  version: 1
  capability: typeof RELEASE_EVIDENCE_READINESS_CAPABILITY
  capabilityStatus: ReleaseEvidenceReadinessStatus
  status: ReleaseEvidenceReadinessStatus
  releaseReady: false
  humanApprovalRequired: true
  canRequestHumanReview: boolean
  scorePercent: number
  coveredRequiredLanes: number
  totalRequiredLanes: number
  lanes: ReleaseEvidenceReadinessLane[]
  evidenceRefs: string[]
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
  updatedAt: string
}

export interface ReleaseEvidenceReadinessInput {
  state: AgenticProductionState
  evidenceCoverage?: EvidenceRefCoverageReport | null
  runtimeReceiptState?: RuntimeJobReceiptState | null
  now?: string
}

export interface ReleaseEvidenceReviewRequestInput {
  state: AgenticProductionState
  snapshot: ReleaseEvidenceReadinessSnapshot
  requestedBy: string
  requestedAt?: string
}

export interface ReleaseEvidenceReviewRequestResult {
  accepted: boolean
  state: AgenticProductionState
  reviewRequestId: string
  releaseReady: false
  blockers: string[]
  nextAction: string
}

export type ReleaseEvidenceReviewDecision = 'approved' | 'rejected'

export interface ReleaseEvidenceReviewDecisionInput {
  state: AgenticProductionState
  snapshot: ReleaseEvidenceReadinessSnapshot
  decision: ReleaseEvidenceReviewDecision
  decidedBy: string
  note?: string
  decidedAt?: string
}

export interface ReleaseEvidenceReviewDecisionResult {
  accepted: boolean
  state: AgenticProductionState
  decisionId: string
  decision: ReleaseEvidenceReviewDecision
  releaseReady: false
  blockers: string[]
  nextAction: string
}

export interface ReleaseEvidencePackageManifestInput {
  state: AgenticProductionState
  snapshot: ReleaseEvidenceReadinessSnapshot
  projectId?: string
  projectName?: string
  generatedBy?: string
  generatedAt?: string
}

export interface ReleaseEvidencePackageManifest {
  version: 1
  packageId: string
  capability: typeof RELEASE_EVIDENCE_READINESS_CAPABILITY
  generatedAt: string
  generatedBy: string
  project: {
    id: string | null
    name: string | null
    domain: AgenticProductionState['brain']['domain']
    objective: string
  }
  readiness: {
    status: ReleaseEvidenceReadinessStatus
    scorePercent: number
    coveredRequiredLanes: number
    totalRequiredLanes: number
    releaseReady: false
    humanApprovalRequired: true
    manualPublishRequired: true
  }
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  lanes: Array<{
    id: ReleaseEvidenceReadinessLaneId
    status: ReleaseEvidenceLaneStatus
    required: boolean
    evidenceCount: number
    missingEvidence: string[]
    blockers: string[]
  }>
  evidenceRefs: string[]
  runtimePolicy: AgenticProductionState['runtimePolicy']
  nextAction: string
  integrityHash: string
}

export interface ReleaseEvidencePackageManifestVerification {
  valid: boolean
  actualHash: string
  expectedHash: string
  errors: string[]
  releaseReady: false
  manualPublishRequired: true
}
