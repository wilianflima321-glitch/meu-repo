import { buildRuntimeFailureSmokeFixtureReport } from '@/lib/runtime/runtime-failure-smoke-fixtures'
﻿import {
  buildRuntimeResilienceLedger,
  validateRuntimeResilienceLedger,
  type RuntimeResilienceEventKind,
  type RuntimeResilienceLedger,
} from '@/lib/runtime/runtime-resilience-ledger'
import type { RuntimeRecoveryMode, RuntimeResilienceSurfaceId } from '@/lib/runtime/runtime-resilience-budget'

export type RuntimeFailureSmokeScenarioId =
  | 'ide-region-crash-isolated'
  | 'preview-render-fallback'
  | 'agent-tool-retry-held'
  | 'research-browser-takeover'
  | 'studio-local-crash-loop'
  | 'cloud-render-teardown'
  | 'publish-rollback'

export type RuntimeFailureSmokeOutcome = 'recovered-with-receipts' | 'blocked-for-review' | 'governed-failure'

export type RuntimeFailureSmokeScenario = {
  id: RuntimeFailureSmokeScenarioId
  surfaceId: RuntimeResilienceSurfaceId
  injectedFailure: string
  eventKind: RuntimeResilienceEventKind
  recoveryMode: RuntimeRecoveryMode
  requiredReceipts: string[]
  defaultEvidenceRefs: string[]
  expectedOutcome: RuntimeFailureSmokeOutcome
  blockedClaims: string[]
}

export type RuntimeFailureSmokeScenarioResult = RuntimeFailureSmokeScenario & {
  runId: string
  ledger: RuntimeResilienceLedger
  validationErrors: string[]
  outcome: RuntimeFailureSmokeOutcome
  marketClaimAllowed: false
  nextAction: string
}

export type RuntimeFailureSmokePackReport = {
  version: 1
  capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_PACK'
  generatedAt: string
  scenarioCount: number
  governedFailureCount: number
  recoveredWithReceiptsCount: number
  blockedForReviewCount: number
  marketClaimAllowed: false
  scenarios: RuntimeFailureSmokeScenarioResult[]
  noFakeSuccessRules: string[]
  nextAction: string
}

export type RuntimeFailureSmokePackInput = {
  runPrefix?: string
  evidenceOverrides?: Partial<Record<RuntimeFailureSmokeScenarioId, string[]>>
  useCanonicalFixtures?: boolean
  generatedAt?: string
}

export const RUNTIME_FAILURE_SMOKE_SCENARIOS: RuntimeFailureSmokeScenario[] = [
  {
    id: 'ide-region-crash-isolated',
    surfaceId: 'ide-shell',
    injectedFailure: 'Editor region throws while preview and agent sidecar remain mounted.',
    eventKind: 'region-error',
    recoveryMode: 'isolate-region',
    requiredReceipts: ['error-boundary-receipt', 'crash-state-receipt'],
    defaultEvidenceRefs: ['error boundary receipt'],
    expectedOutcome: 'blocked-for-review',
    blockedClaims: ['uninterrupted IDE execution', 'production ready'],
  },
  {
    id: 'preview-render-fallback',
    surfaceId: 'preview-viewport',
    injectedFailure: '3D preview render path fails and falls back to canonical review surface.',
    eventKind: 'fallback-activated',
    recoveryMode: 'fallback-preview',
    requiredReceipts: ['error-boundary-receipt', 'performance-trace-receipt'],
    defaultEvidenceRefs: ['error boundary receipt', 'performance trace receipt'],
    expectedOutcome: 'recovered-with-receipts',
    blockedClaims: ['native renderer ready', 'final render'],
  },
  {
    id: 'agent-tool-retry-held',
    surfaceId: 'agent-runtime',
    injectedFailure: 'Agent tool call times out and retries once through bounded policy.',
    eventKind: 'retry-attempted',
    recoveryMode: 'retry-with-backoff',
    requiredReceipts: ['retry-policy-receipt'],
    defaultEvidenceRefs: ['retry policy receipt'],
    expectedOutcome: 'recovered-with-receipts',
    blockedClaims: ['autonomous execution ready', 'agent completed without review'],
  },
  {
    id: 'research-browser-takeover',
    surfaceId: 'research-browser',
    injectedFailure: 'Browser operator detects navigation risk and requests human takeover.',
    eventKind: 'takeover-requested',
    recoveryMode: 'takeover-control',
    requiredReceipts: ['takeover-control-receipt', 'browser-replay-receipt'],
    defaultEvidenceRefs: ['browser replay receipt'],
    expectedOutcome: 'governed-failure',
    blockedClaims: ['research verified', 'autonomous browser execution'],
  },
  {
    id: 'studio-local-crash-loop',
    surfaceId: 'studio-local',
    injectedFailure: 'Native sidecar reports crash loop and enters held crash state.',
    eventKind: 'crash-loop',
    recoveryMode: 'hold-for-human-review',
    requiredReceipts: ['crash-state-receipt', 'retry-policy-receipt'],
    defaultEvidenceRefs: ['crash state receipt'],
    expectedOutcome: 'governed-failure',
    blockedClaims: ['desktop ready', 'signed installer ready'],
  },
  {
    id: 'cloud-render-teardown',
    surfaceId: 'cloud-render',
    injectedFailure: 'Cloud render session must prove cost cap and teardown after a failed preview.',
    eventKind: 'teardown-completed',
    recoveryMode: 'hold-for-human-review',
    requiredReceipts: ['teardown-receipt', 'cost-cap-receipt'],
    defaultEvidenceRefs: ['teardown receipt'],
    expectedOutcome: 'blocked-for-review',
    blockedClaims: ['cloud render available', 'Pixel Streaming available'],
  },
  {
    id: 'publish-rollback',
    surfaceId: 'publish-export',
    injectedFailure: 'Publish package fails validation and rolls back to the last approved checkpoint.',
    eventKind: 'rollback-applied',
    recoveryMode: 'rollback-last-change',
    requiredReceipts: ['rollback-receipt'],
    defaultEvidenceRefs: ['rollback receipt'],
    expectedOutcome: 'governed-failure',
    blockedClaims: ['production ready', 'releaseReady=true'],
  },
]

export const RUNTIME_FAILURE_SMOKE_NO_FAKE_SUCCESS_RULES = [
  'A smoke scenario cannot allow a market claim by itself.',
  'Critical events remain governed even when receipts exist; human review is still required.',
  'Preview fallback, agent retry, and cloud teardown must generate ledger receipts before promotion.',
  'Research takeover always blocks verified/autonomous research claims until reviewed.',
  'Desktop crash-loop evidence never implies desktop ready or signed installer ready.',
]

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function outcomeFromLedger(scenario: RuntimeFailureSmokeScenario, ledger: RuntimeResilienceLedger): RuntimeFailureSmokeOutcome {
  if (ledger.summary.criticalCount > 0) return 'governed-failure'
  if (ledger.summary.missingEvidenceCount > 0) return 'blocked-for-review'
  return scenario.expectedOutcome === 'governed-failure' ? 'governed-failure' : 'recovered-with-receipts'
}

export function buildRuntimeFailureSmokePackReport(input: RuntimeFailureSmokePackInput = {}): RuntimeFailureSmokePackReport {
  const runPrefix = input.runPrefix ?? 'runtime-smoke'
  const fixtureOverrides = input.useCanonicalFixtures ? buildRuntimeFailureSmokeFixtureReport().evidenceOverrideMap : {}
  const scenarios = RUNTIME_FAILURE_SMOKE_SCENARIOS.map((scenario, index) => {
    const runId = `${runPrefix}:${scenario.id}`
    const evidenceRefs = input.evidenceOverrides?.[scenario.id] ?? fixtureOverrides[scenario.id] ?? scenario.defaultEvidenceRefs
    const ledger = buildRuntimeResilienceLedger({
      runId,
      events: [
        {
          surfaceId: scenario.surfaceId,
          kind: scenario.eventKind,
          recoveryMode: scenario.recoveryMode,
          message: scenario.injectedFailure,
          occurredAt: new Date(index * 1000).toISOString(),
          evidenceRefs,
          blockedClaims: scenario.blockedClaims,
        },
      ],
    })
    const outcome = outcomeFromLedger(scenario, ledger)
    return {
      ...scenario,
      runId,
      ledger,
      validationErrors: validateRuntimeResilienceLedger(ledger),
      outcome,
      marketClaimAllowed: false as const,
      nextAction:
        outcome === 'recovered-with-receipts'
          ? 'Attach ledger, receipts, and human review before promotion.'
          : 'Keep the surface held, attach missing receipts, and request human review.',
    }
  })
  const governedFailureCount = scenarios.filter((scenario) => scenario.outcome === 'governed-failure').length
  const recoveredWithReceiptsCount = scenarios.filter((scenario) => scenario.outcome === 'recovered-with-receipts').length
  const blockedForReviewCount = scenarios.filter((scenario) => scenario.outcome === 'blocked-for-review').length

  return {
    version: 1,
    capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_PACK',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scenarioCount: scenarios.length,
    governedFailureCount,
    recoveredWithReceiptsCount,
    blockedForReviewCount,
    marketClaimAllowed: false,
    scenarios,
    noFakeSuccessRules: [...RUNTIME_FAILURE_SMOKE_NO_FAKE_SUCCESS_RULES],
    nextAction: 'Run these smoke scenarios against real IDE, preview, agent, research, desktop, cloud, and publish jobs, then persist ledgers as evidence.',
  }
}

export function validateRuntimeFailureSmokePackReport(report: RuntimeFailureSmokePackReport): string[] {
  const failures: string[] = []
  const ids = new Set(report.scenarios.map((scenario) => scenario.id))

  for (const scenario of RUNTIME_FAILURE_SMOKE_SCENARIOS) {
    if (!ids.has(scenario.id)) failures.push(`missing smoke scenario: ${scenario.id}`)
  }

  if (report.capability !== 'AETHEL_RUNTIME_FAILURE_SMOKE_PACK') failures.push('invalid capability marker')
  if (report.scenarioCount !== RUNTIME_FAILURE_SMOKE_SCENARIOS.length) failures.push('scenario count mismatch')
  if (report.marketClaimAllowed !== false) failures.push('smoke pack cannot allow market claims')
  if (report.noFakeSuccessRules.length < 5) failures.push('smoke no-fake-success rules are too thin')
  if (report.governedFailureCount < 3) failures.push('smoke pack must include governed critical failures')
  if (report.recoveredWithReceiptsCount < 2) failures.push('smoke pack must include receipt-backed recovery cases')
  if (report.blockedForReviewCount < 2) failures.push('smoke pack must include blocked-for-review cases')

  for (const scenario of report.scenarios) {
    if (scenario.validationErrors.length > 0) failures.push(`${scenario.id}: ledger validation failed`)
    if (scenario.marketClaimAllowed !== false) failures.push(`${scenario.id}: market claim allowed by smoke scenario`)
    if (scenario.ledger.summary.blockedClaims.length < 6) failures.push(`${scenario.id}: blocked claims are too thin`)
    if (!scenario.ledger.summary.surfaces.includes(scenario.surfaceId)) failures.push(`${scenario.id}: ledger surface mismatch`)
    for (const claim of scenario.blockedClaims) {
      if (!scenario.ledger.summary.blockedClaims.includes(claim)) failures.push(`${scenario.id}: missing blocked claim ${claim}`)
    }
  }

  return unique(failures)
}
