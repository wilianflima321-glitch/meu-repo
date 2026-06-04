export type EngineModuleDecision = 'wire' | 'retire' | 'monitor'
export type EngineModuleRisk = 'dead-code' | 'parallel-runtime' | 'creative-gap' | 'bundle-risk'
export type EngineModuleIntegrationStatus = 'adapter-wired' | 'retired-confirmed' | 'monitoring'

export interface EngineModuleIntegrationDecision {
  modulePath: string
  decision: EngineModuleDecision
  ownerSurface: string
  reason: string
  risks: EngineModuleRisk[]
  status: EngineModuleIntegrationStatus
  acceptanceCriteria: string[]
}

export const ENGINE_MODULE_INTEGRATION_DECISIONS: EngineModuleIntegrationDecision[] = [
  {
    modulePath: 'lib/sequencer-cinematics.ts',
    decision: 'wire',
    ownerSurface: '/studio/film',
    reason: 'Film Studio needs the canonical shot, keyframe, and render evidence logic instead of a UI-only timeline.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'DirectorMode and VideoTimelineEditor can request sequencer summaries from the shared module.',
      'Render Queue evidence links include shot/sequence identifiers.',
    ],
  },
  {
    modulePath: 'lib/postprocessing/post-processing-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Viewport quality depends on Bloom, SSAO, tone mapping, and outline presets being runtime contracts, not ad-hoc component props.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Viewport quality presets are mapped to post-processing contracts.',
      'Heavy presets route through render readiness checks before cinematic output.',
    ],
  },
  {
    modulePath: 'lib/particles/advanced-particle-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/vfx',
    reason: 'Niagara-style VFX must use the shared particle contract before agents can generate effects safely.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'NiagaraVFX can create particle presets from the shared system.',
      'Generated VFX records validation evidence before scene apply.',
    ],
  },
  {
    modulePath: 'lib/particle-system-real.ts',
    decision: 'wire',
    ownerSurface: '/studio/vfx',
    reason: 'GPU particle runtime remains behind render-gated VFX adapters so browser sessions do not load heavy effects by default.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'VFX surfaces can request GPU particle runtime summaries without importing render-heavy execution paths.',
      'Generated GPU particle presets include max-particle and blend-mode evidence before apply.',
    ],
  },
  {
    modulePath: 'lib/ai/behavior-tree-system.tsx',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Gameplay agents and NPC authoring need behavior-tree contracts connected to scene validation and playtest evidence.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Gameplay Graph references behavior-tree nodes before NPC generation is marked done.',
      'Playtest evidence links behavior-tree decisions to failures and fixes.',
    ],
  },
  {
    modulePath: 'lib/control-rig-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/animation',
    reason: 'Control Rig and Facial Animation need one animation authority for retargeting, constraints, and review packets.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'ControlRigEditor imports control-rig contracts for rig validation.',
      'FacialAnimationEditor records animation review evidence before export.',
    ],
  },
  {
    modulePath: 'lib/facial-animation-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/animation',
    reason: 'Facial Studio needs FACS, lip-sync, and emotion contracts connected to review evidence before export.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'FacialAnimationEditor can request FACS/lip-sync summaries from the shared module.',
      'Facial exports include emotion-state and lip-sync evidence before render handoff.',
    ],
  },
  {
    modulePath: 'lib/world/world-streaming.tsx',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Large worlds require streaming/partition contracts to avoid browser stalls and hallucinated world state.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Landscape and terrain surfaces can request partition plans before world generation.',
      'Repository Cartography stores world partition summaries instead of raw world dumps.',
    ],
  },
  {
    modulePath: 'lib/ray-tracing.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Ray tracing is high-value render code, but it must stay evidence-gated behind performance traces instead of loading as a browser-default promise.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can expose ray-tracing readiness from a summary adapter without importing the renderer directly.',
      'Any ray-traced claim requires p95 frame evidence, denoiser settings, and human render review.',
    ],
  },
  {
    modulePath: 'lib/nanite-virtualized-geometry.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Virtualized geometry is strategic for AAA-scale scenes, but it must map to meshlet, culling, and memory evidence before product claims.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can show virtualized geometry readiness with triangle, meshlet, and memory budget signals.',
      'Final-quality geometry claims stay blocked without WebGPU/Studio Local/Cloud Stream performance evidence.',
    ],
  },
  {
    modulePath: 'lib/assets/asset-importer.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Asset import is central to game quality and must connect to provenance, checksum, LOD/PBR, collision, and license evidence.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio and asset quality jobs can inspect accepted asset types and import options without executing heavy import work.',
      'Asset importer writes remain worker/Studio Local held until license, checksum, optimization, and review evidence exist.',
    ],
  },
  {
    modulePath: 'lib/engine/audio-manager.ts',
    decision: 'wire',
    ownerSurface: '/studio/audio',
    reason: 'Game and film quality needs audio mix evidence; audio runtime contracts must be visible without autoplaying or mutating browser audio graphs.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Audio Studio can expose source/group/mix summary evidence before export.',
      'Final audio claims require mix snapshot, peak-level checks, and human audio review.',
    ],
  },
  {
    modulePath: 'lib/audio/spatial-audio-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/audio',
    reason: 'Spatial audio is a quality differentiator for games and films, but it needs listener, reverb, and headset-review evidence before release claims.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Audio Studio can inspect spatial audio and reverb readiness through a lightweight summary.',
      'Spatial audio output remains review-gated until listener position, zone, and headphone review evidence are attached.',
    ],
  },
  {
    modulePath: 'lib/physics/physics-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Gameplay quality depends on deterministic physics evidence, not hidden runtime code or fake playable claims.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio can show physics timestep, solver, collider, and rigid-body readiness before playtest.',
      'Agent physics edits require collision budget, replay/playtest evidence, and rollback before apply.',
    ],
  },
  {
    modulePath: 'lib/terrain/terrain-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Terrain generation can be expensive and must expose LOD, heightmap, collider, and brush evidence before world-building claims.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Terrain Studio can inspect terrain settings and noise/brush contracts without running generation on the main thread.',
      'Large terrain jobs stay worker/sidecar held until collider, LOD, and performance evidence exist.',
    ],
  },
  {
    modulePath: 'lib/volumetric-clouds.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Atmosphere quality is valuable for premium visuals, but volumetric clouds must be render-gated by trace evidence to avoid fake cinematic claims.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can expose cloud coverage, density, god-rays, and shadow readiness from a summary adapter.',
      'Volumetric atmosphere claims require WebGPU or Cloud Stream performance trace and human visual review.',
    ],
  },
  {
    modulePath: 'lib/dialogue/dialogue-system.tsx',
    decision: 'wire',
    ownerSurface: '/studio/film',
    reason: 'Narrative quality depends on dialogue branch coverage, localization, voice consent, and continuity evidence instead of hidden dialogue runtime code.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Film Studio can inspect conversation, state, and event summaries without executing dialogue playback.',
      'Voice/lip-sync and localization claims require consent, branch coverage, and human narrative review evidence.',
    ],
  },
  {
    modulePath: 'lib/webxr-vr-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Immersive previews can differentiate Aethel, but XR must remain device/capability held to avoid comfort and input-latency issues.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can show XR readiness, required device features, and comfort blockers from a summary adapter.',
      'XR execution remains held without device capability, input latency, and human comfort review evidence.',
    ],
  },
  {
    modulePath: 'lib/motion-matching-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/animation',
    reason: 'High-quality character movement needs motion database, foot locking, and playtest evidence before agents can claim animation quality.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Animation Studio can inspect motion matching config and database readiness without loading heavy pose search runtime.',
      'Animation quality claims require pose database evidence, foot-lock review, and playtest capture.',
    ],
  },
  {
    modulePath: 'lib/input/haptics-system.tsx',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Game feel includes haptics; the system needs accessibility, device, and intensity evidence before agent-authored feedback ships.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio can expose haptic profile readiness and accessibility toggles as evidence.',
      'Haptics remain optional and device-gated, with reduced-motion/accessibility review before release.',
    ],
  },
  {
    modulePath: 'lib/environment/weather-system.tsx',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Weather and atmosphere affect gameplay, lighting, and performance; they must be evidence-visible before large-world claims.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can inspect weather state, transition, wind, and lightning readiness through a summary adapter.',
      'Weather-driven visual claims require lighting impact and performance evidence.',
    ],
  },
  {
    modulePath: 'lib/camera/camera-system.tsx',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Camera feel is core to games and films; camera runtime needs continuity, shake, follow, and comfort evidence.',
    risks: ['creative-gap', 'dead-code'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can inspect camera modes, follow settings, and shake settings from a summary adapter.',
      'Cinematic/playable camera claims require continuity and motion-sickness review evidence.',
    ],
  },
  {
    modulePath: 'lib/engine/physics-engine.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'The legacy physics engine is valuable but must be governed as a compatibility boundary so it does not compete with the canonical physics-system adapter.',
    risks: ['parallel-runtime', 'creative-gap'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio exposes legacy physics readiness only as summary evidence with deterministic-step and collision replay signals.',
      'Any migration or mutation routes through the canonical physics-system contract and playtest replay evidence.',
    ],
  },
  {
    modulePath: 'lib/quest-mission-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/quest',
    reason: 'Quest and mission authoring is a product differentiator, but it needs branch, reward, and localization evidence before agent-authored gameplay claims.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Quest Studio can inspect mission branches, reward balance, and marker readiness without executing gameplay writes.',
      'Agent-authored quests remain held until branch coverage, localization, rollback, and playtest evidence are attached.',
    ],
  },
  {
    modulePath: 'lib/ecs-dots-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'High-quality games need a deterministic ECS/DOTS lane, but scheduler and job execution must stay worker-held until traces prove stability.',
    risks: ['parallel-runtime', 'creative-gap'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio can show World, SystemScheduler, and JobSystem readiness without running broad ECS jobs in the browser.',
      'ECS mutations require system-order evidence, worker traces, and playtest validation before playable claims.',
    ],
  },
  {
    modulePath: 'lib/streaming/level-streaming-system.tsx',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Large worlds depend on level streaming, but load/unload work must be worker or sidecar held to avoid browser stalls.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio can expose loaded-level, memory-pressure, and transition evidence from a lightweight readiness adapter.',
      'Streaming execution remains held without chunk memory budgets, transition traces, and rollback evidence.',
    ],
  },
  {
    modulePath: 'lib/networking-multiplayer.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Multiplayer quality needs authoritative networking, rollback, and matchmaking evidence before live co-op/gameplay claims.',
    risks: ['parallel-runtime', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio can inspect netcode readiness, authority model, and latency budget without starting live rooms.',
      'Networked gameplay remains sandbox/staging held until latency, rollback, and security evidence pass.',
    ],
  },
  {
    modulePath: 'lib/foliage-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Foliage density is a major visual-quality gap; it must be evidence-gated by instance, LOD, culling, and performance traces.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Foliage Studio can inspect painter, cluster, grass, and tree readiness without loading full rendering paths.',
      'Dense foliage stays render-gated until LOD/culling and p95 frame evidence exist.',
    ],
  },
  {
    modulePath: 'lib/virtual-texture-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Virtual textures can unlock large worlds and high-resolution materials, but tile cache and feedback-buffer work must remain worker-held.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Material Studio can show tile cache, feedback buffer, and texture memory readiness from summary evidence.',
      'Virtual texture execution remains held until cache-hit, memory-budget, and render-trace evidence pass.',
    ],
  },
  {
    modulePath: 'lib/ai-audio-engine.ts',
    decision: 'wire',
    ownerSurface: '/studio/audio',
    reason: 'AI emotional audio is valuable for film/game polish, but it must remain review and consent gated rather than silently generating final mix claims.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Audio Studio can inspect emotion/context readiness and required review evidence without mutating audio graphs.',
      'AI audio output remains held until consent, context, mix, and human audio review evidence are attached.',
    ],
  },
  {
    modulePath: 'lib/environment/day-night-cycle.tsx',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Day/night cycles affect lighting, gameplay, atmosphere, and performance; they need transition and playtest evidence before world claims.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can expose time state, sun direction, sky state, and transition readiness from summary evidence.',
      'Lighting/gameplay claims require performance traces and playtest evidence for time-based state changes.',
    ],
  },
  {
    modulePath: 'lib/asset-import-pipeline.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'The older asset import pipeline should feed the same provenance and quality ledger instead of becoming a parallel importer.',
    risks: ['parallel-runtime', 'creative-gap'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Level Studio can inspect supported formats and import options without executing heavy conversion on the main thread.',
      'Imported assets require license, checksum, LOD/PBR/collision, optimization, and human review evidence before final claims.',
    ],
  },
  {
    modulePath: 'lib/audio-engine.ts',
    decision: 'wire',
    ownerSurface: '/studio/audio',
    reason: 'Browser audio playback should be governed by channel, peak-level, and autoplay-safe evidence instead of hidden runtime side effects.',
    risks: ['parallel-runtime', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Audio Studio can inspect track/channel readiness and mix evidence without autoplaying or mutating dashboard audio.',
      'Final audio claims require peak-level, mix snapshot, and human audio review evidence.',
    ],
  },
  {
    modulePath: 'lib/post-process-volume.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Shot and zone-based post-process volumes are premium render controls, but they need performance traces before becoming final-quality claims.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Scene Studio can inspect volume priority, blend distance, and settings readiness through a summary adapter.',
      'Post-process volume execution remains review-quality only until shot performance traces and human visual review pass.',
    ],
  },
  {
    modulePath: 'lib/aaa-material-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Material quality is central to best-in-market games/films, but PBR and shader graph work must be governed by preview, license, and performance evidence.',
    risks: ['creative-gap', 'bundle-risk'],
    status: 'adapter-wired',
    acceptanceCriteria: [
      'Material Studio can inspect PBR, material library, and shader graph readiness without importing heavy shader execution by default.',
      'Final material claims require PBR completeness, texture license evidence, shader preview, and performance trace.',
    ],
  },
  {
    modulePath: 'lib/commands/command-handlers.tsx',
    decision: 'monitor',
    ownerSurface: 'ide-command-bus',
    reason: 'Command handling is large and valuable, but it should be consolidated through the IDE command bus before new command surfaces grow.',
    risks: ['parallel-runtime', 'bundle-risk'],
    status: 'monitoring',
    acceptanceCriteria: [
      'New commands must register through the canonical command bus, not a parallel handler file.',
      'Split clipboard, undo/redo, file operations, search, navigation, and event bus before feature growth.',
    ],
  },
  {
    modulePath: 'lib/hooks/useTheiaSystemsHooks.ts',
    decision: 'monitor',
    ownerSurface: 'ide-theia-compat',
    reason: 'Theia compatibility hooks are broad; they should remain a compatibility boundary until IDE surfaces prove active demand.',
    risks: ['parallel-runtime', 'bundle-risk'],
    status: 'monitoring',
    acceptanceCriteria: [
      'Do not import Theia compatibility hooks into public, dashboard, or default Studio bundles.',
      'Split search, theme, keybinding, notification, command palette, and AI hooks before expanding usage.',
    ],
  },
  {
    modulePath: 'lib/workspace/workspace-service.ts',
    decision: 'monitor',
    ownerSurface: 'workspace-runtime',
    reason: 'Workspace file operations need one authority across IDE, Project Brain, and collaboration state.',
    risks: ['parallel-runtime', 'dead-code'],
    status: 'monitoring',
    acceptanceCriteria: [
      'File watching/search/configuration changes must route through one workspace service boundary.',
      'Split file IO, watchers, search, dirty-state, and configuration before new workspace features.',
    ],
  },
  {
    modulePath: 'lib/events/event-bus-system.tsx',
    decision: 'monitor',
    ownerSurface: 'runtime-event-bus',
    reason: 'A broad event bus can silently create parallel runtimes; keep it visible and split channels before usage grows.',
    risks: ['parallel-runtime', 'bundle-risk'],
    status: 'monitoring',
    acceptanceCriteria: [
      'New event flows must declare channel ownership and evidence impact before wiring.',
      'Split core bus, channels, signals, decorators, and React hooks before feature growth.',
    ],
  },
  {
    modulePath: 'lib/health-check.ts',
    decision: 'monitor',
    ownerSurface: 'platform-health',
    reason: 'Health checks are product-critical, but this large module must stay server/ops-owned rather than leaking into UI bundles.',
    risks: ['parallel-runtime', 'bundle-risk'],
    status: 'monitoring',
    acceptanceCriteria: [
      'Health reporting must stay in platform/server contexts with redacted evidence.',
      'Split liveness, metrics, uptime monitor, alerting, and React status hooks before adding checks.',
    ],
  },
  {
    modulePath: 'lib/collaboration/collaboration-realtime.ts',
    decision: 'retire',
    ownerSurface: 'native-yjs',
    reason: 'Native MonacoBinding and Yjs awareness now own realtime collaboration; parallel realtime abstractions increase collision risk.',
    risks: ['parallel-runtime', 'dead-code'],
    status: 'retired-confirmed',
    acceptanceCriteria: [
      'No production editor imports the retired realtime module.',
      'Native Yjs binding remains covered by tests and collaboration QA gates.',
    ],
  },
  {
    modulePath: 'lib/theme-service.ts',
    decision: 'retire',
    ownerSurface: 'design-tokens',
    reason: 'Design tokens and CSS variables are the single source of truth after the zero-hex ratchet.',
    risks: ['dead-code', 'bundle-risk'],
    status: 'retired-confirmed',
    acceptanceCriteria: [
      'No UI surface imports theme-service.',
      'Theme changes go through tokens and ThemeToggle only.',
    ],
  },
  {
    modulePath: 'lib/workspace-store.ts',
    decision: 'retire',
    ownerSurface: 'project-brain',
    reason: 'Project Brain, Mission Ledger, Yjs, and runtime state now own workspace continuity.',
    risks: ['dead-code', 'parallel-runtime'],
    status: 'retired-confirmed',
    acceptanceCriteria: [
      'Workspace state changes are persisted through Project Brain or collaboration documents.',
      'No agent uses workspace-store for hidden mutable state.',
    ],
  },
]

export function listEngineModuleDecisions(decision?: EngineModuleDecision): EngineModuleIntegrationDecision[] {
  return decision
    ? ENGINE_MODULE_INTEGRATION_DECISIONS.filter((item) => item.decision === decision)
    : [...ENGINE_MODULE_INTEGRATION_DECISIONS]
}

export function validateEngineModuleIntegrationPlan(
  decisions: EngineModuleIntegrationDecision[] = ENGINE_MODULE_INTEGRATION_DECISIONS
): string[] {
  const failures: string[] = []
  const seen = new Set<string>()
  for (const item of decisions) {
    if (seen.has(item.modulePath)) {
      failures.push(`${item.modulePath}: duplicate module decision`)
    }
    seen.add(item.modulePath)
    if (!item.ownerSurface) failures.push(`${item.modulePath}: missing owner surface`)
    if (!item.status) failures.push(`${item.modulePath}: missing execution status`)
    if (item.acceptanceCriteria.length < 2) failures.push(`${item.modulePath}: needs at least two acceptance criteria`)
    if (item.decision === 'wire' && !item.ownerSurface.startsWith('/studio/')) {
      failures.push(`${item.modulePath}: wired modules must point to a Studio surface`)
    }
    if (item.decision === 'wire' && item.status !== 'adapter-wired') {
      failures.push(`${item.modulePath}: wired modules must have adapter-wired status`)
    }
    if (item.decision === 'retire' && item.status !== 'retired-confirmed') {
      failures.push(`${item.modulePath}: retired modules must have retired-confirmed status`)
    }
  }
  return failures
}
