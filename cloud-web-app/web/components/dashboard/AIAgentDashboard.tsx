'use client'

/**
 * AETHEL ENGINE - AI Agent Dashboard
 *
 * Professional dashboard for AI agent monitoring.
 * Shows active agents, executions, errors, costs, and metrics.
 *
 * Features:
 * - Active agent list with status
 * - Execution history
 * - Cost metrics (tokens/API calls)
 * - Error and warning log
 * - Sandbox controls
 *
 * @module components/dashboard/AIAgentDashboard
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'
import {
  EMPTY_STATE_CLASS,
  GHOST_BUTTON_CLASS,
  Icons,
  PANEL_CLASS,
  PRIMARY_TAB_CLASS,
  fetchAgents,
  fetchExecutions,
  fetchMetrics,
  formatCost,
  formatDuration,
  formatTokens,
  getAgentTypeIcon,
  getStatusBg,
  getStatusColor,
  type AIAgent,
  type AIAgentDashboardProps,
  type AgentExecution,
  type AgentMetrics,
  type AgentStatus,
} from './AIAgentDashboard.model'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIAgentDashboard({
  className = '',
  onAgentSelect,
  onKillAgent,
}: AIAgentDashboardProps) {
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [executions, setExecutions] = useState<AgentExecution[]>([])
  const [metrics, setMetrics] = useState<AgentMetrics>({
    totalAgents: 0,
    activeAgents: 0,
    totalExecutions: 0,
    successRate: 0,
    totalTokensUsed: 0,
    totalCost: 0,
    avgExecutionTime: 0,
    errorsToday: 0,
  })
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null)
  const [view, setView] = useState<'agents' | 'history' | 'metrics'>('agents')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real data from API
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    const [agentsData, executionsData, metricsData] = await Promise.all([
      fetchAgents(),
      fetchExecutions(),
      fetchMetrics(),
    ])
    setAgents(agentsData)
    setExecutions(executionsData)
    setMetrics(metricsData)
    setIsRefreshing(false)
    setIsLoading(false)
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  // Kill agent handler
  const handleKillAgent = useCallback((agentId: string) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, status: 'idle' as AgentStatus, currentTask: undefined, progress: 0 } : a
    ))
    onKillAgent?.(agentId)
  }, [onKillAgent])

  return (
    <div className={`${PANEL_CLASS} flex h-full flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--aethel-border-subtle)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-[var(--aethel-primary-light)]">
              <Icons.Robot />
            </div>
            <h2 className={`${CANONICAL_TYPOGRAPHY.h3} text-[var(--aethel-text-primary)]`}>AI Agents</h2>
            <span className="text-xs text-[var(--aethel-text-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-2 py-0.5 rounded">
              {metrics.activeAgents} active
            </span>
          </div>

          <button type="button" aria-label="Refresh agent status"
            onClick={refresh}
            disabled={isRefreshing}
            className={`${GHOST_BUTTON_CLASS} p-2`}
          >
            <div className={isRefreshing ? 'animate-spin' : ''}>
              <Icons.Refresh />
            </div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-1">
          {(['agents', 'history', 'metrics'] as const).map((tab) => (
            <button type="button" aria-label={`Switch view to ${tab === 'agents' ? 'agents' : tab === 'history' ? 'history' : 'metrics'}`}
              key={tab}
              onClick={() => setView(tab)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${CANONICAL_MOTION} ${CANONICAL_FOCUS} ${
                view === tab
                  ? PRIMARY_TAB_CLASS
                  : 'border border-transparent bg-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {tab === 'agents' ? 'Agents' : tab === 'history' ? 'History' : 'Metrics'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Agents View */}
        {view === 'agents' && (
          <div className="space-y-3">
            {agents.length === 0 && !isLoading && (
              <div className={EMPTY_STATE_CLASS}>No active agents right now.</div>
            )}
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent)
                  onAgentSelect?.(agent)
                }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedAgent?.id === agent.id
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]'
                    : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] hover:border-[var(--aethel-border-secondary)]'
                }`}
              >
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-[var(--aethel-text-secondary)]">{getAgentTypeIcon(agent.type)}</div>
                    <span className="text-[var(--aethel-text-primary)] font-medium">{agent.name}</span>
                    {agent.sandboxed && (
                      <div className="text-[var(--aethel-success-light)]" title="Running in sandbox">
                        <Icons.Shield />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getStatusBg(agent.status)} ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                    {(agent.status === 'running' || agent.status === 'waiting') && (
                      <button type="button" aria-label={`Parar agente ${agent.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleKillAgent(agent.id)
                        }}
                        className={`rounded p-1 text-[var(--aethel-error)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]`}
                        title="Parar agente"
                      >
                        <Icons.Stop />
                      </button>
                    )}
                  </div>
                </div>

                {/* Current Task */}
                {agent.currentTask && (
                  <p className="text-sm text-[var(--aethel-text-secondary)] mb-2 truncate">{agent.currentTask}</p>
                )}

                {/* Progress */}
                {agent.status === 'running' && (
                  <div className="mb-2">
                    <div className="h-1 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--aethel-primary)] transition-all duration-300"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)] mt-1">
                      <span>{agent.progress}%</span>
                      {agent.startedAt && (
                        <span>{formatDuration(Date.now() - agent.startedAt.getTime())}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                {agent.status === 'error' && agent.lastError && (
                  <div className="flex items-start gap-2 text-sm text-[var(--aethel-error)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-2 rounded mb-2">
                    <Icons.Warning />
                    <span>{agent.lastError}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <Icons.Code />
                    {agent.model}
                  </span>
                  <span>{formatTokens(agent.tokensUsed)} tokens</span>
                  <span>{agent.apiCalls} calls</span>
                  {agent.errors > 0 && (
                    <span className="text-[var(--aethel-error)]">{agent.errors} errors</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="space-y-2">
            {executions.length === 0 && !isLoading && (
              <div className={EMPTY_STATE_CLASS}>No executions recorded.</div>
            )}
            {executions.map((exec) => (
              <div
                key={exec.id}
                className="p-3 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] rounded-lg border border-[var(--aethel-border-subtle)]"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {exec.status === 'success' ? (
                      <div className="text-[var(--aethel-success-light)]"><Icons.Check /></div>
                    ) : (
                      <div className="text-[var(--aethel-error)]"><Icons.Warning /></div>
                    )}
                    <span className="text-[var(--aethel-text-primary)] text-sm">{exec.agentName}</span>
                  </div>
                  <span className="text-xs text-[var(--aethel-text-tertiary)]">
                    {formatDuration(exec.duration)}
                  </span>
                </div>
                <p className="text-sm text-[var(--aethel-text-secondary)] mb-2">{exec.task}</p>
                {exec.error && (
                  <p className="text-xs text-[var(--aethel-error)] mb-2">{exec.error}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-tertiary)]">
                  <span>{formatTokens(exec.tokensUsed)} tokens</span>
                  <span>{formatCost(exec.cost)}</span>
                  <span>{exec.startTime.toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Metrics View */}
        {view === 'metrics' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={<Icons.Robot />}
                label="Active agents"
                value={`${metrics.activeAgents}/${metrics.totalAgents}`}
                color="text-[var(--aethel-primary-light)]"
              />
              <MetricCard
                icon={<Icons.Check />}
                label="Success rate"
                value={`${metrics.successRate.toFixed(1)}%`}
                color="text-[var(--aethel-success-light)]"
              />
              <MetricCard
                icon={<Icons.Code />}
                label="Tokens used"
                value={formatTokens(metrics.totalTokensUsed)}
                color="text-[var(--aethel-primary-light)]"
              />
              <MetricCard
                icon={<Icons.Dollar />}
                label="Total cost"
                value={formatCost(metrics.totalCost)}
                color="text-[var(--aethel-warning)]"
              />
              <MetricCard
                icon={<Icons.Clock />}
                label="Average time"
                value={formatDuration(metrics.avgExecutionTime)}
                color="text-[var(--aethel-info)]"
              />
              <MetricCard
                icon={<Icons.Warning />}
                label="Errors today"
                value={metrics.errorsToday.toString()}
                color="text-[var(--aethel-error)]"
              />
            </div>

            {/* Executions Chart - Uses real execution data */}
            <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] rounded-lg border border-[var(--aethel-border-subtle)]">
              <h3 className="text-sm text-[var(--aethel-text-secondary)] mb-3">Executions (24h)</h3>
              <div className="h-32 flex items-end gap-1">
                {(() => {
                  // Groups executions by hour for the last 24h
                  const hourlyData = Array(24).fill(0)
                  const now = new Date()
                  executions.forEach(exec => {
                    const hoursDiff = Math.floor((now.getTime() - new Date(exec.startTime).getTime()) / (1000 * 60 * 60))
                    if (hoursDiff >= 0 && hoursDiff < 24) {
                      hourlyData[23 - hoursDiff]++
                    }
                  })
                  const maxExecs = Math.max(...hourlyData, 1)

                  return hourlyData.map((count, i) => {
                    const height = (count / maxExecs) * 100
                    const hour = (now.getHours() - 23 + i + 24) % 24
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-colors ${count > 0 ? 'bg-[var(--aethel-primary)]/70 hover:bg-[var(--aethel-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]'}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${count} execution(s) at  ${hour.toString().padStart(2, '0')}:00`}
                      />
                    )
                  })
                })()}
              </div>
              <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)] mt-2">
                <span>00:00</span>
                <span>12:00</span>
                <span>Now</span>
              </div>
            </div>

            {/* Model Usage - Calculated from real execution data */}
            <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] rounded-lg border border-[var(--aethel-border-subtle)]">
              <h3 className="text-sm text-[var(--aethel-text-secondary)] mb-3">Usage by model</h3>
              <div className="space-y-2">
                {(() => {
                  // Groups usage by model from executions plus active agents
                  const modelUsage: Record<string, { tokens: number; cost: number }> = {}

                  // Active agent data
                  agents.forEach(agent => {
                    if (!modelUsage[agent.model]) {
                      modelUsage[agent.model] = { tokens: 0, cost: 0 }
                    }
                    modelUsage[agent.model].tokens += agent.tokensUsed
                  })

                  // Execution data
                  executions.forEach(exec => {
                    const agent = agents.find(a => a.id === exec.agentId)
                    const model = agent?.model || 'unknown'
                    if (!modelUsage[model]) {
                      modelUsage[model] = { tokens: 0, cost: 0 }
                    }
                    modelUsage[model].tokens += exec.tokensUsed
                    modelUsage[model].cost += exec.cost
                  })

                  const entries = Object.entries(modelUsage)
                  if (entries.length === 0) {
                    return (
                      <div className={`${EMPTY_STATE_CLASS} py-4 text-xs`}>
                        No usage data available
                      </div>
                    )
                  }

                  const totalTokens = entries.reduce((sum, [, data]) => sum + data.tokens, 0) || 1

                  return entries
                    .sort((a, b) => b[1].tokens - a[1].tokens)
                    .slice(0, 5)
                    .map(([model, data]) => (
                      <ModelUsageBar
                        key={model}
                        model={model}
                        percent={Math.round((data.tokens / totalTokens) * 100)}
                        tokens={data.tokens}
                        cost={data.cost}
                      />
                    ))
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="p-3 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] rounded-lg border border-[var(--aethel-border-subtle)]">
      <div className={`${color} mb-1`}>{icon}</div>
      <div className="text-lg text-[var(--aethel-text-primary)] font-semibold">{value}</div>
      <div className="text-xs text-[var(--aethel-text-tertiary)]">{label}</div>
    </div>
  )
}

function ModelUsageBar({
  model,
  percent,
  tokens,
  cost,
}: {
  model: string
  percent: number
  tokens: number
  cost: number
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[var(--aethel-text-primary)]">{model}</span>
        <span className="text-[var(--aethel-text-secondary)]">{formatTokens(tokens)} ({formatCost(cost)})</span>
      </div>
      <div className="h-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-primary)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default AIAgentDashboard
