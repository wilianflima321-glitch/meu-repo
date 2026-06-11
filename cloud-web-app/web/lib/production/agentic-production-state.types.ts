export type ProductionDomain = 'web-app' | 'code' | 'game-film' | 'game' | 'film' | 'mixed'

export type ProductionGraphKey =
  | 'assetGraph'
  | 'sceneWorldGraph'
  | 'gameplayGraph'
  | 'shotFilmGraph'
  | 'validationGraph'
  | 'evidenceGraph'
  | 'releaseGraph'

export type ProductionNodeStatus = 'missing' | 'draft' | 'needs-review' | 'ready' | 'blocked'

export type MissionLedgerState =
  | 'planned'
  | 'running'
  | 'needs-approval'
  | 'blocked'
  | 'paused'
  | 'complete'

export type ProductionRuntimeTarget = 'local-native' | 'local-worker' | 'local-main-safe' | 'cloud-sandbox' | 'held'

export interface ProductionGraphNode {
  id: string
  label: string
  status: ProductionNodeStatus
  ownerAgent: string
  evidenceRefs: string[]
  blockers: string[]
  updatedAt: string
}

export interface ProjectBrainDecision {
  id: string
  title: string
  rationale: string
  ownerAgent: string
  createdAt: string
}

export interface ProjectBrainMemory {
  objective: string
  domain: ProductionDomain
  audience: string
  creativeBible: {
    style: string
    tone: string
    story: string
    continuity: string[]
  }
  technicalBible: {
    runtimeTargets: ProductionRuntimeTarget[]
    constraints: string[]
    performanceBudget: string
  }
  risks: string[]
  decisions: ProjectBrainDecision[]
}

export interface MissionLedgerEntry {
  id: string
  phase: string
  ownerAgent: string
  state: MissionLedgerState
  summary: string
  acceptance: string[]
  evidenceRefs: string[]
  rollbackPlan: string
  nextAction: string
  estimatedCostUsd: number
  updatedAt: string
}

export type ProductionGraphs = Record<ProductionGraphKey, ProductionGraphNode[]>

export interface ProductionRuntimePolicy {
  preferredTarget: ProductionRuntimeTarget
  fallbackTarget: ProductionRuntimeTarget
  localAcceleration: 'prefer-npu' | 'prefer-gpu' | 'balanced' | 'cloud-first'
  requiresHumanApproval: boolean
  maxConcurrentHeavyJobs: number
}

export interface AgenticProductionState {
  version: 1
  updatedAt: string
  brain: ProjectBrainMemory
  ledger: MissionLedgerEntry[]
  graphs: ProductionGraphs
  runtimePolicy: ProductionRuntimePolicy
}

export type AgenticProductionStatePatch = Partial<{
  brain: Partial<ProjectBrainMemory>
  ledger: MissionLedgerEntry[]
  graphs: Partial<Record<ProductionGraphKey, ProductionGraphNode[]>>
  runtimePolicy: Partial<ProductionRuntimePolicy>
}>

export interface ProductionReadinessSummary {
  ready: boolean
  graphCoverage: number
  readyGraphCount: number
  totalGraphCount: number
  evidenceCount: number
  blockedCount: number
  needsHumanApproval: boolean
  nextAction: string
}
