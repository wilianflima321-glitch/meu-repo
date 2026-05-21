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
    estimatedLoc: 1051,
    risk: 'medium',
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
    estimatedLoc: 1180,
    risk: 'low',
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
    estimatedLoc: 1244,
    risk: 'medium',
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
    estimatedLoc: 1200,
    risk: 'medium',
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
    estimatedLoc: 1083,
    risk: 'medium',
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
    estimatedLoc: 1160,
    risk: 'high',
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
    estimatedLoc: 1152,
    risk: 'low',
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
    estimatedLoc: 1143,
    risk: 'low',
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
    estimatedLoc: 1190,
    risk: 'medium',
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
    estimatedLoc: 1170,
    risk: 'high',
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
    estimatedLoc: 1194,
    risk: 'medium',
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
    estimatedLoc: 1200,
    risk: 'medium',
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
    estimatedLoc: 1192,
    risk: 'high',
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
    estimatedLoc: 1147,
    risk: 'medium',
  },
]

export function getEngineSpineSummary() {
  const totalLoc = ENGINE_SPINE_MODULES.reduce((sum, module) => sum + module.estimatedLoc, 0)
  const ready = ENGINE_SPINE_MODULES.filter((module) => module.status === 'ready-to-wire').length
  const held = ENGINE_SPINE_MODULES.filter((module) => module.status === 'worker-held').length
  const adapterNeeded = ENGINE_SPINE_MODULES.filter((module) => module.status === 'adapter-needed').length
  const heavyHeld = ENGINE_SPINE_MODULES.filter((module) =>
    module.loadStrategy === 'worker-or-sidecar' || module.loadStrategy === 'native-or-cloud'
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
  return ENGINE_SPINE_MODULES.filter((module) => wanted.has(module.id))
}

function countLoc(modules: readonly EngineSpineModule[]) {
  return modules.reduce((sum, module) => sum + module.estimatedLoc, 0)
}

function countHighRisk(modules: readonly EngineSpineModule[]) {
  return modules.filter((module) => module.risk === 'high').length
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

  for (const module of ENGINE_SPINE_MODULES) {
    const key = module[groupBy]
    grouped.set(key, [...(grouped.get(key) ?? []), module])
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
  const workerHeld = ENGINE_SPINE_MODULES.filter((module) => module.status === 'worker-held')
  const adapterNeeded = ENGINE_SPINE_MODULES.filter((module) => module.status === 'adapter-needed')
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
