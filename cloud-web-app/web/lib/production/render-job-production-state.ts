import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
} from '@/lib/production/agentic-production-state'
import { mergeAgenticProductionState } from '@/lib/production/agentic-production-state'
import type { ViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function upsertProductionGraphNode(
  state: AgenticProductionState,
  key: ProductionGraphKey,
  node: ProductionGraphNode,
): ProductionGraphNode[] {
  const existing = state.graphs[key]
  const withoutNode = existing.filter((candidate) => candidate.id !== node.id)
  return [node, ...withoutNode].slice(0, 40)
}

function renderBlockers(contract: ViewportRenderJobContract): string[] {
  const blockers = ['Rendered media evidence is required before release approval']
  if (contract.quality === 'final') blockers.push('Final exports require human approval and validation report')
  if (contract.scene.assetCount > 0) blockers.push('Asset license report must be attached to final evidence')
  if (contract.profile.target === 'cloud-sandbox') blockers.push('Cloud render queue must finish before this can be marked ready')
  return unique(blockers)
}

function graphStatus(contract: ViewportRenderJobContract): ProductionGraphNode['status'] {
  return contract.quality === 'draft' ? 'needs-review' : 'blocked'
}

function renderLabel(contract: ViewportRenderJobContract): string {
  return `${contract.profile.label} - ${contract.profile.resolution} - ${contract.profile.fps}fps`
}

export function buildMissionLedgerEntryFromViewportRenderJob(
  contract: ViewportRenderJobContract,
  now = new Date().toISOString(),
): MissionLedgerEntry {
  return {
    id: `render-job-${contract.id}`,
    phase: contract.mode === 'film' ? 'Film render evidence' : 'Game playtest/export evidence',
    ownerAgent: contract.mode === 'film' ? 'Cinematic Editor Agent' : 'Gameplay QA Agent',
    state: contract.quality === 'draft' ? 'needs-approval' : 'blocked',
    summary: `${renderLabel(contract)} requested for ${contract.mode} viewport`,
    acceptance: contract.acceptance,
    evidenceRefs: unique([`render-job:${contract.id}`, ...contract.evidenceRefs]),
    rollbackPlan: `Cancel render contract ${contract.id}, discard generated media, and return to the last approved viewport snapshot.`,
    nextAction:
      contract.quality === 'draft'
        ? 'Generate thumbnail/proxy evidence and review timing/feel'
        : 'Route heavy render through the queue/runtime and attach validation evidence before release',
    estimatedCostUsd: contract.estimatedCostUsd,
    updatedAt: now,
  }
}

export function mergeViewportRenderJobIntoProductionState(
  current: AgenticProductionState,
  contract: ViewportRenderJobContract,
  now = new Date().toISOString(),
): AgenticProductionState {
  const evidenceRefs = unique([`render-job:${contract.id}`, ...contract.evidenceRefs])
  const blockers = renderBlockers(contract)
  const status = graphStatus(contract)

  const renderEvidenceNode: ProductionGraphNode = {
    id: `render-evidence-${contract.id}`,
    label: renderLabel(contract),
    status,
    ownerAgent: 'QA Agent',
    evidenceRefs,
    blockers,
    updatedAt: now,
  }

  const validationNode: ProductionGraphNode = {
    id: `render-validation-${contract.id}`,
    label: `Validate ${contract.mode} render contract ${contract.id}`,
    status,
    ownerAgent: 'Performance QA Agent',
    evidenceRefs,
    blockers: unique([
      ...blockers,
      'Check frame pacing, output duration, asset provenance, audio sync, and release budget',
    ]),
    updatedAt: now,
  }

  const releaseNode: ProductionGraphNode = {
    id: `render-release-${contract.id}`,
    label: `Release gate for ${contract.profile.label}`,
    status: 'blocked',
    ownerAgent: 'Release Agent',
    evidenceRefs,
    blockers: unique([
      'Release blocked until render evidence, validation report, and human approval are attached',
      ...blockers,
    ]),
    updatedAt: now,
  }

  const domainKey: ProductionGraphKey = contract.mode === 'film' ? 'shotFilmGraph' : 'gameplayGraph'
  const domainNode: ProductionGraphNode = {
    id: `${contract.mode}-render-${contract.id}`,
    label:
      contract.mode === 'film'
        ? `Shot continuity render - ${contract.timeline.duration.toFixed(1)}s`
        : `Playable export evidence - ${contract.scene.objectCount} objects`,
    status: 'needs-review',
    ownerAgent: contract.mode === 'film' ? 'Cinematic Editor Agent' : 'Gameplay QA Agent',
    evidenceRefs,
    blockers: ['Review feel, timing, continuity, and performance before marking this surface ready'],
    updatedAt: now,
  }

  return mergeAgenticProductionState(
    current,
    {
      brain: {
        technicalBible: {
          ...current.brain.technicalBible,
          runtimeTargets: unique([
            ...current.brain.technicalBible.runtimeTargets,
            contract.profile.target,
          ]) as AgenticProductionState['brain']['technicalBible']['runtimeTargets'],
          constraints: unique([
            ...current.brain.technicalBible.constraints,
            'Heavy viewport renders must run through local-worker, local-native, or cloud-sandbox lanes, never the browser main thread',
            'Final game/film output requires evidence before release approval',
          ]),
        },
        risks: unique([
          ...current.brain.risks,
          ...(contract.quality === 'final' ? ['Final render cost and validation evidence must be reviewed before release'] : []),
        ]),
      },
      ledger: [buildMissionLedgerEntryFromViewportRenderJob(contract, now), ...current.ledger].slice(0, 50),
      graphs: {
        [domainKey]: upsertProductionGraphNode(current, domainKey, domainNode),
        evidenceGraph: upsertProductionGraphNode(current, 'evidenceGraph', renderEvidenceNode),
        validationGraph: upsertProductionGraphNode(current, 'validationGraph', validationNode),
        releaseGraph: upsertProductionGraphNode(current, 'releaseGraph', releaseNode),
      },
      runtimePolicy: {
        preferredTarget: contract.profile.target,
        fallbackTarget: 'cloud-sandbox',
        requiresHumanApproval: contract.profile.requiresHumanApproval || current.runtimePolicy.requiresHumanApproval,
        maxConcurrentHeavyJobs: Math.max(1, Math.min(current.runtimePolicy.maxConcurrentHeavyJobs, 2)),
      },
    },
    now,
  )
}
