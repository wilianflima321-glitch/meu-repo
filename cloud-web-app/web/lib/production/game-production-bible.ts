import type { CreativePlanningArtifact, PlayableGameGenre, PlayableGameScope } from '@/lib/production/game-scope-orchestrator'
import {
  buildDeepGameProductionBible,
  type DeepProductionBible,
} from '@/lib/production/deep-game-production-bible'

export type ProductionBibleSectionId =
  | 'story'
  | 'world'
  | 'characters'
  | 'gameplay'
  | 'art-direction'
  | 'cinematics'
  | 'audio'
  | 'playtest'
  | 'release'

export interface ProductionBibleSection {
  id: ProductionBibleSectionId
  label: string
  ownerAgent: string
  compactQuestion: string
  requiredEvidence: string[]
}

export interface ProductionBibleSnapshot {
  id: string
  noWallOfText: true
  compactSummary: string
  pillars: string[]
  sections: ProductionBibleSection[]
  deepBible: DeepProductionBible
  firstUserDecision: string
  hiddenDepthCount: number
  nextAction: string
  humanReviewRequired: true
}

const SECTION_BY_ARTIFACT: Partial<Record<CreativePlanningArtifact, ProductionBibleSection>> = {
  'story-bible': {
    id: 'story',
    label: 'Story',
    ownerAgent: 'Narrative Designer Agent',
    compactQuestion: 'What fantasy, promise, conflict, and tone should the player remember?',
    requiredEvidence: ['theme statement', 'story arc', 'tone references', 'continuity rules'],
  },
  'world-bible': {
    id: 'world',
    label: 'World',
    ownerAgent: 'World Architect Agent',
    compactQuestion: 'What rules, places, factions, and traversal constraints make this world coherent?',
    requiredEvidence: ['world premise', 'biomes/factions', 'map scale', 'navigation constraints'],
  },
  'character-bible': {
    id: 'characters',
    label: 'Characters',
    ownerAgent: 'Character Director Agent',
    compactQuestion: 'Who matters, what do they want, and how do silhouettes, animation, and voice stay consistent?',
    requiredEvidence: ['character roster', 'silhouette brief', 'motivation sheet', 'animation needs'],
  },
  'gameplay-loop': {
    id: 'gameplay',
    label: 'Gameplay',
    ownerAgent: 'Gameplay Systems Agent',
    compactQuestion: 'What does the player do every 10 seconds, 2 minutes, and 20 minutes?',
    requiredEvidence: ['core loop', 'input contract', 'ability/combat sheet', 'fail-state design'],
  },
  'visual-style-guide': {
    id: 'art-direction',
    label: 'Art direction',
    ownerAgent: 'Art Direction Agent',
    compactQuestion: 'What references, materials, lighting, camera, and readability rules lock the style?',
    requiredEvidence: ['reference board', 'palette/material rules', 'camera/lens intent', 'quality target'],
  },
  'cinematic-direction': {
    id: 'cinematics',
    label: 'Cinematics',
    ownerAgent: 'Cinematic Director Agent',
    compactQuestion: 'Which shots, animatics, AI video references, and engine captures prove timing without claiming final footage?',
    requiredEvidence: ['shot list', 'storyboard frames', 'animatic prompt', 'draft video review', 'human cinematic approval'],
  },
  'audio-direction': {
    id: 'audio',
    label: 'Audio',
    ownerAgent: 'Audio Composer Agent',
    compactQuestion: 'What music pillars, SFX language, voice direction, and loudness target support play?',
    requiredEvidence: ['music pillars', 'SFX coverage matrix', 'voice direction', 'loudness target'],
  },
  'playtest-plan': {
    id: 'playtest',
    label: 'Playtest',
    ownerAgent: 'QA Playtest Agent',
    compactQuestion: 'Which bot and human tests prove the loop is playable and worth continuing?',
    requiredEvidence: ['bot playtest scenario', 'human review checklist', 'bug ledger', 'fun/feel notes'],
  },
  'release-plan': {
    id: 'release',
    label: 'Release',
    ownerAgent: 'Release Producer Agent',
    compactQuestion: 'What build, rollback, platform checklist, and approval are required before release?',
    requiredEvidence: ['build artifact', 'rollback plan', 'platform checklist', 'human approval'],
  },
}

function uniqueSections(sections: ProductionBibleSection[]): ProductionBibleSection[] {
  const seen = new Set<ProductionBibleSectionId>()
  return sections.filter((section) => {
    if (seen.has(section.id)) return false
    seen.add(section.id)
    return true
  })
}

function scopeDecision(scope: PlayableGameScope): string {
  if (scope === 'prototype') return 'Approve the player fantasy, core loop, and first playable test.'
  if (scope === 'demo') return 'Approve the vertical-slice promise, quality bar, and evidence path.'
  if (scope === 'vertical-slice') return 'Approve the production-quality chapter, asset evidence, playtest budget, and release hold.'
  return 'Approve the production roadmap, budget, milestone cuts, and release evidence model.'
}

export function buildGameProductionBible(input: {
  scope: PlayableGameScope
  genre: PlayableGameGenre
  genreLabel: string
  userIntent: string
  creativeArtifacts: CreativePlanningArtifact[]
  evidenceRefs?: string[]
}): ProductionBibleSnapshot {
  const sections = uniqueSections(
    input.creativeArtifacts
      .map((artifact) => SECTION_BY_ARTIFACT[artifact])
      .filter((section): section is ProductionBibleSection => Boolean(section)),
  )
  const pillars = sections.slice(0, 5).map((section) => section.label)
  const hiddenDepthCount = Math.max(0, input.creativeArtifacts.length - sections.length)
  const deepBible = buildDeepGameProductionBible({
    scope: input.scope,
    genre: input.genre,
    genreLabel: input.genreLabel,
    userIntent: input.userIntent,
    evidenceRefs: input.evidenceRefs,
  })

  return {
    id: `${input.genre}:${input.scope}:production-bible:v1`,
    noWallOfText: true,
    compactSummary: `${input.genreLabel}: ${input.userIntent}`,
    pillars,
    sections,
    deepBible,
    firstUserDecision: scopeDecision(input.scope),
    hiddenDepthCount: hiddenDepthCount + deepBible.scenes.length + deepBible.agentHandoffs.length,
    nextAction: 'Keep the visible UI compact; expand details only when the user asks agents to execute that lane.',
    humanReviewRequired: true,
  }
}
