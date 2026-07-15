/**
 * AI-v1-c — J.2 Nexus UI + J.9 VisualEvidence + Trava II undo contracts.
 */

import { describe, expect, it } from 'vitest'
import { dispatchNexusSquad } from '@/lib/production/nexus-squad-dispatch'
import {
  createNexusPhaseEvent,
  nexusPhaseLabel,
  resolveTerminalPhase,
} from '@/lib/production/nexus-mission-phases'
import { buildNexusMissionUiPayload, nexusCellsToAgentBoard } from '@/lib/production/nexus-mission-ui'
import { capturePatchHashEvidence, resolveWebmCaptureCapability } from '@/lib/production/visual-evidence-capture'
import { buildApexMissionEvidenceLedger, attachVisualEvidence } from '@/lib/production/apex-mission-evidence'
import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import { buildLedgerEvidenceArtifact } from '@/components/agents/evidence-artifacts'
import type { ApexMissionResult } from '@/lib/production/apex-mission-orchestrator'

function stubMission(verdict: ApexMissionResult['verdict']): ApexMissionResult {
  return {
    missionId: 'mission-test-1',
    plan: {
      missionId: 'mission-test-1',
      maestroModelId: 'test-model',
      criticalTask: {
        taskId: 'task_0_code',
        domain: 'code',
        intent: 'implement',
        allowedPaths: ['src/a.ts'],
        successCriteria: ['L.5 PASS'],
        riskScore: 55,
        generatorWidth: 1,
      },
      peripheralTasks: [],
      projectMemoryDigestId: 'mem',
      lawsPackId: 'laws',
      contextPackId: 'ctx',
      trivialBypass: true,
    },
    estimatedSpendTokens: 1200,
    cells: [
      {
        taskId: 'task_0_code',
        role: 'critical',
        moa: {
          generatorWidth: 1,
          proposals: [],
          supremePatch: 'export const x = 1\n',
          verdict: 'CANDIDATE',
        },
        heal:
          verdict === 'APPLY'
            ? {
                verdict: 'APPLY',
                finalPatch: 'export const x = 1\n',
                turns: [{ round: 1, ok: true }],
              }
            : {
                verdict: 'BLOCK',
                reason: 'L.5 FAIL',
                turns: [{ round: 1, ok: false }],
              },
        finalPatch: 'export const x = 1\n',
      },
    ],
    verdict,
    supremePatch: verdict === 'APPLY' ? 'export const x = 1\n' : undefined,
    reason: verdict === 'APPLY' ? undefined : 'L.5 heal did not PASS',
    liveProvider: true,
    phases: [
      createNexusPhaseEvent('maestro_planning'),
      createNexusPhaseEvent('swarm_parallel'),
      createNexusPhaseEvent('healing'),
      createNexusPhaseEvent(resolveTerminalPhase(verdict), verdict === 'APPLY' ? undefined : 'L.5 FAIL'),
    ],
  } as ApexMissionResult
}

describe('AI-v1-c Nexus + VisualEvidence', () => {
  it('dispatches nucleus vs peripheral roles via NexusSquadDispatch', () => {
    const result = dispatchNexusSquad({
      missionId: 'm1',
      maestroModelId: 'model',
      planId: 'pro',
      userPrompt: 'Implement auth and tests for the login flow',
      targetFilePath: 'src/auth.ts',
      riskScore: 80,
    })
    expect(result.nucleusRole.length).toBeGreaterThan(0)
    expect(result.maestro.criticalTask.domain).toBeTruthy()
    expect(result.recommendedMoAWidth).toBeGreaterThanOrEqual(1)
  })

  it('builds Nexus UI labels and never paints BLOCK as apply', () => {
    expect(nexusPhaseLabel('maestro_planning')).toContain('Maestro')
    const blocked = stubMission('BLOCK')
    const ui = buildNexusMissionUiPayload(blocked, blocked.phases)
    expect(ui.currentPhase).toBe('blocked')
    expect(ui.blockedReason).toMatch(/L\.5|PASS|blocked/i)
    expect(ui.verdict).toBe('BLOCK')
    const agents = nexusCellsToAgentBoard(ui.cells)
    expect(agents[0]?.role).toMatch(/Nucleus/i)
  })

  it('J-ACC-04 ledger receipt includes validation + visual evidence refs', () => {
    const mission = stubMission('APPLY')
    const nexus = buildNexusMissionUiPayload(mission, mission.phases, {
      fusionTransactionId: 'tx-abc',
      snapshotHashBefore: 'beforehash',
      snapshotHashAfter: 'afterhash',
    })
    const ledger = buildApexMissionEvidenceLedger({
      mission,
      projectId: 'proj-1',
      nexus,
    })
    expect(ledger.events.some((e) => e.kind === 'validation')).toBe(true)
    expect(ledger.events.some((e) => e.kind === 'screenshot')).toBe(true)
    expect(ledger.events.some((e) => e.kind === 'rollback')).toBe(true)

    const artifact = buildLedgerEvidenceArtifact(ledger)
    expect(artifact?.kind).toBe('ledger')
    expect(artifact?.eventCount).toBeGreaterThan(2)
    expect(artifact?.fusionTransactionId).toBe('tx-abc')
  })

  it('J.9 WebM capability is honest HELD in Node; patch hash still attaches', () => {
    const webm = resolveWebmCaptureCapability()
    expect(webm.status).toBe('HELD')
    const patch = capturePatchHashEvidence({ after: 'code', before: '' })
    expect(patch.kind).toBe('patch_hash')
    expect(patch.refs[0]).toMatch(/^sha256:/)

    let ledger = createTaskEvidenceLedger({
      taskId: 't1',
      projectId: 'p1',
      mission: 'm',
      ownerAgent: 'maestro',
    })
    ledger = attachVisualEvidence(ledger, {
      contentHash: patch.contentHash,
      status: patch.status,
      kind: patch.kind,
      summary: patch.message,
    })
    expect(ledger.events[0]?.title).toMatch(/HELD/)
  })
})
