/**
 * AI-v1-c — Build TaskEvidenceLedger from live Apex / Nexus mission results.
 */

import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import type { ApexMissionResult } from '@/lib/production/apex-mission-orchestrator'
import type { NexusMissionUiPayload } from '@/lib/production/nexus-mission-phases'
import { capturePatchHashEvidence } from '@/lib/production/visual-evidence-capture'

export function attachVisualEvidence(
  ledger: TaskEvidenceLedger,
  input: {
    mediaUrl?: string
    frameCount?: number
    contentHash: string
    status: 'IMPLEMENTED' | 'HELD'
    kind: string
    summary: string
    actor?: string
  },
): TaskEvidenceLedger {
  return appendTaskEvidence(ledger, {
    kind: 'screenshot',
    title:
      input.status === 'IMPLEMENTED'
        ? `VisualEvidence (${input.kind})`
        : `VisualEvidence HELD (${input.kind})`,
    summary: input.summary,
    refs: [
      `hash:${input.contentHash}`,
      ...(input.mediaUrl ? [input.mediaUrl] : []),
      ...(typeof input.frameCount === 'number' ? [`frames:${input.frameCount}`] : []),
    ],
    actor: input.actor ?? 'visual-evidence',
  })
}

export function buildApexMissionEvidenceLedger(input: {
  mission: ApexMissionResult
  projectId: string
  nexus?: NexusMissionUiPayload
}): TaskEvidenceLedger {
  const { mission, projectId, nexus } = input
  let ledger = createTaskEvidenceLedger({
    taskId: mission.missionId,
    projectId,
    mission: `Apex Nexus mission ${mission.missionId}`,
    ownerAgent: 'maestro',
  })

  ledger = appendTaskEvidence(ledger, {
    kind: 'mission',
    title: 'Maestro plan',
    summary: `Critical + ${mission.plan.peripheralTasks.length} peripheral(s); trivialBypass=${mission.plan.trivialBypass}`,
    refs: [
      `laws:${mission.plan.lawsPackId}`,
      `ctx:${mission.plan.contextPackId}`,
      `mem:${mission.plan.projectMemoryDigestId}`,
    ],
    actor: 'maestro',
  })

  for (const cell of mission.cells) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'tool-call',
      title: `${cell.role} MoA cell`,
      summary: `moa=${cell.moa.verdict}; heal=${cell.heal?.verdict ?? 'n/a'}; width=${cell.moa.generatorWidth}`,
      refs: [cell.taskId, cell.role],
      actor: cell.role === 'critical' ? 'nucleus' : 'peripheral',
    })
  }

  if (mission.supremePatch) {
    const visual = capturePatchHashEvidence({
      after: mission.supremePatch,
      label: mission.missionId,
    })
    ledger = attachVisualEvidence(ledger, {
      contentHash: visual.contentHash,
      status: visual.status,
      kind: visual.kind,
      summary: visual.message,
    })
    ledger = appendTaskEvidence(ledger, {
      kind: 'diff',
      title: 'Supreme patch candidate',
      summary: `Patch length ${mission.supremePatch.length} chars; verdict=${mission.verdict}`,
      refs: [`sha256:${visual.contentHash}`],
      actor: 'synthesizer',
    })
  }

  ledger = appendTaskEvidence(ledger, {
    kind: 'validation',
    title: mission.verdict === 'APPLY' ? 'L.5 PASS — apply allowed' : 'L.5 / MoA did not PASS',
    summary:
      mission.verdict === 'APPLY'
        ? 'User may apply; never reported FAIL as success.'
        : mission.reason || 'Mission blocked or escalated — not a success receipt.',
    refs: [mission.verdict],
    actor: 'auto-heal',
  })

  ledger = appendTaskEvidence(ledger, {
    kind: 'cost',
    title: 'Estimated MoA spend',
    summary: `${mission.estimatedSpendTokens} weighted tokens reserved/settled`,
    refs: [`tokens:${mission.estimatedSpendTokens}`],
    actor: 'cost-guard',
  })

  if (nexus?.fusionTransactionId) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'rollback',
      title: 'CreativeFusionTransaction undo scope',
      summary: `Ctrl+Z reverts transaction ${nexus.fusionTransactionId} atomically (Trava II).`,
      refs: [
        `tx:${nexus.fusionTransactionId}`,
        ...(nexus.snapshotHashBefore ? [`before:${nexus.snapshotHashBefore}`] : []),
        ...(nexus.snapshotHashAfter ? [`after:${nexus.snapshotHashAfter}`] : []),
      ],
      actor: 'fusion-tx',
    })
  }

  return ledger
}
