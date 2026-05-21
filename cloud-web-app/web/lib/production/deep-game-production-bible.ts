import type { PlayableGameGenre, PlayableGameScope } from '@/lib/production/game-scope-orchestrator'
import {
  buildCinematicEvidencePlan,
  CINEMATIC_EVIDENCE_REQUIRED_EVIDENCE,
  type CinematicEvidencePlan,
} from '@/lib/production/cinematic-evidence-spine'

export type DeepBibleReadinessState = 'held' | 'blocked' | 'needs-review'

export interface DeepSceneBeat {
  id: string
  title: string
  purpose: string
  playerObjective: string
  emotionalBeat: string
  location: string
  involvedCharacters: string[]
  requiredAssets: string[]
  requiredAnimations: string[]
  requiredAudio: string[]
  cameraLanguage: string
  gameplayTransition: string
  continuityDependencies: string[]
  failureStates: string[]
  performanceBudget: string
  requiredEvidence: string[]
}

export interface DeepCharacterContract {
  id: string
  role: string
  silhouette: string
  motivation: string
  gameplayFunction: string
  animationNeeds: string[]
  voiceAndAudioNeeds: string[]
  relationshipEdges: string[]
  requiredEvidence: string[]
}

export interface DeepWorldContract {
  rules: string[]
  biomes: string[]
  factions: string[]
  landmarks: string[]
  traversalModel: string
  streamingCells: string[]
  navmeshPlan: string[]
  environmentalStorytelling: string[]
}

export interface DeepGameplayContract {
  primaryVerbs: string[]
  tenSecondLoop: string
  twoMinuteLoop: string
  twentyMinuteLoop: string
  cameraAndInputFeel: string[]
  progressionAndEconomy: string[]
  failureRecovery: string[]
  tuningKnobs: string[]
  requiredTelemetry: string[]
}

export interface DeepAssetQualityContract {
  heroAssets: string[]
  environmentKits: string[]
  materialRules: string[]
  sourcingRules: string[]
  lodAndStreamingRules: string[]
  riggingAndAnimationRules: string[]
  proofRequired: string[]
}

export interface DeepAgentHandoffContract {
  agent: string
  reads: string[]
  writes: string[]
  mustNotDo: string[]
}

export interface DeepProductionBible {
  id: string
  state: DeepBibleReadinessState
  noPrototypeShortcut: true
  scope: PlayableGameScope
  genre: PlayableGameGenre
  genreLabel: string
  creativePromise: string
  playerFantasy: string
  qualityBar: string
  storyArchitecture: {
    premise: string
    conflict: string
    emotionalArc: string[]
    continuityRules: string[]
    narrativeRisks: string[]
  }
  world: DeepWorldContract
  characters: DeepCharacterContract[]
  gameplay: DeepGameplayContract
  scenes: DeepSceneBeat[]
  assetQuality: DeepAssetQualityContract
  audioCinematicDirection: {
    musicPillars: string[]
    sfxLanguage: string[]
    voiceDirection: string[]
    cinematicLanguage: string[]
  }
  cinematicEvidence: CinematicEvidencePlan
  runtimeQuality: {
    browserRole: 'preview-review'
    studioLocalRole: 'heavy-production'
    cloudStreamRole: 'final-review-when-configured'
    performanceTargets: string[]
    accessibilityRules: string[]
    telemetryRequired: string[]
  }
  agentHandoffs: DeepAgentHandoffContract[]
  evidenceModel: {
    requiredEvidence: string[]
    blockedClaims: string[]
    humanApprovalCheckpoints: string[]
  }
  compactUiSummary: {
    visiblePillars: string[]
    sceneCount: number
    characterCount: number
    qualityGateCount: number
    nextDecision: string
  }
  humanReviewRequired: true
}

function scopeQualityBar(scope: PlayableGameScope): string {
  if (scope === 'prototype') return 'A tight playable loop that proves feel, readability, and technical direction.'
  if (scope === 'demo') return 'A polished vertical slice with believable art/audio cohesion, playtest evidence, and rollback.'
  return 'A milestone-grade production plan with content roadmap, budget, scene graph, and release evidence per build.'
}

function sceneCountForScope(scope: PlayableGameScope): number {
  if (scope === 'prototype') return 3
  if (scope === 'demo') return 5
  return 8
}

function sceneTemplates(scope: PlayableGameScope, genreLabel: string): DeepSceneBeat[] {
  const titles = [
    'Opening promise',
    'First controlled interaction',
    'Pressure test',
    'System reveal',
    'Vertical-slice climax',
    'Recovery and reward',
    'Mid-production expansion',
    'Release candidate proof',
  ].slice(0, sceneCountForScope(scope))

  return titles.map((title, index) => ({
    id: `scene-${index + 1}`,
    title,
    purpose: index === 0 ? 'Sell the player fantasy quickly.' : 'Validate one production pillar with evidence.',
    playerObjective: index === 0 ? `Understand the ${genreLabel} promise.` : 'Complete a readable goal with controlled failure states.',
    emotionalBeat: index % 2 === 0 ? 'Curiosity into agency.' : 'Pressure into mastery.',
    location: index === 0 ? 'Hero landmark or tutorial-safe arena.' : 'Scoped production test space.',
    involvedCharacters: ['player lead', index % 2 === 0 ? 'mentor/guide' : 'opposition force'],
    requiredAssets: ['hero readable silhouette', 'environment kit', 'interaction prop', 'VFX readability pass'],
    requiredAnimations: ['idle/readability loop', 'primary action', 'fail/recovery beat'],
    requiredAudio: ['music cue', 'interaction SFX', 'state-change stinger'],
    cameraLanguage: 'Camera, framing, and input model must match the selected genre pack.',
    gameplayTransition: 'Scene exits into the next loop without a menu-only fake completion.',
    continuityDependencies: ['story promise', 'world rule', 'character motivation', 'mechanic availability'],
    failureStates: ['player confusion', 'softlock', 'unreadable objective', 'performance hitch'],
    performanceBudget: 'Capture frame pacing, input latency, and memory pressure on the selected runtime.',
    requiredEvidence: [
      'scene brief',
      'storyboard frames',
      'animatic prompt',
      'asset manifest',
      'playtest replay',
      'performance trace',
      'human review note',
    ],
  }))
}

function characterContracts(genreLabel: string): DeepCharacterContract[] {
  return [
    {
      id: 'player-lead',
      role: 'Player lead',
      silhouette: `Readable ${genreLabel} primary avatar or controlled unit.`,
      motivation: 'Owns the player fantasy and exposes the core loop.',
      gameplayFunction: 'Primary input, movement, interaction, and progression surface.',
      animationNeeds: ['idle readability', 'movement set', 'primary action', 'hit/fail recovery'],
      voiceAndAudioNeeds: ['effort library', 'state barks', 'signature interaction cue'],
      relationshipEdges: ['mentor/guide', 'opposition force', 'world faction'],
      requiredEvidence: ['silhouette sheet', 'control rig note', 'animation validation', 'voice direction'],
    },
    {
      id: 'mentor-guide',
      role: 'Guide or context source',
      silhouette: 'Distinct non-player silhouette with low animation risk.',
      motivation: 'Teaches world rules without over-explaining.',
      gameplayFunction: 'Tutorial, quest, or contextual signal.',
      animationNeeds: ['idle', 'gesture', 'dialogue beat'],
      voiceAndAudioNeeds: ['dialogue tone', 'notification cue'],
      relationshipEdges: ['player lead', 'world faction'],
      requiredEvidence: ['dialogue beat', 'continuity receipt', 'voice direction'],
    },
    {
      id: 'opposition-force',
      role: 'Opposition force',
      silhouette: 'Instantly readable threat, rival, puzzle, or system pressure.',
      motivation: 'Tests the player fantasy and exposes failure/recovery.',
      gameplayFunction: 'Combat, traversal, economy, puzzle, race, or social pressure depending on genre.',
      animationNeeds: ['anticipation', 'attack/action tell', 'reaction', 'defeat/recovery'],
      voiceAndAudioNeeds: ['threat SFX', 'readability cue'],
      relationshipEdges: ['player lead', 'world rule'],
      requiredEvidence: ['behavior matrix', 'animation tells', 'playtest failure capture'],
    },
  ]
}

function baseEvidence(): string[] {
  return [
    'approved creative promise',
    'story/world/character bible',
    'scene briefs',
    'asset provenance',
    'camera/input contract',
    ...CINEMATIC_EVIDENCE_REQUIRED_EVIDENCE,
    'playtest replay',
    'bug ledger',
    'performance trace',
    'rollback plan',
    'human review note',
  ]
}

export function buildDeepGameProductionBible(input: {
  scope: PlayableGameScope
  genre: PlayableGameGenre
  genreLabel: string
  userIntent: string
  evidenceRefs?: string[]
}): DeepProductionBible {
  const requiredEvidence = baseEvidence()
  const evidence = new Set(input.evidenceRefs ?? [])
  const missingEvidence = requiredEvidence.filter((item) => !evidence.has(item))
  const state: DeepBibleReadinessState = missingEvidence.length > 0 ? 'held' : 'needs-review'
  const scenes = sceneTemplates(input.scope, input.genreLabel)
  const characters = characterContracts(input.genreLabel)
  const cinematicEvidence = buildCinematicEvidencePlan({
    scope: input.scope,
    evidenceRefs: input.evidenceRefs,
    videoProviderConfigured: evidence.has('AI video provider status'),
    cloudStreamConfigured: evidence.has('engine render or cloud stream capture'),
  })

  return {
    id: `${input.genre}:${input.scope}:deep-production-bible:v1`,
    state,
    noPrototypeShortcut: true,
    scope: input.scope,
    genre: input.genre,
    genreLabel: input.genreLabel,
    creativePromise: input.userIntent,
    playerFantasy: `A player should understand why this ${input.genreLabel} exists within the first minute.`,
    qualityBar: scopeQualityBar(input.scope),
    storyArchitecture: {
      premise: input.userIntent,
      conflict: 'A readable pressure source challenges the player fantasy and creates testable decisions.',
      emotionalArc: ['curiosity', 'agency', 'pressure', 'mastery', 'reward'],
      continuityRules: ['No scene contradicts prior world rules.', 'Characters keep motivation and voice across assets.', 'Gameplay unlocks match narrative context.'],
      narrativeRisks: ['Generic prompt drift', 'Contradictory lore', 'Cutscene/gameplay mismatch', 'Unclear player motivation'],
    },
    world: {
      rules: ['One dominant world rule drives traversal and conflict.', 'Landmarks teach navigation without exposition.', 'Every biome supports the selected input/camera model.'],
      biomes: ['safe hub/test space', 'pressure lane/zone', 'reward or reveal space'],
      factions: ['player-aligned force', 'opposition force', 'neutral/systemic force'],
      landmarks: ['orientation landmark', 'risk landmark', 'reward landmark'],
      traversalModel: 'Traversal must be playable before expansion; blocked paths need readable affordances.',
      streamingCells: ['hub cell', 'encounter cell', 'vista/reward cell'],
      navmeshPlan: ['player path', 'AI path', 'fail/retry path'],
      environmentalStorytelling: ['prop cluster', 'lighting contrast', 'audio cue', 'silhouette marker'],
    },
    characters,
    gameplay: {
      primaryVerbs: ['move', 'read', 'decide', 'act', 'recover'],
      tenSecondLoop: 'Read state, act, receive feedback.',
      twoMinuteLoop: 'Enter a scoped challenge, make a meaningful decision, recover or progress.',
      twentyMinuteLoop: 'Complete a vertical slice loop with progression, reward, and a reason to continue.',
      cameraAndInputFeel: ['input latency budget', 'camera readability', 'controller/keyboard mapping', 'accessibility fallback'],
      progressionAndEconomy: ['first unlock', 'reward rhythm', 'scope cut list', 'cost/benefit tuning'],
      failureRecovery: ['checkpoint', 'clear fail reason', 'retry path', 'no softlock'],
      tuningKnobs: ['enemy pressure', 'movement speed', 'ability cooldown', 'resource rate', 'camera distance'],
      requiredTelemetry: ['completion rate', 'fail reason', 'input latency', 'frame pacing', 'fun/feel score'],
    },
    scenes,
    assetQuality: {
      heroAssets: ['player lead', 'opposition force', 'signature environment kit'],
      environmentKits: ['modular playable kit', 'landmark kit', 'collision/navmesh kit'],
      materialRules: ['PBR proof', 'texture compression', 'readability under gameplay camera'],
      sourcingRules: ['curated source before premium claims', 'raw text-to-3D stays draft', 'license/provenance required'],
      lodAndStreamingRules: ['LOD manifest', 'collision proxy', 'streaming budget', 'runtime trace'],
      riggingAndAnimationRules: ['rig validation', 'animation tells', 'root/fail recovery', 'gameplay hitbox fit'],
      proofRequired: ['source manifest', 'retopo/curated receipt', 'PBR report', 'LOD manifest', 'performance capture'],
    },
    audioCinematicDirection: {
      musicPillars: ['identity cue', 'pressure cue', 'reward cue'],
      sfxLanguage: ['readability-first', 'state transition cues', 'interaction confirmation'],
      voiceDirection: ['short, motivated, continuity-safe', 'no lore dump in first loop'],
      cinematicLanguage: [
        'camera supports player promise',
        'cutscenes hand back to gameplay cleanly',
        'AI video drafts are references, not final footage',
        'no cinematic claim without render evidence',
      ],
    },
    cinematicEvidence,
    runtimeQuality: {
      browserRole: 'preview-review',
      studioLocalRole: 'heavy-production',
      cloudStreamRole: 'final-review-when-configured',
      performanceTargets: ['stable frame pacing', 'input latency budget', 'memory/VRAM budget', 'runtime-specific trace'],
      accessibilityRules: ['readable objective', 'color-independent feedback', 'keyboard/controller path', 'motion clarity'],
      telemetryRequired: ['playtest replay', 'performance trace', 'bug ledger', 'human feel review'],
    },
    agentHandoffs: [
      {
        agent: 'Producer Agent',
        reads: ['scope', 'budget', 'risk register'],
        writes: ['milestone cuts', 'approval checkpoints'],
        mustNotDo: ['claim final delivery without release evidence'],
      },
      {
        agent: 'Game Director Agent',
        reads: ['creative promise', 'genre pack', 'scene briefs'],
        writes: ['continuity rules', 'quality bar'],
        mustNotDo: ['change core fantasy without user approval'],
      },
      {
        agent: 'Gameplay Systems Agent',
        reads: ['gameplay loop', 'camera/input feel', 'scene goals'],
        writes: ['mechanic contracts', 'tuning knobs'],
        mustNotDo: ['ship mechanics without playtest telemetry'],
      },
      {
        agent: 'Technical Artist Agent',
        reads: ['asset quality', 'runtime quality', 'sourcing rules'],
        writes: ['LOD/PBR/collision evidence'],
        mustNotDo: ['treat raw generated meshes as final assets'],
      },
      {
        agent: 'QA Playtest Agent',
        reads: ['scenes', 'gameplay', 'performance targets'],
        writes: ['replays', 'bug ledger', 'fun/feel notes'],
        mustNotDo: ['mark release ready without human review'],
      },
    ],
    evidenceModel: {
      requiredEvidence,
      blockedClaims: ['AAA alone', 'Unreal-grade', 'final game', 'final cinematic', 'release ready', 'marketplace ready'],
      humanApprovalCheckpoints: ['creative promise', 'asset sourcing', 'first playable', 'demo candidate', 'release candidate'],
    },
    compactUiSummary: {
      visiblePillars: ['Fantasy', 'World', 'Characters', 'Loop', 'Scenes', 'Cinematics', 'Quality'],
      sceneCount: scenes.length,
      characterCount: characters.length,
      qualityGateCount: requiredEvidence.length,
      nextDecision: state === 'held' ? 'Approve bible direction and attach first evidence.' : 'Request human review before execution.',
    },
    humanReviewRequired: true,
  }
}
