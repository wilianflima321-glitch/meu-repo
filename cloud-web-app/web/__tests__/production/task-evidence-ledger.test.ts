import { describe, expect, it } from 'vitest'

import { evaluateAgentToolInvocation } from '@/lib/production/agent-tool-bus'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  evaluateTaskEvidenceReadiness,
  summarizeTaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'

describe('task evidence ledger', () => {
  it('blocks apply/release readiness until required evidence is attached', () => {
    const decision = evaluateAgentToolInvocation({
      toolId: 'deployment',
      mode: 'Release',
      projectId: 'project-1',
      intent: 'Deploy production after validation',
      maxCostUsd: 5,
      approvalToken: 'approval-release-1',
      idempotencyKey: 'deploy-production-1',
      readReceiptRefs: ['read-receipt:release-plan'],
      scopeLockRef: 'scope-lock:release',
      rollbackRef: 'rollback:plan',
      evidenceRefs: ['preview:deploy', 'rollback:plan', 'replay:release'],
    })
    const ledger = createTaskEvidenceLedger({
      taskId: 'deploy-1',
      projectId: 'project-1',
      mission: 'Deploy production safely',
      ownerAgent: 'Release Agent',
      now: '2026-05-13T04:20:00.000Z',
    })

    const readiness = evaluateTaskEvidenceReadiness(ledger, decision)

    expect(readiness.ready).toBe(false)
    expect(readiness.missingKinds).toEqual(expect.arrayContaining(['validation', 'approval', 'rollback', 'read-receipt', 'scope-lock', 'idempotency']))
    expect(readiness.blockers.join(' ')).toContain('Missing required evidence')
  })

  it('summarizes evidence once tool calls, validation, approval, replay, and rollback are present', () => {
    const decision = evaluateAgentToolInvocation({
      toolId: 'deployment',
      mode: 'Release',
      projectId: 'project-1',
      intent: 'Deploy production after validation',
      maxCostUsd: 5,
      approvalToken: 'approval-release-1',
      idempotencyKey: 'deploy-production-1',
      readReceiptRefs: ['read-receipt:release-plan'],
      scopeLockRef: 'scope-lock:release',
      rollbackRef: 'rollback:plan',
      evidenceRefs: ['preview:deploy', 'rollback:plan', 'replay:release'],
    })
    const base = createTaskEvidenceLedger({
      taskId: 'deploy-1',
      projectId: 'project-1',
      mission: 'Deploy production safely',
      ownerAgent: 'Release Agent',
      now: '2026-05-13T04:20:00.000Z',
    })
    const ledger = [
      { kind: 'validation' as const, title: 'Build passed', summary: 'npm run build passed', refs: ['build:ok'] },
      { kind: 'approval' as const, title: 'Release approved', summary: 'Human approved release', refs: ['approval-release-1'] },
      { kind: 'rollback' as const, title: 'Rollback ready', summary: 'Rollback plan attached', refs: ['rollback:plan'] },
      { kind: 'read-receipt' as const, title: 'Release plan read', summary: 'Release plan was read before deploy', refs: ['read-receipt:release-plan'] },
      { kind: 'scope-lock' as const, title: 'Release lock', summary: 'Release surface lock was acquired', refs: ['scope-lock:release'] },
      { kind: 'idempotency' as const, title: 'Idempotency key', summary: 'Replay-safe deploy key recorded', refs: ['deploy-production-1'] },
      { kind: 'browser-replay' as const, title: 'Deploy replay', summary: 'Replay attached', refs: ['replay:release'] },
      { kind: 'artifact' as const, title: 'Deploy preview', summary: 'Preview URL attached', refs: ['preview:deploy'] },
    ].reduce(
      (next, event) => appendTaskEvidence(next, { ...event, actor: 'Release Agent' }),
      base
    )

    const readiness = evaluateTaskEvidenceReadiness(ledger, decision)

    expect(readiness.ready).toBe(true)
    expect(summarizeTaskEvidenceLedger(ledger)).toContain('validation:1')
    expect(summarizeTaskEvidenceLedger(ledger)).toContain('rollback:1')
  })
})
