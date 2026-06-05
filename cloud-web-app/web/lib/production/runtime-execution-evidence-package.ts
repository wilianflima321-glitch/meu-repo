import type { AgenticProductionState } from '@/lib/production/agentic-production-state'
import type { GovernedRuntimeJob } from '@/lib/production/governed-runtime-jobs'
import {
  evaluateRuntimeJobReceiptCoverage,
  type RuntimeJobReceiptCoverage,
  type RuntimeJobReceiptState,
} from '@/lib/production/runtime-job-receipts'
import {
  buildReleaseEvidencePackageManifest,
  buildReleaseEvidenceReadinessSnapshot,
  verifyReleaseEvidencePackageManifest,
} from '@/lib/production/release-evidence-readiness'
import type {
  ReleaseEvidencePackageManifest,
  ReleaseEvidencePackageManifestVerification,
  ReleaseEvidenceReadinessSnapshot,
} from '@/lib/production/release-evidence-readiness.contracts'

export const RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY = 'AETHEL_RUNTIME_EXECUTION_EVIDENCE_PACKAGE'

export type RuntimeExecutionEvidencePackageStatus = 'blocked' | 'needs-review'

export interface RuntimeExecutionEvidencePackageInput {
  projectId?: string
  projectName?: string
  state: AgenticProductionState
  job: GovernedRuntimeJob
  receiptState?: RuntimeJobReceiptState | null
  generatedBy?: string
  generatedAt?: string
}

export interface RuntimeExecutionEvidencePackage {
  version: 1
  capability: typeof RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY
  packageId: string
  generatedAt: string
  generatedBy: string
  job: {
    id: string
    kind: GovernedRuntimeJob['kind']
    runtimeTarget: GovernedRuntimeJob['runtimeTarget']
    state: GovernedRuntimeJob['state']
    executionAllowed: boolean
    humanReviewRequired: true
  }
  receiptCoverage: RuntimeJobReceiptCoverage
  releaseSnapshot: ReleaseEvidenceReadinessSnapshot
  releaseManifest: ReleaseEvidencePackageManifest
  manifestVerification: ReleaseEvidencePackageManifestVerification
  status: RuntimeExecutionEvidencePackageStatus
  releaseReady: false
  executionEvidenceComplete: boolean
  humanApprovalRequired: true
  manualPublishRequired: true
  blockers: string[]
  evidenceRefs: string[]
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  nextAction: string
}

export interface RuntimeExecutionEvidencePackageVerification {
  valid: boolean
  releaseReady: false
  manualPublishRequired: true
  errors: string[]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function statusFor(blockers: string[]): RuntimeExecutionEvidencePackageStatus {
  return blockers.length > 0 ? 'blocked' : 'needs-review'
}

export function buildRuntimeExecutionEvidencePackage(
  input: RuntimeExecutionEvidencePackageInput,
): RuntimeExecutionEvidencePackage {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const receiptCoverage = evaluateRuntimeJobReceiptCoverage({
    job: input.job,
    receiptState: input.receiptState,
  })
  const releaseSnapshot = buildReleaseEvidenceReadinessSnapshot({
    state: input.state,
    runtimeReceiptState: input.receiptState,
    now: generatedAt,
  })
  const releaseManifest = buildReleaseEvidencePackageManifest({
    state: input.state,
    snapshot: releaseSnapshot,
    projectId: input.projectId,
    projectName: input.projectName,
    generatedBy: input.generatedBy ?? 'Aethel Runtime Execution Evidence Package',
    generatedAt,
  })
  const manifestVerification = verifyReleaseEvidencePackageManifest(releaseManifest)
  const blockers = unique([
    ...input.job.blockers,
    ...receiptCoverage.blockers,
    ...releaseSnapshot.blockers,
    ...manifestVerification.errors,
    ...(input.job.executionAllowed ? [] : ['Governed runtime job execution was not allowed at package time.']),
    'Human release approval is required before final/public claims.',
  ])
  const evidenceRefs = unique([
    `runtime-job:${input.job.id}`,
    ...input.job.evidenceRefs,
    ...releaseSnapshot.evidenceRefs,
    ...(input.receiptState?.receipts.filter((receipt) => receipt.jobId === input.job.id).flatMap((receipt) => receipt.refs) ?? []),
    `release-manifest:${releaseManifest.packageId}`,
    `release-manifest-integrity:${releaseManifest.integrityHash}`,
  ])

  return {
    version: 1,
    capability: RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY,
    packageId: `runtime-execution-evidence:${input.projectId ?? 'project'}:${input.job.id}:${generatedAt}`,
    generatedAt,
    generatedBy: input.generatedBy ?? 'Aethel Runtime Execution Evidence Package',
    job: {
      id: input.job.id,
      kind: input.job.kind,
      runtimeTarget: input.job.runtimeTarget,
      state: input.job.state,
      executionAllowed: input.job.executionAllowed,
      humanReviewRequired: true,
    },
    receiptCoverage,
    releaseSnapshot,
    releaseManifest,
    manifestVerification,
    status: statusFor(blockers),
    releaseReady: false,
    executionEvidenceComplete: receiptCoverage.missingKinds.length === 0 && receiptCoverage.blockers.length === 0,
    humanApprovalRequired: true,
    manualPublishRequired: true,
    blockers,
    evidenceRefs,
    claimPolicy: {
      allowedClaims: [
        'runtime evidence package generated',
        'receipt coverage calculated',
        'release manifest integrity checked',
        'human review can be requested when blockers are cleared',
      ],
      prohibitedClaims: [
        'final',
        'production ready',
        'AAA pronto',
        'Unreal-grade',
        'automatic publish',
        'releaseReady=true',
      ],
    },
    nextAction:
      blockers.length > 1
        ? 'Capture missing runtime receipts, resolve release evidence blockers, and request human review only after coverage is complete.'
        : 'Execution evidence is packaged; request human review before final/public claims.',
  }
}

export function verifyRuntimeExecutionEvidencePackage(
  evidencePackage: RuntimeExecutionEvidencePackage,
): RuntimeExecutionEvidencePackageVerification {
  const errors = unique([
    ...(evidencePackage.capability === RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY
      ? []
      : ['Package capability is not runtime execution evidence.']),
    ...(evidencePackage.releaseReady === false ? [] : ['Runtime execution package cannot set releaseReady=true.']),
    ...(evidencePackage.manualPublishRequired === true ? [] : ['Runtime execution package must require manual publish.']),
    ...(evidencePackage.humanApprovalRequired === true ? [] : ['Runtime execution package must require human approval.']),
    ...(evidencePackage.manifestVerification.valid ? [] : evidencePackage.manifestVerification.errors),
    ...(evidencePackage.claimPolicy.prohibitedClaims.includes('automatic publish')
      ? []
      : ['Claim policy must prohibit automatic publish.']),
  ])

  return {
    valid: errors.length === 0,
    releaseReady: false,
    manualPublishRequired: true,
    errors,
  }
}
