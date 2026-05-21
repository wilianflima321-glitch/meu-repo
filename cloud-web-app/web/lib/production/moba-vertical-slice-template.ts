import type { QualityOrchestrationPlan } from '@/lib/production/ai-quality-orchestrator'
import { buildMobaExampleScopePlan, type GameScopePlan } from '@/lib/production/game-scope-orchestrator'

export interface PlayableVerticalSliceTemplate {
  id: 'moba-vertical-slice:v1'
  label: 'MOBA example vertical slice'
  notFullGameClaim: true
  releaseState: 'held'
  genericScopePlan: GameScopePlan
  scope: {
    map: 'single-small-lane-arena'
    champions: 2
    minionWaves: true
    tower: true
    camera: 'locked-isometric'
    input: 'mouse-keyboard-baseline'
  }
  graphs: Array<{
    id: string
    ownerAgent: string
    requiredEvidence: string[]
  }>
  qualityPlans: QualityOrchestrationPlan[]
  blockers: string[]
  nextAction: string
}

export function buildMobaVerticalSliceTemplate(input: {
  budgetUsd?: number
  evidenceRefs?: string[]
} = {}): PlayableVerticalSliceTemplate {
  const genericScopePlan = buildMobaExampleScopePlan({
    budgetUsd: input.budgetUsd ?? 20,
    evidenceRefs: input.evidenceRefs ?? [],
    runtimeCapabilities: {
      'license-provenance-scanner': true,
    },
  })

  return {
    id: 'moba-vertical-slice:v1',
    label: 'MOBA example vertical slice',
    notFullGameClaim: true,
    releaseState: 'held',
    genericScopePlan,
    scope: {
      map: 'single-small-lane-arena',
      champions: 2,
      minionWaves: true,
      tower: true,
      camera: 'locked-isometric',
      input: 'mouse-keyboard-baseline',
    },
    graphs: [
      {
        id: 'design-bible',
        ownerAgent: 'Game Director Agent',
        requiredEvidence: ['champion fantasy sheet', 'match loop brief', 'scope cuts'],
      },
      {
        id: 'world-graph',
        ownerAgent: 'World Architect Agent',
        requiredEvidence: ['single lane arena layout', 'navmesh lanes', 'objective timing'],
      },
      {
        id: 'champion-graph',
        ownerAgent: 'Gameplay Systems Agent',
        requiredEvidence: ['2 champion kits', 'ability cooldown sheet', 'hitbox debug capture'],
      },
      {
        id: 'bot-playtest-graph',
        ownerAgent: 'QA Playtest Agent',
        requiredEvidence: ['bot playtest replay', 'win condition telemetry', 'bug ledger'],
      },
      {
        id: 'performance-graph',
        ownerAgent: 'Performance QA Agent',
        requiredEvidence: ['frame budget report', 'VRAM budget report', 'input latency trace'],
      },
      {
        id: 'release-graph',
        ownerAgent: 'Release Producer Agent',
        requiredEvidence: ['playable build artifact', 'rollback plan', 'human approval'],
      },
    ],
    qualityPlans: genericScopePlan.qualityPlans,
    blockers: [
      'This is one example preset, not the default product direction and not a complete MOBA game.',
      'Release is held until bot playtest, performance trace, provenance, rollback, and human approval exist.',
      'Studio Local sidecars are required before claiming optimized character or arena assets.',
      genericScopePlan.uxDisclosure,
    ],
    nextAction: 'Build the small playable arena first, then attach bot playtest and asset-quality evidence before expanding champion count.',
  }
}
