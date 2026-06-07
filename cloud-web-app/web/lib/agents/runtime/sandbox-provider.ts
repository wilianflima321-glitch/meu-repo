import type { AgentRuntimeSandboxProvider } from '@/lib/agents/runtime/types'

export type AgentRuntimeSandboxDecision = {
  provider: AgentRuntimeSandboxProvider
  state: 'provider_unavailable' | 'available'
  evidenceRefs: string[]
  reason: string
}

export function decideAgentRuntimeSandbox(provider: AgentRuntimeSandboxProvider, evidenceRefs: string[] = []): AgentRuntimeSandboxDecision {
  if (provider === 'none') {
    return { provider, state: 'provider_unavailable', evidenceRefs, reason: 'No sandbox provider is configured for code execution.' }
  }
  return { provider, state: 'available', evidenceRefs, reason: `Code execution must route through ${provider} with receipts.` }
}
