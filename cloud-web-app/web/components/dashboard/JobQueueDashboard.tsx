'use client'

/**
 * AETHEL ENGINE - Job Queue Dashboard
 * ====================================
 *
 * Professional monitoring UI for the Persistent Job Queue.
 * Real-time visualization of job processing, stats, and history.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'

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
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  running: { bg: 'bg-sky-500/20', text: 'text-sky-300', dot: 'bg-sky-400 animate-pulse' },
  completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  failed: { bg: 'bg-rose-500/20', text: 'text-rose-300', dot: 'bg-rose-400' },
  cancelled: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', dot: 'bg-zinc-400' },
  timeout: { bg: 'bg-orange-500/20', text: 'text-orange-300', dot: 'bg-orange-400' },
}

const PRIORITY_COLORS: Record<JobPriority, string> = {
  critical: 'text-rose-300',
  high: 'text-orange-300',
  normal: 'text-sky-300',
  low: 'text-zinc-400',
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

function StatCard({ label, value, icon, trend, color = 'text-white' }: StatCardProps) {
  return (
    <div className="aethel-card aethel-p-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span className="text-zinc-600">{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>
        {typeof value === 'number' && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </div>
      {trend && (
        <div className={`mt-2 text-xs ${trend.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
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
    <div className="border-b border-white/10 transition-colors hover:bg-white/[0.03]">
      <div className="flex cursor-pointer items-center gap-4 px-4 py-3" onClick={onToggle}>
        <span className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <Icons.ChevronDown />
        </span>

        <div className={`flex items-center gap-2 rounded px-2 py-1 ${statusColor.bg}`}>
          <span className={`h-2 w-2 rounded-full ${statusColor.dot}`} />
          <span className={`text-xs font-semibold uppercase ${statusColor.text}`}>{job.status}</span>
        </div>

        <div className="w-24">
          <span className="font-mono text-sm text-white">{job.type}</span>
        </div>

        <div className="w-16">
          <span className={`text-xs font-semibold uppercase ${priorityColor}`}>{job.priority}</span>
        </div>

        <div className="w-32">
          {job.status === 'running' ? (
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-sky-400 transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-zinc-400">{job.progress.toFixed(0)}%</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">-</span>
          )}
        </div>

        <div className="w-24 text-right">
          <span className="text-xs text-zinc-400">{formatDuration(job.startedAt, job.completedAt)}</span>
        </div>

        <div className="w-20 text-right">
          <span className="text-xs text-zinc-500">{formatTime(job.createdAt)}</span>
        </div>

        <div className="ml-auto flex items-center gap-1">
          {(job.status === 'failed' || job.status === 'cancelled') && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onRetry(job.id)
              }}
              className="aethel-button aethel-button-ghost rounded-md p-1.5 text-zinc-300 hover:text-sky-200"
              title="Tentar novamente"
            >
              <Icons.Refresh />
            </button>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onCancel(job.id)
              }}
              className="aethel-button aethel-button-ghost rounded-md p-1.5 text-zinc-300 hover:text-rose-200"
              title="Cancelar"
            >
              <Icons.X />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 bg-white/[0.02] px-4 py-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-500">Detalhes do job</h4>
              <dl className="space-y-1">
                <div className="flex">
                  <dt className="w-24 text-xs text-zinc-500">ID:</dt>
                  <dd className="text-xs font-mono text-zinc-300">{job.id}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-zinc-500">Worker:</dt>
                  <dd className="text-xs font-mono text-zinc-300">{job.workerId || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-zinc-500">Retries:</dt>
                  <dd className="text-xs text-zinc-300">
                    {job.retryCount} / {job.maxRetries}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="w-24 text-xs text-zinc-500">Timeout:</dt>
                  <dd className="text-xs text-zinc-300">{job.timeoutMs / 1000}s</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-500">Payload</h4>
              <pre className="max-h-32 overflow-auto rounded-md bg-white/[0.04] p-2 text-xs font-mono text-zinc-300">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            </div>
          </div>

          {Boolean(job.error) && (
            <div className="mt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-rose-300">Erro</h4>
              <div className="rounded-md bg-rose-500/10 p-2 text-xs font-mono text-rose-200">
                {String(job.error)}
              </div>
            </div>
          )}

          {Boolean(job.result) && (
            <div className="mt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-emerald-300">Resultado</h4>
              <pre className="max-h-32 overflow-auto rounded-md bg-emerald-500/10 p-2 text-xs font-mono text-emerald-200">
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
      <div className={`aethel-state aethel-state-loading h-64 ${className}`} role="status">
        Carregando fila de jobs...
      </div>
    )
  }

  return (
    <div className={`aethel-card flex h-full flex-col ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Icons.Server />
          <h2 className="text-base font-semibold text-white">Fila de jobs</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isQueueRunning ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'
            }`}
          >
            {isQueueRunning ? 'Executando' : 'Pausada'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleQueue}
            className={`aethel-button rounded-lg px-3 py-2 text-xs font-semibold ${
              isQueueRunning ? 'aethel-button-secondary' : 'aethel-button-primary'
            }`}
          >
            <span className="flex items-center gap-2">
              {isQueueRunning ? <Icons.Pause /> : <Icons.Play />}
              {isQueueRunning ? 'Pausar fila' : 'Iniciar fila'}
            </span>
          </button>
          <button
            onClick={fetchData}
            className="aethel-button aethel-button-ghost rounded-lg p-2"
            title="Atualizar"
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 border-b border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pendentes" value={stats.pending} icon={<Icons.Clock />} color="text-yellow-300" />
          <StatCard label="Executando" value={stats.running} icon={<Icons.Play />} color="text-sky-300" />
          <StatCard label="Concluidos" value={stats.completed} icon={<Icons.Check />} color="text-emerald-300" />
          <StatCard
            label="Taxa de sucesso"
            value={`${(stats.successRate * 100).toFixed(1)}%`}
            icon={<Icons.Check />}
            color={stats.successRate > 0.9 ? 'text-emerald-300' : 'text-yellow-300'}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <Icons.Filter />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as JobStatus | 'all')}
            className="aethel-input text-xs"
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
            className="aethel-input w-full text-xs"
          />
        </div>

        <div className="text-xs text-zinc-500">{filteredJobs.length} jobs</div>
      </div>

      {error && (
        <div className="aethel-state aethel-state-error border-b border-rose-500/40">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 flex items-center gap-4 border-b border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] uppercase text-zinc-500">
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
          <div className="aethel-state aethel-state-empty m-4">Nenhum job encontrado.</div>
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

      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="aethel-button aethel-button-ghost text-xs disabled:opacity-50"
        >
          &lt; Anterior
        </button>
        <span className="text-xs text-zinc-500">Pagina {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={filteredJobs.length < pageSize}
          className="aethel-button aethel-button-ghost text-xs disabled:opacity-50"
        >
          Proxima &gt;
        </button>
      </div>
    </div>
  )
}

export default JobQueueDashboard
