import type { ProductionRuntimeTarget } from '@/lib/production/agentic-production-state'
import type { GameAssetQualityTier } from '@/lib/production/game-asset-quality-pipeline'
import {
  buildQualityOrchestrationPlan,
  buildRuntimeCapabilitySnapshot,
  type QualityOrchestrationPlan,
  type RuntimeCapabilitySnapshot,
} from '@/lib/production/ai-quality-orchestrator'
import { getGameGenrePack, type GameGenrePack } from '@/lib/production/game-genre-packs'
import { buildGamePlaytestSpinePlan, type PlaytestSpinePlan } from '@/lib/production/game-playtest-spine'

export type PlayableGameScope = 'prototype' | 'demo' | 'complete-game-plan'

export type PlayableGameGenre =
  | 'moba'
  | 'rpg'
  | 'action-adventure'
  | 'platformer'
  | 'shooter'
  | 'racing'
  | 'puzzle'
  | 'visual-novel'
  | 'sandbox'
  | 'strategy'
  | 'custom'

export type CreativePlanningArtifact =
  | 'story-bible'
  | 'world-bible'
  | 'character-bible'
  | 'gameplay-loop'
  | 'visual-style-guide'
  | 'audio-direction'
  | 'quest-dialogue-map'
  | 'level-flow'
  | 'effects-vfx-plan'
  | 'playtest-plan'
  | 'release-plan'
  | 'content-roadmap'
  | 'production-budget'

export type GameScopePlanState = 'held' | 'blocked' | 'needs-review'

export interface GameScopeGraph {
  id: string
  ownerAgent: string
  requiredEvidence: string[]
  userValue: string
}

export interface GameScopePlan {
  id: string
  label: string
  scope: PlayableGameScope
  genre: PlayableGameGenre
  customGenreLabel?: string
  userIntent: string
  notFullGameClaim: true
  releaseState: GameScopePlanState
  runtimeTargets: ProductionRuntimeTarget[]
  genrePack: GameGenrePack
  playtestSpine: PlaytestSpinePlan
  creativeArtifacts: CreativePlanningArtifact[]
  productionGraphs: GameScopeGraph[]
  qualityPlans: QualityOrchestrationPlan[]
  blockers: string[]
  nextAction: string
  uxDisclosure: string
  humanReviewRequired: true
}

export interface BuildGameScopePlanInput {
  scope?: PlayableGameScope
  genre?: PlayableGameGenre
  customGenreLabel?: string
  userIntent?: string
  budgetUsd?: number
  evidenceRefs?: string[]
  runtimeCapabilities?: Partial<RuntimeCapabilitySnapshot>
  targetQuality?: GameAssetQualityTier
}

const SCOPE_LABELS: Record<PlayableGameScope, string> = {
  prototype: 'Playable prototype',
  demo: 'Evidence-backed demo',
  'complete-game-plan': 'Complete game plan',
}

const GENRE_LABELS: Record<PlayableGameGenre, string> = {
  moba: 'MOBA',
  rpg: 'RPG',
  'action-adventure': 'Action adventure',
  platformer: 'Platformer',
  shooter: 'Shooter',
  racing: 'Racing',
  puzzle: 'Puzzle',
  'visual-novel': 'Visual novel',
  sandbox: 'Sandbox',
  strategy: 'Strategy',
  custom: 'Custom game',
}

const PROTOTYPE_ARTIFACTS: CreativePlanningArtifact[] = [
  'story-bible',
  'world-bible',
  'character-bible',
  'gameplay-loop',
  'visual-style-guide',
  'audio-direction',
  'playtest-plan',
]

const DEMO_ARTIFACTS: CreativePlanningArtifact[] = [
  ...PROTOTYPE_ARTIFACTS,
  'quest-dialogue-map',
  'level-flow',
  'effects-vfx-plan',
  'release-plan',
]

const COMPLETE_GAME_PLAN_ARTIFACTS: CreativePlanningArtifact[] = [
  ...DEMO_ARTIFACTS,
  'content-roadmap',
  'production-budget',
]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function artifactsForScope(scope: PlayableGameScope): CreativePlanningArtifact[] {
  if (scope === 'prototype') return PROTOTYPE_ARTIFACTS
  if (scope === 'demo') return DEMO_ARTIFACTS
  return COMPLETE_GAME_PLAN_ARTIFACTS
}

function defaultQualityForScope(scope: PlayableGameScope): GameAssetQualityTier {
  if (scope === 'prototype') return 'curated-marketplace'
  return 'studio-local-optimized'
}

function defaultBudgetForScope(scope: PlayableGameScope): number {
  if (scope === 'prototype') return 8
  if (scope === 'demo') return 35
  return 120
}

function graphForArtifact(artifact: CreativePlanningArtifact): GameScopeGraph {
  switch (artifact) {
    case 'story-bible':
      return {
        id: 'story-bible',
        ownerAgent: 'Narrative Designer Agent',
        requiredEvidence: ['theme statement', 'story arc', 'tone references', 'continuity rules'],
        userValue: 'The game has a coherent story before agents generate scenes, quests, dialogue, or cinematics.',
      }
    case 'world-bible':
      return {
        id: 'world-bible',
        ownerAgent: 'World Architect Agent',
        requiredEvidence: ['world premise', 'biomes/factions', 'map scale', 'navigation constraints'],
        userValue: 'The world has rules and traversal logic before art or level chunks are produced.',
      }
    case 'character-bible':
      return {
        id: 'character-bible',
        ownerAgent: 'Character Director Agent',
        requiredEvidence: ['character roster', 'silhouette brief', 'motivation sheet', 'animation needs'],
        userValue: 'Characters stay consistent across concept art, 3D assets, animation, voice, and gameplay.',
      }
    case 'gameplay-loop':
      return {
        id: 'gameplay-loop',
        ownerAgent: 'Gameplay Systems Agent',
        requiredEvidence: ['core loop', 'input contract', 'ability/combat sheet', 'fail-state design'],
        userValue: 'The first playable build is fun to test, not just visually assembled.',
      }
    case 'visual-style-guide':
      return {
        id: 'visual-style-guide',
        ownerAgent: 'Art Direction Agent',
        requiredEvidence: ['reference board', 'palette/material rules', 'camera/lens intent', 'quality target'],
        userValue: 'Generated and curated assets follow one art direction instead of becoming a mixed asset dump.',
      }
    case 'audio-direction':
      return {
        id: 'audio-direction',
        ownerAgent: 'Audio Composer Agent',
        requiredEvidence: ['music pillars', 'SFX coverage matrix', 'voice direction', 'loudness target'],
        userValue: 'Music, SFX, and voice are planned as part of gameplay and storytelling.',
      }
    case 'quest-dialogue-map':
      return {
        id: 'quest-dialogue-map',
        ownerAgent: 'Quest/Narrative Agent',
        requiredEvidence: ['quest dependency map', 'dialogue beats', 'branching risks', 'continuity receipts'],
        userValue: 'Narrative content can scale without contradicting prior story decisions.',
      }
    case 'level-flow':
      return {
        id: 'level-flow',
        ownerAgent: 'Level Design Agent',
        requiredEvidence: ['level beats', 'encounter pacing', 'navmesh plan', 'camera/composition notes'],
        userValue: 'Worlds and levels are generated around play flow instead of random scenery.',
      }
    case 'effects-vfx-plan':
      return {
        id: 'effects-vfx-plan',
        ownerAgent: 'VFX Technical Artist Agent',
        requiredEvidence: ['VFX list', 'readability rules', 'performance budget', 'accessibility pass'],
        userValue: 'Effects support clarity and performance instead of becoming visual noise.',
      }
    case 'playtest-plan':
      return {
        id: 'playtest-plan',
        ownerAgent: 'QA Playtest Agent',
        requiredEvidence: ['bot playtest scenario', 'human review checklist', 'bug ledger', 'fun/feel notes'],
        userValue: 'Agents prove the build is playable before the product claims progress.',
      }
    case 'release-plan':
      return {
        id: 'release-plan',
        ownerAgent: 'Release Producer Agent',
        requiredEvidence: ['build artifact', 'rollback plan', 'platform checklist', 'human approval'],
        userValue: 'Shipping remains governed and reversible.',
      }
    case 'content-roadmap':
      return {
        id: 'content-roadmap',
        ownerAgent: 'Producer Agent',
        requiredEvidence: ['milestone plan', 'content backlog', 'scope cuts', 'dependency map'],
        userValue: 'A complete-game request becomes a production roadmap instead of a fake instant-finished claim.',
      }
    case 'production-budget':
      return {
        id: 'production-budget',
        ownerAgent: 'Cost Governor Agent',
        requiredEvidence: ['cost forecast', 'provider limits', 'asset/runtime budget', 'approval thresholds'],
        userValue: 'The user sees cost and runtime tradeoffs before expensive generation starts.',
      }
  }
}

function scopeDisclosure(scope: PlayableGameScope): string {
  if (scope === 'prototype') {
    return 'Prototype mode creates the smallest playable loop first; story, world, characters, art direction, and playtest evidence still come before expansion.'
  }
  if (scope === 'demo') {
    return 'Demo mode creates a polished vertical slice with story, world, character, gameplay, audio, VFX, performance, playtest, and release evidence.'
  }
  return 'Complete game mode creates a complete production plan and milestone spine; it does not claim the full game is finished without builds, evidence, and human review.'
}

function scopeBlockers(scope: PlayableGameScope): string[] {
  const common = [
    'Human review required before public, marketplace, client, or final-quality claims.',
    'No autonomous AAA, Unreal-grade, or final game claim without runtime, playtest, performance, provenance, and release evidence.',
  ]
  if (scope === 'prototype') {
    return [
      ...common,
      'Prototype release is held until the core loop, creative bible, playtest smoke test, and asset provenance exist.',
    ]
  }
  if (scope === 'demo') {
    return [
      ...common,
      'Demo release is held until gameplay, story, world, character, audio, VFX, performance, rollback, and human approval evidence exist.',
    ]
  }
  return [
    ...common,
    'A complete-game request creates a production plan first; final release remains held until each milestone ships evidence-backed builds.',
  ]
}

function scopeNextAction(scope: PlayableGameScope): string {
  if (scope === 'prototype') return 'Approve the creative brief, then build the smallest playable loop and attach playtest evidence.'
  if (scope === 'demo') return 'Approve the story/world/character bible, then produce a focused vertical slice with quality gates.'
  return 'Approve the full production bible, milestone budget, and content roadmap before agents generate milestone work.'
}

function qualityPlanGoals(input: {
  scope: PlayableGameScope
  genreLabel: string
  userIntent: string
}): string[] {
  const base = [
    `Plan hero character or key unit quality for ${input.genreLabel}.`,
    `Plan environment and world-kit quality for ${input.userIntent}.`,
  ]
  if (input.scope !== 'prototype') {
    base.push(`Plan cinematic, VFX, and audio-facing assets for the ${input.genreLabel} demo.`)
  }
  return base
}

export function buildGameScopePlan(input: BuildGameScopePlanInput = {}): GameScopePlan {
  const scope = input.scope ?? 'demo'
  const genre = input.genre ?? 'custom'
  const genreLabel = genre === 'custom' ? input.customGenreLabel || GENRE_LABELS.custom : GENRE_LABELS[genre]
  const genrePack = getGameGenrePack(genre, genreLabel)
  const userIntent = input.userIntent || `Create a ${genreLabel} ${SCOPE_LABELS[scope].toLowerCase()} with evidence-first agents.`
  const budgetUsd = input.budgetUsd ?? defaultBudgetForScope(scope)
  const evidenceRefs = input.evidenceRefs ?? []
  const targetQuality = input.targetQuality ?? defaultQualityForScope(scope)
  const capabilities = buildRuntimeCapabilitySnapshot(input.runtimeCapabilities)
  const creativeArtifacts = artifactsForScope(scope)
  const playtestSpine = buildGamePlaytestSpinePlan({
    genre,
    customGenreLabel: genreLabel,
    evidenceRefs,
  })
  const productionGraphs = [
    ...creativeArtifacts.map(graphForArtifact),
    ...genrePack.productionGraphs.map((graph) => ({
      id: `genre-${graph}`,
      ownerAgent: genrePack.specialistAgents[0] || 'Game Designer Agent',
      requiredEvidence: genrePack.evidenceRefs,
      userValue: `${genrePack.label} pack: ${graph}.`,
    })),
  ]
  const runtimeTargets: ProductionRuntimeTarget[] =
    scope === 'prototype'
      ? ['local-main-safe', 'local-worker', 'held']
      : ['local-native', 'cloud-sandbox', 'held']

  const qualityPlans = qualityPlanGoals({ scope, genreLabel, userIntent }).map((goal, index) =>
    buildQualityOrchestrationPlan({
      goal,
      domain: index === 0 ? 'character' : index === 1 ? 'world' : 'cinematic',
      targetQuality,
      budgetUsd,
      runtimeCapabilities: capabilities,
      evidenceRefs,
      assetMetadata: {
        qualityTier: scope === 'prototype' ? 'ai-draft' : 'curated-marketplace',
        licenseStatus: 'needs-review',
      },
    }),
  )

  return {
    id: `${genre}:${scope}:game-scope:v1`,
    label: `${genreLabel} ${SCOPE_LABELS[scope]}`,
    scope,
    genre,
    customGenreLabel: genre === 'custom' ? genreLabel : undefined,
    userIntent,
    notFullGameClaim: true,
    releaseState: qualityPlans.some((plan) => plan.blocked) ? 'blocked' : 'held',
    runtimeTargets: unique(runtimeTargets),
    genrePack,
    playtestSpine,
    creativeArtifacts: unique(creativeArtifacts),
    productionGraphs,
    qualityPlans,
    blockers: scopeBlockers(scope),
    nextAction: scopeNextAction(scope),
    uxDisclosure: scopeDisclosure(scope),
    humanReviewRequired: true,
  }
}

export function buildMobaExampleScopePlan(input: Omit<BuildGameScopePlanInput, 'scope' | 'genre'> = {}): GameScopePlan {
  return buildGameScopePlan({
    ...input,
    scope: 'demo',
    genre: 'moba',
    userIntent:
      input.userIntent ||
      'Build a small MOBA-style vertical slice with two hero units, minion waves, one objective lane, bot playtest, and quality gates.',
  })
}
