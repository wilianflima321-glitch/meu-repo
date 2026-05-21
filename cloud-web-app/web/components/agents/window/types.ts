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

export type AgentFleetSnapshot = {
  mode: 'coordinator-first' | 'selected-agent' | 'review-only'
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
  nextAction: string
}

export type AgentFleetResponse = {
  snapshot: AgentFleetSnapshot
}

export type BrowserOperatorRunSummary = {
  runId: string
  mission: string
  status: string
  updatedAt: string
  stepCount: number
  timelineHash: string
}

export type BrowserOperatorRunsResponse = {
  runs: BrowserOperatorRunSummary[]
}