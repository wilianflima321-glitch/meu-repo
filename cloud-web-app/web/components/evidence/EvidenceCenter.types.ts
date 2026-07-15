import type { LucideIcon } from 'lucide-react'
import type { ProductionGraphNode } from '@/lib/production/agentic-production-state'

export type EvidenceProjectSummary = {
  id: string
  name: string
  description?: string | null
}

export type EvidenceMetric = [string, string | number, LucideIcon]
export type EvidenceGraphEntry = [string, ProductionGraphNode[]]

export type ResearchNavigationMeshSnapshot = {
  capabilityStatus: 'available' | 'held' | 'blocked' | 'needs-review'
  recommendedLane: string | null
  lanes: Array<{
    laneId: string
    label: string
    status: 'available' | 'held' | 'blocked' | 'needs-review'
    missingCapabilities: string[]
    blockers: string[]
    nextAction: string
  }>
  marketParityCoverage: string[]
  limitations: string[]
  nextAction: string
}

export type ReleaseEvidenceReadinessSnapshot = {
  capabilityStatus: 'blocked' | 'needs-review' | 'evidence-backed'
  status: 'blocked' | 'needs-review' | 'evidence-backed'
  releaseReady: false
  humanApprovalRequired: true
  canRequestHumanReview: boolean
  scorePercent: number
  coveredRequiredLanes: number
  totalRequiredLanes: number
  lanes: Array<{
    id: string
    label: string
    required: boolean
    status: 'covered' | 'missing' | 'needs-review' | 'blocked'
    evidenceRefs: string[]
    missingEvidence: string[]
    blockers: string[]
    nextAction: string
  }>
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
}

export type ReleaseEvidencePackageManifest = {
  packageId: string
  generatedAt: string
  integrityHash: string
  readiness: {
    status: 'blocked' | 'needs-review' | 'evidence-backed'
    releaseReady: false
    manualPublishRequired: true
  }
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  evidenceRefs: string[]
}

export type ReleaseEvidencePackageManifestVerification = {
  valid: boolean
  actualHash: string
  expectedHash: string
  errors: string[]
  releaseReady: false
  manualPublishRequired: true
}

export type ReleaseReviewState =
  | 'idle'
  | 'requesting'
  | 'requested'
  | 'deciding'
  | 'approved'
  | 'rejected'
  | 'blocked'
  | 'error'
export type ReleaseReviewAction =
  | 'request-human-review'
  | 'record-human-approval'
  | 'reject-human-review'

export type ProductionBiblePlanSummary = {
  releaseState: string
  uxDisclosure: string
  nextAction: string
  productionGraphs: Array<{ id: string; userValue: string }>
  genrePack: {
    label: string
    cameraModel: string
    inputModel: string
    coreLoop: string[]
  }
  playtestSpine: {
    state: string
    scenarios: unknown[]
  }
  cinematicEvidence: {
    state: string
    lanes: unknown[]
    copy: { cloudCost: string }
  }
  productionBible: {
    pillars: string[]
    firstUserDecision: string
    deepBible: {
      scenes: unknown[]
      characters: unknown[]
      evidenceModel: { requiredEvidence: unknown[] }
    }
  }
}

export type AgentLedgerEntry = {
  id: string
  phase: string
  state: string
  summary: string
  ownerAgent: string
  estimatedCostUsd: number
}
