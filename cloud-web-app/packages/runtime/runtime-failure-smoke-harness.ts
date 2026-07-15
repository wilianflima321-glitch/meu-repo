import type { RuntimeFailureSmokeScenarioId } from './runtime-failure-smoke-pack'
import { buildRuntimeFailureSmokeFixtureReport } from './runtime-failure-smoke-fixtures'

export type RuntimeFailureSmokeHarnessId =
  | 'ide-modern-shell-region-boundary'
  | 'preview-canonical-fallback-surface'

export type RuntimeFailureSmokeHarnessOwner = 'ide-runtime' | 'preview-runtime'
export type RuntimeFailureSmokeHarnessSurface = 'ide' | 'preview'
export type RuntimeFailureSmokeHarnessImplementationState = 'contract-ready' | 'runner-ready' | 'needs-playwright-runner'

export type RuntimeFailureSmokeHarness = {
  id: RuntimeFailureSmokeHarnessId
  scenarioId: RuntimeFailureSmokeScenarioId
  fixtureId: string
  canonicalEntrypoint: string
  owner: RuntimeFailureSmokeHarnessOwner
  surface: RuntimeFailureSmokeHarnessSurface
  mountedAssertion: string
  injectedFailure: string
  expectedRecovery: string
  generatedEvidenceRefs: string[]
  blockedClaims: string[]
  implementationState: RuntimeFailureSmokeHarnessImplementationState
  nextAction: string
}

export type RuntimeFailureSmokeHarnessFixtureCoverage = {
  coveredScenarioIds: RuntimeFailureSmokeScenarioId[]
  missingScenarioIds: RuntimeFailureSmokeScenarioId[]
  coveredFixtureIds: string[]
}

export type RuntimeFailureSmokeHarnessReport = {
  version: 1
  capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_HARNESS'
  harnessCount: number
  contractReadyCount: number
  runnerReadyCount: number
  needsRunnerCount: number
  marketClaimAllowed: false
  manualRunnerRequired: true
  runnerCommand: 'npm run runtime:v29-failure-smoke'
  harnesses: RuntimeFailureSmokeHarness[]
  fixtureCoverage: RuntimeFailureSmokeHarnessFixtureCoverage
  blockers: string[]
  nextAction: string
}

export const RUNTIME_FAILURE_SMOKE_HARNESSES: RuntimeFailureSmokeHarness[] = [
  {
    id: 'ide-modern-shell-region-boundary',
    scenarioId: 'ide-region-crash-isolated',
    fixtureId: 'fixture:ide:error-boundary-region-crash',
    canonicalEntrypoint: 'components/ide/ModernIDEShell.tsx',
    owner: 'ide-runtime',
    surface: 'ide',
    mountedAssertion: 'ModernIDEShell remains mounted when the editor region throws.',
    injectedFailure: 'Inject a controlled editor-region exception while preview, terminal, and agent sidecar stay alive.',
    expectedRecovery: 'Editor region swaps to its crash state, shell chrome remains usable, and evidence receipts are emitted.',
    generatedEvidenceRefs: [
      'harness:modern-ide-shell-mounted',
      'error boundary receipt:ide-editor-region',
      'crash state receipt:ide-region-isolated',
      'fixture:ide:error-boundary-region-crash',
    ],
    blockedClaims: ['uninterrupted IDE execution', 'production ready'],
    implementationState: 'runner-ready',
    nextAction: 'Run the browser runner, inject the editor crash fixture, and persist the generated receipts.',
  },
  {
    id: 'preview-canonical-fallback-surface',
    scenarioId: 'preview-render-fallback',
    fixtureId: 'fixture:preview:canonical-fallback',
    canonicalEntrypoint: 'components/preview/CanonicalPreviewSurface.tsx',
    owner: 'preview-runtime',
    surface: 'preview',
    mountedAssertion: 'CanonicalPreviewSurface remains mounted when the render adapter fails.',
    injectedFailure: 'Disable the render adapter and force the canonical preview fallback path.',
    expectedRecovery: 'Preview swaps to governed fallback, captures frame-budget evidence, and keeps edit/review actions available.',
    generatedEvidenceRefs: [
      'harness:canonical-preview-surface-mounted',
      'error boundary receipt:preview-render-adapter',
      'performance trace receipt:preview-fallback-frame-budget',
      'fixture:preview:canonical-fallback',
    ],
    blockedClaims: ['native renderer ready', 'final render'],
    implementationState: 'runner-ready',
    nextAction: 'Run the browser runner, kill the render adapter, and persist fallback/performance receipts.',
  },
]

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function hasContractEvidence(harness: RuntimeFailureSmokeHarness): boolean {
  const joined = harness.generatedEvidenceRefs.join(' ').toLowerCase()
  return (
    harness.canonicalEntrypoint.endsWith('.tsx') &&
    harness.generatedEvidenceRefs.some((ref) => ref.startsWith('harness:')) &&
    harness.generatedEvidenceRefs.some((ref) => ref.startsWith('fixture:')) &&
    joined.includes('error boundary receipt') &&
    harness.blockedClaims.length >= 2
  )
}

export function buildRuntimeFailureSmokeHarnessReport(): RuntimeFailureSmokeHarnessReport {
  const fixtureReport = buildRuntimeFailureSmokeFixtureReport()
  const fixtureIds = new Set(fixtureReport.fixtures.map((fixture) => fixture.fixtureId))
  const fixtureScenarioIds = new Set(fixtureReport.fixtures.map((fixture) => fixture.scenarioId))
  const coveredScenarioIds = unique(
    RUNTIME_FAILURE_SMOKE_HARNESSES.filter((harness) => fixtureScenarioIds.has(harness.scenarioId)).map((harness) => harness.scenarioId),
  )
  const missingScenarioIds = RUNTIME_FAILURE_SMOKE_HARNESSES.filter((harness) => !fixtureScenarioIds.has(harness.scenarioId)).map(
    (harness) => harness.scenarioId,
  )
  const coveredFixtureIds = unique(
    RUNTIME_FAILURE_SMOKE_HARNESSES.filter((harness) => fixtureIds.has(harness.fixtureId)).map((harness) => harness.fixtureId),
  )
  const blockers = RUNTIME_FAILURE_SMOKE_HARNESSES.flatMap((harness) => [
    ...(fixtureIds.has(harness.fixtureId) ? [] : [`${harness.id}: missing fixture ${harness.fixtureId}`]),
    ...(hasContractEvidence(harness) ? [] : [`${harness.id}: contract evidence is too thin`]),
  ])
  const contractReadyCount = RUNTIME_FAILURE_SMOKE_HARNESSES.filter((harness) => hasContractEvidence(harness) && fixtureIds.has(harness.fixtureId)).length
  const runnerReadyCount = RUNTIME_FAILURE_SMOKE_HARNESSES.filter((harness) => harness.implementationState === 'runner-ready').length
  const needsRunnerCount = RUNTIME_FAILURE_SMOKE_HARNESSES.filter((harness) => harness.implementationState === 'needs-playwright-runner').length

  return {
    version: 1,
    capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_HARNESS',
    harnessCount: RUNTIME_FAILURE_SMOKE_HARNESSES.length,
    contractReadyCount,
    runnerReadyCount,
    needsRunnerCount,
    marketClaimAllowed: false,
    manualRunnerRequired: true,
    runnerCommand: 'npm run runtime:v29-failure-smoke',
    harnesses: RUNTIME_FAILURE_SMOKE_HARNESSES,
    fixtureCoverage: {
      coveredScenarioIds,
      missingScenarioIds,
      coveredFixtureIds,
    },
    blockers,
    nextAction: 'Run the Playwright/in-app browser runner against a live authenticated server, then persist receipts after human review.',
  }
}

export function validateRuntimeFailureSmokeHarnessReport(report: RuntimeFailureSmokeHarnessReport): string[] {
  const failures: string[] = []
  if (report.capability !== 'AETHEL_RUNTIME_FAILURE_SMOKE_HARNESS') failures.push('invalid harness capability')
  if (report.harnessCount !== 2) failures.push('expected IDE and preview harness contracts')
  if (report.contractReadyCount !== 2) failures.push('both harness contracts must be ready')
  if (report.runnerReadyCount !== 2) failures.push('both harnesses must have a runner-ready path')
  if (report.needsRunnerCount !== 0) failures.push('harnesses still point at a missing browser runner')
  if (report.marketClaimAllowed !== false) failures.push('harness report cannot allow market claims')
  if (report.manualRunnerRequired !== true) failures.push('manual/browser runner requirement must be explicit')
  if (report.runnerCommand !== 'npm run runtime:v29-failure-smoke') failures.push('missing executable runner command')
  if (report.fixtureCoverage.missingScenarioIds.length > 0) failures.push('harness has missing fixture scenario coverage')
  if (report.fixtureCoverage.coveredFixtureIds.length !== 2) failures.push('expected two covered fixture ids')
  if (report.blockers.length > 0) failures.push(...report.blockers)

  for (const harness of report.harnesses) {
    if (!harness.canonicalEntrypoint.endsWith('.tsx')) failures.push(`${harness.id}: canonical entrypoint must be TSX`)
    if (harness.generatedEvidenceRefs.length < 4) failures.push(`${harness.id}: generated evidence refs are too thin`)
    if (!harness.generatedEvidenceRefs.some((ref) => ref.startsWith('harness:'))) failures.push(`${harness.id}: missing harness evidence ref`)
    if (!harness.generatedEvidenceRefs.some((ref) => ref.startsWith('fixture:'))) failures.push(`${harness.id}: missing fixture evidence ref`)
    if (!harness.generatedEvidenceRefs.join(' ').includes('error boundary receipt')) failures.push(`${harness.id}: missing error boundary receipt`)
    if (harness.blockedClaims.length < 2) failures.push(`${harness.id}: blocked claims are too thin`)
    if (harness.implementationState !== 'runner-ready') failures.push(`${harness.id}: browser runner is not wired`)
  }

  return unique(failures)
}
