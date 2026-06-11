import type {
  AgenticProductionState,
  AgenticProductionStatePatch,
  MissionLedgerEntry,
  MissionLedgerState,
  ProductionDomain,
  ProductionGraphs,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionNodeStatus,
  ProductionReadinessSummary,
  ProductionRuntimePolicy,
  ProductionRuntimeTarget,
  ProjectBrainDecision,
  ProjectBrainMemory,
} from './agentic-production-state.types'
export type {
  AgenticProductionState,
  AgenticProductionStatePatch,
  MissionLedgerEntry,
  MissionLedgerState,
  ProductionDomain,
  ProductionGraphs,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionNodeStatus,
  ProductionReadinessSummary,
  ProductionRuntimePolicy,
  ProductionRuntimeTarget,
  ProjectBrainDecision,
  ProjectBrainMemory,
} from './agentic-production-state.types'
export const PRODUCTION_STATE_SETTINGS_KEY = 'aethelProductionState'
export const productionGraphLabels: Record<ProductionGraphKey, string> = {
  assetGraph: 'Asset Graph',
  sceneWorldGraph: 'Scene/World Graph',
  gameplayGraph: 'Gameplay Graph',
  shotFilmGraph: 'Shot/Film Graph',
  validationGraph: 'Validation Graph',
  evidenceGraph: 'Evidence Graph',
  releaseGraph: 'Release Graph',
}
const productionGraphKeys = Object.keys(productionGraphLabels) as ProductionGraphKey[]
const productionNodeStatuses: ProductionNodeStatus[] = ['missing', 'draft', 'needs-review', 'ready', 'blocked']
const missionLedgerStates: MissionLedgerState[] = [
  'planned',
  'running',
  'needs-approval',
  'blocked',
  'paused',
  'complete',
]
const runtimeTargets: ProductionRuntimeTarget[] = [
  'local-native',
  'local-worker',
  'local-main-safe',
  'cloud-sandbox',
  'held',
]
const localAccelerationModes: ProductionRuntimePolicy['localAcceleration'][] = [
  'prefer-npu',
  'prefer-gpu',
  'balanced',
  'cloud-first',
]
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}
function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}
function pickStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}
function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}
function isoNow(now?: string): string {
  return now ?? new Date().toISOString()
}
function domainFromProjectType(projectType?: string | null): ProductionDomain {
  switch (projectType) {
    case 'web':
      return 'web-app'
    case 'code':
      return 'code'
    case 'unreal':
      return 'game-film'
    case 'game':
      return 'game'
    case 'film':
      return 'film'
    case 'game-film':
      return 'game-film'
    default:
      return 'mixed'
  }
}
function buildDefaultGraphNode(key: ProductionGraphKey, now: string): ProductionGraphNode {
  return {
    id: key,
    label: productionGraphLabels[key],
    status: key === 'assetGraph' || key === 'validationGraph' || key === 'evidenceGraph' ? 'draft' : 'missing',
    ownerAgent:
      key === 'assetGraph'
        ? 'Asset Librarian Agent'
        : key === 'validationGraph'
          ? 'QA Agent'
          : key === 'releaseGraph'
            ? 'Release Agent'
            : 'Producer Agent',
    evidenceRefs: [],
    blockers: [],
    updatedAt: now,
  }
}
function normalizeGraphNode(input: unknown, fallback: ProductionGraphNode): ProductionGraphNode {
  if (!isRecord(input)) return fallback
  return {
    id: pickString(input.id, fallback.id),
    label: pickString(input.label, fallback.label),
    status: pickEnum(input.status, productionNodeStatuses, fallback.status),
    ownerAgent: pickString(input.ownerAgent, fallback.ownerAgent),
    evidenceRefs: pickStringArray(input.evidenceRefs, fallback.evidenceRefs),
    blockers: pickStringArray(input.blockers, fallback.blockers),
    updatedAt: pickString(input.updatedAt, fallback.updatedAt),
  }
}
function normalizeLedgerEntry(input: unknown, fallback: MissionLedgerEntry): MissionLedgerEntry {
  if (!isRecord(input)) return fallback
  return {
    id: pickString(input.id, fallback.id),
    phase: pickString(input.phase, fallback.phase),
    ownerAgent: pickString(input.ownerAgent, fallback.ownerAgent),
    state: pickEnum(input.state, missionLedgerStates, fallback.state),
    summary: pickString(input.summary, fallback.summary),
    acceptance: pickStringArray(input.acceptance, fallback.acceptance),
    evidenceRefs: pickStringArray(input.evidenceRefs, fallback.evidenceRefs),
    rollbackPlan: pickString(input.rollbackPlan, fallback.rollbackPlan),
    nextAction: pickString(input.nextAction, fallback.nextAction),
    estimatedCostUsd: Math.max(0, pickNumber(input.estimatedCostUsd, fallback.estimatedCostUsd)),
    updatedAt: pickString(input.updatedAt, fallback.updatedAt),
  }
}
function normalizeDecision(input: unknown, fallback: ProjectBrainDecision): ProjectBrainDecision {
  if (!isRecord(input)) return fallback
  return {
    id: pickString(input.id, fallback.id),
    title: pickString(input.title, fallback.title),
    rationale: pickString(input.rationale, fallback.rationale),
    ownerAgent: pickString(input.ownerAgent, fallback.ownerAgent),
    createdAt: pickString(input.createdAt, fallback.createdAt),
  }
}
export function buildDefaultAgenticProductionState(input: {
  projectName?: string | null
  projectType?: string | null
  now?: string
} = {}): AgenticProductionState {
  const now = isoNow(input.now)
  const objective = input.projectName
    ? `Deliver ${input.projectName} with evidence-first AI production.`
    : 'Define one concrete mission before agents start production.'
  return {
    version: 1,
    updatedAt: now,
    brain: {
      objective,
      domain: domainFromProjectType(input.projectType),
      audience: 'End users and reviewers who need a working artifact, not a chat transcript.',
      creativeBible: {
        style: 'Project-defined visual direction',
        tone: 'Clear, premium, low-noise, mission-first',
        story: 'Stored after the first mission brief',
        continuity: ['Mission intent', 'Approved evidence', 'Human review gates'],
      },
      technicalBible: {
        runtimeTargets: ['cloud-sandbox', 'local-worker'],
        constraints: ['No autonomous AAA claims without validation evidence', 'Keep heavy work out of the UI thread'],
        performanceBudget: 'Keep browser UI responsive; route heavy jobs to workers, native, or cloud.',
      },
      risks: ['Asset provenance missing until Asset Graph is reviewed'],
      decisions: [
        {
          id: 'decision-human-approval',
          title: 'Human approval gates stay mandatory',
          rationale: 'Browser/operator/game/film agents can make expensive or risky changes.',
          ownerAgent: 'Producer Agent',
          createdAt: now,
        },
      ],
    },
    ledger: [
      {
        id: 'mission-intake',
        phase: 'Mission intake',
        ownerAgent: 'Producer Agent',
        state: input.projectName ? 'running' : 'planned',
        summary: input.projectName ? 'Mission memory seeded from the active project.' : 'Waiting for a concrete mission.',
        acceptance: ['Goal captured', 'Runtime policy selected', 'Evidence path defined'],
        evidenceRefs: [],
        rollbackPlan: 'Pause agents and restore the last approved checkpoint.',
        nextAction: input.projectName ? 'Complete production graphs' : 'Define mission',
        estimatedCostUsd: 0,
        updatedAt: now,
      },
    ],
    graphs: productionGraphKeys.reduce((graphs, key) => {
      graphs[key] = [buildDefaultGraphNode(key, now)]
      return graphs
    }, {} as ProductionGraphs),
    runtimePolicy: {
      preferredTarget: 'cloud-sandbox',
      fallbackTarget: 'cloud-sandbox',
      localAcceleration: 'balanced',
      requiresHumanApproval: true,
      maxConcurrentHeavyJobs: 1,
    },
  }
}
export function readAgenticProductionStateFromSettings(settings: unknown): AgenticProductionState | null {
  if (!isRecord(settings)) return null
  const candidate = settings[PRODUCTION_STATE_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  return normalizeAgenticProductionState(candidate)
}
export function writeAgenticProductionStateToSettings(
  settings: unknown,
  state: AgenticProductionState
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [PRODUCTION_STATE_SETTINGS_KEY]: state,
  }
}
const releaseApprovalEvidencePatterns = [
  /human[-_ ]?approval/i,
  /release[-_ ]?approval/i,
  /approval[-_: ]?record/i,
  /approved[-_: ]?release/i,
]
function hasReleaseApprovalEvidence(state: AgenticProductionState): boolean {
  const graphEvidence = state.graphs.releaseGraph.flatMap((node) => node.evidenceRefs)
  const ledgerEvidence = state.ledger.flatMap((entry) => entry.evidenceRefs)
  return [...graphEvidence, ...ledgerEvidence].some((ref) =>
    releaseApprovalEvidencePatterns.some((pattern) => pattern.test(ref))
  )
}
function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}
export function enforceProductionReleaseGuard(state: AgenticProductionState): AgenticProductionState {
  const releaseApproved = hasReleaseApprovalEvidence(state)
  const releaseGraph = state.graphs.releaseGraph.map((node) => {
    if (releaseApproved || node.status !== 'ready') return node
    return {
      ...node,
      status: 'needs-review' as const,
      blockers: uniqueStrings([
        ...node.blockers,
        'Human release approval evidence is required before release can be marked ready.',
      ]),
    }
  })
  return {
    ...state,
    graphs: {
      ...state.graphs,
      releaseGraph,
    },
    runtimePolicy: {
      ...state.runtimePolicy,
      requiresHumanApproval: releaseApproved ? state.runtimePolicy.requiresHumanApproval : true,
    },
  }
}
export function normalizeAgenticProductionState(input: unknown): AgenticProductionState {
  const fallback = buildDefaultAgenticProductionState()
  if (!isRecord(input)) return fallback
  const brainInput = isRecord(input.brain) ? input.brain : {}
  const creativeBibleInput = isRecord(brainInput.creativeBible) ? brainInput.creativeBible : {}
  const technicalBibleInput = isRecord(brainInput.technicalBible) ? brainInput.technicalBible : {}
  const runtimePolicyInput = isRecord(input.runtimePolicy) ? input.runtimePolicy : {}
  const graphsInput = isRecord(input.graphs) ? input.graphs : {}
  const graphs = productionGraphKeys.reduce((nextGraphs, key) => {
    const fallbackNode = buildDefaultGraphNode(key, fallback.updatedAt)
    const nodes = Array.isArray(graphsInput[key]) ? graphsInput[key] : []
    nextGraphs[key] =
      nodes.length > 0
        ? nodes.map((node, index) => normalizeGraphNode(node, { ...fallbackNode, id: `${key}-${index + 1}` }))
        : [fallbackNode]
    return nextGraphs
  }, {} as ProductionGraphs)
  const ledgerInput = Array.isArray(input.ledger) ? input.ledger : []
  const ledgerFallback = fallback.ledger[0]
  const normalized: AgenticProductionState = {
    version: 1,
    updatedAt: pickString(input.updatedAt, fallback.updatedAt),
    brain: {
      objective: pickString(brainInput.objective, fallback.brain.objective),
      domain: pickEnum(brainInput.domain, ['web-app', 'code', 'game-film', 'game', 'film', 'mixed'], fallback.brain.domain),
      audience: pickString(brainInput.audience, fallback.brain.audience),
      creativeBible: {
        style: pickString(creativeBibleInput.style, fallback.brain.creativeBible.style),
        tone: pickString(creativeBibleInput.tone, fallback.brain.creativeBible.tone),
        story: pickString(creativeBibleInput.story, fallback.brain.creativeBible.story),
        continuity: pickStringArray(creativeBibleInput.continuity, fallback.brain.creativeBible.continuity),
      },
      technicalBible: {
        runtimeTargets: pickStringArray(technicalBibleInput.runtimeTargets, fallback.brain.technicalBible.runtimeTargets).filter(
          (target): target is ProductionRuntimeTarget => runtimeTargets.includes(target as ProductionRuntimeTarget)
        ),
        constraints: pickStringArray(technicalBibleInput.constraints, fallback.brain.technicalBible.constraints),
        performanceBudget: pickString(technicalBibleInput.performanceBudget, fallback.brain.technicalBible.performanceBudget),
      },
      risks: pickStringArray(brainInput.risks, fallback.brain.risks),
      decisions: Array.isArray(brainInput.decisions)
        ? brainInput.decisions.map((decision, index) =>
            normalizeDecision(decision, {
              id: `decision-${index + 1}`,
              title: 'Production decision',
              rationale: 'Captured in Project Brain',
              ownerAgent: 'Producer Agent',
              createdAt: fallback.updatedAt,
            })
          )
        : fallback.brain.decisions,
    },
    ledger:
      ledgerInput.length > 0
        ? ledgerInput.map((entry, index) => normalizeLedgerEntry(entry, { ...ledgerFallback, id: `ledger-${index + 1}` }))
        : fallback.ledger,
    graphs,
    runtimePolicy: {
      preferredTarget: pickEnum(runtimePolicyInput.preferredTarget, runtimeTargets, fallback.runtimePolicy.preferredTarget),
      fallbackTarget: pickEnum(runtimePolicyInput.fallbackTarget, runtimeTargets, fallback.runtimePolicy.fallbackTarget),
      localAcceleration: pickEnum(
        runtimePolicyInput.localAcceleration,
        localAccelerationModes,
        fallback.runtimePolicy.localAcceleration
      ),
      requiresHumanApproval: pickBoolean(
        runtimePolicyInput.requiresHumanApproval,
        fallback.runtimePolicy.requiresHumanApproval
      ),
      maxConcurrentHeavyJobs: Math.max(
        1,
        Math.min(4, Math.round(pickNumber(runtimePolicyInput.maxConcurrentHeavyJobs, fallback.runtimePolicy.maxConcurrentHeavyJobs)))
      ),
    },
  }
  return enforceProductionReleaseGuard(normalized)
}
export function coerceAgenticProductionStatePatch(input: unknown): AgenticProductionStatePatch {
  if (!isRecord(input)) return {}
  const patch: AgenticProductionStatePatch = {}
  if (isRecord(input.brain)) {
    patch.brain = input.brain as Partial<ProjectBrainMemory>
  }
  if (Array.isArray(input.ledger)) {
    patch.ledger = input.ledger.map((entry, index) =>
      normalizeLedgerEntry(entry, {
        id: `ledger-${index + 1}`,
        phase: 'Mission phase',
        ownerAgent: 'Producer Agent',
        state: 'planned',
        summary: 'Mission ledger entry',
        acceptance: [],
        evidenceRefs: [],
        rollbackPlan: 'Pause agents and return to the last approved checkpoint.',
        nextAction: 'Review mission',
        estimatedCostUsd: 0,
        updatedAt: isoNow(),
      })
    )
  }
  if (isRecord(input.graphs)) {
    const graphsInput = input.graphs
    patch.graphs = productionGraphKeys.reduce<Partial<Record<ProductionGraphKey, ProductionGraphNode[]>>>((graphs, key) => {
      if (Array.isArray(graphsInput[key])) {
        graphs[key] = graphsInput[key].map((node, index) =>
          normalizeGraphNode(node, { ...buildDefaultGraphNode(key, isoNow()), id: `${key}-${index + 1}` })
        )
      }
      return graphs
    }, {})
  }
  if (isRecord(input.runtimePolicy)) {
    patch.runtimePolicy = input.runtimePolicy as Partial<ProductionRuntimePolicy>
  }
  return patch
}
export function mergeAgenticProductionState(
  current: AgenticProductionState,
  patch: AgenticProductionStatePatch,
  now = isoNow()
): AgenticProductionState {
  const merged: AgenticProductionState = normalizeAgenticProductionState({
    ...current,
    updatedAt: now,
    brain: {
      ...current.brain,
      ...patch.brain,
      creativeBible: {
        ...current.brain.creativeBible,
        ...(patch.brain?.creativeBible ?? {}),
      },
      technicalBible: {
        ...current.brain.technicalBible,
        ...(patch.brain?.technicalBible ?? {}),
      },
    },
    ledger: patch.ledger ?? current.ledger,
    graphs: {
      ...current.graphs,
      ...(patch.graphs ?? {}),
    },
    runtimePolicy: {
      ...current.runtimePolicy,
      ...(patch.runtimePolicy ?? {}),
    },
  })
  return enforceProductionReleaseGuard({
    ...merged,
    updatedAt: now,
  })
}
export function buildProductionReadinessSummary(state: AgenticProductionState): ProductionReadinessSummary {
  const guardedState = enforceProductionReleaseGuard(state)
  const allNodes = productionGraphKeys.flatMap((key) => guardedState.graphs[key])
  const readyGraphCount = productionGraphKeys.filter((key) =>
    guardedState.graphs[key].some((node) => node.status === 'ready' || node.status === 'needs-review')
  ).length
  const evidenceCount = allNodes.reduce((total, node) => total + node.evidenceRefs.length, 0)
  const blockedCount = allNodes.filter((node) => node.status === 'blocked').length
  const graphCoverage = Math.round((readyGraphCount / productionGraphKeys.length) * 100)
  const latestLedger = guardedState.ledger[0]
  const ready =
    readyGraphCount === productionGraphKeys.length &&
    evidenceCount > 0 &&
    blockedCount === 0 &&
    !guardedState.runtimePolicy.requiresHumanApproval
  return {
    ready,
    graphCoverage,
    readyGraphCount,
    totalGraphCount: productionGraphKeys.length,
    evidenceCount,
    blockedCount,
    needsHumanApproval: guardedState.runtimePolicy.requiresHumanApproval,
    nextAction:
      latestLedger?.nextAction ||
      (blockedCount > 0
        ? 'Resolve blocked production graph'
        : readyGraphCount < productionGraphKeys.length
          ? 'Complete production graphs'
          : guardedState.runtimePolicy.requiresHumanApproval
            ? 'Request human approval'
            : 'Prepare release evidence'),
  }
}
