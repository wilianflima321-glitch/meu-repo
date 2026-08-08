/**
 * Focus 1A / A1 — Apex code mission orchestrator (live).
 * Maestro plan → MoA cells (real LLM) → Auto-Heal (L.5) → APPLY candidate.
 * Free plan: width 1 via adaptiveMoAWidth. Premium pin does not solo peripherals.
 */

import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import { adaptiveMoAWidth } from '@/lib/ai/fusion-specialist-registry'
import {
  createCriticalFuseFn,
  createHealRepairFn,
  createL5ValidationFn,
  createMoAGeneratorFn,
  estimateMoASpendTokens,
} from '@/lib/ai/apex-moa-provider-adapters'
import { runApexMoACell } from '@/lib/production/apex-moa-orchestrator'
import { runAutoHealLoop, type AutoHealResult } from '@/lib/production/auto-heal-loop'
import {
  assertDisjointAllowedPaths,
  type MaestroDelegationPlan,
} from '@/lib/production/maestro-delegation'
import { dispatchNexusSquad } from '@/lib/production/nexus-squad-dispatch'
import {
  createNexusPhaseEvent,
  type NexusPhaseEvent,
} from '@/lib/production/nexus-mission-phases'
import type { L5VirtualFile } from '@/lib/production/project-l5-typecheck'
import type { ApexMoACellResult } from '@/lib/production/apex-moa-orchestrator'

const log = createComponentLogger('apex-mission-orchestrator')

export interface ApexMissionInput {
  userId: string
  planId: string
  maestroModelId: string
  userPrompt: string
  systemPrompt?: string
  /** Target file for L.5 overlay (required for heal) */
  targetFilePath: string
  allowedPaths?: string[]
  riskScore?: number
  ambientFiles?: L5VirtualFile[]
  maxHealRounds?: 1 | 2 | 3
  /** When false, skip Premium LLM fuse (deterministic only) */
  enableLlmFuse?: boolean
  lawsPackId?: string
  contextPackId?: string
  projectMemoryDigestId?: string
  /** J.2 — phase callback for Nexus UI chrome */
  onPhase?: (event: NexusPhaseEvent) => void
  /**
   * R19 — per-cell lifecycle for coordinator SSE (status only; not MoA token fan-in).
   * Cells run in parallel; events are unordered across peripherals.
   */
  onCell?: (event: ApexMissionCellProgressEvent) => void
}

export interface ApexMissionCellProgressEvent {
  taskId: string
  role: 'critical' | 'peripheral'
  status: 'started' | 'completed' | 'blocked'
  moaVerdict?: string
  healVerdict?: string
  healRounds?: number
}

export interface ApexMissionCellOutcome {
  taskId: string
  role: 'critical' | 'peripheral'
  moa: ApexMoACellResult
  heal?: AutoHealResult
  finalPatch?: string
}

export interface ApexMissionResult {
  missionId: string
  plan: MaestroDelegationPlan
  estimatedSpendTokens: number
  cells: ApexMissionCellOutcome[]
  verdict: 'APPLY' | 'BLOCK' | 'ESCALATE'
  supremePatch?: string
  reason?: string
  liveProvider: true
  /** J.2 phase timeline for Nexus UI */
  phases: NexusPhaseEvent[]
  nucleusRole?: string
  peripheralRoles?: string[]
}

function buildHeuristicPlan(input: ApexMissionInput, missionId: string): {
  plan: MaestroDelegationPlan
  nucleusRole: string
  peripheralRoles: string[]
} {
  const risk = input.riskScore ?? 55
  const paths = input.allowedPaths?.length ? input.allowedPaths : [input.targetFilePath]
  const dispatched = dispatchNexusSquad({
    missionId,
    maestroModelId: input.maestroModelId,
    planId: input.planId,
    userPrompt: input.userPrompt,
    targetFilePath: input.targetFilePath,
    allowedPaths: paths,
    riskScore: risk,
    projectMemoryDigestId: input.projectMemoryDigestId ?? `mem_${missionId}`,
    lawsPackId: input.lawsPackId ?? 'laws_default',
    contextPackId: input.contextPackId ?? 'ctx_default',
  })
  return {
    plan: dispatched.maestro,
    nucleusRole: dispatched.nucleusRole,
    peripheralRoles: dispatched.peripheralRoles,
  }
}

async function runCellWithHeal(input: {
  mission: ApexMissionInput
  taskId: string
  role: 'critical' | 'peripheral'
  intent: string
  riskScore: number
  filePath: string
  trivialBypass: boolean
}): Promise<ApexMissionCellOutcome> {
  input.mission.onCell?.({
    taskId: input.taskId,
    role: input.role,
    status: 'started',
  })

  const generate = createMoAGeneratorFn()
  const fuseFn =
    input.mission.enableLlmFuse === false
      ? undefined
      : adaptiveMoAWidth(input.riskScore, input.mission.planId) >= 2
        ? createCriticalFuseFn({ fuseModelId: input.trivialBypass ? 'apex-fast-ow' : input.mission.maestroModelId })
        : undefined

  let lazyRejectCount = 0
  let moa = await runApexMoACell({
    job: {
      parentMissionId: undefined,
      taskDomain: 'code',
      prompt: input.intent,
      systemPrompt: input.mission.systemPrompt,
      planId: input.mission.planId,
      riskScore: input.riskScore,
      lawsPackId: input.mission.lawsPackId ?? 'laws_default',
      contextPackId: input.mission.contextPackId ?? 'ctx_default',
      projectMemoryDigestId: input.mission.projectMemoryDigestId ?? 'mem',
      maxHealRounds: input.mission.maxHealRounds ?? 3,
    },
    generate,
    fuseFn,
    lazyRejectCount,
  })

  // One Lazy retry with settle:0 semantics (caller settles zero on final BLOCK)
  if (moa.verdict === 'LAZY_RETRY') {
    lazyRejectCount = (moa.lazy?.lazyRejectCount ?? 0) + 1
    moa = await runApexMoACell({
      job: {
        taskDomain: 'code',
        prompt: `${input.intent}\n\nPrevious output was REJECTED as lazy. Rewrite with full implementation.`,
        systemPrompt: input.mission.systemPrompt,
        planId: input.mission.planId,
        riskScore: input.riskScore,
        lawsPackId: input.mission.lawsPackId ?? 'laws_default',
        contextPackId: input.mission.contextPackId ?? 'ctx_default',
        projectMemoryDigestId: input.mission.projectMemoryDigestId ?? 'mem',
      },
      generate,
      fuseFn,
      lazyRejectCount,
    })
  }

  if (moa.verdict !== 'CANDIDATE' || !moa.supremePatch) {
    input.mission.onCell?.({
      taskId: input.taskId,
      role: input.role,
      status: 'blocked',
      moaVerdict: moa.verdict,
    })
    return { taskId: input.taskId, role: input.role, moa }
  }

  const heal = await runAutoHealLoop({
    initialPatch: moa.supremePatch,
    validate: createL5ValidationFn({
      filePath: input.filePath,
      ambientFiles: input.mission.ambientFiles,
    }),
    repair: createHealRepairFn({ repairModelId: input.trivialBypass ? 'apex-fast-ow' : input.mission.maestroModelId }),
    maxRounds: input.mission.maxHealRounds ?? 3,
    systemPrompt: input.mission.systemPrompt,
    escalateOnExhaust: input.role === 'critical',
  })

  const outcome: ApexMissionCellOutcome = {
    taskId: input.taskId,
    role: input.role,
    moa,
    heal,
    finalPatch: heal.verdict === 'APPLY' ? heal.finalPatch : moa.supremePatch,
  }
  input.mission.onCell?.({
    taskId: input.taskId,
    role: input.role,
    status: heal.verdict === 'APPLY' ? 'completed' : 'blocked',
    moaVerdict: moa.verdict,
    healVerdict: heal.verdict,
    healRounds: heal.turns.length,
  })
  return outcome
}

/**
 * Run a live Apex code mission. Caller must reserve spend via estimateMoASpendTokens first.
 */
export async function runApexCodeMission(input: ApexMissionInput): Promise<ApexMissionResult> {
  const missionId = randomUUID()
  const phases: NexusPhaseEvent[] = []
  const emit = (phase: Parameters<typeof createNexusPhaseEvent>[0], detail?: string) => {
    const event = createNexusPhaseEvent(phase, detail)
    phases.push(event)
    input.onPhase?.(event)
  }

  emit('maestro_planning')
  const { plan, nucleusRole, peripheralRoles } = buildHeuristicPlan(input, missionId)
  const pathsOk = assertDisjointAllowedPaths(plan)
  if (!pathsOk.ok) {
    log.warn('mission_path_conflict', { missionId, conflicts: pathsOk.conflicts })
    emit('blocked', pathsOk.conflicts.join('; '))
    return {
      missionId,
      plan,
      estimatedSpendTokens: 0,
      cells: [],
      verdict: 'BLOCK',
      reason: `allowedPaths conflict: ${pathsOk.conflicts.join('; ')}`,
      liveProvider: true,
      phases,
      nucleusRole,
      peripheralRoles,
    }
  }

  // Premium pin must NOT solo peripherals — run them in parallel MoA cells
  const estimatedSpendTokens = estimateMoASpendTokens({
    width: adaptiveMoAWidth(input.riskScore ?? 55, input.planId),
    peripheralCount: plan.peripheralTasks.length,
    maxHealRounds: input.maxHealRounds ?? 3,
  })

  log.info('apex_mission_start', {
    missionId,
    planId: input.planId,
    trivialBypass: plan.trivialBypass,
    peripherals: plan.peripheralTasks.length,
    estimatedSpendTokens,
  })

  emit(
    'swarm_parallel',
    `${1 + plan.peripheralTasks.length} cell(s); nucleus=${nucleusRole}`,
  )

  const criticalPath = plan.criticalTask.allowedPaths[0] ?? input.targetFilePath
  const criticalPromise = runCellWithHeal({
    mission: input,
    taskId: plan.criticalTask.taskId,
    role: 'critical',
    intent: plan.criticalTask.intent,
    riskScore: plan.criticalTask.riskScore,
    filePath: criticalPath,
    trivialBypass: plan.trivialBypass,
  })

  const peripheralPromises = plan.peripheralTasks.map((task) =>
    runCellWithHeal({
      mission: input,
      taskId: task.taskId,
      role: 'peripheral',
      intent: task.intent,
      riskScore: task.riskScore,
      filePath: task.allowedPaths[0] ?? `${criticalPath}.peripheral.ts`,
      trivialBypass: plan.trivialBypass,
    }),
  )

  const [critical, ...peripherals] = await Promise.all([criticalPromise, ...peripheralPromises])
  const cells = [critical, ...peripherals]

  emit('healing', `critical heal rounds ≤${input.maxHealRounds ?? 3}`)

  if (critical.moa.verdict === 'BLOCK' || critical.moa.verdict === 'LAZY_RETRY') {
    emit('blocked', 'Critical MoA cell blocked by LazyInspector')
    return {
      missionId,
      plan,
      estimatedSpendTokens,
      cells,
      verdict: 'BLOCK',
      reason: 'Critical MoA cell blocked by LazyInspector',
      liveProvider: true,
      phases,
      nucleusRole,
      peripheralRoles,
    }
  }

  if (!critical.heal || critical.heal.verdict !== 'APPLY') {
    const verdict = critical.heal?.verdict === 'ESCALATE' ? 'ESCALATE' : 'BLOCK'
    emit(verdict === 'ESCALATE' ? 'escalated' : 'blocked', critical.heal?.reason)
    return {
      missionId,
      plan,
      estimatedSpendTokens,
      cells,
      verdict,
      reason: critical.heal?.reason ?? 'Critical L.5 heal did not PASS',
      supremePatch: critical.finalPatch,
      liveProvider: true,
      phases,
      nucleusRole,
      peripheralRoles,
    }
  }

  emit('apply', 'L.5 PASS — candidate ready (not auto-applied as silent success)')
  return {
    missionId,
    plan,
    estimatedSpendTokens,
    cells,
    verdict: 'APPLY',
    supremePatch: critical.heal.finalPatch,
    liveProvider: true,
    phases,
    nucleusRole,
    peripheralRoles,
  }
}

export { estimateMoASpendTokens }
