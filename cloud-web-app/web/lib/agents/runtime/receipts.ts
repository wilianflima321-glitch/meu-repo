import type { AgentType } from '@/lib/agent-orchestrator'
import type { AgentRuntimeReceipt } from '@/lib/agents/runtime/types'

export function createAgentRuntimeReceipt(input: Omit<AgentRuntimeReceipt, 'id'> & { id?: string }): AgentRuntimeReceipt {
  return {
    ...input,
    id: input.id ?? `${input.role}:${input.kind}:${input.state}:${input.evidenceRefs.join('|') || 'no-evidence'}`,
  }
}

export function buildMissingReceipt(role: AgentType, kind: AgentRuntimeReceipt['kind'], reason: string): AgentRuntimeReceipt {
  return createAgentRuntimeReceipt({ role, kind, state: 'blocked', evidenceRefs: [], reason })
}

export function countReceipts(receipts: AgentRuntimeReceipt[], kind: AgentRuntimeReceipt['kind']): number {
  return receipts.filter((receipt) => receipt.kind === kind && receipt.state === 'recorded').length
}
