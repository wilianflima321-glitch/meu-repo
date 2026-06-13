import { describe, expect, it } from 'vitest'

import {
  evaluateGovernedAgentToolJob,
  recordGovernedToolExecution,
  type GovernedAgentToolJobInput,
} from '@/lib/production/agent-tool-job-runner'

const NOW = '2026-01-01T00:00:00.000Z'

function baseInput(overrides: Partial<GovernedAgentToolJobInput> = {}): GovernedAgentToolJobInput {
  return {
    toolId: 'diff-proposal',
    mode: 'Builder',
    projectId: 'project-1',
    agent: 'Aethel Coder',
    mission: 'Apply a code change',
    intent: 'Apply 1 file change(s)',
    targetPaths: ['src/index.ts'],
    now: NOW,
    ...overrides,
  }
}

describe('agent tool job runner (governed execution kernel)', () => {
  it('holds a diff-proposal job that is missing read receipts, scope lock, and budget', () => {
    const decision = evaluateGovernedAgentToolJob(
      baseInput({ idempotencyKey: 'run_1', rollbackRef: 'rollback_1' })
    )

    expect(decision.toolDecision.tool.id).toBe('diff-proposal')
    expect(decision.toolDecision.status).toBe('held')
    expect(decision.ready).toBe(false)
    // diff + idempotency + rollback are present; read-receipt + scope-lock are missing.
    expect(decision.evidenceReadiness.missingKinds).toEqual(
      expect.arrayContaining(['read-receipt', 'scope-lock'])
    )
  })

  it('does not block in observe mode even when not ready', () => {
    const decision = evaluateGovernedAgentToolJob(baseInput({ enforcement: 'observe' }))
    expect(decision.ready).toBe(false)
    expect(decision.allowed).toBe(true)
  })

  it('blocks in enforced mode when not ready', () => {
    const decision = evaluateGovernedAgentToolJob(baseInput({ enforcement: 'enforced' }))
    expect(decision.ready).toBe(false)
    expect(decision.allowed).toBe(false)
    expect(decision.blockers.length).toBeGreaterThan(0)
  })

  it('allows a fully-evidenced diff-proposal job and closes the loop', () => {
    const decision = evaluateGovernedAgentToolJob(
      baseInput({
        enforcement: 'enforced',
        idempotencyKey: 'run_2',
        rollbackRef: 'rollback_2',
        readReceiptRefs: ['receipt-a', 'receipt-b'],
        scopeLockRef: 'lock_2',
        maxCostUsd: 0,
      })
    )

    expect(decision.toolDecision.status).toBe('allowed')
    expect(decision.ready).toBe(true)
    expect(decision.allowed).toBe(true)
    expect(decision.evidenceReadiness.missingKinds).toEqual([])

    const closedLedger = recordGovernedToolExecution(decision, {
      status: 'success',
      appliedPaths: ['src/index.ts'],
      rollbackRefs: ['rollback_2'],
      validationVerdict: 'pass',
      now: NOW,
    })

    const kinds = closedLedger.events.map((event) => event.kind)
    expect(kinds).toEqual(expect.arrayContaining(['tool-call', 'validation', 'diff', 'read-receipt']))
  })

  it('rejects an unknown tool as blocked', () => {
    const decision = evaluateGovernedAgentToolJob(
      baseInput({ toolId: 'not-a-real-tool' as GovernedAgentToolJobInput['toolId'], enforcement: 'enforced' })
    )
    expect(decision.toolDecision.status).toBe('blocked')
    expect(decision.allowed).toBe(false)
  })

  it('records a failed execution with the error message', () => {
    const decision = evaluateGovernedAgentToolJob(baseInput({ idempotencyKey: 'run_3' }))
    const ledger = recordGovernedToolExecution(decision, {
      status: 'failed',
      error: 'APPLY_WRITE_FAILED',
      now: NOW,
    })
    const toolCall = ledger.events.find((event) => event.kind === 'tool-call')
    expect(toolCall?.summary).toContain('APPLY_WRITE_FAILED')
  })
})
