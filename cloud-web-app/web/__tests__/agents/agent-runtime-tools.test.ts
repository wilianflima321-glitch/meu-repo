import { describe, expect, it } from 'vitest'

import {
  buildAgentRoleEvalSuite,
  buildAgentRoleManifest,
  buildAgentRuntimeExecutionPlan,
  createAgentRuntimeReceipt,
  toolPermission,
  validateAgentRuntimeExecutionPlan,
  validateAgentRoleManifest,
} from '@/lib/agents/runtime'

describe('agent runtime tools', () => {
  it('requires approval and evidence for high-risk scoped tools', () => {
    const manifest = buildAgentRoleManifest({
      role: 'engineer',
      missionScope: 'Patch a bounded runtime module.',
      allowedTools: [toolPermission({ toolId: 'files.write', risk: 'high', readOnly: false, requiresApproval: false, evidenceRequired: true })],
    })

    expect(validateAgentRoleManifest(manifest)).toEqual(expect.arrayContaining(['engineer:files.write: high risk tools require approval']))
  })

  it('keeps execution blocked when receipts, sandbox, and evals are missing', () => {
    const plan = buildAgentRuntimeExecutionPlan({ missionScope: 'Investigate a runtime bug.', roles: ['architect', 'engineer'], sandboxProvider: 'none' })

    expect(plan.state).toBe('blocked')
    expect(plan.blockers).toEqual(expect.arrayContaining(['No sandbox provider is configured for code execution.']))
    expect(validateAgentRuntimeExecutionPlan(plan)).toEqual([])
  })

  it('moves to review rather than availability when receipts and sandbox exist', () => {
    const receipts = [
      createAgentRuntimeReceipt({ role: 'engineer', kind: 'tool', state: 'recorded', evidenceRefs: ['tool receipt'], reason: 'Tool call recorded.' }),
      createAgentRuntimeReceipt({ role: 'engineer', kind: 'memory', state: 'recorded', evidenceRefs: ['read receipt'], reason: 'Memory shard selected.' }),
    ]
    const evalSuite = buildAgentRoleEvalSuite(
      Array.from({ length: 30 }, (_, index) => ({ id: `engineer-${index}`, role: 'engineer', prompt: 'bounded patch', expectedEvidence: ['diff'] })),
    )
    const plan = buildAgentRuntimeExecutionPlan({
      missionScope: 'Patch bounded runtime module.',
      roles: ['engineer'],
      sandboxProvider: 'studio-local',
      receipts,
      evalSuite,
      memoryReceiptsRequired: true,
    })

    expect(plan.state).toBe('needs-review')
    expect(plan.blockers).toEqual([])
    expect(plan.nextAction).toContain('approval')
  })
})
