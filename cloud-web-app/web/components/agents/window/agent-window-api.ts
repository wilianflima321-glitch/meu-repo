import type {
  AgentFleetMemberSnapshot,
  AgentFleetMemberStatus,
  AgentFleetResponse,
  AgentFleetSnapshot,
  BrowserOperatorRunsResponse,
  BrowserOperatorRunSummary,
  ResearchNavigationMeshSnapshot,
} from './types'

export async function fetchAgentFleet(projectId: string): Promise<AgentFleetSnapshot> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/production-state/agent-fleet`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`agent-fleet:${response.status}`)
  }

  const payload = (await response.json()) as AgentFleetResponse
  return payload.snapshot
}

export async function patchAgentFleet(
  projectId: string,
  patch: Partial<Pick<AgentFleetSnapshot, 'paused'>>,
): Promise<AgentFleetSnapshot> {
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

  const payload = (await response.json()) as AgentFleetResponse
  return payload.snapshot
}

export async function fetchBrowserOperatorRuns(projectId: string): Promise<BrowserOperatorRunSummary[]> {
  const response = await fetch(`/api/agents/browser-operator/runs?projectId=${encodeURIComponent(projectId)}&limit=8`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`browser-operator-runs:${response.status}`)
  }

  const payload = (await response.json()) as BrowserOperatorRunsResponse
  return payload.runs
}

export async function fetchResearchNavigationMesh(): Promise<ResearchNavigationMeshSnapshot> {
  const response = await fetch('/api/research/navigation-mesh?missionKind=advanced-research', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`research-navigation-mesh:${response.status}`)
  }

  return (await response.json()) as ResearchNavigationMeshSnapshot
}

export function groupMembers(members: AgentFleetMemberSnapshot[]): Record<AgentFleetMemberStatus, AgentFleetMemberSnapshot[]> {
  return members.reduce<Record<AgentFleetMemberStatus, AgentFleetMemberSnapshot[]>>(
    (acc, member) => {
      acc[member.status].push(member)
      return acc
    },
    { ready: [], attention: [], blocked: [], paused: [] },
  )
}
