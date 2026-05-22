import { buildAgentExecutionSummary, type AgentExecutionState } from '@/lib/server/agent-observability'
import type { AgentSnapshot } from '@/lib/server/agent-store'

export type AgentRunArtifactKind =
  | 'evidence'
  | 'branch'
  | 'pull-request'
  | 'preview'
  | 'replay'
  | 'log'
  | 'unknown'

export type AgentRunControl =
  | 'follow-up'
  | 'takeover'
  | 'pause'
  | 'approve'
  | 'request-review'

export type AgentRunMarketReadiness = 'blocked' | 'needs-review' | 'evidence-backed'

export type AgentRunArtifact = {
  id: string
  kind: AgentRunArtifactKind
  label: string
  ref: string
  requiredForMarketReady: boolean
}

export type AgentRunLedgerEntry = {
  id: string
  sessionId: string
  userId: string
  task: string
  role: string
  state: AgentExecutionState
  createdAt: string
  updatedAt: string
  branchName: string | null
  pullRequestUrl: string | null
  previewUrl: string | null
  evidenceRefs: string[]
  artifacts: AgentRunArtifact[]
  availableControls: AgentRunControl[]
  marketReadiness: AgentRunMarketReadiness
  missingMarketEvidence: string[]
}

export type AgentRunLedgerSummary = {
  totalRuns: number
  activeRuns: number
  runsWithEvidence: number
  runsWithReviewArtifact: number
  runsReadyForHumanReview: number
  blockedRuns: number
  lastUpdatedAt: string | null
}

export type AgentRunLedger = {
  entries: AgentRunLedgerEntry[]
  summary: AgentRunLedgerSummary
  retention: 'local-agent-store'
  capabilityStatus: 'READY'
  responsibilityModel: 'human-owner-required'
}

export function buildAgentRunLedger(snapshots: AgentSnapshot[], limit = 50): AgentRunLedger {
  const entries = snapshots
    .map(buildAgentRunLedgerEntry)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, Math.min(100, Math.max(1, Math.trunc(limit))))

  return {
    entries,
    summary: summarizeAgentRunLedger(entries),
    retention: 'local-agent-store',
    capabilityStatus: 'READY',
    responsibilityModel: 'human-owner-required',
  }
}

export function buildAgentRunLedgerEntry(snapshot: AgentSnapshot): AgentRunLedgerEntry {
  const summary = buildAgentExecutionSummary(snapshot)
  const status = getRecord(snapshot.status)
  const config = getRecord(snapshot.config)
  const currentTask = getRecord(status.currentTask)
  const evidenceRefs = collectEvidenceRefs(snapshot)
  const branchName = firstString(
    config.branchName,
    config.gitBranch,
    status.branchName,
    status.gitBranch,
    currentTask.branchName,
  )
  const pullRequestUrl = firstString(
    config.pullRequestUrl,
    config.prUrl,
    status.pullRequestUrl,
    status.prUrl,
    currentTask.pullRequestUrl,
  )
  const previewUrl = firstString(
    config.previewUrl,
    config.deploymentUrl,
    status.previewUrl,
    status.deploymentUrl,
    currentTask.previewUrl,
  )
  const artifacts = collectArtifacts({ evidenceRefs, branchName, pullRequestUrl, previewUrl, snapshot })
  const missingMarketEvidence = missingEvidenceForMarketReadiness({
    state: summary.state,
    evidenceRefs,
    branchName,
    pullRequestUrl,
    previewUrl,
    artifacts,
  })

  return {
    id: `agent-run:${snapshot.sessionId}`,
    sessionId: snapshot.sessionId,
    userId: snapshot.userId,
    task: summary.task,
    role: firstString(config.role, config.agentRole, status.role, currentTask.role) ?? 'autonomous-agent',
    state: summary.state,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    branchName,
    pullRequestUrl,
    previewUrl,
    evidenceRefs,
    artifacts,
    availableControls: controlsForState(summary.state),
    marketReadiness: marketReadinessForMissingEvidence(summary.state, missingMarketEvidence),
    missingMarketEvidence,
  }
}

export function summarizeAgentRunLedger(entries: AgentRunLedgerEntry[]): AgentRunLedgerSummary {
  return {
    totalRuns: entries.length,
    activeRuns: entries.filter((entry) => entry.state === 'running' || entry.state === 'pending' || entry.state === 'paused').length,
    runsWithEvidence: entries.filter((entry) => entry.evidenceRefs.length > 0).length,
    runsWithReviewArtifact: entries.filter((entry) => entry.pullRequestUrl || entry.previewUrl || entry.artifacts.some((artifact) => artifact.kind === 'pull-request' || artifact.kind === 'preview')).length,
    runsReadyForHumanReview: entries.filter((entry) => entry.marketReadiness === 'needs-review' || entry.marketReadiness === 'evidence-backed').length,
    blockedRuns: entries.filter((entry) => entry.marketReadiness === 'blocked').length,
    lastUpdatedAt: entries[0]?.updatedAt ?? null,
  }
}

function collectEvidenceRefs(snapshot: AgentSnapshot): string[] {
  const status = getRecord(snapshot.status)
  const currentTask = getRecord(status.currentTask)
  const refs = [
    ...pickStringArray(status.evidenceRefs),
    ...pickStringArray(currentTask.evidenceRefs),
    ...((snapshot.steps ?? []).flatMap((step) => [
      ...pickStringArray(step.evidenceRefs),
      ...pickStringArray(step.artifactRefs),
      ...pickStringArray(step.receipts),
      ...(typeof step.evidenceRef === 'string' ? [step.evidenceRef] : []),
      ...(typeof step.screenshotUrl === 'string' ? [`screenshot:${step.screenshotUrl}`] : []),
      ...(typeof step.previewUrl === 'string' ? [`preview:${step.previewUrl}`] : []),
    ])),
  ]
  return unique(refs.filter((ref) => ref.trim().length > 0)).slice(0, 60)
}

function collectArtifacts(input: {
  evidenceRefs: string[]
  branchName: string | null
  pullRequestUrl: string | null
  previewUrl: string | null
  snapshot: AgentSnapshot
}): AgentRunArtifact[] {
  const artifacts = input.evidenceRefs.map((ref, index) => ({
    id: `artifact:${input.snapshot.sessionId}:${index}`,
    kind: artifactKindForRef(ref),
    label: artifactLabelForRef(ref),
    ref,
    requiredForMarketReady: true,
  }))

  if (input.branchName) {
    artifacts.push({
      id: `artifact:${input.snapshot.sessionId}:branch`,
      kind: 'branch',
      label: 'Working branch',
      ref: input.branchName,
      requiredForMarketReady: true,
    })
  }

  if (input.pullRequestUrl) {
    artifacts.push({
      id: `artifact:${input.snapshot.sessionId}:pull-request`,
      kind: 'pull-request',
      label: 'Pull request',
      ref: input.pullRequestUrl,
      requiredForMarketReady: true,
    })
  }

  if (input.previewUrl) {
    artifacts.push({
      id: `artifact:${input.snapshot.sessionId}:preview`,
      kind: 'preview',
      label: 'Preview deployment',
      ref: input.previewUrl,
      requiredForMarketReady: true,
    })
  }

  return artifacts
}

function missingEvidenceForMarketReadiness(input: {
  state: AgentExecutionState
  evidenceRefs: string[]
  branchName: string | null
  pullRequestUrl: string | null
  previewUrl: string | null
  artifacts: AgentRunArtifact[]
}): string[] {
  const missing = []
  if (input.evidenceRefs.length === 0) missing.push('Evidence refs required before agent work can be trusted.')
  if (!input.branchName && !input.pullRequestUrl) missing.push('Branch or pull request artifact required for reviewable code changes.')
  if (!input.previewUrl && !input.artifacts.some((artifact) => artifact.kind === 'preview' || artifact.kind === 'replay')) {
    missing.push('Preview, replay, or screenshot artifact required for visual/product changes.')
  }
  if (input.state === 'failed') missing.push('Failed runs require a recovery note before market-ready claims.')
  if (input.state === 'unknown') missing.push('Unknown run state requires operator review.')
  return missing
}

function marketReadinessForMissingEvidence(
  state: AgentExecutionState,
  missingEvidence: string[],
): AgentRunMarketReadiness {
  if (state === 'failed' || state === 'unknown' || missingEvidence.length > 0) return 'blocked'
  if (state === 'completed' || state === 'stopped') return 'needs-review'
  return 'blocked'
}

function controlsForState(state: AgentExecutionState): AgentRunControl[] {
  if (state === 'running' || state === 'pending') return ['follow-up', 'pause', 'takeover']
  if (state === 'paused') return ['follow-up', 'takeover']
  if (state === 'completed' || state === 'stopped') return ['follow-up', 'request-review', 'approve']
  return ['follow-up', 'takeover']
}

function artifactKindForRef(ref: string): AgentRunArtifactKind {
  const normalized = ref.toLowerCase()
  if (normalized.includes('pull') || normalized.includes('pr:') || normalized.includes('/pull/')) return 'pull-request'
  if (normalized.includes('preview') || normalized.includes('deploy')) return 'preview'
  if (normalized.includes('replay') || normalized.includes('screenshot') || normalized.includes('clip')) return 'replay'
  if (normalized.includes('log') || normalized.includes('trace')) return 'log'
  if (normalized.includes('branch')) return 'branch'
  if (normalized.includes(':')) return 'evidence'
  return 'unknown'
}

function artifactLabelForRef(ref: string): string {
  const kind = artifactKindForRef(ref)
  if (kind === 'pull-request') return 'Pull request evidence'
  if (kind === 'preview') return 'Preview evidence'
  if (kind === 'replay') return 'Replay or visual evidence'
  if (kind === 'log') return 'Log or trace evidence'
  if (kind === 'branch') return 'Branch evidence'
  if (kind === 'evidence') return 'Evidence reference'
  return 'Unclassified evidence'
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function pickStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function firstString(...values: unknown[]): string | null {
  const found = values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
  return found?.trim() ?? null
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items))
}
