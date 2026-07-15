import { describe, expect, it } from 'vitest'

import { agentLlmChat } from '@/lib/ai/agent-llm-bridge'
import { evaluateGovernedAgentToolJob } from '@/lib/production/agent-tool-job-runner'
import { mapToolNameToCanonical } from '@/lib/production/agent-tool-name-adapter'

describe('agent governed tool gate contracts', () => {
  it('maps create_file to diff-proposal as a mutating write-scoped tool', () => {
    const mapping = mapToolNameToCanonical('create_file')
    expect(mapping.toolId).toBe('diff-proposal')
    expect(mapping.mutating).toBe(true)
  })

  it('allows scoped diff-proposal when required evidence is seeded', () => {
    const decision = evaluateGovernedAgentToolJob({
      toolId: 'diff-proposal',
      mode: 'Builder',
      projectId: 'game',
      agent: 'Gameplay Engineer Agent',
      mission: 'Agent tool: create_file',
      intent: 'Execute create_file',
      targetPaths: ['src/game/combat/BossController.ts'],
      idempotencyKey: 'agent-lock-abc',
      scopeLockRef: 'agent-lock-abc',
      rollbackRef: 'pre-write:/src/game/combat/BossController.ts',
      readReceiptRefs: ['cartography:cart-1'],
      maxCostUsd: 0,
      hasDiffEvidence: true,
      enforcement: 'enforced',
    })

    expect(decision.allowed).toBe(true)
    expect(decision.ready).toBe(true)
    expect(decision.blockers).toHaveLength(0)
  })

  it('blocks enforced diff-proposal when evidence is missing', () => {
    const decision = evaluateGovernedAgentToolJob({
      toolId: 'diff-proposal',
      mode: 'Builder',
      projectId: 'game',
      agent: 'Gameplay Engineer Agent',
      mission: 'Agent tool: create_file',
      intent: 'Execute create_file',
      targetPaths: ['src/game/combat/BossController.ts'],
      enforcement: 'enforced',
    })

    expect(decision.allowed).toBe(false)
    expect(decision.blockers.length).toBeGreaterThan(0)
  })
})

describe('agentLlmChat', () => {
  it('exports a callable bridge function', () => {
    expect(typeof agentLlmChat).toBe('function')
  })
})
