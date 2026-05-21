import type { PlayableGameGenre } from '@/lib/production/game-scope-orchestrator'

export type GenreCameraModel =
  | 'isometric-locked'
  | 'third-person-follow'
  | 'side-scroll'
  | 'first-person'
  | 'chase-camera'
  | 'static-composition'
  | 'top-down-tactical'
  | 'freeform'

export type GenreInputModel =
  | 'mouse-keyboard'
  | 'keyboard-controller'
  | 'gamepad-first'
  | 'touch-friendly'
  | 'point-and-click'
  | 'tactical-hotkeys'
  | 'custom'

export interface GameGenrePack {
  genre: PlayableGameGenre
  label: string
  cameraModel: GenreCameraModel
  inputModel: GenreInputModel
  coreLoop: string[]
  requiredSystems: string[]
  productionGraphs: string[]
  assetPriorities: string[]
  playtestScenarios: string[]
  performanceBudgets: string[]
  evidenceRefs: string[]
  specialistAgents: string[]
  runtimeNotes: string[]
  limitations: string[]
}

const COMMON_EVIDENCE = [
  'scope decision',
  'core loop proof',
  'input/camera capture',
  'playtest replay',
  'performance trace',
  'human review',
]

const COMMON_AGENTS = [
  'Producer Agent',
  'Game Designer Agent',
  'Gameplay Systems Agent',
  'Technical Artist Agent',
  'QA Playtest Agent',
  'Performance QA Agent',
]

export const GAME_GENRE_PACKS: Record<PlayableGameGenre, GameGenrePack> = {
  moba: {
    genre: 'moba',
    label: 'MOBA',
    cameraModel: 'isometric-locked',
    inputModel: 'mouse-keyboard',
    coreLoop: ['lane push', 'ability combo', 'objective contest', 'recall/upgrade', 'teamfight review'],
    requiredSystems: ['ability system', 'minion waves', 'tower/objective logic', 'bot behavior tree', 'fog/readability rules'],
    productionGraphs: ['arena flow', 'champion kit graph', 'minion/objective graph', 'bot-playtest graph', 'balance telemetry'],
    assetPriorities: ['2 hero units first', 'arena readability kit', 'VFX silhouettes', 'UI cooldown/readability'],
    playtestScenarios: ['bot lane push', 'tower dive safety', 'ability readability', 'input latency', 'snowball/balance smoke'],
    performanceBudgets: ['60fps browser preview', 'input-to-feedback under 80ms', 'VFX readability under combat load'],
    evidenceRefs: [...COMMON_EVIDENCE, 'champion kit sheet', 'objective timing telemetry'],
    specialistAgents: [...COMMON_AGENTS, 'Combat Designer Agent', 'VFX Technical Artist Agent'],
    runtimeNotes: ['Browser can preview arena and inputs; Studio Local should validate nav/collision and VFX budgets.'],
    limitations: ['A vertical slice is not matchmaking, ranked, netcode, anti-cheat, or full champion roster.'],
  },
  rpg: {
    genre: 'rpg',
    label: 'RPG',
    cameraModel: 'third-person-follow',
    inputModel: 'gamepad-first',
    coreLoop: ['explore', 'quest choice', 'combat encounter', 'loot/progression', 'story consequence'],
    requiredSystems: ['quest system', 'inventory/equipment', 'save/load', 'dialogue continuity', 'enemy behavior trees'],
    productionGraphs: ['quest dependency map', 'character arc graph', 'loot/progression graph', 'encounter graph', 'save-state graph'],
    assetPriorities: ['hero character', 'NPC set', 'quest props', 'landmarks', 'enemy archetypes'],
    playtestScenarios: ['quest branch continuity', 'save/load recovery', 'combat difficulty curve', 'dialogue contradiction check'],
    performanceBudgets: ['stable traversal frame time', 'streaming hitch report', 'NPC count budget'],
    evidenceRefs: [...COMMON_EVIDENCE, 'quest dependency map', 'dialogue continuity receipt', 'save/load checkpoint'],
    specialistAgents: [...COMMON_AGENTS, 'Narrative Designer Agent', 'World Architect Agent'],
    runtimeNotes: ['Studio Local should validate save/state, world streaming, navmesh, and dialogue/cutscene assets.'],
    limitations: ['A complete RPG requires milestone planning for content volume, localization, balance, and QA breadth.'],
  },
  'action-adventure': {
    genre: 'action-adventure',
    label: 'Action adventure',
    cameraModel: 'third-person-follow',
    inputModel: 'gamepad-first',
    coreLoop: ['traverse', 'solve/explore', 'combat beat', 'cinematic beat', 'upgrade/unlock'],
    requiredSystems: ['camera rig', 'melee/ranged combat', 'traversal affordances', 'checkpoint save', 'cinematic sequencer'],
    productionGraphs: ['traversal graph', 'combat graph', 'cinematic graph', 'checkpoint graph', 'setpiece performance graph'],
    assetPriorities: ['hero rig', 'traversal props', 'enemy set', 'setpiece kit', 'cinematic lighting'],
    playtestScenarios: ['camera occlusion', 'ledge/traversal safety', 'combat readability', 'checkpoint recovery'],
    performanceBudgets: ['stable camera frame time', 'animation blend budget', 'setpiece streaming budget'],
    evidenceRefs: [...COMMON_EVIDENCE, 'camera rig capture', 'traversal test map', 'checkpoint recovery proof'],
    specialistAgents: [...COMMON_AGENTS, 'Animation Director Agent', 'Cinematic Director Agent'],
    runtimeNotes: ['Browser is useful for scene review; Studio Local should own animation, traversal, and cinematic validation.'],
    limitations: ['Premium action feel needs repeated human playtest and tuning, not one-shot generation.'],
  },
  platformer: {
    genre: 'platformer',
    label: 'Platformer',
    cameraModel: 'side-scroll',
    inputModel: 'keyboard-controller',
    coreLoop: ['move', 'jump timing', 'hazard read', 'collect/reward', 'level retry'],
    requiredSystems: ['movement controller', 'collision/hazard rules', 'checkpoint respawn', 'camera bounds', 'level timing'],
    productionGraphs: ['movement feel graph', 'hazard graph', 'level rhythm graph', 'checkpoint graph'],
    assetPriorities: ['readable tileset', 'player silhouette', 'hazards', 'collectibles', 'background layers'],
    playtestScenarios: ['jump arc feel', 'coyote-time tolerance', 'hazard readability', 'checkpoint frustration'],
    performanceBudgets: ['60fps baseline', 'collision step budget', 'low-latency input feedback'],
    evidenceRefs: [...COMMON_EVIDENCE, 'jump arc capture', 'collision debug capture', 'checkpoint test'],
    specialistAgents: [...COMMON_AGENTS, 'Camera Feel Agent'],
    runtimeNotes: ['Browser can iterate quickly; physics/collision traces should still be captured for evidence.'],
    limitations: ['Fun depends heavily on tuned movement feel and level rhythm.'],
  },
  shooter: {
    genre: 'shooter',
    label: 'Shooter',
    cameraModel: 'first-person',
    inputModel: 'mouse-keyboard',
    coreLoop: ['aim', 'shoot', 'reload/resource', 'position', 'encounter clear'],
    requiredSystems: ['weapon handling', 'hit detection', 'enemy AI', 'cover/arena flow', 'accessibility settings'],
    productionGraphs: ['weapon graph', 'enemy encounter graph', 'arena cover graph', 'latency/readability graph'],
    assetPriorities: ['weapon kit', 'enemy silhouettes', 'arena cover', 'impact VFX/SFX', 'HUD readability'],
    playtestScenarios: ['aim latency', 'hit confirmation', 'enemy pressure', 'cover readability', 'motion comfort'],
    performanceBudgets: ['low input latency', 'stable frame pacing', 'projectile/hit scan trace'],
    evidenceRefs: [...COMMON_EVIDENCE, 'weapon feel capture', 'hit debug trace', 'accessibility pass'],
    specialistAgents: [...COMMON_AGENTS, 'Combat Designer Agent'],
    runtimeNotes: ['Shooter feel requires input latency proof and repeated tuning; browser preview must not fake network quality.'],
    limitations: ['Multiplayer, anti-cheat, netcode, and matchmaking are separate production milestones.'],
  },
  racing: {
    genre: 'racing',
    label: 'Racing',
    cameraModel: 'chase-camera',
    inputModel: 'gamepad-first',
    coreLoop: ['accelerate', 'corner', 'overtake', 'lap timing', 'upgrade/tune'],
    requiredSystems: ['vehicle handling', 'track spline', 'checkpoint timing', 'ghost/bot lap', 'camera shake control'],
    productionGraphs: ['vehicle physics graph', 'track graph', 'lap telemetry graph', 'bot ghost graph'],
    assetPriorities: ['vehicle body', 'track kit', 'road materials', 'HUD timing', 'environment landmarks'],
    playtestScenarios: ['cornering feel', 'lap validity', 'collision recovery', 'bot lap baseline'],
    performanceBudgets: ['stable high-speed streaming', 'vehicle physics tick budget', 'camera comfort'],
    evidenceRefs: [...COMMON_EVIDENCE, 'lap telemetry', 'vehicle handling capture', 'track checkpoint proof'],
    specialistAgents: [...COMMON_AGENTS, 'Physics/Vehicle Agent'],
    runtimeNotes: ['Studio Local should validate physics, track collision, and high-speed streaming budgets.'],
    limitations: ['High-quality racing feel needs deterministic physics and tuned tracks.'],
  },
  puzzle: {
    genre: 'puzzle',
    label: 'Puzzle',
    cameraModel: 'static-composition',
    inputModel: 'point-and-click',
    coreLoop: ['observe', 'hypothesize', 'manipulate', 'feedback', 'solve/unlock'],
    requiredSystems: ['rule engine', 'hint system', 'state reset', 'accessibility/readability', 'progression gates'],
    productionGraphs: ['puzzle rule graph', 'hint graph', 'solution-state graph', 'difficulty ramp graph'],
    assetPriorities: ['clear interactables', 'feedback VFX/SFX', 'minimal UI', 'readable symbols'],
    playtestScenarios: ['solution validity', 'hint usefulness', 'softlock prevention', 'readability/accessibility'],
    performanceBudgets: ['instant feedback', 'minimal animation jank', 'state reset reliability'],
    evidenceRefs: [...COMMON_EVIDENCE, 'solution proof', 'softlock test', 'hint review'],
    specialistAgents: [...COMMON_AGENTS, 'UX Researcher Agent'],
    runtimeNotes: ['Puzzle production benefits from fast browser iteration and rigorous state validation.'],
    limitations: ['The main quality risk is unclear rules, not raw rendering fidelity.'],
  },
  'visual-novel': {
    genre: 'visual-novel',
    label: 'Visual novel',
    cameraModel: 'static-composition',
    inputModel: 'point-and-click',
    coreLoop: ['read/listen', 'choose', 'branch', 'relationship/state update', 'scene unlock'],
    requiredSystems: ['dialogue tree', 'branch state', 'save/load', 'voice/music cues', 'localization plan'],
    productionGraphs: ['dialogue graph', 'branch continuity graph', 'character relationship graph', 'audio cue graph'],
    assetPriorities: ['character portraits', 'backgrounds', 'expression sets', 'voice/music cues', 'choice UI'],
    playtestScenarios: ['branch continuity', 'save/load at choices', 'line timing', 'localization overflow'],
    performanceBudgets: ['fast scene transitions', 'audio sync', 'low memory portrait swaps'],
    evidenceRefs: [...COMMON_EVIDENCE, 'branch map', 'dialogue continuity receipt', 'save-at-choice proof'],
    specialistAgents: [...COMMON_AGENTS, 'Narrative Designer Agent', 'Translator Agent'],
    runtimeNotes: ['Narrative continuity and localization evidence matter more than heavy rendering.'],
    limitations: ['Story quality needs authorial review; agents can draft and validate, not replace taste.'],
  },
  sandbox: {
    genre: 'sandbox',
    label: 'Sandbox',
    cameraModel: 'freeform',
    inputModel: 'custom',
    coreLoop: ['collect', 'build/modify', 'simulate', 'share/test', 'expand'],
    requiredSystems: ['world persistence', 'placement/build tools', 'physics/simulation rules', 'save/load', 'permissions'],
    productionGraphs: ['world persistence graph', 'build tool graph', 'simulation graph', 'sharing/safety graph'],
    assetPriorities: ['modular kits', 'tool UI', 'materials', 'physics proxies', 'save thumbnails'],
    playtestScenarios: ['save/load large world', 'tool usability', 'simulation stability', 'permission/safety review'],
    performanceBudgets: ['streaming chunks', 'simulation tick budget', 'memory ceiling'],
    evidenceRefs: [...COMMON_EVIDENCE, 'world persistence proof', 'tool usability pass', 'simulation trace'],
    specialistAgents: [...COMMON_AGENTS, 'Systems Architect Agent'],
    runtimeNotes: ['Sandbox games need persistence and safety gates before broad user-generated content.'],
    limitations: ['UGC, moderation, permissions, and scale must be planned as product features.'],
  },
  strategy: {
    genre: 'strategy',
    label: 'Strategy',
    cameraModel: 'top-down-tactical',
    inputModel: 'tactical-hotkeys',
    coreLoop: ['scout', 'choose strategy', 'issue commands', 'resolve conflict', 'economy/progression'],
    requiredSystems: ['unit selection', 'command queue', 'AI planner', 'economy/resources', 'fog/visibility'],
    productionGraphs: ['unit command graph', 'AI strategy graph', 'economy graph', 'visibility graph', 'balance telemetry'],
    assetPriorities: ['unit readability', 'map tiles', 'command UI', 'resource icons', 'combat VFX clarity'],
    playtestScenarios: ['unit command clarity', 'AI difficulty', 'economy runaway', 'visibility/fog correctness'],
    performanceBudgets: ['unit count budget', 'AI tick budget', 'pathfinding budget'],
    evidenceRefs: [...COMMON_EVIDENCE, 'unit command capture', 'AI strategy telemetry', 'economy balance notes'],
    specialistAgents: [...COMMON_AGENTS, 'Systems Balance Agent'],
    runtimeNotes: ['Strategy games require deterministic AI, pathing, and balance telemetry before demo claims.'],
    limitations: ['Large-scale unit counts must be capped until pathfinding and AI budgets are proven.'],
  },
  custom: {
    genre: 'custom',
    label: 'Custom game',
    cameraModel: 'freeform',
    inputModel: 'custom',
    coreLoop: ['define fantasy', 'define player action', 'define feedback', 'test loop', 'scope next milestone'],
    requiredSystems: ['scope contract', 'camera/input decision', 'core loop prototype', 'playtest criteria', 'evidence ledger'],
    productionGraphs: ['custom brief graph', 'camera/input graph', 'core loop graph', 'playtest graph'],
    assetPriorities: ['style guide', 'hero object', 'world kit', 'feedback VFX/SFX'],
    playtestScenarios: ['core loop comprehension', 'input comfort', 'visual clarity', 'scope risk review'],
    performanceBudgets: ['browser responsiveness', 'runtime target decision', 'budget/cost visibility'],
    evidenceRefs: COMMON_EVIDENCE,
    specialistAgents: COMMON_AGENTS,
    runtimeNotes: ['Custom briefs must choose camera, input, core loop, runtime target, and evidence path before generation.'],
    limitations: ['Custom scope is held until the user approves a concrete production bible.'],
  },
}

export function getGameGenrePack(genre: PlayableGameGenre, customLabel?: string): GameGenrePack {
  const pack = GAME_GENRE_PACKS[genre] ?? GAME_GENRE_PACKS.custom
  return genre === 'custom' && customLabel
    ? { ...pack, label: customLabel }
    : pack
}
