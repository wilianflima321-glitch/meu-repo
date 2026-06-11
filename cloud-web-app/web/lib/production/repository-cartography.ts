import {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionNodeStatus,
  mergeAgenticProductionState,
} from './agentic-production-state'
import { buildRepositorySurface } from './repository-cartography-surface-classifier'
import { buildAgentHandoffs } from './repository-cartography-handoffs'

import { REPOSITORY_CARTOGRAPHY_SETTINGS_KEY } from './repository-cartography-contracts'
import type {
  CartographySourceKind,
  RepositoryArtifactInput,
  RepositoryCartographyInput,
  RepositoryCartographyManifest,
  RepositoryCartographyTotals,
  RepositoryContextBudget,
  RepositoryContextPlan,
  RepositoryContextStrategy,
  RepositoryCriticalGap,
  RepositoryDuplicateGroup,
  RepositoryGapSeverity,
  RepositoryPriority,
  RepositoryRetrievalBatch,
  RepositorySurface,
  RepositorySurfaceDomain,
} from './repository-cartography-contracts'
export * from './repository-cartography-contracts'

import {
  ONE_MB,
  buildContextBudget,
  buildCriticalGaps,
  buildDoNotInvent,
  buildDuplicateGroups,
  buildIndexingPolicy,
  buildMustReadFirst,
  buildTotals,
  isRecord,
  slugify,
  unique,
} from './repository-cartography-analysis'

export function buildRepositoryCartographyManifest(input: RepositoryCartographyInput): RepositoryCartographyManifest {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const surfaces = input.artifacts
    .filter((artifact) => artifact.path.trim().length > 0)
    .map((artifact, index) => buildRepositorySurface(artifact, index))
    .sort((a, b) => a.path.localeCompare(b.path))
  const duplicateGroups = buildDuplicateGroups(surfaces)
  const criticalGaps = buildCriticalGaps(surfaces, duplicateGroups)
  const contextPlan: RepositoryContextPlan = {
    mustReadFirst: buildMustReadFirst(surfaces),
    doNotInvent: buildDoNotInvent(surfaces, criticalGaps),
    indexingPolicy: buildIndexingPolicy(surfaces),
  }
  const contextBudget = buildContextBudget(surfaces, contextPlan, criticalGaps)

  return {
    version: 1,
    id: `repo-cartography-${slugify(input.projectId)}-${generatedAt.slice(0, 10)}`,
    generatedAt,
    projectId: input.projectId,
    sourceKinds: unique(surfaces.map((surface) => surface.sourceKind)).sort((a, b) => a.localeCompare(b)),
    totals: buildTotals(surfaces),
    surfaces,
    duplicateGroups,
    criticalGaps,
    contextPlan,
    contextBudget,
    agentHandoffs: buildAgentHandoffs(surfaces, criticalGaps),
  }
}

function graphStatusForManifest(manifest: RepositoryCartographyManifest, key: ProductionGraphKey): ProductionNodeStatus {
  const hasBlocker = manifest.criticalGaps.some((gap) => gap.severity === 'blocker')
  if (key === 'assetGraph' && hasBlocker) return 'blocked'
  if (key === 'validationGraph' && manifest.criticalGaps.some((gap) => gap.id === 'gap-playtest-validation')) {
    return 'needs-review'
  }
  if (key === 'evidenceGraph') return 'ready'
  if (manifest.criticalGaps.length > 0) return 'needs-review'
  return 'ready'
}

function buildCartographyGraphNode(
  manifest: RepositoryCartographyManifest,
  key: ProductionGraphKey,
  label: string,
  ownerAgent: string
): ProductionGraphNode {
  return {
    id: `repo-cartography-${key}`,
    label,
    status: graphStatusForManifest(manifest, key),
    ownerAgent,
    evidenceRefs: [`repo-cartography:${manifest.id}`],
    blockers: manifest.criticalGaps
      .filter((gap) => gap.severity === 'blocker' || gap.severity === 'high')
      .map((gap) => gap.title),
    updatedAt: manifest.generatedAt,
  }
}

function upsertGraphNode(nodes: ProductionGraphNode[], node: ProductionGraphNode): ProductionGraphNode[] {
  return [node, ...nodes.filter((candidate) => candidate.id !== node.id)]
}

function upsertLedgerEntry(entries: MissionLedgerEntry[], entry: MissionLedgerEntry): MissionLedgerEntry[] {
  return [entry, ...entries.filter((candidate) => candidate.id !== entry.id)]
}

function formatBytesAsMb(bytes: number): string {
  return `${Math.round((bytes / ONE_MB) * 10) / 10} MB`
}

function buildCartographyLedgerEntry(manifest: RepositoryCartographyManifest): MissionLedgerEntry {
  const blockerCount = manifest.criticalGaps.filter((gap) => gap.severity === 'blocker' || gap.severity === 'high').length
  const manualReviewCount = manifest.totals.strategyCounts['manual-review']
  const externalMirrorCount = manifest.totals.strategyCounts['external-mirror']
  const needsApproval = blockerCount > 0 || manualReviewCount > 0 || manifest.duplicateGroups.length > 0

  return {
    id: 'repo-cartography',
    phase: 'Repository cartography',
    ownerAgent: 'Producer Agent',
    state: needsApproval ? 'needs-approval' : 'running',
    summary: `Mapped ${manifest.totals.totalFiles} files (${formatBytesAsMb(
      manifest.totals.totalBytes
    )}) with ${manifest.duplicateGroups.length} duplicate groups and ${externalMirrorCount} external-mirror surfaces.`,
    acceptance: [
      'mustReadFirst context selected',
      'doNotInvent guardrails generated',
      'agentHandoffs assigned',
      'license/provenance and duplicate risks surfaced',
    ],
    evidenceRefs: [`repo-cartography:${manifest.id}`],
    rollbackPlan: 'Pause agents, keep the previous Project Brain, and discard cartography-derived graph updates.',
    nextAction:
      manifest.criticalGaps[0]?.recommendation ??
      'Route each specialized agent through its handoff before editing files or assets.',
    estimatedCostUsd: 0,
    updatedAt: manifest.generatedAt,
  }
}

function appendUnique(existing: string[], additions: string[], limit = 40): string[] {
  return unique([...existing, ...additions]).slice(0, limit)
}

export function mergeRepositoryCartographyIntoProductionState(
  state: AgenticProductionState,
  manifest: RepositoryCartographyManifest
): AgenticProductionState {
  const constraints = [
    `Repository cartography coverage: ${manifest.totals.totalFiles} files / ${formatBytesAsMb(manifest.totals.totalBytes)}.`,
    `${manifest.totals.strategyCounts['external-mirror']} surfaces require external-mirror metadata before GB-scale downloads.`,
    `${manifest.contextPlan.mustReadFirst.length} mustReadFirst files must be loaded before mission edits.`,
  ]
  const risks = manifest.criticalGaps.map((gap) => `${gap.severity.toUpperCase()}: ${gap.title}`)
  const ledger = upsertLedgerEntry(state.ledger, buildCartographyLedgerEntry(manifest))
  const graphs: Partial<Record<ProductionGraphKey, ProductionGraphNode[]>> = {
    assetGraph: upsertGraphNode(
      state.graphs.assetGraph,
      buildCartographyGraphNode(manifest, 'assetGraph', 'Asset Graph cartography', 'Asset Librarian Agent')
    ),
    sceneWorldGraph: upsertGraphNode(
      state.graphs.sceneWorldGraph,
      buildCartographyGraphNode(manifest, 'sceneWorldGraph', 'Scene/World cartography', 'Technical Artist Agent')
    ),
    gameplayGraph: upsertGraphNode(
      state.graphs.gameplayGraph,
      buildCartographyGraphNode(manifest, 'gameplayGraph', 'Gameplay cartography', 'Gameplay Engineer Agent')
    ),
    shotFilmGraph: upsertGraphNode(
      state.graphs.shotFilmGraph,
      buildCartographyGraphNode(manifest, 'shotFilmGraph', 'Shot/Film cartography', 'Cinematic Editor Agent')
    ),
    validationGraph: upsertGraphNode(
      state.graphs.validationGraph,
      buildCartographyGraphNode(manifest, 'validationGraph', 'Validation cartography', 'QA Agent')
    ),
    evidenceGraph: upsertGraphNode(
      state.graphs.evidenceGraph,
      buildCartographyGraphNode(manifest, 'evidenceGraph', 'Repository evidence manifest', 'Producer Agent')
    ),
  }

  return mergeAgenticProductionState(
    state,
    {
      brain: {
        technicalBible: {
          ...state.brain.technicalBible,
          constraints: appendUnique(state.brain.technicalBible.constraints, constraints),
        },
        risks: appendUnique(state.brain.risks, risks),
      },
      ledger,
      graphs,
      runtimePolicy:
        manifest.totals.strategyCounts['external-mirror'] > 0 || manifest.totals.strategyCounts['index-only'] > 0
          ? {
              localAcceleration: 'balanced',
              maxConcurrentHeavyJobs: Math.min(state.runtimePolicy.maxConcurrentHeavyJobs, 2),
              requiresHumanApproval: true,
            }
          : {
              requiresHumanApproval: state.runtimePolicy.requiresHumanApproval,
            },
    },
    manifest.generatedAt
  )
}

export function readRepositoryCartographyManifestFromSettings(settings: unknown): RepositoryCartographyManifest | null {
  if (!isRecord(settings)) return null
  const candidate = settings[REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1) return null
  if (typeof candidate.id !== 'string' || typeof candidate.projectId !== 'string') return null
  if (!Array.isArray(candidate.surfaces) || !Array.isArray(candidate.agentHandoffs)) return null
  if (!isRecord(candidate.totals) || !isRecord(candidate.contextPlan)) return null
  return candidate as unknown as RepositoryCartographyManifest
}

export function writeRepositoryCartographyManifestToSettings(
  settings: unknown,
  manifest: RepositoryCartographyManifest
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]: manifest,
  }
}
