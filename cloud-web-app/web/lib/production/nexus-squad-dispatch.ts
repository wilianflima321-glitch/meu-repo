/**
 * AI-v1-c / J.2 — NexusSquadDispatch (spec contract name).
 * Thin dispatcher over workforce topology + Maestro Delegation plan.
 * Does not invent a second orchestration — reuses shipped planners.
 * AI-v1-e: surfaces J.5 GraphOperator / J.6 VideoToMechanic / J.7 UsdIntegrator hooks.
 * AI-v1-f: surfaces J.8 BrowserOperator research hint.
 * AI-v1-g: surfaces J.10 LiveVoice direction hint.
 */

import {
  planAgentWorkforceForMission,
  type WorkforcePlan,
  type WorkforcePlanningInput,
} from '@/lib/production/agent-workforce-topology'
import {
  buildMaestroDelegationPlan,
  type MaestroDelegationPlan,
} from '@/lib/production/maestro-delegation'
import { adaptiveMoAWidth, type ApexTaskDomain } from '@/lib/ai/fusion-specialist-registry'
import type { GraphOperatorTarget } from '@/lib/production/graph-operator'

export type NexusCreativeOperatorHint =
  | { kind: 'graph-operator'; target: GraphOperatorTarget }
  | { kind: 'video-to-mechanic' }
  | { kind: 'usd-integrator' }
  | { kind: 'browser-operator' }
  | { kind: 'live-voice' }
  | { kind: 'none' }

export interface NexusSquadDispatchInput {
  missionId: string
  maestroModelId: string
  planId: string
  userPrompt: string
  targetFilePath: string
  allowedPaths?: string[]
  riskScore?: number
  projectMemoryDigestId?: string
  lawsPackId?: string
  contextPackId?: string
  workforce?: Partial<WorkforcePlanningInput>
}

export interface NexusSquadDispatchResult {
  workforce: WorkforcePlan
  maestro: MaestroDelegationPlan
  nucleusRole: string
  peripheralRoles: string[]
  recommendedMoAWidth: number
  /** AI-v1-e — which creative operator the Nexus UI should route through Bridge */
  creativeOperator: NexusCreativeOperatorHint
}

function mapDomain(missionType: WorkforcePlan['missionType']): ApexTaskDomain {
  if (missionType === 'game-production' || missionType === 'film-audio-production') {
    return 'world'
  }
  if (missionType === 'research-development') return 'docs'
  return 'code'
}

/**
 * Detect J.5–J.10 creative operator from mission text (Nexus UI routing hint).
 */
export function resolveNexusCreativeOperatorHint(userPrompt: string): NexusCreativeOperatorHint {
  const p = userPrompt.toLowerCase()
  if (/video\s*to\s*mechanic|video.?scaffold|clip\s*→\s*bt|state\s*machine\s*from\s*video/i.test(p)) {
    return { kind: 'video-to-mechanic' }
  }
  if (/usd\s*integrat|place\s*library\s*asset|megascans|tripo.?cook|meshy.?usd/i.test(p)) {
    return { kind: 'usd-integrator' }
  }
  if (
    /browser\s*operator|governed\s*(fetch|research)|web\s*research|evidence.?backed\s*research|allowlist\s*snapshot/i.test(
      p,
    )
  ) {
    return { kind: 'browser-operator' }
  }
  if (
    /live\s*voice|push[- ]?to[- ]?talk|governed\s*livevoice|generate[- ]?play\s*turn|voice\s*direction|waveform.*costguard|costguard.*waveform/i.test(
      p,
    )
  ) {
    return { kind: 'live-voice' }
  }
  if (/sound\s*cue|quest\s*graph|vfx\s*node|visual\s*script|behavior\s*tree|graph\s*operator/i.test(p)) {
    let target: GraphOperatorTarget = 'visual-script'
    if (/sound\s*cue|metasound/i.test(p)) target = 'sound-cue'
    else if (/quest/i.test(p)) target = 'quest'
    else if (/vfx/i.test(p)) target = 'vfx'
    else if (/behavior\s*tree|\bbt\b/i.test(p)) target = 'behavior-tree'
    return { kind: 'graph-operator', target }
  }
  return { kind: 'none' }
}

/**
 * Dispatch a Nexus squad plan: workforce selection + Maestro critical/peripheral split.
 */
export function dispatchNexusSquad(input: NexusSquadDispatchInput): NexusSquadDispatchResult {
  const risk = input.riskScore ?? 55
  const workforce = planAgentWorkforceForMission({
    mission: input.userPrompt,
    ...input.workforce,
  })

  const paths = input.allowedPaths?.length
    ? input.allowedPaths
    : [input.targetFilePath]
  const domain = mapDomain(workforce.missionType)
  const width = adaptiveMoAWidth(risk, input.planId)
  const creativeOperator = resolveNexusCreativeOperatorHint(input.userPrompt)

  const successCriteria =
    creativeOperator.kind === 'graph-operator'
      ? ['LazyInspector PASS', 'Graph Critic PASS', 'FusionTx commit', 'CostGuard settle']
      : creativeOperator.kind === 'video-to-mechanic'
        ? ['Trava III scaffold only', 'no auto-physics', 'FusionTx commit', 'CostGuard settle']
        : creativeOperator.kind === 'usd-integrator'
          ? ['no proxy capsule', 'USD viewer honesty', 'FusionTx commit', 'CostGuard settle']
          : creativeOperator.kind === 'browser-operator'
            ? [
                'allowlist sandbox',
                'governed fetch/snapshot',
                'evidence ledger receipt',
                'CostGuard settle',
                'CDP farm HELD honest',
              ]
            : creativeOperator.kind === 'live-voice'
              ? [
                  'push-to-talk generate-play',
                  'audible waveform + lipsync',
                  'evidence ledger receipt',
                  'CostGuard settle',
                  'duplex WebRTC HELD honest',
                ]
              : ['LazyInspector PASS', 'L.5 PASS', 'no TODO stubs']

  const maestro = buildMaestroDelegationPlan({
    missionId: input.missionId,
    maestroModelId: input.maestroModelId,
    planId: input.planId,
    projectMemoryDigestId: input.projectMemoryDigestId ?? `mem_${input.missionId}`,
    lawsPackId: input.lawsPackId ?? 'laws_default',
    contextPackId: input.contextPackId ?? 'ctx_default',
    critical: {
      domain,
      intent: input.userPrompt.slice(0, 2000),
      allowedPaths: paths.slice(0, 1),
      successCriteria,
      riskScore: risk,
    },
    peripherals:
      risk >= 70 && width > 1
        ? [
            {
              domain: 'tests',
              intent: `Add/adjust tests for: ${input.userPrompt.slice(0, 400)}`,
              allowedPaths: paths.slice(1, 2).length
                ? paths.slice(1, 2)
                : [`${paths[0]}.test.ts`],
              successCriteria: ['tests compile', 'LazyInspector PASS'],
              riskScore: Math.min(risk, 60),
            },
          ]
        : [],
  })

  return {
    workforce,
    maestro,
    nucleusRole: String(workforce.centralCoordinator),
    peripheralRoles: workforce.selectedAgents
      .filter((a) => a !== workforce.centralCoordinator)
      .slice(0, 6)
      .map(String),
    recommendedMoAWidth: width,
    creativeOperator,
  }
}
