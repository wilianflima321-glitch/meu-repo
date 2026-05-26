export type EngineSpineDomain = 'render' | 'world' | 'film' | 'systems' | 'network' | 'assets' | 'native'
export type EngineSpineStatus = 'visible' | 'ready-to-wire' | 'adapter-needed' | 'worker-held'
export type EngineSpineLoadStrategy = 'already-visible' | 'dynamic-client-only' | 'summary-adapter' | 'worker-or-sidecar' | 'native-or-cloud'
export type EngineSpineReadinessState = 'ready' | 'needs-review' | 'needs-adapters' | 'worker-held'

export interface EngineSpineModule {
  id: string
  label: string
  domain: EngineSpineDomain
  status: EngineSpineStatus
  modulePath: string
  targetSurface: string
  userValue: string
  nextAction: string
  limitation: string
  loadStrategy: EngineSpineLoadStrategy
  estimatedLoc: number
  risk: 'low' | 'medium' | 'high'
}

export interface EngineSpineDecisionMatrixRow {
  key: string
  label: string
  modules: EngineSpineModule[]
  totalLoc: number
  highRisk: number
}

export interface EngineSpineReadinessModel {
  state: EngineSpineReadinessState
  label: string
  summary: string
  blockers: string[]
  nextAction: string
}

export const ENGINE_SPINE_MODULES: EngineSpineModule[] = [
  {
    id: 'aaa-render-system',
    label: 'AAA render pipeline',
    domain: 'render',
    status: 'adapter-needed',
    modulePath: 'lib/aaa-render-system.ts',
    targetSurface: 'Viewport render backend',
    userValue: 'Deferred WebGL, HDR, G-buffer evidence, and post-FX become visible in review/final render modes.',
    nextAction: 'Wrap behind a viewport backend adapter before replacing the current renderer.',
    limitation: 'Do not import directly into public or dashboard routes; route through viewport/render readiness.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1051, risk: 'medium',
  },
  {
    id: 'post-processing-system',
    label: 'Post-processing stack',
    domain: 'render',
    status: 'ready-to-wire',
    modulePath: 'lib/postprocessing/post-processing-system.ts',
    targetSurface: 'Viewport quality controls',
    userValue: 'Bloom, AO, tone mapping, and tasteful cinematic passes move from hidden code to explicit quality toggles.',
    nextAction: 'Expose as review-quality toggles and keep chromatic aberration off by default.',
    limitation: 'Keep expensive passes off until the user selects review/final quality.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1180, risk: 'low',
  },
  {
    id: 'pixel-streaming',
    label: 'Pixel Streaming cloud lane',
    domain: 'render',
    status: 'visible',
    modulePath: 'lib/pixel-streaming.ts',
    targetSurface: 'Viewport Cloud Stream',
    userValue: 'Unreal/cloud GPU review becomes an optional, cost-aware lane instead of a default browser burden.',
    nextAction: 'Keep Cloud Stream behind explicit user selection and maintain the split signaling/session/codec/cost boundaries.',
    limitation: 'Cloud stream is not free: show cost/status and never promise Unreal quality without a configured backend.',
    loadStrategy: 'dynamic-client-only',
    estimatedLoc: 1244, risk: 'medium',
  },
  {
    id: 'ray-tracing',
    label: 'Ray tracing readiness',
    domain: 'render',
    status: 'adapter-needed',
    modulePath: 'lib/ray-tracing.ts',
    targetSurface: 'Scene Studio render evidence',
    userValue: 'Ray tracing becomes an explicit review lane with p95 frame, denoiser, and human visual evidence.',
    nextAction: 'Expose summary readiness first; require WebGPU/Cloud/Studio Local trace before enabling render claims.',
    limitation: 'Do not call this AAA or final quality from browser evidence alone.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 997, risk: 'high',
  },
  {
    id: 'nanite-virtualized-geometry',
    label: 'Virtualized geometry',
    domain: 'render',
    status: 'adapter-needed',
    modulePath: 'lib/nanite-virtualized-geometry.ts',
    targetSurface: 'Scene Studio geometry budget',
    userValue: 'Meshlet, culling, triangle, and memory budgets become visible before users ask for large worlds.',
    nextAction: 'Keep as a summary adapter until WebGPU or native culling traces exist.',
    limitation: 'Virtualized geometry is not an Unreal Nanite claim; it is an Aethel evidence lane.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 990, risk: 'high',
  },
  {
    id: 'volumetric-clouds',
    label: 'Volumetric atmosphere',
    domain: 'render',
    status: 'adapter-needed',
    modulePath: 'lib/volumetric-clouds.ts',
    targetSurface: 'Scene Studio atmosphere',
    userValue: 'Cloud coverage, raymarch budget, god rays, and shadow cost become reviewable instead of hidden shader work.',
    nextAction: 'Expose atmosphere summary only; route heavy rendering through trace-gated render paths.',
    limitation: 'Cloud raymarching can dominate GPU time; keep it off default preview bundles.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 984, risk: 'high',
  },
  {
    id: 'studio-local-runtime',
    label: 'Studio Local runtime',
    domain: 'native',
    status: 'visible',
    modulePath: 'apps/studio-local/src-tauri/src/lib.rs',
    targetSurface: 'Studio Local capsule',
    userValue: 'Heavy native work can move to Tauri/sidecars instead of slowing browser sessions.',
    nextAction: 'Expose capability probes and handoff state before routing destructive or high-cost jobs locally.',
    limitation: 'Local runtime is capability-gated; browser remains the fallback when probes are absent or stale.',
    loadStrategy: 'native-or-cloud',
    estimatedLoc: 1200, risk: 'medium',
  },
  {
    id: 'behavior-tree-system',
    label: 'Behavior tree runtime',
    domain: 'world',
    status: 'ready-to-wire',
    modulePath: 'lib/ai/behavior-tree-system.tsx',
    targetSurface: 'Scene Studio AI panel',
    userValue: 'NPC logic becomes inspectable instead of living as unconnected engine code.',
    nextAction: 'Add an AI tab in Scene Studio with read-only tree preview first.',
    limitation: 'Start read-only; agent mutations need playtest evidence and scope locks.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1083, risk: 'medium',
  },
  {
    id: 'world-streaming',
    label: 'World streaming',
    domain: 'world',
    status: 'worker-held',
    modulePath: 'lib/world/world-streaming.tsx',
    targetSurface: 'Level Studio open-world mode',
    userValue: 'Large worlds get chunk visibility, LOD, and held-state controls without blocking the browser main thread.',
    nextAction: 'Keep heavy scan/stream work in worker or sidecar; expose chunk readiness in Level Studio.',
    limitation: 'World scans can freeze the main thread if wired directly.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 1160, risk: 'high',
  },
  {
    id: 'terrain-system',
    label: 'Terrain generation',
    domain: 'world',
    status: 'worker-held',
    modulePath: 'lib/terrain/terrain-system.ts',
    targetSurface: 'Terrain Studio',
    userValue: 'Heightmap, LOD, brush, foliage, and collider readiness become visible before world generation.',
    nextAction: 'Expose read-only terrain/noise/brush summary and keep generation worker/sidecar held.',
    limitation: 'Large terrain jobs can freeze the UI if imported directly.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 973, risk: 'high',
  },
  {
    id: 'quest-system',
    label: 'Quest system',
    domain: 'world',
    status: 'ready-to-wire',
    modulePath: 'lib/quests/quest-system.tsx',
    targetSurface: 'Quest Studio',
    userValue: 'Branching mission authoring gets surfaced as a real production system, not only a route label.',
    nextAction: 'Connect existing Quest Studio cards to quest validation and reward previews.',
    limitation: 'Gameplay writes stay disabled until validation packets and rollback are visible.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1152, risk: 'low',
  },
  {
    id: 'save-manager',
    label: 'Save manager',
    domain: 'systems',
    status: 'ready-to-wire',
    modulePath: 'lib/save/save-manager.tsx',
    targetSurface: 'Level Studio save slots',
    userValue: 'Playable prototypes can expose save/load evidence and rollback-friendly state snapshots.',
    nextAction: 'Add save-slot preview and route all writes through evidence ledger.',
    limitation: 'Save mutations must be project-scoped and reversible.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1143, risk: 'low',
  },
  {
    id: 'inventory-system',
    label: 'Inventory system',
    domain: 'systems',
    status: 'ready-to-wire',
    modulePath: 'lib/inventory/inventory-system.tsx',
    targetSurface: 'Level Studio gameplay systems',
    userValue: 'Loot, equipment, and item evidence can become testable inside game prototypes.',
    nextAction: 'Surface as read-only inventory model before enabling mutations.',
    limitation: 'Inventory edits need economy/balance evidence before agent writes are allowed.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1190, risk: 'medium',
  },
  {
    id: 'physics-system',
    label: 'Physics runtime',
    domain: 'systems',
    status: 'ready-to-wire',
    modulePath: 'lib/physics/physics-system.ts',
    targetSurface: 'Level Studio playtest readiness',
    userValue: 'Fixed timestep, solver, collider, and rigid-body evidence can gate playable claims.',
    nextAction: 'Expose physics summary and require replay/playtest evidence before agent mutations.',
    limitation: 'Physics edits can break feel quickly; keep rollback and playtest receipts mandatory.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 973, risk: 'medium',
  },
  {
    id: 'audio-manager',
    label: 'Audio mix runtime',
    domain: 'systems',
    status: 'ready-to-wire',
    modulePath: 'lib/engine/audio-manager.ts',
    targetSurface: 'Audio Studio mix evidence',
    userValue: 'Sources, groups, snapshots, and peak-level evidence become part of game/film release quality.',
    nextAction: 'Expose mix summary and hold final export until human audio review.',
    limitation: 'Do not autoplay or mutate browser audio graphs from a dashboard surface.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 970, risk: 'medium',
  },
  {
    id: 'spatial-audio-system',
    label: 'Spatial audio',
    domain: 'systems',
    status: 'ready-to-wire',
    modulePath: 'lib/audio/spatial-audio-system.ts',
    targetSurface: 'Audio Studio spatial review',
    userValue: 'Listener position, reverb zones, and headset review can be audited before cinematic/game claims.',
    nextAction: 'Expose spatial readiness and require headphone review evidence before final release.',
    limitation: 'Spatial quality depends on device and mix context; agents can prepare evidence, not replace taste.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 926, risk: 'medium',
  },
  {
    id: 'multiplayer-system',
    label: 'Multiplayer runtime',
    domain: 'network',
    status: 'adapter-needed',
    modulePath: 'lib/networking/multiplayer-system.tsx',
    targetSurface: 'Creative Hub multiplayer card',
    userValue: 'Collaboration and gameplay networking get a visible readiness model for creators.',
    nextAction: 'Expose readiness, room state, and constraints before adding live mutation controls.',
    limitation: 'Networking is high-risk for reliability; show readiness before live rooms.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 1170, risk: 'high',
  },
  {
    id: 'cutscene-system',
    label: 'Cutscene system',
    domain: 'film',
    status: 'ready-to-wire',
    modulePath: 'lib/cutscene/cutscene-system.tsx',
    targetSurface: 'Film Studio timeline',
    userValue: 'Shot sequencing, camera moves, and continuity checks become discoverable in Film Studio.',
    nextAction: 'Add a Film Studio tab for cutscene packets and keep export behind review gates.',
    limitation: 'Exports remain review-gated until continuity and render evidence pass.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1194, risk: 'medium',
  },
  {
    id: 'dialogue-cutscene-system',
    label: 'Dialogue cutscenes',
    domain: 'film',
    status: 'ready-to-wire',
    modulePath: 'lib/dialogue-cutscene-system.ts',
    targetSurface: 'Film Studio dialogue tab',
    userValue: 'Branching dialogue and cinematic beats can be inspected with evidence instead of hidden claims.',
    nextAction: 'Wire read-only dialogue graph preview before voice/lip-sync generation.',
    limitation: 'Voice/lip-sync generation requires license and actor-consent evidence.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 1200, risk: 'medium',
  },
  {
    id: 'capture-system',
    label: 'Capture system',
    domain: 'film',
    status: 'worker-held',
    modulePath: 'lib/capture/capture-system.tsx',
    targetSurface: 'Film Studio review capture',
    userValue: 'Review captures can be recorded as evidence without freezing authoring surfaces.',
    nextAction: 'Keep recording off the main thread and expose capture readiness first.',
    limitation: 'Capture can be CPU/GPU heavy; keep it worker-held until a target is chosen.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 1192, risk: 'high',
  },
  {
    id: 'aaa-asset-pipeline',
    label: 'AAA asset pipeline',
    domain: 'assets',
    status: 'adapter-needed',
    modulePath: 'lib/aaa-asset-pipeline.ts',
    targetSurface: 'Asset import and marketplace trust',
    userValue: 'GLTF/FBX/USD processing gets tied to license, provenance, and validation evidence.',
    nextAction: 'Expose dependency graph and validation before enabling new importer writes.',
    limitation: 'Asset processing must respect licensing, storage limits, and provenance gates.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 1147, risk: 'medium',
  },
  {
    id: 'asset-importer',
    label: 'Asset importer',
    domain: 'assets',
    status: 'worker-held',
    modulePath: 'lib/assets/asset-importer.ts',
    targetSurface: 'Level Studio asset intake',
    userValue: 'Models, textures, HDRI, audio, and video imports become governed by provenance, checksum, and quality evidence.',
    nextAction: 'Expose accepted formats and option summary; run heavy import/optimization only in worker or Studio Local.',
    limitation: 'Raw imported assets are not final; LOD, PBR, collision/navmesh, perf, license, and review remain required.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 984, risk: 'high',
  },
  {
    id: 'dialogue-system',
    label: 'Dialogue runtime',
    domain: 'film',
    status: 'ready-to-wire',
    modulePath: 'lib/dialogue/dialogue-system.tsx',
    targetSurface: 'Film Studio narrative review',
    userValue: 'Dialogue branches, variables, events, localization, and consent evidence become reviewable.',
    nextAction: 'Expose read-only conversation summary before voice/lip-sync generation.',
    limitation: 'Narrative quality and consent stay human-reviewed before final media claims.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 986, risk: 'medium',
  },
  {
    id: 'webxr-vr-system',
    label: 'Immersive XR readiness',
    domain: 'render',
    status: 'worker-held',
    modulePath: 'lib/webxr-vr-system.ts',
    targetSurface: 'Scene Studio XR review',
    userValue: 'VR/AR capability, hand tracking, controller input, teleport, and comfort evidence become explicit.',
    nextAction: 'Keep XR execution device-held; expose capability summary and comfort blockers first.',
    limitation: 'XR can cause comfort/input issues and cannot be implied available without device evidence.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 982, risk: 'high',
  },
  {
    id: 'motion-matching-system',
    label: 'Motion matching',
    domain: 'systems',
    status: 'worker-held',
    modulePath: 'lib/motion-matching-system.ts',
    targetSurface: 'Animation Studio movement quality',
    userValue: 'Pose database, trajectory, foot locking, and locomotion evidence become part of character quality.',
    nextAction: 'Expose config/database summary; keep pose search worker-held until playtest evidence exists.',
    limitation: 'Animation feel cannot be claimed from config alone; it needs playtest and human review.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 980, risk: 'high',
  },
  {
    id: 'haptics-system',
    label: 'Haptics feedback',
    domain: 'systems',
    status: 'ready-to-wire',
    modulePath: 'lib/input/haptics-system.tsx',
    targetSurface: 'Level Studio game feel',
    userValue: 'Gamepad/mobile haptics become accessibility-aware evidence, not hidden feedback magic.',
    nextAction: 'Expose haptic profile summary with accessibility toggles and device support state.',
    limitation: 'Haptics must remain optional, device-gated, and accessibility-reviewed.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 974, risk: 'medium',
  },
  {
    id: 'weather-system',
    label: 'Weather runtime',
    domain: 'world',
    status: 'adapter-needed',
    modulePath: 'lib/environment/weather-system.tsx',
    targetSurface: 'Scene Studio environment review',
    userValue: 'Weather, wind, lightning, visibility, and lighting impact become governed scene evidence.',
    nextAction: 'Expose state/transition summary and require lighting/perf evidence before world claims.',
    limitation: 'Weather affects gameplay and rendering; keep heavy effects off until reviewed.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 970, risk: 'medium',
  },
  {
    id: 'camera-system',
    label: 'Camera runtime',
    domain: 'film',
    status: 'ready-to-wire',
    modulePath: 'lib/camera/camera-system.tsx',
    targetSurface: 'Scene Studio camera review',
    userValue: 'Camera mode, follow, orbit, shake, and path evidence become central to game/film quality.',
    nextAction: 'Expose camera summary and require continuity/comfort review before final camera claims.',
    limitation: 'Camera feel is taste-sensitive and must stay human-reviewed.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 969, risk: 'medium',
  },
  {
    id: 'command-handlers',
    label: 'Command handlers',
    domain: 'systems',
    status: 'adapter-needed',
    modulePath: 'lib/commands/command-handlers.tsx',
    targetSurface: 'IDE command bus',
    userValue: 'Clipboard, undo/redo, file ops, search, navigation, and command events get one visible authority.',
    nextAction: 'Split command domains before adding more IDE actions.',
    limitation: 'Do not create parallel command buses or import command handlers into unrelated surfaces.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 995, risk: 'high',
  },
  {
    id: 'theia-systems-hooks',
    label: 'Theia compatibility hooks',
    domain: 'systems',
    status: 'adapter-needed',
    modulePath: 'lib/hooks/useTheiaSystemsHooks.ts',
    targetSurface: 'IDE compatibility boundary',
    userValue: 'Search, theme, keybindings, notifications, command palette, and AI hooks stay explicitly scoped.',
    nextAction: 'Split hooks by concern before wiring them into premium IDE surfaces.',
    limitation: 'Compatibility hooks must not leak into public/dashboard/default Studio bundles.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 989, risk: 'high',
  },
  {
    id: 'workspace-service',
    label: 'Workspace service',
    domain: 'systems',
    status: 'adapter-needed',
    modulePath: 'lib/workspace/workspace-service.ts',
    targetSurface: 'IDE workspace runtime',
    userValue: 'File IO, watchers, search, dirty files, and configuration become one governed workspace boundary.',
    nextAction: 'Split workspace IO/watch/search/configuration before expanding filesystem features.',
    limitation: 'Workspace state must not compete with Project Brain, Yjs, or mission ledger state.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 985, risk: 'high',
  },
  {
    id: 'event-bus-system',
    label: 'Runtime event bus',
    domain: 'systems',
    status: 'adapter-needed',
    modulePath: 'lib/events/event-bus-system.tsx',
    targetSurface: 'Runtime event governance',
    userValue: 'Events, channels, signals, and decorators become governed instead of hidden app-wide coupling.',
    nextAction: 'Split bus/channels/signals/hooks and require channel ownership before new events.',
    limitation: 'Unowned event buses create invisible coupling and parallel runtime risk.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 985, risk: 'high',
  },
  {
    id: 'health-check',
    label: 'Platform health runtime',
    domain: 'native',
    status: 'ready-to-wire',
    modulePath: 'lib/health-check.ts',
    targetSurface: 'Admin/platform health',
    userValue: 'Liveness, metrics, uptime, alerts, and redacted health evidence become operationally trustworthy.',
    nextAction: 'Keep health logic server/platform-owned and split UI hooks from runtime checks.',
    limitation: 'Health details must be redacted in user/admin screenshots and evidence exports.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 970, risk: 'medium',
  },
  {
    id: 'legacy-physics-engine',
    label: 'Legacy physics engine boundary',
    domain: 'systems',
    status: 'adapter-needed',
    modulePath: 'lib/engine/physics-engine.ts',
    targetSurface: 'Level Studio physics compatibility',
    userValue: 'Existing physics world, bodies, and collider code becomes a migration-safe compatibility lane instead of a hidden parallel runtime.',
    nextAction: 'Keep read-only readiness and migrate writes through the canonical physics-system adapter.',
    limitation: 'Legacy physics must not compete with the canonical physics contract or ship playable claims without replay evidence.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 970, risk: 'high',
  },
  {
    id: 'quest-mission-system',
    label: 'Quest mission runtime',
    domain: 'world',
    status: 'ready-to-wire',
    modulePath: 'lib/quest-mission-system.ts',
    targetSurface: 'Quest Studio mission validation',
    userValue: 'Quest branches, rewards, markers, and UI packets become governed production evidence for game prototypes and vertical slices.',
    nextAction: 'Expose branch/reward/localization summaries and require rollback before agent quest writes.',
    limitation: 'Quest generation is not final gameplay until branch coverage, balance, localization, and playtest evidence pass.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 963, risk: 'medium',
  },
  {
    id: 'ecs-dots-system',
    label: 'DOTS-style ECS runtime',
    domain: 'systems',
    status: 'worker-held',
    modulePath: 'lib/ecs-dots-system.ts',
    targetSurface: 'Level Studio systems readiness',
    userValue: 'World, component registry, scheduler, and job system readiness can support serious game simulation without browser-thread surprises.',
    nextAction: 'Expose scheduler/component summaries; keep job execution worker-held until traces and playtests are recorded.',
    limitation: 'Broad ECS jobs can silently freeze sessions; never run them in public/dashboard/default Studio bundles.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 960, risk: 'high',
  },
  {
    id: 'level-streaming-system',
    label: 'Level streaming runtime',
    domain: 'world',
    status: 'worker-held',
    modulePath: 'lib/streaming/level-streaming-system.tsx',
    targetSurface: 'Level Studio streaming readiness',
    userValue: 'Loaded levels, memory pressure, transitions, and cache state become visible before users build larger worlds.',
    nextAction: 'Expose streaming readiness and keep load/unload execution worker or sidecar held.',
    limitation: 'Streaming claims require chunk budgets, memory pressure evidence, transition traces, and rollback readiness.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 959, risk: 'high',
  },
  {
    id: 'networking-multiplayer',
    label: 'Multiplayer netcode runtime',
    domain: 'network',
    status: 'worker-held',
    modulePath: 'lib/networking-multiplayer.ts',
    targetSurface: 'Level Studio multiplayer readiness',
    userValue: 'Network client, prediction, rollback, WebRTC, and matchmaking become auditable before any live gameplay promise.',
    nextAction: 'Expose latency, authority, and rollback readiness; keep live rooms sandbox or staging held.',
    limitation: 'Multiplayer quality depends on server authority, latency traces, rollback evidence, and abuse controls.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 958, risk: 'high',
  },
  {
    id: 'foliage-system',
    label: 'Foliage density runtime',
    domain: 'world',
    status: 'adapter-needed',
    modulePath: 'lib/foliage-system.ts',
    targetSurface: 'Foliage Studio density evidence',
    userValue: 'Instanced foliage, grass, trees, clusters, and painting become quality-controlled instead of just decorative code.',
    nextAction: 'Expose instance, LOD, culling, and frame-trace readiness before dense foliage applies to scenes.',
    limitation: 'Dense foliage can dominate GPU cost; keep it render-gated until culling and performance evidence exist.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 947, risk: 'high',
  },
  {
    id: 'virtual-texture-system',
    label: 'Virtual texture runtime',
    domain: 'render',
    status: 'worker-held',
    modulePath: 'lib/virtual-texture-system.ts',
    targetSurface: 'Material Studio texture budget',
    userValue: 'Large material sets can expose tile cache, feedback buffer, and memory budget evidence before heavy texture work runs.',
    nextAction: 'Expose tile/cache summaries and keep streaming/feedback execution worker-held.',
    limitation: 'Virtual textures require cache-hit, memory, and render-trace evidence before high-resolution material claims.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 926, risk: 'high',
  },
  {
    id: 'ai-audio-engine',
    label: 'AI emotional audio runtime',
    domain: 'film',
    status: 'ready-to-wire',
    modulePath: 'lib/ai-audio-engine.ts',
    targetSurface: 'Audio Studio emotion review',
    userValue: 'Emotional score, context, and adaptive audio logic become evidence-backed instead of hidden generation magic.',
    nextAction: 'Expose emotion/context summaries and hold output until consent, mix, and human audio review exist.',
    limitation: 'AI audio is taste and consent sensitive; agents prepare evidence, humans approve final use.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 899, risk: 'medium',
  },
  {
    id: 'day-night-cycle',
    label: 'Day/night cycle runtime',
    domain: 'world',
    status: 'ready-to-wire',
    modulePath: 'lib/environment/day-night-cycle.tsx',
    targetSurface: 'Scene Studio environment timeline',
    userValue: 'Time of day, season, sky, sun direction, and lighting transitions become auditable world-building evidence.',
    nextAction: 'Expose time/sky summaries and require lighting/performance/playtest evidence before world claims.',
    limitation: 'Time-based state affects gameplay and rendering; keep transitions reviewed and trace-backed.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 894, risk: 'medium',
  },
  {
    id: 'asset-import-pipeline-legacy',
    label: 'Asset import pipeline boundary',
    domain: 'assets',
    status: 'worker-held',
    modulePath: 'lib/asset-import-pipeline.ts',
    targetSurface: 'Level Studio import governance',
    userValue: 'Legacy format support and import progress can feed the same provenance, checksum, and quality ledger as the canonical importer.',
    nextAction: 'Expose supported formats and option summaries; route heavy conversion through worker or Studio Local.',
    limitation: 'Raw imports are never final; license, LOD, PBR, collision/navmesh, performance, and review evidence are mandatory.',
    loadStrategy: 'worker-or-sidecar',
    estimatedLoc: 882, risk: 'high',
  },
  {
    id: 'browser-audio-engine',
    label: 'Browser audio engine',
    domain: 'systems',
    status: 'ready-to-wire',
    modulePath: 'lib/audio-engine.ts',
    targetSurface: 'Audio Studio playback boundary',
    userValue: 'Tracks, channels, effects, and playback state become mix evidence without surprising autoplay behavior.',
    nextAction: 'Expose channel/mix summaries and keep playback user-initiated with peak-level review.',
    limitation: 'Browser audio must respect autoplay, accessibility, and human mix review before final claims.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 849, risk: 'medium',
  },
  {
    id: 'post-process-volume',
    label: 'Post-process volume runtime',
    domain: 'render',
    status: 'adapter-needed',
    modulePath: 'lib/post-process-volume.ts',
    targetSurface: 'Scene Studio shot volumes',
    userValue: 'Shot and zone-specific post-processing can be reviewed as a governed quality layer for games and films.',
    nextAction: 'Expose volume priority/blend summaries and require shot performance traces before final render claims.',
    limitation: 'Post-process volumes can hide GPU cost; keep them review-quality until trace and human visual review pass.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 845, risk: 'medium',
  },
  {
    id: 'aaa-material-system',
    label: 'AAA material system',
    domain: 'assets',
    status: 'adapter-needed',
    modulePath: 'lib/aaa-material-system.ts',
    targetSurface: 'Material Studio PBR evidence',
    userValue: 'Advanced PBR, material library, and shader graph compilation become visible quality gates for assets and scenes.',
    nextAction: 'Expose PBR completeness, texture license, shader preview, and performance evidence before material finalization.',
    limitation: 'Material quality is not final without texture provenance, PBR completeness, shader preview, and performance traces.',
    loadStrategy: 'summary-adapter',
    estimatedLoc: 844, risk: 'high',
  },
]

export function getEngineSpineSummary() {
  const totalLoc = ENGINE_SPINE_MODULES.reduce((sum, engineModule) => sum + engineModule.estimatedLoc, 0)
  const ready = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'ready-to-wire').length
  const held = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'worker-held').length
  const adapterNeeded = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'adapter-needed').length
  const heavyHeld = ENGINE_SPINE_MODULES.filter((engineModule) =>
    engineModule.loadStrategy === 'worker-or-sidecar' || engineModule.loadStrategy === 'native-or-cloud'
  ).length

  return {
    totalModules: ENGINE_SPINE_MODULES.length,
    totalLoc,
    ready,
    held,
    adapterNeeded,
    heavyHeld,
  }
}

export function getEngineSpineModulesByIds(ids: readonly string[]) {
  const wanted = new Set(ids)
  return ENGINE_SPINE_MODULES.filter((engineModule) => wanted.has(engineModule.id))
}

function countLoc(modules: readonly EngineSpineModule[]) {
  return modules.reduce((sum, engineModule) => sum + engineModule.estimatedLoc, 0)
}

function countHighRisk(modules: readonly EngineSpineModule[]) {
  return modules.filter((engineModule) => engineModule.risk === 'high').length
}

export function getEngineSpineDecisionMatrix(groupBy: 'domain' | 'status' | 'loadStrategy' = 'domain'): EngineSpineDecisionMatrixRow[] {
  const labels: Record<string, string> = {
    render: 'Render',
    world: 'World',
    film: 'Film',
    systems: 'Systems',
    network: 'Network',
    assets: 'Assets',
    native: 'Native',
    visible: 'Visible',
    'ready-to-wire': 'Ready to wire',
    'adapter-needed': 'Adapter needed',
    'worker-held': 'Worker held',
    'already-visible': 'Already visible',
    'dynamic-client-only': 'Dynamic client only',
    'summary-adapter': 'Summary adapter',
    'worker-or-sidecar': 'Worker or sidecar',
    'native-or-cloud': 'Native or cloud',
  }
  const grouped = new Map<string, EngineSpineModule[]>()

  for (const engineModule of ENGINE_SPINE_MODULES) {
    const key = engineModule[groupBy]
    grouped.set(key, [...(grouped.get(key) ?? []), engineModule])
  }

  return [...grouped.entries()]
    .map(([key, modules]) => ({
      key,
      label: labels[key] ?? key,
      modules,
      totalLoc: countLoc(modules),
      highRisk: countHighRisk(modules),
    }))
    .sort((left, right) => right.highRisk - left.highRisk || right.totalLoc - left.totalLoc || left.label.localeCompare(right.label))
}

export function getEngineSpinePriorityModules(limit = 6): EngineSpineModule[] {
  const statusWeight: Record<EngineSpineStatus, number> = {
    'worker-held': 40,
    'adapter-needed': 30,
    'ready-to-wire': 20,
    visible: 5,
  }
  const riskWeight: Record<EngineSpineModule['risk'], number> = {
    high: 30,
    medium: 15,
    low: 5,
  }
  const loadWeight: Record<EngineSpineLoadStrategy, number> = {
    'worker-or-sidecar': 16,
    'native-or-cloud': 14,
    'summary-adapter': 10,
    'dynamic-client-only': 7,
    'already-visible': 0,
  }

  return [...ENGINE_SPINE_MODULES]
    .sort((left, right) => {
      const rightScore = statusWeight[right.status] + riskWeight[right.risk] + loadWeight[right.loadStrategy] + right.estimatedLoc / 1000
      const leftScore = statusWeight[left.status] + riskWeight[left.risk] + loadWeight[left.loadStrategy] + left.estimatedLoc / 1000
      return rightScore - leftScore || right.estimatedLoc - left.estimatedLoc || left.label.localeCompare(right.label)
    })
    .slice(0, limit)
}

export function getEngineSpineReadinessModel(): EngineSpineReadinessModel {
  const summary = getEngineSpineSummary()
  const workerHeld = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'worker-held')
  const adapterNeeded = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'adapter-needed')
  const blockers: string[] = []

  if (workerHeld.length > 0) {
    blockers.push(`${workerHeld.length} module(s) require worker, sidecar, native, or cloud boundaries before execution.`)
  }
  if (adapterNeeded.length > 0) {
    blockers.push(`${adapterNeeded.length} module(s) need read-only adapters before product writes are safe.`)
  }
  if (summary.heavyHeld > 0) {
    blockers.push(`${summary.heavyHeld} heavy module(s) must not be loaded directly in public, dashboard, or default Studio bundles.`)
  }

  if (workerHeld.length > 0) {
    return {
      state: 'worker-held',
      label: 'Worker held',
      summary: 'The engine spine is valuable, but high-risk modules are still held behind runtime boundaries.',
      blockers,
      nextAction: 'Build read-only adapters first, then route heavy execution through worker, sidecar, Studio Local, or Cloud Stream capabilities.',
    }
  }

  if (adapterNeeded.length > 0) {
    return {
      state: 'needs-adapters',
      label: 'Needs adapters',
      summary: 'The next safe move is adapter exposure, not direct runtime execution.',
      blockers,
      nextAction: 'Expose owner surface, evidence signals, and rollback contract for each module before enabling agent writes.',
    }
  }

  if (summary.ready > 0) {
    return {
      state: 'needs-review',
      label: 'Needs review',
      summary: 'Ready modules can be surfaced, but still require evidence review before writes or exports.',
      blockers,
      nextAction: 'Wire read-only panels into their Studio surfaces and keep mutations review-gated.',
    }
  }

  return {
    state: 'ready',
    label: 'Ready',
    summary: 'All tracked modules have visible boundaries.',
    blockers,
    nextAction: 'Keep gates active and only expand runtime execution when capability evidence exists.',
  }
}
