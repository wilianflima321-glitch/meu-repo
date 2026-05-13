export type EngineModuleDecision = 'wire' | 'retire' | 'monitor'
export type EngineModuleRisk = 'dead-code' | 'parallel-runtime' | 'creative-gap' | 'bundle-risk'

export interface EngineModuleIntegrationDecision {
  modulePath: string
  decision: EngineModuleDecision
  ownerSurface: string
  reason: string
  risks: EngineModuleRisk[]
  acceptanceCriteria: string[]
}

export const ENGINE_MODULE_INTEGRATION_DECISIONS: EngineModuleIntegrationDecision[] = [
  {
    modulePath: 'lib/engine/sequencer-cinematics.ts',
    decision: 'wire',
    ownerSurface: '/studio/film',
    reason: 'Film Studio needs the canonical shot, keyframe, and render evidence logic instead of a UI-only timeline.',
    risks: ['creative-gap', 'dead-code'],
    acceptanceCriteria: [
      'DirectorMode and VideoTimelineEditor can request sequencer summaries from the shared module.',
      'Render Queue evidence links include shot/sequence identifiers.',
    ],
  },
  {
    modulePath: 'lib/engine/post-processing-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Viewport quality depends on Bloom, SSAO, tone mapping, and outline presets being runtime contracts, not ad-hoc component props.',
    risks: ['creative-gap', 'bundle-risk'],
    acceptanceCriteria: [
      'Viewport quality presets are mapped to post-processing contracts.',
      'Heavy presets route through render readiness checks before cinematic output.',
    ],
  },
  {
    modulePath: 'lib/particles/particle-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/vfx',
    reason: 'Niagara-style VFX must use the shared particle contract before agents can generate effects safely.',
    risks: ['creative-gap', 'dead-code'],
    acceptanceCriteria: [
      'NiagaraVFX can create particle presets from the shared system.',
      'Generated VFX records validation evidence before scene apply.',
    ],
  },
  {
    modulePath: 'lib/ai/behavior-tree-system.ts',
    decision: 'wire',
    ownerSurface: '/studio/level',
    reason: 'Gameplay agents and NPC authoring need behavior-tree contracts connected to scene validation and playtest evidence.',
    risks: ['creative-gap', 'parallel-runtime'],
    acceptanceCriteria: [
      'Gameplay Graph references behavior-tree nodes before NPC generation is marked done.',
      'Playtest evidence links behavior-tree decisions to failures and fixes.',
    ],
  },
  {
    modulePath: 'lib/engine/skeletal-animation.ts',
    decision: 'wire',
    ownerSurface: '/studio/rig',
    reason: 'Control Rig and Facial Animation need one animation authority for retargeting, constraints, and review packets.',
    risks: ['creative-gap', 'dead-code'],
    acceptanceCriteria: [
      'ControlRigEditor imports skeletal-animation contracts for rig validation.',
      'FacialAnimationEditor records animation review evidence before export.',
    ],
  },
  {
    modulePath: 'lib/engine/world-partition.ts',
    decision: 'wire',
    ownerSurface: '/studio/landscape',
    reason: 'Large worlds require streaming/partition contracts to avoid browser stalls and hallucinated world state.',
    risks: ['creative-gap', 'parallel-runtime'],
    acceptanceCriteria: [
      'Landscape and terrain surfaces can request partition plans before world generation.',
      'Repository Cartography stores world partition summaries instead of raw world dumps.',
    ],
  },
  {
    modulePath: 'lib/collaboration/collaboration-realtime.ts',
    decision: 'retire',
    ownerSurface: 'native-yjs',
    reason: 'Native MonacoBinding and Yjs awareness now own realtime collaboration; parallel realtime abstractions increase collision risk.',
    risks: ['parallel-runtime', 'dead-code'],
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
    if (item.acceptanceCriteria.length < 2) failures.push(`${item.modulePath}: needs at least two acceptance criteria`)
    if (item.decision === 'wire' && !item.ownerSurface.startsWith('/studio/')) {
      failures.push(`${item.modulePath}: wired modules must point to a Studio surface`)
    }
  }
  return failures
}
