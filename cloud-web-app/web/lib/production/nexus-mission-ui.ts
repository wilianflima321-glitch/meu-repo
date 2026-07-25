/**
 * AI-v1-c — Map ApexMissionResult → NexusMissionUiPayload for chat chrome.
 */

import type { ApexMissionResult } from '@/lib/production/apex-mission-orchestrator'
import {
  createNexusPhaseEvent,
  nexusPhaseLabel,
  resolveTerminalPhase,
  type NexusCellUi,
  type NexusMissionUiPayload,
  type NexusPhaseEvent,
} from '@/lib/production/nexus-mission-phases'
import { capturePatchHashEvidence } from '@/lib/production/visual-evidence-capture'

export function buildNexusMissionUiPayload(
  mission: ApexMissionResult,
  phases: NexusPhaseEvent[],
  fusion?: {
    fusionTransactionId?: string
    snapshotHashBefore?: string
    snapshotHashAfter?: string
  },
): NexusMissionUiPayload {
  const terminal = resolveTerminalPhase(mission.verdict)

  const cells: NexusCellUi[] = mission.cells.map((cell) => {
    const blocked =
      cell.moa.verdict === 'BLOCK' ||
      cell.moa.verdict === 'LAZY_RETRY' ||
      (cell.heal && cell.heal.verdict !== 'APPLY')
    const role = cell.role === 'critical' ? 'nucleus' : 'peripheral'
    return {
      taskId: cell.taskId,
      role,
      domainLabel: cell.role === 'critical' ? 'Nucleus (Maestro)' : 'Peripheral (Swarm)',
      status: blocked ? 'blocked' : mission.verdict === 'APPLY' ? 'completed' : 'working',
      moaVerdict: cell.moa.verdict,
      healVerdict: cell.heal?.verdict,
      healRounds: cell.heal?.turns.length ?? 0,
      // CW6 honesty: ApexMissionCellOutcome has no real dependency DAG (J.11 STOPPED).
      // Do not invent peripheral→nucleus edges as a cosmetic task graph.
      dependsOnTaskIds: [],
    }
  })

  const visual = mission.supremePatch
    ? capturePatchHashEvidence({ after: mission.supremePatch, label: mission.missionId })
    : {
        status: 'HELD' as const,
        kind: 'patch_hash' as const,
        refs: [],
        message: 'No patch candidate — visual evidence not attached.',
        contentHash: '',
      }

  return {
    missionId: mission.missionId,
    currentPhase: terminal,
    phaseLabel: nexusPhaseLabel(terminal),
    phases:
      phases.length > 0
        ? phases
        : [
            createNexusPhaseEvent('maestro_planning'),
            createNexusPhaseEvent('swarm_parallel'),
            createNexusPhaseEvent('healing'),
            createNexusPhaseEvent(terminal, mission.reason),
          ],
    cells,
    verdict: mission.verdict,
    blockedReason:
      mission.verdict === 'APPLY' ? undefined : mission.reason || 'Mission did not PASS L.5',
    estimatedSpendTokens: mission.estimatedSpendTokens,
    fusionTransactionId: fusion?.fusionTransactionId,
    snapshotHashBefore: fusion?.snapshotHashBefore,
    snapshotHashAfter: fusion?.snapshotHashAfter,
    visualEvidence: {
      status: visual.status,
      kind: visual.kind,
      refs: visual.refs,
      message: visual.message,
    },
  }
}

export function nexusCellsToAgentBoard(
  cells: NexusCellUi[],
): Array<{
  id: string
  role: string
  name: string
  currentTask: string
  status: 'idle' | 'queued' | 'working' | 'completed' | 'blocked'
  telemetry: 'live' | 'estimated' | 'unavailable'
  progress?: number
}> {
  return cells.map((cell) => ({
    id: cell.taskId,
    role: cell.domainLabel,
    name: cell.role === 'nucleus' ? 'Nucleus' : 'Peripheral',
    currentTask:
      cell.healVerdict && cell.healVerdict !== 'APPLY'
        ? `Heal ${cell.healVerdict} (${cell.healRounds ?? 0} rounds) — not success`
        : cell.moaVerdict
          ? `MoA ${cell.moaVerdict}`
          : 'Awaiting cell result',
    status: cell.status,
    telemetry: 'live',
    progress: cell.status === 'completed' ? 100 : cell.status === 'blocked' ? 100 : 50,
  }))
}
