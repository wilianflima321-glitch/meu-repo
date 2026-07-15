import type { AgentSnapshot } from '@/lib/server/agent-store'

export type AgentExecutionState = 'running' | 'paused' | 'completed' | 'failed' | 'pending' | 'stopped' | 'unknown'

export type AgentExecutionSummary = {
  sessionId: string
  task: string
  state: AgentExecutionState
  createdAt: string
  updatedAt: string
  stepCount: number
  iteration: number
  model?: string
  autonomyLevel?: string
  requireApproval?: boolean
  currentTaskStatus?: string
}

export type AgentOverviewSummary = {
  totalExecutions: number
  activeExecutions: number
  pausedExecutions: number
  completedExecutions: number
  failedExecutions: number
  pendingExecutions: number
  lastUpdatedAt: string | null
}

export type AgentOverview = {
  agents: Array<{
    id: string
    name: string
    role: string
    status: AgentExecutionState
    executions: number
    lastUpdatedAt: string | null
  }>
  executions: AgentExecutionSummary[]
  summary: AgentOverviewSummary
}

export type AgentMetrics = {
  totalAgents: number
  activeAgents: number
  totalExecutions: number
  successRate: number
  totalTokensUsed: number
  totalCost: number
  avgExecutionTime: number
  errorsToday: number
  metered: boolean
  costModel: string
  summary: AgentOverviewSummary
}

const DEFAULT_AGENT_ID = 'autonomous-agent'
const DEFAULT_AGENT_NAME = 'Autonomous Agent'

export function buildAgentExecutionSummary(snapshot: AgentSnapshot): AgentExecutionSummary {
  const status = snapshot.status || {}
  const currentTask = getRecord(status.currentTask)
  const config = snapshot.config || {}
  const stepCount = Array.isArray(snapshot.steps) ? snapshot.steps.length : toSafeNumber(status.steps)
  const state = deriveAgentExecutionState(snapshot)

  return {
    sessionId: snapshot.sessionId,
    task: snapshot.task || getString(currentTask.description) || 'Untitled agent task',
    state,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    stepCount,
    iteration: toSafeNumber(status.iteration),
    model: getString(config.model),
    autonomyLevel: getString(config.autonomyLevel),
    requireApproval: typeof config.requireApproval === 'boolean' ? config.requireApproval : undefined,
    currentTaskStatus: getString(currentTask.status),
  }
}

export function buildAgentOverview(snapshots: AgentSnapshot[], limit = 50): AgentOverview {
  const executions = snapshots
    .map(buildAgentExecutionSummary)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, limit)

  const summary = summarizeAgentExecutions(executions)

  return {
    agents: [
      {
        id: DEFAULT_AGENT_ID,
        name: DEFAULT_AGENT_NAME,
        role: 'Tool-using background executor with human approval gates',
        status: summary.activeExecutions > 0 ? 'running' : summary.pausedExecutions > 0 ? 'paused' : 'unknown',
        executions: summary.totalExecutions,
        lastUpdatedAt: summary.lastUpdatedAt,
      },
    ],
    executions,
    summary,
  }
}

export function buildAgentMetrics(overview: AgentOverview, now = new Date()): AgentMetrics {
  const { summary } = overview
  const successRate =
    summary.totalExecutions === 0
      ? 0
      : Math.round((summary.completedExecutions / summary.totalExecutions) * 1000) / 10
  const today = now.toISOString().slice(0, 10)
  const errorsToday = overview.executions.filter(
    (execution) => execution.state === 'failed' && execution.updatedAt.slice(0, 10) === today,
  ).length

  return {
    totalAgents: overview.agents.length,
    activeAgents: summary.activeExecutions,
    totalExecutions: summary.totalExecutions,
    successRate,
    totalTokensUsed: 0,
    totalCost: 0,
    avgExecutionTime: 0,
    errorsToday,
    metered: false,
    costModel: 'agent-store-does-not-meter-token-usage-yet',
    summary,
  }
}

export function summarizeAgentExecutions(executions: AgentExecutionSummary[]): AgentOverviewSummary {
  return {
    totalExecutions: executions.length,
    activeExecutions: executions.filter((execution) => execution.state === 'running').length,
    pausedExecutions: executions.filter((execution) => execution.state === 'paused').length,
    completedExecutions: executions.filter((execution) => execution.state === 'completed').length,
    failedExecutions: executions.filter((execution) => execution.state === 'failed').length,
    pendingExecutions: executions.filter((execution) => execution.state === 'pending').length,
    lastUpdatedAt: executions[0]?.updatedAt || null,
  }
}

export function deriveAgentExecutionState(snapshot: AgentSnapshot): AgentExecutionState {
  const status = snapshot.status || {}
  if (status.isPaused === true) return 'paused'
  if (status.isRunning === true) return 'running'

  const currentTask = getRecord(status.currentTask)
  const taskStatus = getString(currentTask.status)
  if (taskStatus === 'completed') return 'completed'
  if (taskStatus === 'failed') return 'failed'
  if (taskStatus === 'paused') return 'paused'
  if (taskStatus === 'pending' || taskStatus === 'planning') return 'pending'
  if (taskStatus === 'executing' || taskStatus === 'reviewing') return 'running'

  if (snapshot.steps && snapshot.steps.length > 0) return 'stopped'
  return 'unknown'
}

export function parseAgentLimit(value: string | null, fallback = 50): number {
  if (value === null || value.trim().length === 0) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(100, Math.max(1, Math.trunc(parsed)))
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function toSafeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
