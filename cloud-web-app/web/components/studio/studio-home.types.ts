export type FullAccessScope = 'project' | 'workspace' | 'web_tools'
export type MissionDomain = 'games' | 'films' | 'apps' | 'general'
export type MissionDomainSelection = MissionDomain | 'auto'

export type FullAccessPolicySummary = {
  scope: FullAccessScope
  plan: string
  allowedActionClasses: string[]
  manualConfirmActionClasses: string[]
  blockedActionClasses: string[]
  notes: string[]
}

export type StudioTask = {
  id: string
  title: string
  ownerRole: 'planner' | 'coder' | 'reviewer'
  status: 'queued' | 'planning' | 'building' | 'validating' | 'blocked' | 'done' | 'error'
  estimateCredits: number
  estimateSeconds: number
  result?: string
  validationVerdict: 'pending' | 'passed' | 'failed'
  validationReport?: {
    totalChecks: number
    failedIds: string[]
    failedMessages: string[]
  }
  applyToken?: string
}

export type StudioMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  agentRole?: 'planner' | 'coder' | 'reviewer'
  content: string
  timestamp: string
  status?: string
}

export type FullAccessGrant = {
  id: string
  scope: FullAccessScope
  expiresAt: string
  revokedAt?: string
}

export type StudioAgentRun = {
  id: string
  taskId: string
  role: 'planner' | 'coder' | 'reviewer'
  model: string
  status: 'running' | 'success' | 'error'
  tokensIn: number
  tokensOut: number
  latencyMs: number
  cost: number
  startedAt: string
  finishedAt?: string
  message: string
}

export type StudioSession = {
  id: string
  projectId: string
  mission: string
  missionDomain?: MissionDomain
  qualityMode: 'standard' | 'delivery' | 'studio'
  qualityChecklist?: string[]
  status: 'active' | 'stopped' | 'completed'
  tasks: StudioTask[]
  agentRuns: StudioAgentRun[]
  messages: StudioMessage[]
  orchestration?: {
    mode: 'serial' | 'role_sequenced_wave' | 'parallel_wave'
    conversationPolicy: 'peer_review'
    applyPolicy: 'serial_after_validation'
    lastWaveAt?: string
  }
  fullAccessGrants: FullAccessGrant[]
  cost: {
    estimatedCredits: number
    usedCredits: number
    budgetCap: number
    remainingCredits: number
  }
}

export type WalletSummary = {
  balance: number
  currency: string
}

export type UsageSummary = {
  plan: string
  usage: { tokens: { used: number; limit: number; remaining: number; percentUsed: number } }
  usageEntitlement?: {
    creditBalance: number
    variableUsageAllowed: boolean
    blockedReason: string | null
  }
}
