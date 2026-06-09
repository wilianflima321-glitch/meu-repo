import type { RuntimeFailureSmokeScenarioId } from '@/lib/runtime/runtime-failure-smoke-pack'

export type RuntimeFailureSmokeFixtureSurface =
  | 'ide'
  | 'preview'
  | 'agent'
  | 'research'
  | 'desktop'
  | 'cloud'
  | 'publish'

export type RuntimeFailureSmokeFixture = {
  scenarioId: RuntimeFailureSmokeScenarioId
  surface: RuntimeFailureSmokeFixtureSurface
  owner: string
  fixtureId: string
  injectedFault: string
  evidenceRefs: string[]
  requiredHarness: string[]
  blockedClaims: string[]
  replayable: boolean
  persistable: boolean
}

export type RuntimeFailureSmokeFixtureReport = {
  version: 1
  capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_FIXTURES'
  fixtureCount: number
  replayableCount: number
  persistableCount: number
  evidenceOverrideMap: Partial<Record<RuntimeFailureSmokeScenarioId, string[]>>
  fixtures: RuntimeFailureSmokeFixture[]
  blockers: string[]
  nextAction: string
}

export const RUNTIME_FAILURE_SMOKE_FIXTURES: RuntimeFailureSmokeFixture[] = [
  {
    scenarioId: 'ide-region-crash-isolated',
    surface: 'ide',
    owner: 'ide-runtime',
    fixtureId: 'fixture:ide:error-boundary-region-crash',
    injectedFault: 'Throw inside editor region while preview, terminal, and agent sidecar remain mounted.',
    evidenceRefs: ['error boundary receipt:ide-editor-region', 'crash state receipt:ide-region-isolated'],
    requiredHarness: ['ModernIDEShell region boundary', 'region crash fixture', 'shell mounted assertion'],
    blockedClaims: ['uninterrupted IDE execution', 'production ready'],
    replayable: true,
    persistable: true,
  },
  {
    scenarioId: 'preview-render-fallback',
    surface: 'preview',
    owner: 'preview-runtime',
    fixtureId: 'fixture:preview:canonical-fallback',
    injectedFault: 'Disable render adapter and force canonical preview fallback surface.',
    evidenceRefs: ['error boundary receipt:preview-render-adapter', 'performance trace receipt:preview-fallback-frame-budget'],
    requiredHarness: ['CanonicalPreviewSurface', 'render adapter kill switch', 'fallback screenshot receipt'],
    blockedClaims: ['native renderer ready', 'final render'],
    replayable: true,
    persistable: true,
  },
  {
    scenarioId: 'agent-tool-retry-held',
    surface: 'agent',
    owner: 'agent-orchestrator',
    fixtureId: 'fixture:agent:bounded-tool-retry',
    injectedFault: 'Force one tool timeout and verify bounded retry without autonomy promotion.',
    evidenceRefs: ['retry policy receipt:agent-tool-timeout', 'tool receipt:agent-retry-held'],
    requiredHarness: ['scoped tool registry', 'retry budget fixture', 'approval hold assertion'],
    blockedClaims: ['autonomous execution ready', 'agent completed without review'],
    replayable: true,
    persistable: true,
  },
  {
    scenarioId: 'research-browser-takeover',
    surface: 'research',
    owner: 'research-browser-operator',
    fixtureId: 'fixture:research:browser-takeover',
    injectedFault: 'Navigate to risky/ambiguous source and require user takeover.',
    evidenceRefs: ['browser replay receipt:research-risk-navigation', 'takeover control receipt:research-human-takeover'],
    requiredHarness: ['browser replay recorder', 'DOM receipt', 'takeover control assertion'],
    blockedClaims: ['research verified', 'autonomous browser execution'],
    replayable: true,
    persistable: true,
  },
  {
    scenarioId: 'studio-local-crash-loop',
    surface: 'desktop',
    owner: 'desktop-runtime',
    fixtureId: 'fixture:desktop:sidecar-crash-loop',
    injectedFault: 'Report sidecar crash loop through native kernel manifest and hold release.',
    evidenceRefs: ['crash state receipt:studio-local-sidecar-loop', 'retry policy receipt:studio-local-held'],
    requiredHarness: ['native kernel manifest', 'sidecar crash fixture', 'desktop release hold assertion'],
    blockedClaims: ['desktop ready', 'signed installer ready'],
    replayable: true,
    persistable: true,
  },
  {
    scenarioId: 'cloud-render-teardown',
    surface: 'cloud',
    owner: 'cloud-render-runtime',
    fixtureId: 'fixture:cloud:teardown-cost-cap',
    injectedFault: 'Open governed cloud session fixture, force failed preview, and require teardown/cost cap receipt.',
    evidenceRefs: ['teardown receipt:cloud-session-closed', 'cost cap receipt:cloud-render-budget-held'],
    requiredHarness: ['cloud session fixture', 'teardown assertion', 'cost cap assertion'],
    blockedClaims: ['cloud render available', 'Pixel Streaming available'],
    replayable: true,
    persistable: true,
  },
  {
    scenarioId: 'publish-rollback',
    surface: 'publish',
    owner: 'release-governance',
    fixtureId: 'fixture:publish:rollback-checkpoint',
    injectedFault: 'Fail package validation and roll back to last approved checkpoint.',
    evidenceRefs: ['rollback receipt:publish-last-approved-checkpoint', 'human review receipt:release-held'],
    requiredHarness: ['package validation fixture', 'rollback checkpoint', 'manual publish hold assertion'],
    blockedClaims: ['production ready', 'releaseReady=true'],
    replayable: true,
    persistable: true,
  },
]

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

export function buildRuntimeFailureSmokeFixtureReport(): RuntimeFailureSmokeFixtureReport {
  const evidenceOverrideMap: Partial<Record<RuntimeFailureSmokeScenarioId, string[]>> = {}
  for (const fixture of RUNTIME_FAILURE_SMOKE_FIXTURES) {
    evidenceOverrideMap[fixture.scenarioId] = unique(fixture.evidenceRefs)
  }
  const blockers = RUNTIME_FAILURE_SMOKE_FIXTURES.flatMap((fixture) => [
    ...(fixture.replayable ? [] : [`${fixture.fixtureId}: fixture is not replayable`]),
    ...(fixture.persistable ? [] : [`${fixture.fixtureId}: fixture is not persistable`]),
    ...(fixture.requiredHarness.length === 0 ? [`${fixture.fixtureId}: missing harness requirements`] : []),
    ...(fixture.blockedClaims.length === 0 ? [`${fixture.fixtureId}: missing blocked claims`] : []),
  ])
  return {
    version: 1,
    capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_FIXTURES',
    fixtureCount: RUNTIME_FAILURE_SMOKE_FIXTURES.length,
    replayableCount: RUNTIME_FAILURE_SMOKE_FIXTURES.filter((fixture) => fixture.replayable).length,
    persistableCount: RUNTIME_FAILURE_SMOKE_FIXTURES.filter((fixture) => fixture.persistable).length,
    evidenceOverrideMap,
    fixtures: RUNTIME_FAILURE_SMOKE_FIXTURES,
    blockers,
    nextAction: 'Wire each fixture into its real harness and persist the generated evidence refs through the runtime evidence package.',
  }
}

export function validateRuntimeFailureSmokeFixtureReport(report: RuntimeFailureSmokeFixtureReport): string[] {
  const failures: string[] = []
  if (report.capability !== 'AETHEL_RUNTIME_FAILURE_SMOKE_FIXTURES') failures.push('invalid fixture capability')
  if (report.fixtureCount !== 7) failures.push('expected 7 runtime failure smoke fixtures')
  if (report.replayableCount !== report.fixtureCount) failures.push('all smoke fixtures must be replayable')
  if (report.persistableCount !== report.fixtureCount) failures.push('all smoke fixtures must be persistable')
  if (report.blockers.length > 0) failures.push(...report.blockers)
  for (const fixture of report.fixtures) {
    if (!report.evidenceOverrideMap[fixture.scenarioId]?.length) failures.push(`${fixture.scenarioId}: missing evidence override`)
    if (!fixture.fixtureId.startsWith('fixture:')) failures.push(`${fixture.scenarioId}: fixtureId must be namespaced`)
    if (fixture.evidenceRefs.length < 2) failures.push(`${fixture.scenarioId}: at least two evidence refs are required`)
    if (fixture.requiredHarness.length < 2) failures.push(`${fixture.scenarioId}: harness requirements are too thin`)
  }
  return unique(failures)
}
