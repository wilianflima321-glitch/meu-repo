export type AethelMcpTransport = 'stdio' | 'http' | 'sse'
export type AethelMcpServerState = 'held' | 'needs-review' | 'available' | 'blocked'
export type AethelMcpRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type AethelMcpServerScope = {
  readOnly: boolean
  allowedTools: string[]
  allowedResourcePrefixes: string[]
  envAllowlist: string[]
}

export type AethelMcpServerRegistration = {
  id: string
  name: string
  transport: AethelMcpTransport
  command?: string
  args?: string[]
  url?: string
  state: AethelMcpServerState
  scope: AethelMcpServerScope
  approvedAt?: string
  approvedBy?: string
  evidenceRefs: string[]
}

export type AethelMcpToolCallRequest = {
  serverId: string
  toolName: string
  riskLevel: AethelMcpRiskLevel
  input: Record<string, unknown>
  approvalToken?: string
  missionId?: string
}

export type AethelMcpToolReceipt = {
  id: string
  serverId: string
  toolName: string
  state: 'blocked' | 'needs-review' | 'recorded'
  reason: string
  evidenceRefs: string[]
  requiresHumanApproval: boolean
}

export type AethelMcpHostRegistry = {
  version: 1
  servers: AethelMcpServerRegistration[]
  defaultPolicy: 'deny-unapproved-tools'
  receiptPolicy: 'required-for-every-tool-call'
  prohibitedClaims: string[]
}

export const AETHEL_MCP_HOST_PROHIBITED_CLAIMS = [
  'MCP ecosystem ready',
  'external tools run without approval',
  'autonomous tool execution ready',
] as const

export function buildAethelMcpHostRegistry(servers: AethelMcpServerRegistration[] = []): AethelMcpHostRegistry {
  return {
    version: 1,
    servers,
    defaultPolicy: 'deny-unapproved-tools',
    receiptPolicy: 'required-for-every-tool-call',
    prohibitedClaims: [...AETHEL_MCP_HOST_PROHIBITED_CLAIMS],
  }
}

export function validateAethelMcpToolCall(
  registry: AethelMcpHostRegistry,
  request: AethelMcpToolCallRequest,
): AethelMcpToolReceipt {
  const server = registry.servers.find((candidate) => candidate.id === request.serverId)
  if (!server) return receiptFor(request, 'blocked', 'MCP server is not registered.', true, [])
  if (server.state !== 'available') return receiptFor(request, 'blocked', `MCP server is ${server.state}.`, true, server.evidenceRefs)
  if (!server.approvedAt || !server.approvedBy) return receiptFor(request, 'blocked', 'MCP server has no approval receipt.', true, server.evidenceRefs)
  if (!server.scope.allowedTools.includes(request.toolName)) {
    return receiptFor(request, 'blocked', 'Tool is outside the approved server scope.', true, server.evidenceRefs)
  }
  if ((request.riskLevel === 'high' || request.riskLevel === 'critical') && !request.approvalToken) {
    return receiptFor(request, 'needs-review', 'High-risk MCP tool call requires a human approval token.', true, server.evidenceRefs)
  }
  return receiptFor(request, 'recorded', 'MCP tool call is approved by registry scope and receipt policy.', false, server.evidenceRefs)
}

function receiptFor(
  request: AethelMcpToolCallRequest,
  state: AethelMcpToolReceipt['state'],
  reason: string,
  requiresHumanApproval: boolean,
  evidenceRefs: string[],
): AethelMcpToolReceipt {
  return {
    id: `${request.serverId}:${request.toolName}:${request.missionId ?? 'no-mission'}`,
    serverId: request.serverId,
    toolName: request.toolName,
    state,
    reason,
    evidenceRefs,
    requiresHumanApproval,
  }
}

export function validateAethelMcpHostRegistry(registry: AethelMcpHostRegistry): string[] {
  const failures: string[] = []
  if (registry.defaultPolicy !== 'deny-unapproved-tools') failures.push('default policy must deny unapproved tools')
  if (registry.receiptPolicy !== 'required-for-every-tool-call') failures.push('MCP tool calls must always produce receipts')
  for (const server of registry.servers) {
    if (!server.evidenceRefs.length) failures.push(`${server.id}: evidenceRefs are required`)
    if (server.state === 'available' && (!server.approvedAt || !server.approvedBy)) failures.push(`${server.id}: available servers need approval receipts`)
    if (server.state === 'available' && server.scope.allowedTools.length === 0) failures.push(`${server.id}: available servers need scoped tools`)
  }
  return failures
}
