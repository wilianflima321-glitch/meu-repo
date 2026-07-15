import { describe, expect, it } from 'vitest'

import {
  AGENT_ROLE_PROFILES,
  DEFAULT_AGENT_SET,
  ORCHESTRATOR_COORDINATION_POLICY,
  SUPPORTED_AGENT_TYPES,
  buildRoleScope,
  getOrchestrator,
} from '@/lib/agent-orchestrator'

describe('agent orchestrator scale contract', () => {
  it('exposes a wide specialist fleet instead of a five-role demo roster', () => {
    expect(SUPPORTED_AGENT_TYPES.length).toBeGreaterThanOrEqual(20)
    expect(SUPPORTED_AGENT_TYPES).toEqual(
      expect.arrayContaining([
        'browser-operator',
        'fact-checker',
        'huggingface-curator',
        'github-cartographer',
        'security-auditor',
        'performance-engineer',
        'gameplay-engineer',
        'cinematic-director',
        'asset-pipeline',
        'cost-governor',
      ])
    )
  })

  it('keeps every specialist role governed by explicit scope and guidance', () => {
    const scopes = SUPPORTED_AGENT_TYPES.map((agentType) => buildRoleScope(agentType))

    expect(scopes.every((scope) => scope.length > 24)).toBe(true)
    expect(new Set(scopes).size).toBe(SUPPORTED_AGENT_TYPES.length)

    for (const agentType of SUPPORTED_AGENT_TYPES) {
      const profile = AGENT_ROLE_PROFILES[agentType]
      const guidance = profile.guidance('large repo')
      expect(profile.name).toBeTruthy()
      expect(profile.role).toBeTruthy()
      expect(guidance.length).toBeGreaterThan(48)
      expect(guidance).not.toContain('[object Object]')
    }
  })

  it('keeps coordinator-first defaults while allowing the full fleet to be scheduled', () => {
    expect(DEFAULT_AGENT_SET).toEqual(['architect', 'designer', 'engineer'])
    expect(ORCHESTRATOR_COORDINATION_POLICY.nonOverlappingScopes).toBe(true)
    expect(ORCHESTRATOR_COORDINATION_POLICY.applyGate).toBe('reviewer_required')
    expect(ORCHESTRATOR_COORDINATION_POLICY.executionOrder).toEqual(SUPPORTED_AGENT_TYPES)
  })

  it('initializes one governed worker per supported specialist role', () => {
    const agentStatus = getOrchestrator().getAgentStatus()
    const ids = agentStatus.map((agent) => agent.id)

    expect(agentStatus).toHaveLength(SUPPORTED_AGENT_TYPES.length)
    expect(ids).toEqual(
      expect.arrayContaining([
        'browser-operator-001',
        'huggingface-curator-001',
        'github-cartographer-001',
        'gameplay-engineer-001',
        'cinematic-director-001',
      ])
    )
  })
})
