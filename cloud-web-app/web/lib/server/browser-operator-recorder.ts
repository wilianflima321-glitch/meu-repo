import { createHash, randomUUID } from 'node:crypto'

import {
  evaluateBrowserOperatorPolicy,
  type BrowserOperatorPolicyDecision,
} from '@/lib/production/browser-operator-safety'

export type BrowserOperatorRunStatus =
  | 'running'
  | 'paused'
  | 'approval-required'
  | 'cancelled'
  | 'completed'

export type BrowserOperatorStep = {
  id: string
  index: number
  timestamp: string
  tool: string
  targetUrl: string
  intent: string
  paramsDigest: string
  screenshotUrl?: string
  domSnapshotHash?: string
  requiresApproval: boolean
  approved: boolean
  decision: BrowserOperatorPolicyDecision
  evidenceRefs: string[]
}

export type BrowserOperatorRun = {
  runId: string
  projectId?: string
  actorId: string
  mission: string
  status: BrowserOperatorRunStatus
  createdAt: string
  updatedAt: string
  currentStep: number
  steps: BrowserOperatorStep[]
  timelineHash: string
}

export type RecordBrowserOperatorStepInput = {
  runId?: string
  projectId?: string
  actorId: string
  mission: string
  tool: string
  targetUrl: string
  intent: string
  params?: unknown
  pageText?: string | null
  screenshotUrl?: string
  domSnapshot?: string
  allowedDomains?: string[]
  deniedDomains?: string[]
  hasHumanApproval?: boolean
  approvalToken?: string | null
  amountUsd?: number | null
}

export type BrowserOperatorAction = 'pause' | 'resume' | 'takeover' | 'approve' | 'cancel' | 'complete'

const runs = new Map<string, BrowserOperatorRun>()

function nowIso() {
  return new Date().toISOString()
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex')
}

function recomputeTimelineHash(run: BrowserOperatorRun): string {
  return digest(run.steps.map((step) => ({
    id: step.id,
    index: step.index,
    tool: step.tool,
    targetUrl: step.targetUrl,
    intent: step.intent,
    decision: step.decision.status,
    evidenceRefs: step.evidenceRefs,
  })))
}

function getOrCreateRun(input: RecordBrowserOperatorStepInput): BrowserOperatorRun {
  const runId = input.runId ?? `bor_${randomUUID()}`
  const existing = runs.get(runId)
  if (existing) return existing

  const run: BrowserOperatorRun = {
    runId,
    projectId: input.projectId,
    actorId: input.actorId,
    mission: input.mission,
    status: 'running',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    currentStep: 0,
    steps: [],
    timelineHash: digest([]),
  }
  runs.set(runId, run)
  return run
}

export function recordBrowserOperatorStep(input: RecordBrowserOperatorStepInput): BrowserOperatorRun {
  const run = getOrCreateRun(input)
  const domSnapshotHash = input.domSnapshot ? digest(input.domSnapshot) : undefined
  const decision = evaluateBrowserOperatorPolicy({
    targetUrl: input.targetUrl,
    intendedAction: input.intent || input.tool,
    pageText: input.pageText,
    hasReplayCapture: true,
    hasScreenshotCapture: Boolean(input.screenshotUrl),
    hasDomSnapshot: Boolean(domSnapshotHash),
    hasPauseControl: true,
    hasHumanApproval: input.hasHumanApproval,
    approvalToken: input.approvalToken,
    allowedDomains: input.allowedDomains,
    deniedDomains: input.deniedDomains,
    amountUsd: input.amountUsd,
  })
  const requiresApproval = decision.status !== 'read-only'
  const evidenceRefs = [
    `browser-run:${run.runId}`,
    input.screenshotUrl ? `screenshot:${input.screenshotUrl}` : null,
    domSnapshotHash ? `dom:${domSnapshotHash}` : null,
    `risk:${decision.highRiskDecision.status}`,
  ].filter((value): value is string => Boolean(value))

  const step: BrowserOperatorStep = {
    id: `step_${randomUUID()}`,
    index: run.steps.length,
    timestamp: nowIso(),
    tool: input.tool,
    targetUrl: input.targetUrl,
    intent: input.intent,
    paramsDigest: digest(input.params),
    screenshotUrl: input.screenshotUrl,
    domSnapshotHash,
    requiresApproval,
    approved: Boolean(input.hasHumanApproval && input.approvalToken),
    decision,
    evidenceRefs,
  }

  run.steps.push(step)
  run.currentStep = step.index
  run.status = requiresApproval && !step.approved ? 'approval-required' : run.status
  run.updatedAt = nowIso()
  run.timelineHash = recomputeTimelineHash(run)
  runs.set(run.runId, run)

  return run
}

export function getBrowserOperatorRun(runId: string): BrowserOperatorRun | null {
  return runs.get(runId) ?? null
}

export function listBrowserOperatorRuns(options: { projectId?: string; limit?: number } = {}): BrowserOperatorRun[] {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50))
  return Array.from(runs.values())
    .filter((run) => !options.projectId || run.projectId === options.projectId)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
}

export function applyBrowserOperatorAction(runId: string, action: BrowserOperatorAction): BrowserOperatorRun | null {
  const run = runs.get(runId)
  if (!run) return null

  if (action === 'pause') run.status = 'paused'
  if (action === 'takeover') run.status = 'paused'
  if (action === 'resume') run.status = 'running'
  if (action === 'cancel') run.status = 'cancelled'
  if (action === 'complete') run.status = 'completed'
  if (action === 'approve') {
    run.steps = run.steps.map((step, index) =>
      index === run.currentStep ? { ...step, approved: true, requiresApproval: false } : step,
    )
    run.status = 'running'
  }

  run.updatedAt = nowIso()
  run.timelineHash = recomputeTimelineHash(run)
  runs.set(runId, run)
  return run
}

export function clearBrowserOperatorRunsForTests() {
  runs.clear()
}
