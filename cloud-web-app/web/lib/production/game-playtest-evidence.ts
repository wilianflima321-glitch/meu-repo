import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionRuntimeTarget,
} from '@/lib/production/agentic-production-state'
import { mergeAgenticProductionState } from '@/lib/production/agentic-production-state'

export type GamePlaytestArtifactKind =
  | 'replay'
  | 'input-log'
  | 'screenshot'
  | 'video-capture'
  | 'performance-trace'
  | 'bug-report'
  | 'accessibility-report'
  | 'savegame'
  | 'build-artifact'

export interface GamePlaytestArtifact {
  kind: GamePlaytestArtifactKind
  url: string
  checksum?: string
  sizeBytes?: number
}

export interface GamePlaytestMetrics {
  durationSeconds: number
  averageFps?: number
  p95FrameTimeMs?: number
  inputLatencyMs?: number
  crashCount: number
  blockerBugCount: number
  majorBugCount: number
  completionRate: number
  memoryPeakMb?: number
  vramPeakMb?: number
}

export interface GamePlaytestValidation {
  playable: boolean
  crashFree: boolean
  performanceOk: boolean
  inputOk: boolean
  progressionOk: boolean
  accessibilityOk: boolean
  humanFeelReviewOk: boolean
}

export interface GamePlaytestEvidence {
  sessionId: string
  projectId?: string | null
  buildId: string
  scenario: string
  runtimeTarget: ProductionRuntimeTarget
  capturedAt: string
  artifacts: GamePlaytestArtifact[]
  metrics: GamePlaytestMetrics
  validation: GamePlaytestValidation
  notes: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function booleanOrFalse(value: unknown): boolean {
  return value === true
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function normalizeRuntimeTarget(value: unknown): ProductionRuntimeTarget {
  if (
    value === 'local-native' ||
    value === 'local-worker' ||
    value === 'local-main-safe' ||
    value === 'cloud-sandbox' ||
    value === 'held'
  ) {
    return value
  }
  return 'cloud-sandbox'
}

function normalizeArtifact(value: unknown): GamePlaytestArtifact | null {
  if (!isRecord(value)) return null
  const kind = value.kind
  const url = stringOrNull(value.url)
  if (
    !url ||
    (
      kind !== 'replay' &&
      kind !== 'input-log' &&
      kind !== 'screenshot' &&
      kind !== 'video-capture' &&
      kind !== 'performance-trace' &&
      kind !== 'bug-report' &&
      kind !== 'accessibility-report' &&
      kind !== 'savegame' &&
      kind !== 'build-artifact'
    )
  ) {
    return null
  }

  return {
    kind,
    url,
    checksum: stringOrNull(value.checksum) ?? undefined,
    sizeBytes: numberOrUndefined(value.sizeBytes),
  }
}

function validationPasses(validation: GamePlaytestValidation): boolean {
  return (
    validation.playable &&
    validation.crashFree &&
    validation.performanceOk &&
    validation.inputOk &&
    validation.progressionOk &&
    validation.accessibilityOk &&
    validation.humanFeelReviewOk
  )
}

function evidenceRef(evidence: GamePlaytestEvidence): string {
  return `game-playtest:${evidence.sessionId}:${evidence.capturedAt}`
}

function artifactRefs(evidence: GamePlaytestEvidence): string[] {
  return evidence.artifacts.map((artifact) => `${artifact.kind}:${artifact.url}`)
}

function upsertNode(
  state: AgenticProductionState,
  key: ProductionGraphKey,
  node: ProductionGraphNode,
): ProductionGraphNode[] {
  return [node, ...state.graphs[key].filter((candidate) => candidate.id !== node.id)].slice(0, 60)
}

function blockersFor(evidence: GamePlaytestEvidence): string[] {
  return unique([
    ...(!evidence.validation.playable ? ['Playable path failed'] : []),
    ...(!evidence.validation.crashFree ? ['Crash-free validation failed'] : []),
    ...(!evidence.validation.performanceOk ? ['Frame pacing or performance budget failed'] : []),
    ...(!evidence.validation.inputOk ? ['Input/camera feel validation failed'] : []),
    ...(!evidence.validation.progressionOk ? ['Progression/save/load validation failed'] : []),
    ...(!evidence.validation.accessibilityOk ? ['Accessibility validation failed'] : []),
    ...(!evidence.validation.humanFeelReviewOk ? ['Human feel review is still required'] : []),
    ...(evidence.metrics.blockerBugCount > 0 ? [`${evidence.metrics.blockerBugCount} blocker bugs remain`] : []),
    ...(evidence.metrics.crashCount > 0 ? [`${evidence.metrics.crashCount} crashes recorded`] : []),
  ])
}

function buildLedger(evidence: GamePlaytestEvidence): MissionLedgerEntry {
  const refs = unique([evidenceRef(evidence), ...artifactRefs(evidence)])
  const passed = validationPasses(evidence.validation)
  const blockers = blockersFor(evidence)
  return {
    id: `game-playtest-${evidence.sessionId}`,
    phase: 'Game playtest validation',
    ownerAgent: 'QA Playtest Agent',
    state: passed ? 'needs-approval' : 'blocked',
    summary: `${evidence.scenario} playtest captured for build ${evidence.buildId}`,
    acceptance: [
      'Replay artifact attached',
      'Performance trace attached',
      'Bug ledger attached',
      'Input/camera feel reviewed',
      'Release remains human-held',
    ],
    evidenceRefs: refs,
    rollbackPlan: `Hold build ${evidence.buildId}, preserve previous approved checkpoint, and route blockers back to Gameplay/Performance agents.`,
    nextAction: passed
      ? 'Request human release review; do not mark game ready automatically.'
      : `Fix playtest blockers: ${blockers.join('; ')}`,
    estimatedCostUsd: 0,
    updatedAt: evidence.capturedAt,
  }
}

export function coerceGamePlaytestEvidence(input: unknown): GamePlaytestEvidence | null {
  const source = isRecord(input) && isRecord(input.evidence) ? input.evidence : input
  if (!isRecord(source)) return null

  const sessionId = stringOrNull(source.sessionId)
  const buildId = stringOrNull(source.buildId)
  const scenario = stringOrNull(source.scenario)
  if (!sessionId || !buildId || !scenario) return null

  const artifacts = Array.isArray(source.artifacts)
    ? source.artifacts.map(normalizeArtifact).filter((artifact): artifact is GamePlaytestArtifact => Boolean(artifact))
    : []
  if (!artifacts.some((artifact) => artifact.kind === 'replay')) return null
  if (!artifacts.some((artifact) => artifact.kind === 'performance-trace')) return null
  if (!artifacts.some((artifact) => artifact.kind === 'bug-report')) return null

  const metricsInput = isRecord(source.metrics) ? source.metrics : {}
  const validationInput = isRecord(source.validation) ? source.validation : {}

  return {
    sessionId,
    projectId: stringOrNull(source.projectId),
    buildId,
    scenario,
    runtimeTarget: normalizeRuntimeTarget(source.runtimeTarget),
    capturedAt: typeof source.capturedAt === 'string' && !Number.isNaN(Date.parse(source.capturedAt))
      ? source.capturedAt
      : new Date().toISOString(),
    artifacts,
    metrics: {
      durationSeconds: numberOr(metricsInput.durationSeconds, 0),
      averageFps: numberOrUndefined(metricsInput.averageFps),
      p95FrameTimeMs: numberOrUndefined(metricsInput.p95FrameTimeMs),
      inputLatencyMs: numberOrUndefined(metricsInput.inputLatencyMs),
      crashCount: numberOr(metricsInput.crashCount, 0),
      blockerBugCount: numberOr(metricsInput.blockerBugCount, 0),
      majorBugCount: numberOr(metricsInput.majorBugCount, 0),
      completionRate: Math.min(1, numberOr(metricsInput.completionRate, 0)),
      memoryPeakMb: numberOrUndefined(metricsInput.memoryPeakMb),
      vramPeakMb: numberOrUndefined(metricsInput.vramPeakMb),
    },
    validation: {
      playable: booleanOrFalse(validationInput.playable),
      crashFree: booleanOrFalse(validationInput.crashFree),
      performanceOk: booleanOrFalse(validationInput.performanceOk),
      inputOk: booleanOrFalse(validationInput.inputOk),
      progressionOk: booleanOrFalse(validationInput.progressionOk),
      accessibilityOk: booleanOrFalse(validationInput.accessibilityOk),
      humanFeelReviewOk: booleanOrFalse(validationInput.humanFeelReviewOk),
    },
    notes: stringArray(source.notes),
  }
}

export function mergeGamePlaytestEvidenceIntoProductionState(
  current: AgenticProductionState,
  evidence: GamePlaytestEvidence
): AgenticProductionState {
  const refs = unique([evidenceRef(evidence), ...artifactRefs(evidence)])
  const passed = validationPasses(evidence.validation)
  const blockers = blockersFor(evidence)
  const status: ProductionGraphNode['status'] = passed ? 'needs-review' : 'blocked'

  const evidenceNode: ProductionGraphNode = {
    id: `game-playtest-evidence-${evidence.sessionId}`,
    label: `Playtest evidence - ${evidence.scenario}`,
    status: 'ready',
    ownerAgent: 'QA Playtest Agent',
    evidenceRefs: refs,
    blockers: [],
    updatedAt: evidence.capturedAt,
  }
  const gameplayNode: ProductionGraphNode = {
    id: `game-playtest-gameplay-${evidence.sessionId}`,
    label: `Gameplay validation - ${evidence.scenario}`,
    status,
    ownerAgent: 'Gameplay Systems Agent',
    evidenceRefs: refs,
    blockers,
    updatedAt: evidence.capturedAt,
  }
  const validationNode: ProductionGraphNode = {
    id: `game-playtest-validation-${evidence.sessionId}`,
    label: `Playtest validation - ${evidence.scenario}`,
    status,
    ownerAgent: 'Performance QA Agent',
    evidenceRefs: refs,
    blockers,
    updatedAt: evidence.capturedAt,
  }
  const releaseNode: ProductionGraphNode = {
    id: `game-playtest-release-${evidence.sessionId}`,
    label: `Release review from playtest - ${evidence.buildId}`,
    status,
    ownerAgent: 'Release Producer Agent',
    evidenceRefs: refs,
    blockers: passed
      ? ['Human approval required before release; playtest evidence never auto-publishes the game']
      : blockers,
    updatedAt: evidence.capturedAt,
  }

  return mergeAgenticProductionState(
    current,
    {
      brain: {
        technicalBible: {
          ...current.brain.technicalBible,
          runtimeTargets: unique([...current.brain.technicalBible.runtimeTargets, evidence.runtimeTarget]) as ProductionRuntimeTarget[],
          constraints: unique([
            ...current.brain.technicalBible.constraints,
            'Playable quality requires replay, bug ledger, performance trace, input/camera validation, and human feel review',
          ]),
        },
        risks: unique([
          ...current.brain.risks,
          ...(passed ? [] : ['Playtest evidence found blockers that prevent release readiness']),
        ]),
      },
      ledger: [buildLedger(evidence), ...current.ledger].slice(0, 60),
      graphs: {
        evidenceGraph: upsertNode(current, 'evidenceGraph', evidenceNode),
        gameplayGraph: upsertNode(current, 'gameplayGraph', gameplayNode),
        validationGraph: upsertNode(current, 'validationGraph', validationNode),
        releaseGraph: upsertNode(current, 'releaseGraph', releaseNode),
      },
      runtimePolicy: {
        preferredTarget: evidence.runtimeTarget,
        fallbackTarget: 'cloud-sandbox',
        requiresHumanApproval: true,
      },
    },
    evidence.capturedAt,
  )
}
