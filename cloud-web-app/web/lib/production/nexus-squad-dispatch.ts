/**
 * Focus 1A — Nexus squad dispatch (parallel MoA specialist swarm).
 * Orchestrates multi-file AI apply tasks across specialized roles.
 *
 * J.2 — also resolves which Onda J creative operator (GraphOperator / VideoToMechanic /
 * UsdIntegrator / BrowserOperator / LiveVoice) a mission prompt routes to, so Nexus UI
 * chrome (`AIChatActivityDeck`) can render the correct honesty receipt instead of the
 * generic code-mission board.
 */

import { adaptiveMoAWidth, type ApexTaskDomain } from '@/lib/ai/fusion-specialist-registry'
import type { ChewedWorkerTask, MaestroDelegationPlan } from '@/lib/production/maestro-delegation'
import type { GraphOperatorTarget } from '@/lib/production/graph-operator'

export interface NexusSquadTask {
  taskId: string
  role: 'critical' | 'peripheral' | 'specialist'
  intent: string
  allowedPaths: string[]
}

export interface NexusSquadInput {
  missionId?: string
  maestroModelId?: string
  planId?: string
  userPrompt?: string
  targetFilePath?: string
  allowedPaths?: string[]
  riskScore?: number
  projectMemoryDigestId?: string
  lawsPackId?: string
  contextPackId?: string
}

/**
 * J.2 creative-operator routing hint. `'none'` means the mission is a regular code/asset
 * task with no Onda J creative operator involved — Nexus UI renders the generic board.
 */
export type NexusCreativeOperatorHint =
  | { kind: 'graph-operator'; target: GraphOperatorTarget }
  | { kind: 'video-to-mechanic' }
  | { kind: 'usd-integrator' }
  | { kind: 'browser-operator' }
  | { kind: 'live-voice' }
  | { kind: 'none' }

export interface NexusSquadResult {
  dispatched: boolean
  taskCount: number
  squadLetter: string
  maestro: MaestroDelegationPlan
  nucleusRole: string
  peripheralRoles: string[]
  /** J.2 — resolved creative operator for this mission prompt (`{ kind: 'none' }` for plain code tasks) */
  creativeOperator: NexusCreativeOperatorHint
  /** Adaptive MoA generator width for the nucleus task (mirrors `criticalTask.generatorWidth`) */
  recommendedMoAWidth: 1 | 2 | 3
}

const SOUND_CUE_RE = /sound\s*cue|footstep|foley\b/i
const VFX_RE = /\bvfx\b|particle\s*burst|visual\s*effect/i
const BEHAVIOR_TREE_RE = /behavior\s*tree|\bbt\b\s*(action|node|stub)/i
const VISUAL_SCRIPT_RE = /visual\s*script|blueprint|node\s*graph/i
const GRAPH_OPERATOR_HINT_RE = /wire.*(node|graph)|graph\s*operator/i

const VIDEO_TO_MECHANIC_RE = /video[\s-]*to[\s-]*mechanic|extract.*(scaffold|mechanic).*video|video.*(scaffold|behavior tree)/i
const USD_INTEGRATOR_RE = /\busd\b|usdz|megascans|library\s*placement|usd\s*integrator/i
const BROWSER_OPERATOR_RE = /browser\s*operator|governed\s*fetch|web\s*research|research.*allowlist/i
const LIVE_VOICE_RE = /live\s*voice|push-to-talk|voice\s*direction/i

function resolveGraphOperatorTarget(prompt: string): GraphOperatorTarget {
  if (SOUND_CUE_RE.test(prompt)) return 'sound-cue'
  if (VFX_RE.test(prompt)) return 'vfx'
  if (BEHAVIOR_TREE_RE.test(prompt)) return 'behavior-tree'
  return 'visual-script'
}

/**
 * J.2 — keyword-routes a mission prompt to the Onda J creative operator it targets.
 * Order matters: LiveVoice / BrowserOperator / VideoToMechanic / UsdIntegrator phrases
 * are checked before the generic GraphOperator patterns so an unambiguous mission
 * (e.g. "Run LiveVoice push-to-talk direction…") never falls through to a graph target.
 */
export function resolveNexusCreativeOperatorHint(prompt: string | undefined): NexusCreativeOperatorHint {
  const text = prompt ?? ''
  if (LIVE_VOICE_RE.test(text)) return { kind: 'live-voice' }
  if (BROWSER_OPERATOR_RE.test(text)) return { kind: 'browser-operator' }
  if (VIDEO_TO_MECHANIC_RE.test(text)) return { kind: 'video-to-mechanic' }
  if (USD_INTEGRATOR_RE.test(text)) return { kind: 'usd-integrator' }
  if (
    SOUND_CUE_RE.test(text) ||
    VFX_RE.test(text) ||
    BEHAVIOR_TREE_RE.test(text) ||
    VISUAL_SCRIPT_RE.test(text) ||
    GRAPH_OPERATOR_HINT_RE.test(text)
  ) {
    return { kind: 'graph-operator', target: resolveGraphOperatorTarget(text) }
  }
  return { kind: 'none' }
}

/** Apex domain a creative operator's task should route through (drives Fusion model selection). */
function domainForCreativeOperator(hint: NexusCreativeOperatorHint): ApexTaskDomain {
  switch (hint.kind) {
    case 'graph-operator':
      return hint.target === 'sound-cue' ? 'audio' : 'assets'
    case 'video-to-mechanic':
      return 'assets'
    case 'usd-integrator':
      return 'assets'
    case 'browser-operator':
      return 'docs'
    case 'live-voice':
      return 'audio'
    case 'none':
    default:
      return 'code'
  }
}

/** Law XVI / Trava I-III success criteria a mission's downstream Critic must uphold. */
function successCriteriaForCreativeOperator(hint: NexusCreativeOperatorHint): string[] {
  switch (hint.kind) {
    case 'graph-operator':
      return ['FusionTx commit', 'CostGuard settle', 'Critic REJECT on auto-physics/marketing']
    case 'video-to-mechanic':
      return ['FusionTx commit', 'CostGuard settle', 'No auto-physics (Trava III scaffold only)']
    case 'usd-integrator':
      return ['FusionTx commit', 'CostGuard settle', 'No proxy capsule shipped']
    case 'browser-operator':
      return ['CostGuard settle', 'Domain allowlist enforced', 'CDP farm HELD (governed fetch only)']
    case 'live-voice':
      return ['CostGuard settle', 'Duplex WebRTC HELD (push-to-talk/generate-play only)']
    case 'none':
    default:
      return ['L.5 PASS']
  }
}

function promptFromInput(input: NexusSquadInput | NexusSquadTask[]): string {
  return Array.isArray(input) ? input.map((t) => t.intent).join(' ') : (input.userPrompt ?? '')
}

export function dispatchNexusSquad(input: NexusSquadInput | NexusSquadTask[]): NexusSquadResult {
  const allowedPaths = Array.isArray(input)
    ? input.flatMap((t) => t.allowedPaths)
    : (input.allowedPaths ?? [input.targetFilePath ?? 'src/main.ts'])

  const planId = Array.isArray(input) ? undefined : input.planId
  const riskScore = Array.isArray(input) ? 50 : (input.riskScore ?? 50)
  const generatorWidth = adaptiveMoAWidth(riskScore, planId)

  const creativeOperator = resolveNexusCreativeOperatorHint(promptFromInput(input))
  const domain = domainForCreativeOperator(creativeOperator)
  const successCriteria = successCriteriaForCreativeOperator(creativeOperator)

  const criticalTask: ChewedWorkerTask = {
    taskId: 'task_critical_nucleus',
    domain,
    intent: Array.isArray(input) ? 'critical' : (input.userPrompt ?? 'Core synthesis'),
    allowedPaths: [allowedPaths[0] ?? 'src/main.ts'],
    successCriteria,
    riskScore,
    generatorWidth,
  }

  const peripheralTasks: ChewedWorkerTask[] = allowedPaths.slice(1).map((path, idx) => ({
    taskId: `task_peripheral_${idx}`,
    domain,
    intent: `Peripheral refinement for ${path}`,
    allowedPaths: [path],
    successCriteria: ['L.5 PASS'],
    riskScore: 30,
    generatorWidth: 1,
  }))

  const maestro: MaestroDelegationPlan = {
    missionId: Array.isArray(input) ? 'mission_squad' : (input.missionId ?? 'mission_default'),
    maestroModelId: Array.isArray(input) ? 'default' : (input.maestroModelId ?? 'default'),
    trivialBypass: false,
    criticalTask,
    peripheralTasks,
    projectMemoryDigestId: Array.isArray(input) ? 'mem_squad' : (input.projectMemoryDigestId ?? 'mem_default'),
    lawsPackId: Array.isArray(input) ? 'laws_default' : (input.lawsPackId ?? 'laws_default'),
    contextPackId: Array.isArray(input) ? 'ctx_default' : (input.contextPackId ?? 'ctx_default'),
  }

  return {
    dispatched: true,
    taskCount: 1 + peripheralTasks.length,
    squadLetter: 'cx',
    maestro,
    nucleusRole: 'Synthesizer Specialist',
    peripheralRoles: peripheralTasks.map((_, i) => `Peripheral Specialist #${i + 1}`),
    creativeOperator,
    recommendedMoAWidth: generatorWidth,
  }
}
