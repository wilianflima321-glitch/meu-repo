import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionRuntimeTarget,
} from '@/lib/production/agentic-production-state'
import { mergeAgenticProductionState } from '@/lib/production/agentic-production-state'
import { CINEMATIC_EVIDENCE_REQUIRED_EVIDENCE } from '@/lib/production/cinematic-evidence-spine'
import { GAME_ASSET_QUALITY_REQUIRED_EVIDENCE } from '@/lib/production/game-asset-quality-pipeline'

export type GameProductionScale = 'prototype' | 'vertical-slice' | 'premium-indie' | 'aaa-assisted'
export type GameProductionReadinessState = 'held' | 'blocked' | 'needs-review' | 'ready'

export type GameProductionDomainGraph =
  | 'design-bible'
  | 'world-graph'
  | 'gameplay-graph'
  | 'combat-graph'
  | 'camera-input-graph'
  | 'animation-graph'
  | 'cinematic-evidence-graph'
  | 'quest-narrative-graph'
  | 'asset-pipeline-graph'
  | 'audio-mix-graph'
  | 'performance-graph'
  | 'playtest-validation-graph'
  | 'release-graph'

export interface GameProductionGraphContract {
  id: GameProductionDomainGraph
  label: string
  ownerAgent: string
  requiredEvidence: string[]
  acceptance: string[]
  blockers: string[]
}

export interface GameProductionSpineContract {
  id: string
  projectId: string
  title: string
  scale: GameProductionScale
  runtimeTargets: ProductionRuntimeTarget[]
  noAutonomousAaaClaim: true
  browserRole: 'responsive-preview-and-review'
  heavyWorkPolicy: 'sidecar-or-cloud-only'
  humanApprovalRequiredForRelease: true
  graphs: GameProductionGraphContract[]
  requiredSpecialistAgents: string[]
  qualityBars: string[]
  knownLimitations: string[]
  createdAt: string
}

export interface GameProductionReadinessReport {
  state: GameProductionReadinessState
  missingEvidence: string[]
  blockedGraphs: string[]
  nextAction: string
}

const GRAPH_LABELS: Record<GameProductionDomainGraph, string> = {
  'design-bible': 'Game Design Bible',
  'world-graph': 'World Graph',
  'gameplay-graph': 'Gameplay Graph',
  'combat-graph': 'Combat Graph',
  'camera-input-graph': 'Camera/Input Graph',
  'animation-graph': 'Animation Graph',
  'cinematic-evidence-graph': 'Cinematic Evidence Graph',
  'quest-narrative-graph': 'Quest/Narrative Graph',
  'asset-pipeline-graph': 'Asset Pipeline Graph',
  'audio-mix-graph': 'Audio Mix Graph',
  'performance-graph': 'Performance Graph',
  'playtest-validation-graph': 'Playtest Validation Graph',
  'release-graph': 'Release Graph',
}

const GRAPH_OWNERS: Record<GameProductionDomainGraph, string> = {
  'design-bible': 'Game Director Agent',
  'world-graph': 'World Architect Agent',
  'gameplay-graph': 'Gameplay Systems Agent',
  'combat-graph': 'Combat Designer Agent',
  'camera-input-graph': 'Camera Feel Agent',
  'animation-graph': 'Animation Director Agent',
  'cinematic-evidence-graph': 'Cinematic Director Agent',
  'quest-narrative-graph': 'Narrative Designer Agent',
  'asset-pipeline-graph': 'Technical Artist Agent',
  'audio-mix-graph': 'Audio Director Agent',
  'performance-graph': 'Performance QA Agent',
  'playtest-validation-graph': 'QA Playtest Agent',
  'release-graph': 'Release Producer Agent',
}

const REQUIRED_GRAPH_IDS: GameProductionDomainGraph[] = [
  'design-bible',
  'world-graph',
  'gameplay-graph',
  'combat-graph',
  'camera-input-graph',
  'animation-graph',
  'cinematic-evidence-graph',
  'quest-narrative-graph',
  'asset-pipeline-graph',
  'audio-mix-graph',
  'performance-graph',
  'playtest-validation-graph',
  'release-graph',
]

const SPECIALIST_AGENTS = [
  'Producer Agent',
  'Game Director Agent',
  'Gameplay Systems Agent',
  'Combat Designer Agent',
  'World Architect Agent',
  'Technical Artist Agent',
  'Animation Director Agent',
  'Cinematic Director Agent',
  'Video Evidence Agent',
  'Narrative Designer Agent',
  'Audio Director Agent',
  'Performance QA Agent',
  'QA Playtest Agent',
  'Release Producer Agent',
]

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function graphEvidence(id: GameProductionDomainGraph): string[] {
  switch (id) {
    case 'design-bible':
      return ['design bible version', 'reference board', 'scope cuts', 'target audience']
    case 'world-graph':
      return ['world partition plan', 'streaming budget', 'navmesh tiles', 'landmark pacing map']
    case 'gameplay-graph':
      return ['core loop spec', 'save/load checkpoint', 'ability contract', 'state machine test']
    case 'combat-graph':
      return ['hitbox debug capture', 'frame data table', 'enemy behavior matrix', 'tuning notes']
    case 'camera-input-graph':
      return ['camera rig capture', 'input latency budget', 'accessibility mapping', 'controller pass']
    case 'animation-graph':
      return ['rig validation', 'blend tree evidence', 'root motion pass', 'IK/facial/cloth budget']
    case 'cinematic-evidence-graph':
      return [
        ...CINEMATIC_EVIDENCE_REQUIRED_EVIDENCE,
        'shot timing pass',
        'gameplay handoff capture',
      ]
    case 'quest-narrative-graph':
      return ['quest dependency map', 'dialog continuity pass', 'lore consistency receipt', 'fail-state design']
    case 'asset-pipeline-graph':
      return [
        'asset license/provenance',
        ...GAME_ASSET_QUALITY_REQUIRED_EVIDENCE,
        'thumbnail catalog',
      ]
    case 'audio-mix-graph':
      return ['music cue map', 'SFX coverage matrix', 'loudness report', 'dialog sync pass']
    case 'performance-graph':
      return ['frame budget report', 'VRAM budget report', 'CPU/GPU trace', 'streaming hitch report']
    case 'playtest-validation-graph':
      return ['playtest replay', 'bug ledger', 'regression report', 'fun/feel review']
    case 'release-graph':
      return ['build artifact', 'platform checklist', 'human approval', 'rollback plan']
  }
}

function graphAcceptance(id: GameProductionDomainGraph): string[] {
  const base = graphEvidence(id)
  if (id === 'release-graph') return [...base, 'no fake done status', 'final approval before publish']
  if (id === 'performance-graph') return [...base, 'no heavy job on browser main thread']
  if (id === 'playtest-validation-graph') return [...base, 'bot and human review paths captured']
  if (id === 'cinematic-evidence-graph') {
    return [
      ...base,
      'Draft videos are not final',
      'AI video provider configured or lane held',
      'Cloud/video generation cost applies',
    ]
  }
  return [...base, 'read receipt attached before apply']
}

function buildGraphContract(id: GameProductionDomainGraph): GameProductionGraphContract {
  return {
    id,
    label: GRAPH_LABELS[id],
    ownerAgent: GRAPH_OWNERS[id],
    requiredEvidence: graphEvidence(id),
    acceptance: graphAcceptance(id),
    blockers: [],
  }
}

function mapToProductionGraphKey(id: GameProductionDomainGraph): ProductionGraphKey {
  if (id === 'asset-pipeline-graph') return 'assetGraph'
  if (id === 'world-graph') return 'sceneWorldGraph'
  if (id === 'release-graph') return 'releaseGraph'
  if (id === 'playtest-validation-graph' || id === 'performance-graph') return 'validationGraph'
  if (id === 'design-bible' || id === 'quest-narrative-graph' || id === 'cinematic-evidence-graph') return 'shotFilmGraph'
  return 'gameplayGraph'
}

function buildProductionNode(
  graph: GameProductionGraphContract,
  now: string
): ProductionGraphNode {
  return {
    id: `game-spine-${graph.id}`,
    label: graph.label,
    status: graph.id === 'release-graph' ? 'blocked' : 'needs-review',
    ownerAgent: graph.ownerAgent,
    evidenceRefs: graph.requiredEvidence.map((evidence) => `required:${graph.id}:${evidence}`),
    blockers:
      graph.id === 'release-graph'
        ? ['Release blocked until build, playtest, performance, provenance, and human approval evidence pass']
        : [`${graph.label} requires evidence before agents can mark work ready`],
    updatedAt: now,
  }
}

function upsertNode(nodes: ProductionGraphNode[], node: ProductionGraphNode): ProductionGraphNode[] {
  return [node, ...nodes.filter((candidate) => candidate.id !== node.id)].slice(0, 60)
}

function buildLedger(contract: GameProductionSpineContract): MissionLedgerEntry {
  return {
    id: `game-production-spine-${contract.id}`,
    phase: 'Game production spine',
    ownerAgent: 'Producer Agent',
    state: 'needs-approval',
    summary: `${contract.title} requires graph-based production before premium game claims can be accepted.`,
    acceptance: [
      'Design Bible approved',
      'Gameplay, world, combat, animation, cinematic, asset, performance, playtest, and release graphs attached',
      'Browser remains preview/review; heavy jobs route to sidecar or cloud',
      'AI video and animatics remain evidence until runtime capture and human review exist',
      'Release requires human approval and rollback plan',
    ],
    evidenceRefs: contract.graphs.flatMap((graph) => graph.requiredEvidence.map((evidence) => `required:${graph.id}:${evidence}`)),
    rollbackPlan: 'Hold release, preserve the last approved playable checkpoint, and roll back generated assets/build outputs.',
    nextAction: 'Assign specialist agents and attach first playtest/performance evidence.',
    estimatedCostUsd: contract.scale === 'aaa-assisted' ? 25 : contract.scale === 'premium-indie' ? 10 : 2,
    updatedAt: contract.createdAt,
  }
}

export function buildGameProductionSpineContract(input: {
  projectId: string
  title: string
  scale?: GameProductionScale
  runtimeTargets?: ProductionRuntimeTarget[]
  createdAt?: string
}): GameProductionSpineContract {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const runtimeTargets = unique(input.runtimeTargets ?? ['local-native', 'cloud-sandbox']) as ProductionRuntimeTarget[]
  return {
    id: `${input.projectId}:game-production-spine:v1`,
    projectId: input.projectId,
    title: input.title,
    scale: input.scale ?? 'vertical-slice',
    runtimeTargets,
    noAutonomousAaaClaim: true,
    browserRole: 'responsive-preview-and-review',
    heavyWorkPolicy: 'sidecar-or-cloud-only',
    humanApprovalRequiredForRelease: true,
    graphs: REQUIRED_GRAPH_IDS.map(buildGraphContract),
    requiredSpecialistAgents: SPECIALIST_AGENTS,
    qualityBars: [
      'Playable build beats chat transcript',
      'Combat feel requires frame data, replay, and tuning notes',
      'World scale requires streaming, navmesh, asset budget, and traversal evidence',
      'Cinematic quality requires storyboard, animatic, AI video reference, engine capture, audio, continuity, and render evidence',
      'No final game/film state without playtest replay, performance report, provenance, and human approval',
    ],
    knownLimitations: [
      'Browser preview cannot replace a native AAA renderer for final large-world output',
      'Text-to-video output is a draft/reference lane; final footage requires engine/runtime capture and human approval',
      'AI agents need read receipts, scope locks, playtest evidence, and human review to avoid hallucinated completeness',
      'AAA-assisted means Aethel orchestrates, validates, and exports; it does not promise full autonomous AAA production',
    ],
    createdAt,
  }
}

export function evaluateGameProductionReadiness(
  contract: GameProductionSpineContract,
  evidenceRefs: string[]
): GameProductionReadinessReport {
  const evidence = new Set(evidenceRefs)
  const missingEvidence = contract.graphs.flatMap((graph) =>
    graph.requiredEvidence
      .map((required) => `required:${graph.id}:${required}`)
      .filter((required) => !evidence.has(required))
  )
  const blockedGraphs = contract.graphs
    .filter((graph) => graph.blockers.length > 0)
    .map((graph) => graph.id)
  const state: GameProductionReadinessState =
    missingEvidence.length > 0
      ? 'held'
      : blockedGraphs.length > 0
        ? 'blocked'
        : contract.humanApprovalRequiredForRelease
          ? 'needs-review'
          : 'ready'

  return {
    state,
    missingEvidence,
    blockedGraphs,
    nextAction:
      state === 'held'
        ? 'Attach required graph evidence before agents can claim playable quality.'
        : state === 'blocked'
          ? 'Resolve graph blockers and rerun playtest validation.'
          : state === 'needs-review'
            ? 'Request human release approval with replay, build, performance, and provenance evidence.'
            : 'Release candidate can proceed.',
  }
}

export function mergeGameProductionSpineIntoProductionState(
  current: AgenticProductionState,
  contract: GameProductionSpineContract
): AgenticProductionState {
  const graphPatch: Partial<Record<ProductionGraphKey, ProductionGraphNode[]>> = {}

  for (const graph of contract.graphs) {
    const key = mapToProductionGraphKey(graph.id)
    const currentNodes = graphPatch[key] ?? current.graphs[key]
    graphPatch[key] = upsertNode(currentNodes, buildProductionNode(graph, contract.createdAt))
  }

  return mergeAgenticProductionState(
    current,
    {
      brain: {
        domain: 'game',
        creativeBible: {
          ...current.brain.creativeBible,
          continuity: unique([
            ...current.brain.creativeBible.continuity,
            'Game Design Bible',
            'World Graph',
            'Gameplay Graph',
            'Cinematic Evidence Graph',
            'Playtest Validation Graph',
          ]),
        },
        technicalBible: {
          ...current.brain.technicalBible,
          runtimeTargets: contract.runtimeTargets,
          constraints: unique([
            ...current.brain.technicalBible.constraints,
            'Browser is preview/review only for premium game production',
            'Heavy render, indexing, asset processing, shader compile, and playtest jobs must run in sidecar/cloud lanes',
            'AI video drafts require provider configuration, cost guard, continuity receipt, runtime capture, and human review',
            'No autonomous AAA claim without graph evidence, playtest replay, performance report, and human approval',
          ]),
        },
        risks: unique([
          ...current.brain.risks,
          'AI can hallucinate game completeness without design, gameplay, asset, playtest, performance, and release graphs',
        ]),
      },
      ledger: [buildLedger(contract), ...current.ledger].slice(0, 60),
      graphs: graphPatch,
      runtimePolicy: {
        preferredTarget: contract.runtimeTargets.includes('local-native') ? 'local-native' : 'cloud-sandbox',
        fallbackTarget: 'cloud-sandbox',
        requiresHumanApproval: true,
        maxConcurrentHeavyJobs: Math.min(current.runtimePolicy.maxConcurrentHeavyJobs, 2),
      },
    },
    contract.createdAt,
  )
}
