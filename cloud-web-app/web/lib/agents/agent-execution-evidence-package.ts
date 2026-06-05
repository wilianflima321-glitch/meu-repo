import type { AgentRunLedger } from '@/lib/server/agent-run-ledger'
import type { AgentReadReceiptState } from '@/lib/production/agent-read-receipts'
import type { ContextMemorySpinePlan } from '@/lib/production/context-memory-spine'
import {
  buildAgentRuntimeSpinePlan,
  validateAgentRuntimeSpinePlan,
  type AgentRuntimeSpinePlan,
} from '@/lib/agents/agent-runtime-spine'
import type { AgentType } from '@/lib/agent-orchestrator'

export const AGENT_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY = 'AETHEL_AGENT_EXECUTION_EVIDENCE_PACKAGE'

export type AgentExecutionEvidencePackageStatus = 'blocked' | 'needs-review'

export interface AgentExecutionEvidencePackageInput {
  projectId?: string
  ledger: AgentRunLedger
  readReceiptState?: AgentReadReceiptState | null
  memoryPlan?: ContextMemorySpinePlan | null
  selectedAgents?: AgentType[]
  toolRegistryAvailable?: boolean
  sandboxProvider?: 'none' | 'local-script-sandbox' | 'vercel-sandbox' | 'studio-local'
  browserReplayEnabled?: boolean
  vectorStoreProvider?: 'none' | 'local-index' | 'cloud-index'
  roleEvalSuiteAvailable?: boolean
  humanApprovalRequired?: boolean
  generatedBy?: string
  generatedAt?: string
}

export interface AgentExecutionEvidencePackage {
  version: 1
  capability: typeof AGENT_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY
  packageId: string
  generatedAt: string
  generatedBy: string
  runtimePlan: AgentRuntimeSpinePlan
  runSummary: AgentRunLedger['summary']
  readReceiptCount: number
  toolReceiptCount: number
  sandboxReceiptCount: number
  browserReplayReceiptCount: number
  reviewArtifactCount: number
  status: AgentExecutionEvidencePackageStatus
  autonomousExecutionReady: false
  releaseReady: false
  humanApprovalRequired: true
  manualApplyRequired: true
  blockers: string[]
  evidenceRefs: string[]
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  nextAction: string
}

export interface AgentExecutionEvidencePackageVerification {
  valid: boolean
  autonomousExecutionReady: false
  releaseReady: false
  manualApplyRequired: true
  errors: string[]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function collectLedgerEvidenceRefs(ledger: AgentRunLedger): string[] {
  return unique([
    'agent-run-ledger',
    ...ledger.entries.map((entry) => `agent-run:${entry.sessionId}`),
    ...ledger.entries.flatMap((entry) => entry.evidenceRefs),
    ...ledger.entries.flatMap((entry) => entry.artifacts.map((artifact) => `${artifact.kind}:${artifact.ref}`)),
  ])
}

function collectReadReceiptRefs(receiptState?: AgentReadReceiptState | null): string[] {
  return unique(receiptState?.receipts.flatMap((receipt) => [
    `agent-read-receipt:${receipt.id}`,
    ...receipt.evidenceRefs,
  ]) ?? [])
}

function countRefs(refs: string[], pattern: RegExp): number {
  return refs.filter((ref) => pattern.test(ref.toLowerCase())).length
}

function statusFor(blockers: string[]): AgentExecutionEvidencePackageStatus {
  return blockers.length > 0 ? 'blocked' : 'needs-review'
}

function inferSelectedAgents(input: AgentExecutionEvidencePackageInput): AgentType[] | undefined {
  if (input.selectedAgents?.length) return input.selectedAgents
  const roles = unique(input.ledger.entries.map((entry) => entry.role.toLowerCase()))
  const supported = ['architect', 'designer', 'engineer', 'qa', 'devops', 'researcher', 'product'] as AgentType[]
  const inferred = supported.filter((agent) => roles.some((role) => role.includes(agent)))
  return inferred.length ? inferred : undefined
}

export function buildAgentExecutionEvidencePackage(
  input: AgentExecutionEvidencePackageInput,
): AgentExecutionEvidencePackage {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const ledgerEvidenceRefs = collectLedgerEvidenceRefs(input.ledger)
  const readReceiptRefs = collectReadReceiptRefs(input.readReceiptState)
  const evidenceRefs = unique([...ledgerEvidenceRefs, ...readReceiptRefs])
  const runtimePlan = buildAgentRuntimeSpinePlan({
    selectedAgents: inferSelectedAgents(input),
    memoryPlan: input.memoryPlan,
    toolRegistryAvailable: input.toolRegistryAvailable ?? countRefs(evidenceRefs, /tool/) > 0,
    sandboxProvider: input.sandboxProvider ?? (countRefs(evidenceRefs, /sandbox/) > 0 ? 'local-script-sandbox' : 'none'),
    browserReplayEnabled: input.browserReplayEnabled ?? countRefs(evidenceRefs, /browser|replay|screenshot/) > 0,
    vectorStoreProvider: input.vectorStoreProvider ?? 'none',
    roleEvalSuiteAvailable: input.roleEvalSuiteAvailable ?? countRefs(evidenceRefs, /eval/) > 0,
    humanApprovalRequired: input.humanApprovalRequired ?? true,
    evidenceRefs,
  })
  const runtimeFailures = validateAgentRuntimeSpinePlan(runtimePlan)
  const blockers = unique([
    ...runtimePlan.blockers,
    ...runtimeFailures,
    ...input.ledger.entries.flatMap((entry) => entry.missingMarketEvidence),
    ...(input.ledger.summary.totalRuns > 0 ? [] : ['No agent runs are persisted for this project.']),
    ...(readReceiptRefs.length > 0 ? [] : ['Agent read receipts are required before broad context or apply claims.']),
    ...(input.ledger.summary.runsWithReviewArtifact > 0 ? [] : ['Agent output needs a PR, preview, replay, or review artifact.']),
    'Autonomous agent execution cannot be marked ready automatically.',
  ])

  return {
    version: 1,
    capability: AGENT_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY,
    packageId: `agent-execution-evidence:${input.projectId ?? 'project'}:${generatedAt}`,
    generatedAt,
    generatedBy: input.generatedBy ?? 'Aethel Agent Execution Evidence Package',
    runtimePlan,
    runSummary: input.ledger.summary,
    readReceiptCount: input.readReceiptState?.receipts.length ?? 0,
    toolReceiptCount: countRefs(evidenceRefs, /tool/),
    sandboxReceiptCount: countRefs(evidenceRefs, /sandbox/),
    browserReplayReceiptCount: countRefs(evidenceRefs, /browser|replay|screenshot/),
    reviewArtifactCount: input.ledger.summary.runsWithReviewArtifact,
    status: statusFor(blockers),
    autonomousExecutionReady: false,
    releaseReady: false,
    humanApprovalRequired: true,
    manualApplyRequired: true,
    blockers,
    evidenceRefs,
    claimPolicy: {
      allowedClaims: [
        'agent run ledger packaged',
        'read receipts attached when available',
        'runtime capability state calculated',
        'human review can be requested when blockers are cleared',
      ],
      prohibitedClaims: [
        'autonomous execution ready',
        'agent completed without review',
        'production ready',
        'releaseReady=true',
        'apply without approval',
      ],
    },
    nextAction:
      blockers.length > 1
        ? 'Attach read receipts, sandbox/tool/browser evidence, and a review artifact before agent apply claims.'
        : 'Agent execution evidence is packaged; request human review before apply/release claims.',
  }
}

export function verifyAgentExecutionEvidencePackage(
  evidencePackage: AgentExecutionEvidencePackage,
): AgentExecutionEvidencePackageVerification {
  const errors = unique([
    ...(evidencePackage.capability === AGENT_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY
      ? []
      : ['Package capability is not agent execution evidence.']),
    ...(evidencePackage.autonomousExecutionReady === false
      ? []
      : ['Agent execution package cannot set autonomousExecutionReady=true.']),
    ...(evidencePackage.releaseReady === false ? [] : ['Agent execution package cannot set releaseReady=true.']),
    ...(evidencePackage.manualApplyRequired ? [] : ['Agent execution package must require manual apply.']),
    ...(evidencePackage.humanApprovalRequired ? [] : ['Agent execution package must require human approval.']),
    ...(evidencePackage.claimPolicy.prohibitedClaims.includes('apply without approval')
      ? []
      : ['Claim policy must prohibit apply without approval.']),
  ])

  return {
    valid: errors.length === 0,
    autonomousExecutionReady: false,
    releaseReady: false,
    manualApplyRequired: true,
    errors,
  }
}
