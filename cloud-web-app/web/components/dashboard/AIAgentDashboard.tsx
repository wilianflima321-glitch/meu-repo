'use client'

/**
 * AETHEL ENGINE - AI Agent Dashboard
 *
 * Dashboard profissional para monitoramento de agentes de IA.
 * Mostra agentes ativos, execucoes, erros, custos e Metricas.
 *
 * Features:
 * - Lista de agentes ativos com status
 * - Historico de execucoes
 * - Metricas de custo (tokens/API calls)
 * - Log de erros e warnings
 * - Controle de sandbox
 *
 * @module components/dashboard/AIAgentDashboard
 */

import React, { useState, useEffect, useCallback } from 'react'
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

// ============================================================================
// TYPES
// ============================================================================

type AgentStatus = 'idle' | 'running' | 'waiting' | 'error' | 'completed'
type AgentType = 'code' | 'web' | 'file' | 'terminal' | 'vision' | 'custom'

interface AIAgent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  currentTask?: string
  progress: number
  startedAt?: Date
  tokensUsed: number
  apiCalls: number
  errors: number
  lastError?: string
  model: string
  sandboxed: boolean
}

interface AgentExecution {
  id: string
  agentId: string
  agentName: string
  task: string
  status: 'success' | 'error' | 'cancelled'
  startTime: Date
  endTime: Date
  duration: number
  tokensUsed: number
  cost: number
  error?: string
}

interface AgentMetrics {
  totalAgents: number
  activeAgents: number
  totalExecutions: number
  successRate: number
  totalTokensUsed: number
  totalCost: number
  avgExecutionTime: number
  errorsToday: number
}

interface AIAgentDashboardProps {
  className?: string
  onAgentSelect?: (agent: AIAgent) => void
  onKillAgent?: (agentId: string) => void
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Robot: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Stop: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  Code: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Globe: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Terminal: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Cog: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Dollar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
}

// ============================================================================
// UTILITIES
// ============================================================================

function getAgentTypeIcon(type: AgentType) {
  switch (type) {
    case 'code': return <Icons.Code />
    case 'web': return <Icons.Globe />
    case 'file': return <Icons.Folder />
    case 'terminal': return <Icons.Terminal />
    case 'vision': return <Icons.Eye />
    default: return <Icons.Cog />
  }
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'running': return 'text-[var(--aethel-success-light)]'
    case 'waiting': return 'text-[var(--aethel-warning)]'
    case 'error': return 'text-[var(--aethel-error)]'
    case 'completed': return 'text-[var(--aethel-primary-light)]'
    default: return 'text-[var(--aethel-text-secondary)]'
  }
}

function getStatusBg(status: AgentStatus): string {
  switch (status) {
    case 'running': return 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
    case 'waiting': return 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]'
    case 'error': return 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]'
    case 'completed': return 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]'
    default: return 'bg-[var(--aethel-surface-secondary)]/20'
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
  return `${(tokens / 1000000).toFixed(2)}M`
}

const PANEL_CLASS = 'rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] shadow-[0_18px_48px_rgba(2,6,23,0.18)]'
const GHOST_BUTTON_CLASS = `inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] text-[var(--aethel-text-secondary)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]`
const PRIMARY_TAB_CLASS = 'bg-[var(--aethel-primary)] text-white shadow-[0_12px_28px_rgba(79,70,229,0.22)]'
const EMPTY_STATE_CLASS = 'rounded-2xl border border-dashed border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-6 py-12 text-center text-sm text-[var(--aethel-text-secondary)]'

// ============================================================================
// API INTEGRATION
// ============================================================================

async function fetchAgents(): Promise<AIAgent[]> {
  try {
    const res = await fetch('/api/ai/agents')
    if (!res.ok) return []
    const data = await res.json()
    return data.agents || []
  } catch {
    return []
  }
}

async function fetchExecutions(): Promise<AgentExecution[]> {
  try {
    const res = await fetch('/api/ai/agents/executions?limit=20')
    if (!res.ok) return []
    const data = await res.json()
    return data.executions || []
  } catch {
    return []
  }
}

async function fetchMetrics(): Promise<AgentMetrics> {
  try {
    const res = await fetch('/api/ai/agents/metrics')
    if (!res.ok) throw new Error('Failed')
    return await res.json()
  } catch {
    return {
      totalAgents: 0,
      activeAgents: 0,
      totalExecutions: 0,
      successRate: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      avgExecutionTime: 0,
      errorsToday: 0,
    }
  }
}

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
              {metrics.activeAgents} ativos
            </span>
          </div>

          <button type="button" aria-label="Atualizar status dos agentes"
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
            <button type="button" aria-label={`Alternar visualizacao de ${tab === 'agents' ? 'agentes' : tab === 'history' ? 'historico' : 'metricas'}`}
              key={tab}
              onClick={() => setView(tab)}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${CANONICAL_MOTION} ${CANONICAL_FOCUS} ${
                view === tab
                  ? PRIMARY_TAB_CLASS
                  : 'border border-transparent bg-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              {tab === 'agents' ? 'Agentes' : tab === 'history' ? 'Historico' : 'Metricas'}
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
              <div className={EMPTY_STATE_CLASS}>Nenhum agente ativo no momento.</div>
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
                      <div className="text-[var(--aethel-success-light)]" title="Executando em Sandbox">
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
              <div className={EMPTY_STATE_CLASS}>Nenhuma execucao registrada.</div>
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
                label="Agentes Ativos"
                value={`${metrics.activeAgents}/${metrics.totalAgents}`}
                color="text-[var(--aethel-primary-light)]"
              />
              <MetricCard
                icon={<Icons.Check />}
                label="Taxa de Sucesso"
                value={`${metrics.successRate.toFixed(1)}%`}
                color="text-[var(--aethel-success-light)]"
              />
              <MetricCard
                icon={<Icons.Code />}
                label="Tokens Usados"
                value={formatTokens(metrics.totalTokensUsed)}
                color="text-[var(--aethel-primary-light)]"
              />
              <MetricCard
                icon={<Icons.Dollar />}
                label="Custo Total"
                value={formatCost(metrics.totalCost)}
                color="text-[var(--aethel-warning)]"
              />
              <MetricCard
                icon={<Icons.Clock />}
                label="Tempo Medio"
                value={formatDuration(metrics.avgExecutionTime)}
                color="text-[var(--aethel-info)]"
              />
              <MetricCard
                icon={<Icons.Warning />}
                label="Erros Hoje"
                value={metrics.errorsToday.toString()}
                color="text-[var(--aethel-error)]"
              />
            </div>

            {/* Executions Chart - Uses real execution data */}
            <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] rounded-lg border border-[var(--aethel-border-subtle)]">
              <h3 className="text-sm text-[var(--aethel-text-secondary)] mb-3">Execucoes (24h)</h3>
              <div className="h-32 flex items-end gap-1">
                {(() => {
                  // Agrupa execucoes por hora das ultimas 24h
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
                        title={`${count} execucao(oes)  as  ${hour.toString().padStart(2, '0')}:00`}
                      />
                    )
                  })
                })()}
              </div>
              <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)] mt-2">
                <span>00:00</span>
                <span>12:00</span>
                <span>Agora</span>
              </div>
            </div>

            {/* Model Usage - Calculated from real execution data */}
            <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] rounded-lg border border-[var(--aethel-border-subtle)]">
              <h3 className="text-sm text-[var(--aethel-text-secondary)] mb-3">Uso por modelo</h3>
              <div className="space-y-2">
                {(() => {
                  // Agrupa uso por modelo das execucoes + agentes ativos
                  const modelUsage: Record<string, { tokens: number; cost: number }> = {}

                  // Dados dos agentes ativos
                  agents.forEach(agent => {
                    if (!modelUsage[agent.model]) {
                      modelUsage[agent.model] = { tokens: 0, cost: 0 }
                    }
                    modelUsage[agent.model].tokens += agent.tokensUsed
                  })

                  // Dados das execucoes
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
                        Nenhum dado de uso disponivel
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
  icon: React.ReactNode
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




