import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

export type AgentStatus = 'idle' | 'running' | 'waiting' | 'error' | 'completed'
export type AgentType = 'code' | 'web' | 'file' | 'terminal' | 'vision' | 'custom'

export interface AIAgent {
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

export interface AgentExecution {
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

export interface AgentMetrics {
  totalAgents: number
  activeAgents: number
  totalExecutions: number
  successRate: number
  totalTokensUsed: number
  totalCost: number
  avgExecutionTime: number
  errorsToday: number
}

export interface AIAgentDashboardProps {
  className?: string
  onAgentSelect?: (agent: AIAgent) => void
  onKillAgent?: (agentId: string) => void
}

export const Icons = {
  Robot: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Play: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Stop: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  Code: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  Globe: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  Folder: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Terminal: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Eye: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Cog: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Warning: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Dollar: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Shield: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
}

export function getAgentTypeIcon(type: AgentType) {
  switch (type) {
    case 'code': return <Icons.Code />
    case 'web': return <Icons.Globe />
    case 'file': return <Icons.Folder />
    case 'terminal': return <Icons.Terminal />
    case 'vision': return <Icons.Eye />
    default: return <Icons.Cog />
  }
}

export function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'running': return 'text-[var(--aethel-success-light)]'
    case 'waiting': return 'text-[var(--aethel-warning)]'
    case 'error': return 'text-[var(--aethel-error)]'
    case 'completed': return 'text-[var(--aethel-primary-light)]'
    default: return 'text-[var(--aethel-text-secondary)]'
  }
}

export function getStatusBg(status: AgentStatus): string {
  switch (status) {
    case 'running': return 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
    case 'waiting': return 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]'
    case 'error': return 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]'
    case 'completed': return 'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]'
    default: return 'bg-[var(--aethel-surface-secondary)]/20'
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
  return `${(tokens / 1000000).toFixed(2)}M`
}

export const PANEL_CLASS = 'rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] shadow-[0_18px_48px_rgba(2,6,23,0.18)]'
export const GHOST_BUTTON_CLASS = `inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] text-[var(--aethel-text-secondary)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]`
export const PRIMARY_TAB_CLASS = 'bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] shadow-[0_12px_28px_rgba(79,70,229,0.22)]'
export const EMPTY_STATE_CLASS = 'rounded-2xl border border-dashed border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-6 py-12 text-center text-sm text-[var(--aethel-text-secondary)]'

export async function fetchAgents(): Promise<AIAgent[]> {
  try {
    const res = await fetch('/api/ai/agents')
    if (!res.ok) return []
    const data = await res.json()
    return data.agents || []
  } catch {
    return []
  }
}

export async function fetchExecutions(): Promise<AgentExecution[]> {
  try {
    const res = await fetch('/api/ai/agents/executions?limit=20')
    if (!res.ok) return []
    const data = await res.json()
    return data.executions || []
  } catch {
    return []
  }
}

export async function fetchMetrics(): Promise<AgentMetrics> {
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
