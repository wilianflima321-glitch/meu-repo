import type { AgentFleetMode } from '@/lib/production/agent-fleet-session'

export type AgentFleetMemberStatus = 'ready' | 'attention' | 'blocked' | 'paused'

export type AgentFleetMemberSnapshot = {
  agent: string
  role: 'senior-coordinator' | 'specialist'
  lane: string
  status: AgentFleetMemberStatus
  ownedSurfaceCount: number
  activeLockCount: number
  lockedSurfacePreview: string[]
  staleSurfaceCount: number
  staleSurfacePreview: string[]
  nextAction: string
}

export type AgentSurfaceLockOwnerSnapshot = {
  agent: string
  ownerUserId: string
  lockCount: number
  paths: string[]
  expiresAt: string
}

export type AgentSurfaceLockSnapshot = {
  projectId: string
  generatedAt: string
  activeLockCount: number
  lockedPathCount: number
  owners: AgentSurfaceLockOwnerSnapshot[]
  expiringSoonCount: number
  arbitrationRequired: boolean
  nextAction: string
}

export type AgentFleetSnapshot = {
  mode: AgentFleetMode
  paused: boolean
  hasManifest: boolean
  centralAgent: string
  summary: string
  composer: {
    primaryMode: string
    switcherHint: string
  }
  members: AgentFleetMemberSnapshot[]
  blockers: string[]
  activeLockCount: number
  staleSurfaceCount: number
  lockCoordination: AgentSurfaceLockSnapshot
  nextAction: string
}

export type AgentFleetApiResponse = {
  snapshot: AgentFleetSnapshot
}

export type AgentSurfaceLock = {
  id: string
  agent: string
  ownerUserId: string
  paths: string[]
  source: 'apply' | 'tool' | 'session'
  reason: string
  expiresAt: string
}

export type AgentLocksApiResponse = {
  locks: AgentSurfaceLock[]
  snapshot: AgentSurfaceLockSnapshot
}

export type AgentReadReceiptKind = 'repository-cartography' | 'research-intelligence'

export type AgentReadinessDecision = {
  allowed: boolean
  enforcement?: 'skipped' | 'passed'
  reason?: string
  code?: string
  status?: number
  message?: string
  metadata: {
    agent: string
    targetPaths: string[]
    manifestId: string | null
    researchPacketId: string | null
    missing: string[]
    stale: string[]
    acceptedReceiptIds: string[]
    blockers: string[]
  }
}

export type AgentReadReceiptsApiResponse = {
  readiness: AgentReadinessDecision
  persisted?: boolean
}

export interface AgentFleetCoordinatorStripProps {
  projectId: string
  selectedAgentId: string
  onSelectAgentId: (agentId: string) => void
  className?: string
}
