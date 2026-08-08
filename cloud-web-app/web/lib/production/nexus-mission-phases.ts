/**
 * AI-v1-c / J.2 — Nexus mission phase events + UI labels.
 * Maestro planning → Swarm parallel → Healing → Apply | Blocked.
 */

export type NexusMissionPhase =
  | 'maestro_planning'
  | 'swarm_parallel'
  | 'healing'
  | 'apply'
  | 'blocked'
  | 'escalated'

export interface NexusPhaseEvent {
  phase: NexusMissionPhase
  at: string
  label: string
  detail?: string
}

export interface NexusCellUi {
  taskId: string
  role: 'nucleus' | 'peripheral'
  domainLabel: string
  status: 'queued' | 'working' | 'completed' | 'blocked'
  moaVerdict?: string
  healVerdict?: string
  healRounds?: number
  /** Explicit dependency edges when known (CW6 task-graph visibility). */
  dependsOnTaskIds?: string[]
}

/** Terminal + in-flight (R19 coordinator SSE). RUNNING is never a ship success. */
export type NexusMissionVerdict = 'APPLY' | 'BLOCK' | 'ESCALATE' | 'RUNNING'

export interface NexusMissionUiPayload {
  missionId: string
  currentPhase: NexusMissionPhase
  phaseLabel: string
  phases: NexusPhaseEvent[]
  cells: NexusCellUi[]
  verdict: NexusMissionVerdict
  /** Never treat L.5 FAIL as success — explicit blocked copy for UI */
  blockedReason?: string
  estimatedSpendTokens: number
  fusionTransactionId?: string
  snapshotHashBefore?: string
  snapshotHashAfter?: string
  /** Portable Trava II handoff JSON for server→client Ctrl+Z. */
  fusionHandoffJson?: string
  visualEvidence?: {
    status: 'IMPLEMENTED' | 'HELD'
    kind: 'png_frames' | 'webm' | 'patch_hash'
    refs: string[]
    message: string
  }
}

export const NEXUS_PHASE_LABELS: Record<NexusMissionPhase, string> = {
  maestro_planning: 'Maestro planning…',
  swarm_parallel: 'Swarm on parallel cells…',
  healing: 'Healing (L.5)…',
  apply: 'Apply candidate ready',
  blocked: 'Blocked — not applied as success',
  escalated: 'Escalated for human review',
}

export function nexusPhaseLabel(phase: NexusMissionPhase): string {
  return NEXUS_PHASE_LABELS[phase]
}

export function createNexusPhaseEvent(
  phase: NexusMissionPhase,
  detail?: string,
): NexusPhaseEvent {
  return {
    phase,
    at: new Date().toISOString(),
    label: nexusPhaseLabel(phase),
    detail,
  }
}

export function resolveTerminalPhase(
  verdict: 'APPLY' | 'BLOCK' | 'ESCALATE',
): NexusMissionPhase {
  if (verdict === 'APPLY') return 'apply'
  if (verdict === 'ESCALATE') return 'escalated'
  return 'blocked'
}
