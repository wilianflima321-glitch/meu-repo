import { type GovernedRuntimeState } from '../../web/lib/product/workspace-blueprint'

export type RuntimeResilienceSurfaceId =
  | 'ide-shell'
  | 'preview-viewport'
  | 'agent-runtime'
  | 'research-browser'
  | 'studio-local'
  | 'cloud-render'
  | 'publish-export'

export type RuntimeRecoveryMode =
  | 'isolate-region'
  | 'fallback-preview'
  | 'pause-and-resume'
  | 'takeover-control'
  | 'retry-with-backoff'
  | 'rollback-last-change'
  | 'hold-for-human-review'

export type RuntimeResilienceEvidenceId =
  | 'error-boundary-receipt'
  | 'crash-state-receipt'
  | 'retry-policy-receipt'
  | 'rollback-receipt'
  | 'performance-trace-receipt'
  | 'browser-replay-receipt'
  | 'takeover-control-receipt'
  | 'human-review-receipt'
  | 'teardown-receipt'
  | 'cost-cap-receipt'

export type RuntimeResilienceBudget = {
  surfaceId: RuntimeResilienceSurfaceId
  owner: string
  state: GovernedRuntimeState
  maxHonestClaim: string
  p95InteractiveMs: number
  p95RecoveryMs: number
  maxCrashLoopCount: number
  maxRetryCount: number
  recoveryModes: RuntimeRecoveryMode[]
  requiredEvidence: RuntimeResilienceEvidenceId[]
  blockers: string[]
  nextAction: string
}

export type RuntimeResilienceBudgetReport = {
  version: 1
  generatedAt: string
  capability: 'AETHEL_RUNTIME_RESILIENCE_BUDGETS'
  budgetCount: number
  availableBudgetCount: number
  heldOrBlockedBudgetCount: number
  p0BlockerCount: number
  budgets: RuntimeResilienceBudget[]
  noFakeSuccessRules: string[]
  nextAction: string
}

export type RuntimeResilienceInput = {
  evidenceRefs?: string[]
  ideRegionBoundariesReady?: boolean
  previewFallbackReady?: boolean
  agentSandboxReady?: boolean
  researchTakeoverReady?: boolean
  studioLocalCrashManifestReady?: boolean
  cloudTeardownReady?: boolean
  publishRollbackReady?: boolean
  humanReviewed?: boolean
}

const REQUIRED_SURFACES: RuntimeResilienceSurfaceId[] = [
  'ide-shell',
  'preview-viewport',
  'agent-runtime',
  'research-browser',
  'studio-local',
  'cloud-render',
  'publish-export',
]

export const RUNTIME_RESILIENCE_NO_FAKE_SUCCESS_RULES = [
  'A region failure must not crash the whole IDE shell.',
  'Preview and viewport failures must fall back to a reviewable state with receipts instead of silent success.',
  'Agent and browser execution must expose stop, takeover, replay, and approval receipts before autonomy claims.',
  'Studio Local and Cloud Render stay held unless crash state, teardown, cost cap, and rollback evidence exist.',
  'Publishing cannot be production-ready without rollback and human review receipts.',
]

function hasEvidence(evidenceRefs: string[], id: RuntimeResilienceEvidenceId): boolean {
  const token = id.replace(/-receipt$/, '').replace(/-/g, ' ')
  return evidenceRefs.some((ref) => ref.toLowerCase().includes(token))
}

function missingEvidence(required: RuntimeResilienceEvidenceId[], evidenceRefs: string[]): string[] {
  return required.filter((id) => !hasEvidence(evidenceRefs, id)).map((id) => `Missing resilience evidence: ${id}`)
}

function stateFromBlockers(blockers: string[]): GovernedRuntimeState {
  if (blockers.length === 0) return 'available'
  if (blockers.some((blocker) => /provider|cloud render|not configured/i.test(blocker))) return 'provider_unavailable'
  if (blockers.every((blocker) => /human review/i.test(blocker))) return 'human_review_required'
  if (blockers.some((blocker) => /crash|rollback|takeover|teardown|cost cap|sandbox|not complete/i.test(blocker))) return 'held'
  return 'needs-review'
}

function budget(input: Omit<RuntimeResilienceBudget, 'state'> & { state?: GovernedRuntimeState }): RuntimeResilienceBudget {
  return {
    ...input,
    state: input.state ?? stateFromBlockers(input.blockers),
  }
}

function severityBlockers(budgets: RuntimeResilienceBudget[]): number {
  return budgets.flatMap((item) => item.blockers).filter((blocker) => /crash|rollback|takeover|human|teardown|cost|sandbox|production/i.test(blocker)).length
}

export function buildRuntimeResilienceBudgetReport(input: RuntimeResilienceInput = {}): RuntimeResilienceBudgetReport {
  const evidenceRefs = input.evidenceRefs ?? []
  const humanReviewBlocker = input.humanReviewed ? [] : ['Human review receipt is missing.']

  const budgets = [
    budget({
      surfaceId: 'ide-shell',
      owner: 'ide-runtime',
      maxHonestClaim: 'isolated IDE shell with region-level recovery, not uninterrupted execution until crash receipts exist',
      p95InteractiveMs: 750,
      p95RecoveryMs: 1500,
      maxCrashLoopCount: 1,
      maxRetryCount: 2,
      recoveryModes: ['isolate-region', 'pause-and-resume'],
      requiredEvidence: ['error-boundary-receipt', 'crash-state-receipt', 'performance-trace-receipt'],
      blockers: input.ideRegionBoundariesReady ? missingEvidence(['crash-state-receipt', 'performance-trace-receipt'], evidenceRefs) : ['IDE region boundaries and crash receipts are not complete.'],
      nextAction: 'Attach editor, preview, chat, terminal, and problems region error-boundary receipts.',
    }),
    budget({
      surfaceId: 'preview-viewport',
      owner: 'preview-runtime',
      maxHonestClaim: 'canonical preview surface with fallback and proposal recovery, not final render',
      p95InteractiveMs: 900,
      p95RecoveryMs: 1800,
      maxCrashLoopCount: 1,
      maxRetryCount: 2,
      recoveryModes: ['fallback-preview', 'rollback-last-change', 'hold-for-human-review'],
      requiredEvidence: ['error-boundary-receipt', 'rollback-receipt', 'performance-trace-receipt', 'human-review-receipt'],
      blockers: input.previewFallbackReady ? missingEvidence(['rollback-receipt', 'performance-trace-receipt'], evidenceRefs).concat(humanReviewBlocker) : ['Preview fallback, rollback, and performance receipts are not complete.'],
      nextAction: 'Route canvas, app preview, and 3D viewport failures through one canonical fallback and proposal rollback path.',
    }),
    budget({
      surfaceId: 'agent-runtime',
      owner: 'agent-orchestrator',
      maxHonestClaim: 'governed agent execution with receipts, not autonomous execution ready',
      p95InteractiveMs: 1200,
      p95RecoveryMs: 2500,
      maxCrashLoopCount: 0,
      maxRetryCount: 1,
      recoveryModes: ['retry-with-backoff', 'pause-and-resume', 'hold-for-human-review'],
      requiredEvidence: ['retry-policy-receipt', 'crash-state-receipt', 'human-review-receipt'],
      blockers: input.agentSandboxReady ? missingEvidence(['retry-policy-receipt', 'crash-state-receipt'], evidenceRefs).concat(humanReviewBlocker) : ['Agent sandbox and retry receipts are not complete.'],
      nextAction: 'Keep agent tools scoped, retry bounded, and human approval explicit before stronger autonomy claims.',
    }),
    budget({
      surfaceId: 'research-browser',
      owner: 'research-browser-operator',
      maxHonestClaim: 'auditable browser research workspace with replay, not research verified',
      p95InteractiveMs: 1500,
      p95RecoveryMs: 3000,
      maxCrashLoopCount: 0,
      maxRetryCount: 1,
      recoveryModes: ['takeover-control', 'pause-and-resume', 'hold-for-human-review'],
      requiredEvidence: ['browser-replay-receipt', 'takeover-control-receipt', 'human-review-receipt'],
      blockers: input.researchTakeoverReady ? missingEvidence(['browser-replay-receipt', 'takeover-control-receipt'], evidenceRefs).concat(humanReviewBlocker) : ['Browser replay and takeover receipts are not complete.'],
      nextAction: 'Store URL, DOM, screenshot, replay, stop, takeover, source, and final-answer receipts for every research run.',
    }),
    budget({
      surfaceId: 'studio-local',
      owner: 'desktop-runtime',
      maxHonestClaim: 'held desktop runtime until probe, crash recovery, updater, and sidecar receipts are complete',
      p95InteractiveMs: 2000,
      p95RecoveryMs: 5000,
      maxCrashLoopCount: 1,
      maxRetryCount: 1,
      recoveryModes: ['retry-with-backoff', 'pause-and-resume', 'hold-for-human-review'],
      requiredEvidence: ['crash-state-receipt', 'retry-policy-receipt', 'human-review-receipt'],
      blockers: input.studioLocalCrashManifestReady ? missingEvidence(['crash-state-receipt', 'retry-policy-receipt'], evidenceRefs).concat(humanReviewBlocker) : ['Studio Local crash manifest and sidecar recovery receipts are not complete.'],
      nextAction: 'Persist native crash state, probe sidecars, hash runtime templates, and block signed installer claims until evidence exists.',
    }),
    budget({
      surfaceId: 'cloud-render',
      owner: 'cloud-render-runtime',
      maxHonestClaim: 'held cloud render lane until cost cap, teardown, playback, and rollback receipts exist',
      p95InteractiveMs: 2500,
      p95RecoveryMs: 8000,
      maxCrashLoopCount: 0,
      maxRetryCount: 0,
      recoveryModes: ['hold-for-human-review', 'rollback-last-change'],
      requiredEvidence: ['cost-cap-receipt', 'teardown-receipt', 'rollback-receipt', 'human-review-receipt'],
      blockers: input.cloudTeardownReady ? missingEvidence(['cost-cap-receipt', 'teardown-receipt', 'rollback-receipt'], evidenceRefs).concat(humanReviewBlocker) : ['Cloud render cost cap, teardown, and rollback receipts are not complete.'],
      nextAction: 'Require session URL, cost cap, teardown, playback, rollback, and approval before any cloud availability copy.',
    }),
    budget({
      surfaceId: 'publish-export',
      owner: 'release-governance',
      maxHonestClaim: 'reviewable export package until rollback, provenance, and human release receipts exist',
      p95InteractiveMs: 1000,
      p95RecoveryMs: 3000,
      maxCrashLoopCount: 0,
      maxRetryCount: 1,
      recoveryModes: ['rollback-last-change', 'hold-for-human-review'],
      requiredEvidence: ['rollback-receipt', 'human-review-receipt'],
      blockers: input.publishRollbackReady ? missingEvidence(['rollback-receipt'], evidenceRefs).concat(humanReviewBlocker) : ['Publish/export rollback receipts are not complete.'],
      nextAction: 'Attach package hash, provenance, rollback, deploy log, and human release approval receipts before production claims.',
    }),
  ]

  const availableBudgetCount = budgets.filter((item) => item.state === 'available').length
  const heldOrBlockedBudgetCount = budgets.length - availableBudgetCount

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    capability: 'AETHEL_RUNTIME_RESILIENCE_BUDGETS',
    budgetCount: budgets.length,
    availableBudgetCount,
    heldOrBlockedBudgetCount,
    p0BlockerCount: severityBlockers(budgets),
    budgets,
    noFakeSuccessRules: [...RUNTIME_RESILIENCE_NO_FAKE_SUCCESS_RULES],
    nextAction:
      heldOrBlockedBudgetCount > 0
        ? 'Resolve crash, retry, rollback, takeover, teardown, cost, and review receipts before stronger market claims.'
        : 'All resilience budgets can proceed, but receipts must stay attached to every run.',
  }
}

export function validateRuntimeResilienceBudgetReport(report: RuntimeResilienceBudgetReport): string[] {
  const failures: string[] = []
  const ids = new Set(report.budgets.map((item) => item.surfaceId))

  for (const surfaceId of REQUIRED_SURFACES) {
    if (!ids.has(surfaceId)) failures.push(`missing resilience surface: ${surfaceId}`)
  }

  if (report.budgetCount !== REQUIRED_SURFACES.length) failures.push(`expected ${REQUIRED_SURFACES.length} resilience budgets`)
  if (report.budgetCount !== report.budgets.length) failures.push('budgetCount does not match budgets length')
  if (report.noFakeSuccessRules.length < 5) failures.push('resilience no-fake-success matrix is too thin')
  if (report.p0BlockerCount < 5) failures.push('runtime resilience must expose P0 blockers while evidence is missing')

  for (const item of report.budgets) {
    if (item.requiredEvidence.length === 0) failures.push(`${item.surfaceId}: required evidence is empty`)
    if (item.recoveryModes.length === 0) failures.push(`${item.surfaceId}: recovery modes are empty`)
    if (item.p95InteractiveMs <= 0 || item.p95RecoveryMs <= 0) failures.push(`${item.surfaceId}: invalid timing budget`)
    if (item.maxHonestClaim.length < 32) failures.push(`${item.surfaceId}: maxHonestClaim is too vague`)
    if (item.state === 'available' && item.blockers.length > 0) failures.push(`${item.surfaceId}: available budget cannot have blockers`)
  }

  const research = report.budgets.find((item) => item.surfaceId === 'research-browser')
  const cloud = report.budgets.find((item) => item.surfaceId === 'cloud-render')
  const publish = report.budgets.find((item) => item.surfaceId === 'publish-export')
  const desktop = report.budgets.find((item) => item.surfaceId === 'studio-local')

  if (!research?.requiredEvidence.includes('takeover-control-receipt')) failures.push('research browser must require takeover control')
  if (!cloud?.requiredEvidence.includes('teardown-receipt')) failures.push('cloud render must require teardown evidence')
  if (!publish?.requiredEvidence.includes('rollback-receipt')) failures.push('publish/export must require rollback evidence')
  if (!desktop?.maxHonestClaim.includes('held')) failures.push('Studio Local resilience must stay held by default')

  return failures
}
