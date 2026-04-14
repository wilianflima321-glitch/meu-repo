'use client'

/**
 * AETHEL ENGINE - Job Queue Dashboard
 * ====================================
 *
 * Professional monitoring UI for the Persistent Job Queue.
 * Real-time visualization of job processing, stats, and history.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

// ============================================================================
// TYPES
// ============================================================================

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
type JobPriority = 'low' | 'normal' | 'high' | 'critical'

interface Job {
  id: string
  type: string
  priority: JobPriority
  status: JobStatus
  payload: unknown
  result: unknown
  error: string
  progress: number
  retryCount: number
  maxRetries: number
  createdAt: string
  startedAt: string
  completedAt: string
  timeoutMs: number
  scheduledAt: string
  workerId: string
  metadata: Record<string, unknown>
}

interface QueueStats {
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
  total: number
  avgProcessingTime: number
  successRate: number
}

interface JobQueueDashboardProps {
  /** WebSocket URL for real-time updates */
  wsUrl?: string
  /** HTTP API base URL */
  apiUrl?: string
  /** Refresh interval in ms */
  refreshInterval?: number
  /** Custom class name */
  className?: string
  /** Jobs per page */
  pageSize?: number
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Play: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Pause: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  X: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  Trash: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Filter: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Server: () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
}

// ============================================================================
// STATUS COLORS
// ============================================================================

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]', text: 'text-[var(--aethel-warning)]', dot: 'bg-[var(--aethel-warning-light)]' },
  running: { bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]', text: 'text-[var(--aethel-info)]', dot: 'bg-[var(--aethel-info-light)] animate-pulse' },
  completed: { bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)]', text: 'text-[var(--aethel-success)]', dot: 'bg-[var(--aethel-success-light)]' },
  failed: { bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]', text: 'text-[var(--aethel-error)]', dot: 'bg-[var(--aethel-error-light)]' },
  cancelled: { bg: 'bg-[color-mix(in_srgb,var(--aethel-border-secondary)_30%,transparent)]', text: 'text-[var(--aethel-text-secondary)]', dot: 'bg-[var(--aethel-text-tertiary)]' },
  timeout: { bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]', text: 'text-[var(--aethel-warning-light)]', dot: 'bg-[var(--aethel-warning)]' },
}

const PRIORITY_COLORS: Record<JobPriority, string> = {
  critical: 'text-[var(--aethel-error)]',
  high: 'text-[var(--aethel-warning-light)]',
  normal: 'text-[var(--aethel-info)]',
  low: 'text-[var(--aethel-text-secondary)]',
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; isUp: boolean }
  color?: string
}

function StatCard({ label, value, icon, trend, color = 'text-[var(--aethel-text-primary)]' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4">
      <div className="flex items-center justify-between text-xs text-[var(--aethel-text-tertiary)]">
        <span>{label}</span>
        <span className="text-[var(--aethel-text-tertiary)]">{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>
        {typeof value === 'number' && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </div>
      {trend && (
        <div className={`mt-2 text-xs ${trend.isUp ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]'}`}>
          {trend.isUp ? 'up' : 'down'} {trend.value}% da ultima hora
        </div>
      )}
    </div>
  )
}

// ============================================================================
// JOB ROW
// ============================================================================

interface JobRowProps {
  job: Job
  isExpanded: boolean
  onToggle: () => void
  onRetry: (id: string) => void
  onCancel: (id: string) => void
}

function JobRow({ job, isExpanded, onToggle, onRetry, onCancel }: JobRowProps) {
  const statusColor = STATUS_COLORS[job.status]
  const priorityColor = PRIORITY_COLORS[job.priority]

  const formatTime = (date: string) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleTimeString()
  }

  const formatDuration = (start: string, end: string) => {
    if (!start) return '-'
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const diff = endDate.getTime() - startDate.getTime()

    if (diff < 1000) return `${diff}ms`
    if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`
    return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`
  }

  return (
    <div className="border-b border-[var(--aethel-border-subtle)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)]">
      <div className="flex cursor-pointer items-center gap-4 px-4 py-3" onClick={onToggle}>
        <span className={`text-[var(--aethel-text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <Icons.ChevronDown />
        </span>

        <div className={`flex items-center gap-2 rounded px-2 py-1 ${statusColor.bg}`}>
          <span className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
          <span className={`text-xs font-semibold uppercase ${statusColor.text}`}>{job.status}</span>
        </div>

        <div className="w-24">
          <span className="font-mono text-sm text-[var(--aethel-text-primary)]">{job.type}</span>
        </div>

        <div className="w-16">
          <span className={`text-xs font-semibold uppercase ${priorityColor}`}>{job.priority}</span>
        </div>

        <div className="w-32">
          {job.status === 'running' ? (
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
                <div
                  className="h-full bg-[var(--aethel-info-light)] transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-[var(--aethel-text-secondary)]">{job.progress.toFixed(0)}%</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--aethel-text-tertiary)]">-</span>
          )}
        </div>

        <div className="w-24 text-right">
          <span className="text-xs text-[var(--aethel-text-secondary)]">{formatDuration(job.startedAt, job.completedAt)}</span>
        </div>

        <div className="w-20 text-right">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{formatTime(job.createdAt)}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {(job.status === 'failed' || job.status === 'cancelled') && (
            <button type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRetry(job.id)
              }}
              className={`rounded-xl p-1.5 text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:text-[var(--aethel-info-light)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
              title="Tentar novamente"
              aria-label={`Tentar novamente job ${job.id}`}
            >
              <Icons.Refresh />
            </button>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <button type="button"
              onClick={(event) => {
                event.stopPropagation()
                onCancel(job.id)
              }}
              className={`rounded-xl p-1.5 text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:text-[var(--aethel-error)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
              title="Cancelar"
              aria-label={`Cancelar job ${job.id}`}
            >
              <Icons.X />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] px-4 py-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--aethel-text-tertiary)]">Detalhes do job</h4>
              <dl className="space-y-1">
                <div className="flex">
                  <dt className="w-24 text-xs text-[var(--aethel-text-tertiary)]">ID:</dt>
                  <dd className="text-xs font-mono text-[var(--aethel-text-secondary)]">{job.id}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-[var(--aethel-text-tertiary)]">Worker:</dt>
                  <dd className="text-xs font-mono text-[var(--aethel-text-secondary)]">{job.workerId || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-[var(--aethel-text-tertiary)]">Retries:</dt>
                  <dd className="text-xs text-[var(--aethel-text-secondary)]">
                    {job.retryCount} / {job.maxRetries}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-[var(--aethel-text-tertiary)]">Timeout:</dt>
                  <dd className="text-xs text-[var(--aethel-text-secondary)]">{job.timeoutMs / 1000}s</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--aethel-text-tertiary)]">Payload</h4>
              <pre className="max-h-32 overflow-auto rounded-md bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-2 text-xs font-mono text-[var(--aethel-text-secondary)]">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            </div>
          </div>

          {Boolean(job.error) && (
            <div className="mt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--aethel-error)]">Erro</h4>
              <div className="rounded-md bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-2 text-xs font-mono text-[var(--aethel-error)]">
                {String(job.error)}
              </div>
            </div>
          )}

          {Boolean(job.result) && (
            <div className="mt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--aethel-success)]">Resultado</h4>
              <pre className="max-h-32 overflow-auto rounded-md bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] p-2 text-xs font-mono text-[var(--aethel-success-light)]">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function JobQueueDashboard({
  wsUrl = '',
  apiUrl = '/api/jobs',
  refreshInterval = 5000,
  className = '',
  pageSize = 20,
}: JobQueueDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [isQueueRunning, setIsQueueRunning] = useState(true)
  const shellClass =
    'flex h-full flex-col rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] shadow-[0_24px_80px_rgba(2,6,23,0.22)]'
  const primaryButtonClass = `inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const ghostButtonClass = `inline-flex items-center justify-center rounded-2xl p-2 text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const inputClass = `w-full rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [jobsRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}?page=${page}&limit=${pageSize}&status=${filter}`),
        fetch(`${apiUrl}/stats`),
      ])

      if (!jobsRes.ok) {
        throw new Error(`Falha ao buscar jobs: ${jobsRes.status}`)
      }
      if (!statsRes.ok) {
        throw new Error(`Falha ao buscar estatisticas: ${statsRes.status}`)
      }

      const jobsData = await jobsRes.json()
      const statsData = await statsRes.json()

      setJobs(jobsData.jobs || [])
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao buscar dados')
    } finally {
      setIsLoading(false)
    }
  }, [page, filter, apiUrl, pageSize])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  useEffect(() => {
    if (!wsUrl) return

    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'job:update') {
          setJobs((prev) => prev.map((job) => (job.id === data.job.id ? data.job : job)))
        } else if (data.type === 'job:new') {
          setJobs((prev) => [data.job, ...prev].slice(0, pageSize))
        } else if (data.type === 'stats:update') {
          setStats(data.stats)
        }
      } catch {
        // ignore malformed payloads
      }
    }

    return () => ws.close()
  }, [wsUrl, pageSize])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filter !== 'all' && job.status !== filter) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return job.id.toLowerCase().includes(query) || job.type.toLowerCase().includes(query)
      }
      return true
    })
  }, [jobs, filter, searchQuery])

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/${id}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao reenfileirar job')
      fetchData()
    } catch {
      setError('Falha ao reenfileirar job')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/${id}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao cancelar job')
      fetchData()
    } catch {
      setError('Falha ao cancelar job')
    }
  }

  const handleToggleQueue = async () => {
    try {
      const res = await fetch(`${apiUrl}/${isQueueRunning ? 'stop' : 'start'}`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao alternar fila')
      setIsQueueRunning(!isQueueRunning)
    } catch {
      setError('Falha ao alternar fila')
    }
  }

  if (isLoading && jobs.length === 0) {
    return (
      <div className={`flex h-64 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-sm text-[var(--aethel-info-light)] ${className}`} role="status">
        Carregando fila de jobs...
      </div>
    )
  }

  return (
    <div className={`${shellClass} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Icons.Server />
          <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">Fila de jobs</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isQueueRunning ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
            }`}
          >
            {isQueueRunning ? 'Executando' : 'Pausada'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button"
            onClick={handleToggleQueue}
            className={`${primaryButtonClass} ${
              isQueueRunning
                ? 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)]'
                : 'bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] shadow-[0_14px_32px_rgba(56,189,248,0.24)]'
            }`}
            aria-label={isQueueRunning ? 'Pausar fila de jobs' : 'Iniciar fila de jobs'}
          >
            <span className="flex items-center gap-2">
              {isQueueRunning ? <Icons.Pause /> : <Icons.Play />}
              {isQueueRunning ? 'Pausar fila' : 'Iniciar fila'}
            </span>
          </button>
          <button type="button"
            onClick={fetchData}
            className={ghostButtonClass}
            title="Atualizar"
            aria-label="Atualizar fila de jobs"
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 border-b border-[var(--aethel-border-subtle)] p-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pendentes" value={stats.pending} icon={<Icons.Clock />} color="text-[var(--aethel-warning)]" />
          <StatCard label="Executando" value={stats.running} icon={<Icons.Play />} color="text-[var(--aethel-info)]" />
          <StatCard label="Concluidos" value={stats.completed} icon={<Icons.Check />} color="text-[var(--aethel-success)]" />
          <StatCard
            label="Taxa de sucesso"
            value={`${(stats.successRate * 100).toFixed(1)}%`}
            icon={<Icons.Check />}
            color={stats.successRate > 0.9 ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-warning)]'}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)]">
          <Icons.Filter />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as JobStatus | 'all')}
            className={inputClass}
            aria-label="Filtrar jobs por status"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="running">Executando</option>
            <option value="completed">Concluido</option>
            <option value="failed">Falhou</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por ID ou tipo..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={inputClass}
            aria-label="Buscar jobs por id ou tipo"
          />
        </div>

        <div className="text-xs text-[var(--aethel-text-tertiary)]">{filteredJobs.length} jobs</div>
      </div>

      {error && (
        <div className="border-b border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error)]">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 flex items-center gap-4 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-[10px] uppercase text-[var(--aethel-text-tertiary)]">
          <span className="w-4"></span>
          <span className="w-20">Status</span>
          <span className="w-24">Tipo</span>
          <span className="w-16">Prioridade</span>
          <span className="w-32">Progresso</span>
          <span className="w-24 text-right">Duracao</span>
          <span className="w-20 text-right">Criado</span>
          <span className="ml-auto w-16">Acoes</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="m-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-6 text-sm text-[var(--aethel-text-tertiary)]">Nenhum job encontrado.</div>
        ) : (
          filteredJobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              isExpanded={expandedJobId === job.id}
              onToggle={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
              onRetry={handleRetry}
              onCancel={handleCancel}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--aethel-border-subtle)] px-4 py-3">
        <button type="button"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`${ghostButtonClass} text-xs disabled:opacity-50`}
          aria-label="Pagina anterior da fila"
        >
          &lt; Anterior
        </button>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">Pagina {page}</span>
        <button type="button"
          onClick={() => setPage(page + 1)}
          disabled={filteredJobs.length < pageSize}
          className={`${ghostButtonClass} text-xs disabled:opacity-50`}
          aria-label="Proxima pagina da fila"
        >
          Proxima &gt;
        </button>
      </div>
    </div>
  )
}

export default JobQueueDashboard
