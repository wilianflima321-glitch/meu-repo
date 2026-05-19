export type EngineSpineDomain = 'render' | 'world' | 'film' | 'systems' | 'network' | 'assets'
export type EngineSpineStatus = 'visible' | 'ready-to-wire' | 'adapter-needed' | 'worker-held'

export interface EngineSpineModule {
  id: string
  label: string
  domain: EngineSpineDomain
  status: EngineSpineStatus
  modulePath: string
  targetSurface: string
  userValue: string
  nextAction: string
  estimatedLoc: number
  risk: 'low' | 'medium' | 'high'
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
    estimatedLoc: 1180,
    risk: 'low',
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
    estimatedLoc: 1147,
    risk: 'medium',
  },
]

export function getEngineSpineSummary() {
  const totalLoc = ENGINE_SPINE_MODULES.reduce((sum, module) => sum + module.estimatedLoc, 0)
  const ready = ENGINE_SPINE_MODULES.filter((module) => module.status === 'ready-to-wire').length
  const held = ENGINE_SPINE_MODULES.filter((module) => module.status === 'worker-held').length
  const adapterNeeded = ENGINE_SPINE_MODULES.filter((module) => module.status === 'adapter-needed').length

  return {
    totalModules: ENGINE_SPINE_MODULES.length,
    totalLoc,
    ready,
    held,
    adapterNeeded,
  }
}

export function getEngineSpineModulesByIds(ids: readonly string[]) {
  const wanted = new Set(ids)
  return ENGINE_SPINE_MODULES.filter((module) => wanted.has(module.id))
}
