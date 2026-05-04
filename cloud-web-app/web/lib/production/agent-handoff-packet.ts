import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphNode,
  ProductionRuntimePolicy,
} from './agentic-production-state'
import type {
  RepositoryAgentHandoff,
  RepositoryCartographyManifest,
  RepositoryCriticalGap,
  RepositorySurface,
} from './repository-cartography'
import {
  buildParallelAgentWorkContract,
  type ParallelAgentWorkContract,
} from './parallel-agent-work-contract'

export type AgentHandoffPacketStatus = 'ready' | 'needs-review' | 'blocked'

export type AgentHandoffPacket = {
  version: 1
  generatedAt: string
  projectId: string
  agent: string
  status: AgentHandoffPacketStatus
  mission: {
    objective: string
    domain: AgenticProductionState['brain']['domain']
    audience: string
  }
  latestLedger: Pick<
    MissionLedgerEntry,
    'id' | 'phase' | 'state' | 'summary' | 'evidenceRefs' | 'rollbackPlan' | 'nextAction'
  >
  runtimePolicy: ProductionRuntimePolicy
  cartography: {
    manifestId: string | null
    manifestGeneratedAt: string | null
    totalFiles: number
    totalBytes: number
    sourceKinds: string[]
    mustReadFirst: string[]
    doNotInvent: string[]
    indexingPolicy: string[]
    contextBudget: {
      directReadBytes: number
      summarizeFirstBytes: number
      indexOnlyBytes: number
      externalMirrorBytes: number
      manualReviewBytes: number
      estimatedChunkCount: number
      retrievalBatches: AgentHandoffPacketContextRetrievalBatch[]
      largestContextRisks: Array<{
        path: string
        sizeBytes: number
        domain: string
        strategy: string
        sourceKind: string
      }>
      guardrails: string[]
    }
    ownedSurfaces: Pick<
      RepositorySurface,
      'path' | 'domain' | 'layer' | 'strategy' | 'priority' | 'sizeBytes' | 'license' | 'sourceKind' | 'lastModified'
    >[]
    criticalGaps: Pick<RepositoryCriticalGap, 'id' | 'severity' | 'title' | 'recommendation' | 'affectedPaths'>[]
    duplicateGroups: Array<{ id: string; reason: string; paths: string[] }>
  }
  graphEvidence: Pick<ProductionGraphNode, 'id' | 'label' | 'status' | 'ownerAgent' | 'evidenceRefs' | 'blockers'>[]
  workContract: ParallelAgentWorkContract
  acceptance: string[]
  blockers: string[]
  nextActions: string[]
}

type AgentHandoffPacketContextRetrievalBatch = {
  id: string
  strategy: string
  purpose: string
  surfaces: string[]
}

type BuildAgentHandoffPacketInput = {
  projectId: string
  agent: string
  state: AgenticProductionState
  manifest?: RepositoryCartographyManifest | null
  generatedAt?: string
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)))
}

function findLatestLedger(state: AgenticProductionState): MissionLedgerEntry {
  return state.ledger[0]
}

function findAgentHandoff(manifest: RepositoryCartographyManifest | null | undefined, agent: string): RepositoryAgentHandoff | null {
  return manifest?.agentHandoffs.find((handoff) => handoff.agent === agent) ?? null
}

function ownedSurfacesForAgent(
  manifest: RepositoryCartographyManifest | null | undefined,
  handoff: RepositoryAgentHandoff | null,
  agent: string
): AgentHandoffPacket['cartography']['ownedSurfaces'] {
  if (!manifest) return []
  const surfacePaths = new Set(handoff?.surfaces ?? [])
  return manifest.surfaces
    .filter((surface) => surfacePaths.has(surface.path) || surface.ownerAgents.includes(agent))
    .sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.sizeBytes - a.sizeBytes || a.path.localeCompare(b.path)
    })
    .slice(0, 60)
    .map((surface) => ({
      path: surface.path,
      domain: surface.domain,
      layer: surface.layer,
      strategy: surface.strategy,
      priority: surface.priority,
      sizeBytes: surface.sizeBytes,
      license: surface.license,
      sourceKind: surface.sourceKind,
      lastModified: surface.lastModified,
    }))
}

function graphEvidenceForAgent(state: AgenticProductionState, agent: string): AgentHandoffPacket['graphEvidence'] {
  return Object.values(state.graphs)
    .flat()
    .filter((node) => node.ownerAgent === agent || node.ownerAgent === 'Producer Agent')
    .map((node) => ({
      id: node.id,
      label: node.label,
      status: node.status,
      ownerAgent: node.ownerAgent,
      evidenceRefs: node.evidenceRefs,
      blockers: node.blockers,
    }))
}

function contextBudgetForPacket(
  manifest: RepositoryCartographyManifest | null | undefined
): AgentHandoffPacket['cartography']['contextBudget'] {
  const budget = manifest?.contextBudget
  if (!budget) {
    return {
      directReadBytes: 0,
      summarizeFirstBytes: 0,
      indexOnlyBytes: 0,
      externalMirrorBytes: 0,
      manualReviewBytes: 0,
      estimatedChunkCount: 0,
      retrievalBatches: [],
      largestContextRisks: [],
      guardrails: [
        'Repository Context Budget missing; request a fresh Repository Cartography scan before broad retrieval or edits.',
      ],
    }
  }

  return {
    directReadBytes: budget.directReadBytes,
    summarizeFirstBytes: budget.summarizeFirstBytes,
    indexOnlyBytes: budget.indexOnlyBytes,
    externalMirrorBytes: budget.externalMirrorBytes,
    manualReviewBytes: budget.manualReviewBytes,
    estimatedChunkCount: budget.estimatedChunkCount,
    retrievalBatches: budget.retrievalBatches.slice(0, 5).map((batch) => ({
      id: batch.id,
      strategy: batch.strategy,
      purpose: batch.purpose,
      surfaces: batch.surfaces.slice(0, 8),
    })),
    largestContextRisks: budget.largestContextRisks.slice(0, 8).map((surface) => ({
      path: surface.path,
      sizeBytes: surface.sizeBytes,
      domain: surface.domain,
      strategy: surface.strategy,
      sourceKind: surface.sourceKind,
    })),
    guardrails: budget.guardrails.slice(0, 8),
  }
}

function statusFromPacket(input: {
  handoff: RepositoryAgentHandoff | null
  gaps: RepositoryCriticalGap[]
  graphEvidence: AgentHandoffPacket['graphEvidence']
}): AgentHandoffPacketStatus {
  if (input.gaps.some((gap) => gap.severity === 'blocker')) return 'blocked'
  if (input.graphEvidence.some((node) => node.status === 'blocked')) return 'blocked'
  if (input.gaps.some((gap) => gap.severity === 'high') || input.graphEvidence.some((node) => node.status === 'needs-review')) {
    return 'needs-review'
  }
  return input.handoff ? 'ready' : 'needs-review'
}

export function buildAgentHandoffPacket({
  projectId,
  agent,
  state,
  manifest,
  generatedAt,
}: BuildAgentHandoffPacketInput): AgentHandoffPacket {
  const latestLedger = findLatestLedger(state)
  const handoff = findAgentHandoff(manifest, agent)
  const graphEvidence = graphEvidenceForAgent(state, agent)
  const ownedSurfaces = ownedSurfacesForAgent(manifest, handoff, agent)
  const relevantGaps = manifest
    ? manifest.criticalGaps.filter((gap) => {
        if (gap.severity === 'blocker' || gap.severity === 'high') return true
        return gap.affectedPaths.some((affectedPath) => ownedSurfaces.some((surface) => surface.path === affectedPath))
      })
    : []
  const acceptance = unique([
    ...latestLedger.acceptance,
    ...(handoff?.requiredEvidence ?? []),
    'Cite Repository Cartography evidence before edits',
    'Record validation and rollback in Mission Ledger',
  ])
  const blockers = unique([
    ...state.brain.risks.filter((risk) => /^(BLOCKER|HIGH):/i.test(risk)),
    ...graphEvidence.flatMap((node) => node.blockers),
    ...relevantGaps
      .filter((gap) => gap.severity === 'blocker' || gap.severity === 'high')
      .map((gap) => `${gap.severity.toUpperCase()}: ${gap.title}`),
  ])
  const nextActions = unique([
    handoff?.objective ?? `Prepare scoped handoff for ${agent}`,
    latestLedger.nextAction,
    relevantGaps[0]?.recommendation ?? '',
  ]).slice(0, 5)
  const workContract = buildParallelAgentWorkContract({
    agent,
    state,
    manifest,
    ownedSurfaces,
    criticalGaps: relevantGaps,
  })

  return {
    version: 1,
    generatedAt: generatedAt ?? new Date().toISOString(),
    projectId,
    agent,
    status: statusFromPacket({ handoff, gaps: relevantGaps, graphEvidence }),
    mission: {
      objective: state.brain.objective,
      domain: state.brain.domain,
      audience: state.brain.audience,
    },
    latestLedger: {
      id: latestLedger.id,
      phase: latestLedger.phase,
      state: latestLedger.state,
      summary: latestLedger.summary,
      evidenceRefs: latestLedger.evidenceRefs,
      rollbackPlan: latestLedger.rollbackPlan,
      nextAction: latestLedger.nextAction,
    },
    runtimePolicy: state.runtimePolicy,
    cartography: {
      manifestId: manifest?.id ?? null,
      manifestGeneratedAt: manifest?.generatedAt ?? null,
      totalFiles: manifest?.totals.totalFiles ?? 0,
      totalBytes: manifest?.totals.totalBytes ?? 0,
      sourceKinds: manifest?.sourceKinds ?? [],
      mustReadFirst: manifest?.contextPlan.mustReadFirst.slice(0, 20) ?? [],
      doNotInvent: manifest?.contextPlan.doNotInvent ?? [
        'Do not edit without a fresh Repository Cartography manifest.',
      ],
      indexingPolicy: manifest?.contextPlan.indexingPolicy ?? [],
      contextBudget: contextBudgetForPacket(manifest),
      ownedSurfaces,
      criticalGaps: relevantGaps.map((gap) => ({
        id: gap.id,
        severity: gap.severity,
        title: gap.title,
        recommendation: gap.recommendation,
        affectedPaths: gap.affectedPaths,
      })),
      duplicateGroups:
        manifest?.duplicateGroups.slice(0, 20).map((group) => ({
          id: group.id,
          reason: group.reason,
          paths: group.paths,
        })) ?? [],
    },
    graphEvidence,
    workContract,
    acceptance,
    blockers,
    nextActions,
  }
}
