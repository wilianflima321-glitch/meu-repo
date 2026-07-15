import type { AgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  type RuntimeResilienceLedger,
  validateRuntimeResilienceLedger,
} from '@aethel/runtime/runtime-resilience-ledger'
import type { GovernedRuntimeJob } from '@/lib/production/governed-runtime-jobs'
import type { RuntimeFailureSmokeBrowserRunnerState } from '@/lib/production/runtime-failure-smoke-browser-runner-state'
import type { RuntimeFailureSmokePackState } from '@/lib/production/runtime-failure-smoke-pack-state'
import type { V29SidecarInstallManifest } from '@aethel/runtime/v29-sidecar-install-manifest'
import type { V29SidecarLifecycleReport } from '@aethel/runtime/v29-sidecar-lifecycle'
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
  failureSmokePackState?: RuntimeFailureSmokePackState | null
  failureSmokeBrowserRunnerState?: RuntimeFailureSmokeBrowserRunnerState | null
  sidecarLifecycleReport?: V29SidecarLifecycleReport | null
  sidecarInstallManifest?: V29SidecarInstallManifest | null
  resilienceLedger?: RuntimeResilienceLedger | null
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
  failureSmokePackState: RuntimeFailureSmokePackState | null
  failureSmokeBrowserRunnerState: RuntimeFailureSmokeBrowserRunnerState | null
  sidecarLifecycleReport: V29SidecarLifecycleReport | null
  sidecarInstallManifest: V29SidecarInstallManifest | null
  resilienceLedger: RuntimeResilienceLedger | null
  resilienceLedgerVerification: string[]
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
  const resilienceLedgerVerification = input.resilienceLedger
    ? validateRuntimeResilienceLedger(input.resilienceLedger)
    : ['Runtime resilience ledger is missing from the evidence package.']
  const blockers = unique([
    ...input.job.blockers,
    ...receiptCoverage.blockers,
    ...releaseSnapshot.blockers,
    ...manifestVerification.errors,
    ...resilienceLedgerVerification,
    ...(input.failureSmokePackState ? [] : ['Runtime failure smoke pack state is missing from the evidence package.']),
    ...(input.failureSmokePackState?.summary.releaseReady === false ? [] : ['Runtime failure smoke pack state cannot be release ready.']),
    ...(input.failureSmokeBrowserRunnerState
      ? []
      : ['Runtime failure smoke browser runner state is missing from the evidence package.']),
    ...(input.failureSmokeBrowserRunnerState?.summary.releaseReady === false
      ? []
      : ['Runtime failure smoke browser runner state cannot be release ready.']),
    ...((input.failureSmokeBrowserRunnerState?.summary.strictReceiptMatchCount ?? 0) >= 2
      ? []
      : ['Runtime failure smoke browser runner receipts are incomplete.']),
    ...(input.sidecarLifecycleReport ? [] : ['Sidecar lifecycle report is missing from the evidence package.']),
    ...(input.sidecarLifecycleReport?.summary.releaseReady === false
      ? []
      : ['Sidecar lifecycle report cannot be release ready.']),
    ...((input.sidecarLifecycleReport?.summary.checksumVerified ?? 0) >= 1
      ? []
      : ['Sidecar lifecycle checksum evidence is missing.']),
    ...((input.sidecarLifecycleReport?.summary.healthChecked ?? 0) >= 1
      ? []
      : ['Sidecar lifecycle health evidence is missing.']),
    ...(input.sidecarInstallManifest ? [] : ['Sidecar install manifest is missing from the evidence package.']),
    ...(input.sidecarInstallManifest?.summary.releaseReady === false
      ? []
      : ['Sidecar install manifest cannot be release ready.']),
    ...((input.sidecarInstallManifest?.summary.checksumCoverage ?? 0) >= 1
      ? []
      : ['Sidecar install checksum evidence is missing.']),
    ...((input.sidecarInstallManifest?.summary.signatureCoverage ?? 0) >= 1
      ? []
      : ['Sidecar install signature evidence is missing.']),
    ...(input.resilienceLedger?.summary.readyForStrongerClaims === false
      ? ['Runtime resilience ledger still blocks stronger reliability claims.']
      : []),
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
    ...(input.resilienceLedger ? [`runtime-resilience-ledger:${input.resilienceLedger.runId}`] : []),
    ...(input.failureSmokePackState ? [`runtime-failure-smoke-pack-state:${input.failureSmokePackState.summary.lastRunId ?? input.failureSmokePackState.projectId}`] : []),
    ...(input.failureSmokePackState?.packs.flatMap((pack) => pack.evidenceRefs) ?? []),
    ...(input.failureSmokeBrowserRunnerState
      ? [
          `runtime-failure-smoke-browser-runner-state:${
            input.failureSmokeBrowserRunnerState.summary.lastRunId ?? input.failureSmokeBrowserRunnerState.projectId
          }`,
        ]
      : []),
    ...(input.failureSmokeBrowserRunnerState?.reports.flatMap((report) => report.evidenceRefs) ?? []),
    ...(input.sidecarLifecycleReport ? [`sidecar-lifecycle-report:${input.sidecarLifecycleReport.generatedAt}`] : []),
    ...(input.sidecarLifecycleReport?.sidecars.flatMap((entry: any) => entry.evidenceRefs) ?? []),
    ...(input.sidecarInstallManifest ? [`sidecar-install-manifest:${input.sidecarInstallManifest.generatedAt}`] : []),
    ...(input.sidecarInstallManifest?.artifacts.flatMap((artifact: any) => artifact.evidenceRefs) ?? []),
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
    failureSmokePackState: input.failureSmokePackState ?? null,
    failureSmokeBrowserRunnerState: input.failureSmokeBrowserRunnerState ?? null,
    sidecarLifecycleReport: input.sidecarLifecycleReport ?? null,
    sidecarInstallManifest: input.sidecarInstallManifest ?? null,
    resilienceLedger: input.resilienceLedger ?? null,
    resilienceLedgerVerification,
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
        'resilience ledger attached',
        'failure smoke pack state attached',
        'failure smoke browser runner evidence attached',
        'sidecar lifecycle evidence attached',
        'sidecar install manifest attached',
        'human review can be requested when blockers are cleared',
      ],
      prohibitedClaims: [
        'final',
        'production ready',
        'AAA pronto',
        'Unreal-grade',
        'automatic publish',
        'releaseReady=true',
        'research verified',
        'desktop ready',
        'native renderer ready',
        'signed installer',
        'public download ready',
        'cloud render available',
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
    ...(evidencePackage.resilienceLedgerVerification.length === 0
      ? []
      : evidencePackage.resilienceLedgerVerification.map((error) => `Runtime resilience ledger error: ${error}`)),
    ...(evidencePackage.failureSmokePackState
      ? []
      : ['Runtime execution package must include failure smoke pack state.']),
    ...(evidencePackage.failureSmokeBrowserRunnerState
      ? []
      : ['Runtime execution package must include failure smoke browser runner state.']),
    ...(evidencePackage.failureSmokeBrowserRunnerState?.summary.releaseReady === false
      ? []
      : ['Runtime failure smoke browser runner state cannot be release ready.']),
    ...((evidencePackage.failureSmokeBrowserRunnerState?.summary.strictReceiptMatchCount ?? 0) >= 2
      ? []
      : ['Runtime failure smoke browser runner receipts are incomplete.']),
    ...(evidencePackage.sidecarLifecycleReport
      ? []
      : ['Runtime execution package must include sidecar lifecycle report.']),
    ...(evidencePackage.sidecarLifecycleReport?.summary.releaseReady === false
      ? []
      : ['Sidecar lifecycle report cannot be release ready.']),
    ...(evidencePackage.sidecarInstallManifest
      ? []
      : ['Runtime execution package must include sidecar install manifest.']),
    ...(evidencePackage.sidecarInstallManifest?.summary.releaseReady === false
      ? []
      : ['Sidecar install manifest cannot be release ready.']),
    ...(evidencePackage.claimPolicy.prohibitedClaims.includes('automatic publish')
      ? []
      : ['Claim policy must prohibit automatic publish.']),
    ...(evidencePackage.claimPolicy.prohibitedClaims.includes('research verified')
      ? []
      : ['Claim policy must prohibit research verified without resilience evidence.']),
    ...(evidencePackage.claimPolicy.prohibitedClaims.includes('signed installer')
      ? []
      : ['Claim policy must prohibit signed installer.']),
    ...(evidencePackage.claimPolicy.prohibitedClaims.includes('public download ready')
      ? []
      : ['Claim policy must prohibit public download ready.']),
  ])

  return {
    valid: errors.length === 0,
    releaseReady: false,
    manualPublishRequired: true,
    errors,
  }
}
