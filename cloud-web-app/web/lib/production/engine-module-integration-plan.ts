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
    ownerSurface: '/studio/rig',
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
    ownerSurface: '/studio/facial',
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
    ownerSurface: '/studio/landscape',
    reason: 'Large worlds require streaming/partition contracts to avoid browser stalls and hallucinated world state.',
    risks: ['creative-gap', 'parallel-runtime'],
    status: 'adapter-wired',
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
