/**
 * Focus 1A — Nexus squad dispatch (parallel MoA specialist swarm).
 * Orchestrates multi-file AI apply tasks across specialized roles.
 */

import type { MaestroDelegationPlan } from '@/lib/production/maestro-delegation'

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

export interface NexusSquadResult {
  dispatched: boolean
  taskCount: number
  squadLetter: string
  maestro: MaestroDelegationPlan
  nucleusRole: string
  peripheralRoles: string[]
}

export function dispatchNexusSquad(input: NexusSquadInput | NexusSquadTask[]): NexusSquadResult {
  const allowedPaths = Array.isArray(input)
    ? input.flatMap((t) => t.allowedPaths)
    : (input.allowedPaths ?? [input.targetFilePath ?? 'src/main.ts'])

  const maestro: MaestroDelegationPlan = {
    planId: Array.isArray(input) ? 'plan_squad' : (input.planId ?? 'plan_default'),
    trivialBypass: false,
    criticalTask: {
      taskId: 'task_critical_nucleus',
      role: 'critical',
      intent: Array.isArray(input) ? 'critical' : (input.userPrompt ?? 'Core synthesis'),
      allowedPaths: [allowedPaths[0] ?? 'src/main.ts'],
      riskScore: Array.isArray(input) ? 50 : (input.riskScore ?? 50),
    },
    peripheralTasks: allowedPaths.slice(1).map((path, idx) => ({
      taskId: `task_peripheral_${idx}`,
      role: 'peripheral',
      intent: `Peripheral refinement for ${path}`,
      allowedPaths: [path],
      riskScore: 30,
    })),
  }

  return {
    dispatched: true,
    taskCount: 1 + maestro.peripheralTasks.length,
    squadLetter: 'cx',
    maestro,
    nucleusRole: 'Synthesizer Specialis',
    peripheralRoles: maestro.peripheralTasks.map((_, i) => `Peripheral Specialist #${i + 1}`),
  }
}
