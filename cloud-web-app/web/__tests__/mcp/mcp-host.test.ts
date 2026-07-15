import { describe, expect, it } from 'vitest'

import {
  buildAethelMcpHostRegistry,
  validateAethelMcpHostRegistry,
  validateAethelMcpToolCall,
} from '@/lib/mcp/host'

describe('Aethel MCP host contract', () => {
  it('blocks unregistered servers by default', () => {
    const receipt = validateAethelMcpToolCall(buildAethelMcpHostRegistry(), {
      serverId: 'unknown',
      toolName: 'files.read',
      riskLevel: 'low',
      input: {},
    })

    expect(receipt).toMatchObject({ state: 'blocked', requiresHumanApproval: true })
  })

  it('requires approval receipts before available MCP servers can execute scoped tools', () => {
    const registry = buildAethelMcpHostRegistry([
      {
        id: 'filesystem',
        name: 'Filesystem',
        transport: 'stdio',
        command: 'node',
        state: 'available',
        scope: { readOnly: true, allowedTools: ['files.read'], allowedResourcePrefixes: ['workspace://'], envAllowlist: [] },
        evidenceRefs: ['approval receipt'],
      },
    ])

    expect(validateAethelMcpHostRegistry(registry)).toEqual(expect.arrayContaining(['filesystem: available servers need approval receipts']))
  })

  it('allows scoped low-risk calls and holds high-risk calls without approval token', () => {
    const registry = buildAethelMcpHostRegistry([
      {
        id: 'filesystem',
        name: 'Filesystem',
        transport: 'stdio',
        command: 'node',
        state: 'available',
        scope: { readOnly: true, allowedTools: ['files.read', 'files.write'], allowedResourcePrefixes: ['workspace://'], envAllowlist: [] },
        approvedAt: '2026-06-06T00:00:00.000Z',
        approvedBy: 'human-owner',
        evidenceRefs: ['approval receipt'],
      },
    ])

    expect(validateAethelMcpToolCall(registry, { serverId: 'filesystem', toolName: 'files.read', riskLevel: 'low', input: {} }).state).toBe('recorded')
    expect(validateAethelMcpToolCall(registry, { serverId: 'filesystem', toolName: 'files.write', riskLevel: 'high', input: {} }).state).toBe('needs-review')
  })
})
