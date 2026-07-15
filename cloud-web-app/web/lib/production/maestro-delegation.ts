/**
 * Decision #61 — Maestro Delegation plan builder (Focus 1A foundation)
 * Premium pin decomposes; critical nucleus kept; peripherals → MoA cells.
 */

import { adaptiveMoAWidth, type ApexTaskDomain } from '@/lib/ai/fusion-specialist-registry'

export interface ChewedWorkerTask {
  taskId: string
  domain: ApexTaskDomain
  intent: string
  allowedPaths: string[]
  successCriteria: string[]
  riskScore: number
  generatorWidth: 1 | 2 | 3
}

export interface MaestroDelegationPlan {
  missionId: string
  maestroModelId: string
  criticalTask: ChewedWorkerTask
  peripheralTasks: ChewedWorkerTask[]
  projectMemoryDigestId: string
  lawsPackId: string
  contextPackId: string
  trivialBypass: boolean
}

export function buildMaestroDelegationPlan(input: {
  missionId: string
  maestroModelId: string
  planId?: string
  projectMemoryDigestId: string
  lawsPackId: string
  contextPackId: string
  critical: Omit<ChewedWorkerTask, 'generatorWidth' | 'taskId'> & { taskId?: string }
  peripherals?: Array<Omit<ChewedWorkerTask, 'generatorWidth' | 'taskId'> & { taskId?: string }>
}): MaestroDelegationPlan {
  const peripherals = (input.peripherals ?? []).slice(0, 4)
  const trivialBypass =
    peripherals.length === 0 &&
    input.critical.riskScore < 25 &&
    input.critical.domain !== 'planning'

  const toTask = (
    t: Omit<ChewedWorkerTask, 'generatorWidth' | 'taskId'> & { taskId?: string },
    idx: number,
  ): ChewedWorkerTask => ({
    taskId: t.taskId ?? `task_${idx}_${t.domain}`,
    domain: t.domain,
    intent: t.intent,
    allowedPaths: t.allowedPaths,
    successCriteria: t.successCriteria,
    riskScore: t.riskScore,
    generatorWidth: adaptiveMoAWidth(t.riskScore, input.planId),
  })

  return {
    missionId: input.missionId,
    maestroModelId: input.maestroModelId,
    criticalTask: toTask(input.critical, 0),
    peripheralTasks: peripherals.map((p, i) => toTask(p, i + 1)),
    projectMemoryDigestId: input.projectMemoryDigestId,
    lawsPackId: input.lawsPackId,
    contextPackId: input.contextPackId,
    trivialBypass,
  }
}

/** Peripheral paths must be disjoint from nucleus and each other */
export function assertDisjointAllowedPaths(plan: MaestroDelegationPlan): {
  ok: boolean
  conflicts: string[]
} {
  const seen = new Map<string, string>()
  const conflicts: string[] = []
  const all = [plan.criticalTask, ...plan.peripheralTasks]
  for (const task of all) {
    for (const path of task.allowedPaths) {
      const prev = seen.get(path)
      if (prev && prev !== task.taskId) {
        conflicts.push(`${path} claimed by ${prev} and ${task.taskId}`)
      } else {
        seen.set(path, task.taskId)
      }
    }
  }
  return { ok: conflicts.length === 0, conflicts }
}
