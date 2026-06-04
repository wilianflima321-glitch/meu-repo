import type {
  AgentFleetApiResponse,
  AgentFleetSnapshot,
  AgentLocksApiResponse,
  AgentReadReceiptKind,
  AgentReadinessDecision,
  AgentReadReceiptsApiResponse,
} from './AgentFleetCoordinatorStrip.types'

export async function fetchFleetSnapshot(projectId: string): Promise<AgentFleetSnapshot> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-fleet`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`agent-fleet:${response.status}`)
  }

  const payload = (await response.json()) as AgentFleetApiResponse
  return payload.snapshot
}

export async function fetchAgentLocks(projectId: string): Promise<AgentLocksApiResponse> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-locks`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`agent-locks:${response.status}`)
  }

  return (await response.json()) as AgentLocksApiResponse
}

export async function fetchReadReceipts(projectId: string, agent: string): Promise<AgentReadinessDecision> {
  const params = new URLSearchParams({
    agent,
    enforceReadReceipts: 'true',
  })
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/production-state/read-receipts?${params.toString()}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }
  )

  if (!response.ok) {
    throw new Error(`agent-read-receipts:${response.status}`)
  }

  const payload = (await response.json()) as AgentReadReceiptsApiResponse
  return payload.readiness
}

export async function acknowledgeReadReceipts(projectId: string, readiness: AgentReadinessDecision): Promise<AgentReadinessDecision> {
  const receipts: Array<{
    agent: string
    kind: AgentReadReceiptKind
    ref: string
    readAt: string
    evidenceRefs: string[]
    note: string
  }> = []
  const readAt = new Date().toISOString()
  const agent = readiness.metadata.agent

  if (readiness.metadata.manifestId) {
    receipts.push({
      agent,
      kind: 'repository-cartography',
      ref: readiness.metadata.manifestId,
      readAt,
      evidenceRefs: ['agent-fleet:context-receipts'],
      note: 'Coordinator acknowledged Repository Cartography from Agent Fleet.',
    })
  }

  if (readiness.metadata.researchPacketId) {
    receipts.push({
      agent,
      kind: 'research-intelligence',
      ref: readiness.metadata.researchPacketId,
      readAt,
      evidenceRefs: ['agent-fleet:context-receipts'],
      note: 'Coordinator acknowledged Research Intelligence from Agent Fleet.',
    })
  }

  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/read-receipts`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent,
      enforceReadReceipts: true,
      receipts,
    }),
  })

  if (!response.ok) {
    throw new Error(`agent-read-receipts.patch:${response.status}`)
  }

  const payload = (await response.json()) as AgentReadReceiptsApiResponse
  return payload.readiness
}

export async function patchFleetSnapshot(projectId: string, patch: Partial<Pick<AgentFleetSnapshot, 'centralAgent' | 'mode' | 'paused'>>) {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-fleet`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    throw new Error(`agent-fleet.patch:${response.status}`)
  }

  const payload = (await response.json()) as AgentFleetApiResponse
  return payload.snapshot
}
