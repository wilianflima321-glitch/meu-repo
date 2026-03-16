'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Cpu,
  HardDrive,
  Layers,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'
type JobType = 'render' | 'build' | 'ai' | 'export' | 'import' | 'other'

interface Job {
  id: string
  type: JobType
  name: string
  status: JobStatus
  progress: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
  metadata?: Record<string, unknown>
  priority: number
  retries: number
  maxRetries: number
}

interface QueueStats {
  pending: number
  running: number
  completed: number
  failed: number
  avgProcessingTime: number
  throughput: number
}

// ============================================================================
// COMPONENTS
// ============================================================================

const STATUS_CONFIG: Record<JobStatus, { color: string; icon: React.ElementType; label: string }> = {
  pending: { color: 'bg-[var(--aethel-warning)]/15 text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]', icon: Clock, label: 'Pendente' },
  running: { color: 'bg-[var(--aethel-info)]/15 text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]', icon: Activity, label: 'Executando' },
  completed: { color: 'bg-[var(--aethel-success)]/15 text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]', icon: CheckCircle2, label: 'Concluido' },
  failed: { color: 'bg-[var(--aethel-error)]/15 text-[var(--aethel-error-light)] border-rose-500/30', icon: XCircle, label: 'Falhou' },
  paused: { color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30', icon: Pause, label: 'Pausado' },
}

const TYPE_CONFIG: Record<JobType, { color: string; label: string }> = {
  render: { color: 'bg-[var(--aethel-info)]/15 text-[var(--aethel-info-light)]', label: 'Render' },
  build: { color: 'bg-orange-500/15 text-orange-300', label: 'Build' },
  ai: { color: 'bg-[var(--aethel-info)]/15 text-[var(--aethel-info-light)]', label: 'AI' },
  export: { color: 'bg-[var(--aethel-success)]/15 text-[var(--aethel-success-light)]', label: 'Export' },
  import: { color: 'bg-blue-500/15 text-[var(--aethel-primary-light)]', label: 'Import' },
  other: { color: 'bg-zinc-500/15 text-zinc-300', label: 'Outro' },
}

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const { color, icon: Icon, label } = STATUS_CONFIG[status]

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

const TypeBadge: React.FC<{ type: JobType }> = ({ type }) => {
  const { color, label } = TYPE_CONFIG[type]
  return <span className={`rounded px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>
}

const ProgressBar: React.FC<{ progress: number; status: JobStatus }> = ({ progress, status }) => {
  const colors: Record<JobStatus, string> = {
    pending: 'bg-[var(--aethel-warning-light)]',
    running: 'bg-[var(--aethel-info-light)]',
    completed: 'bg-[var(--aethel-success-light)]',
    failed: 'bg-[var(--aethel-error-light)]',
    paused: 'bg-zinc-400',
  }

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full ${colors[status]} transition-all duration-300`}
        style={{ width: `${status === 'completed' ? 100 : progress}%` }}
      />
    </div>
  )
}

const JobRow: React.FC<{
  job: Job
  isExpanded: boolean
  onToggle: () => void
  onRetry: () => void
  onCancel: () => void
  onPause: () => void
}> = ({ job, isExpanded, onToggle, onRetry, onCancel, onPause }) => {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <div
        className="flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.04]"
        onClick={onToggle}
      >
        <button className="text-zinc-500">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <TypeBadge type={job.type} />
            <span className="truncate text-sm font-medium text-white">{job.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <ProgressBar progress={job.progress} status={job.status} />
            <span className="whitespace-nowrap text-xs text-zinc-400">
              {job.status === 'completed' ? '100%' : `${job.progress}%`}
            </span>
          </div>
        </div>

        <StatusBadge status={job.status} />

        <div className="flex items-center gap-1">
          {job.status === 'failed' && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onRetry()
              }}
              className="aethel-button aethel-button-ghost rounded-md p-1.5 text-[var(--aethel-info-light)]"
              title="Reenfileirar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {job.status === 'running' && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onPause()
              }}
              className="aethel-button aethel-button-ghost rounded-md p-1.5 text-[var(--aethel-warning-light)]"
              title="Pausar"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          {job.status === 'paused' && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onPause()
              }}
              className="aethel-button aethel-button-ghost rounded-md p-1.5 text-[var(--aethel-success-light)]"
              title="Retomar"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onCancel()
              }}
              className="aethel-button aethel-button-ghost rounded-md p-1.5 text-[var(--aethel-error-light)]"
              title="Cancelar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 bg-white/[0.03] px-4 pb-3">
          <div className="grid gap-4 py-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-500">ID</p>
              <p className="text-xs font-mono text-zinc-300">{job.id.slice(0, 16)}...</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Criado</p>
              <p className="text-sm text-zinc-300">{job.createdAt.toLocaleTimeString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Prioridade</p>
              <p className="text-sm text-zinc-300">{'*'.repeat(job.priority)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Tentativas</p>
              <p className="text-sm text-zinc-300">
                {job.retries}/{job.maxRetries}
              </p>
            </div>
          </div>

          {job.error && (
            <div className="mt-2 rounded-lg border border-rose-500/30 bg-[var(--aethel-error)]/10 p-2 text-sm text-[var(--aethel-error-light)]">
              <strong>Erro:</strong> {job.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const StatsCard: React.FC<{
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}> = ({ label, value, icon, color }) => (
  <div className={`aethel-card aethel-p-4 ${color}`}>
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-white/[0.05] p-2 text-zinc-400">{icon}</div>
      <div>
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-sm text-zinc-500">{label}</p>
      </div>
    </div>
  </div>
)

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const JobQueueDashboard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<JobType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch('/api/admin/jobs'),
        fetch('/api/admin/jobs/stats'),
      ])

      if (!jobsRes.ok) {
        throw new Error(`Falha ao carregar jobs: ${jobsRes.status}`)
      }
      if (!statsRes.ok) {
        throw new Error(`Falha ao carregar estatisticas: ${statsRes.status}`)
      }

      const jobsData = await jobsRes.json()
      const statsData = await statsRes.json()

      setJobs(
        jobsData.jobs?.map((job: Job) => ({
          ...job,
          createdAt: new Date(job.createdAt),
          startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
          completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        })) || [],
      )
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsRefreshing(false)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 10000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const filteredJobs = jobs.filter((job) => {
    if (filterStatus !== 'all' && job.status !== filterStatus) return false
    if (filterType !== 'all' && job.type !== filterType) return false
    if (searchQuery && !job.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${id}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao reenfileirar job')
      await fetchJobs()
    } catch {
      setError('Falha ao reenfileirar job')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao cancelar job')
      await fetchJobs()
    } catch {
      setError('Falha ao cancelar job')
    }
  }

  const handlePause = async (id: string) => {
    const job = jobs.find((item) => item.id === id)
    const action = job?.status === 'paused' ? 'resume' : 'pause'
    try {
      const res = await fetch(`/api/admin/jobs/${id}/${action}`, { method: 'POST' })
      if (!res.ok) throw new Error(`Falha ao ${action} job`)
      await fetchJobs()
    } catch {
      setError(`Falha ao ${action} job`)
    }
  }

  if (isLoading) {
    return (
      <div className={`aethel-card ${className}`}>
        <div className="aethel-state aethel-state-loading h-64">Carregando fila de jobs...</div>
      </div>
    )
  }

  return (
    <div className={`aethel-card ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-[var(--aethel-info-light)]" />
          <div>
            <h2 className="text-base font-semibold text-white">Fila de jobs</h2>
            <p className="text-xs text-zinc-500">{jobs.length} jobs no total</p>
          </div>
        </div>

        <button
          onClick={fetchJobs}
          disabled={isRefreshing}
          className="aethel-button aethel-button-primary flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="aethel-state aethel-state-error mx-4 mt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Pendentes"
            value={stats.pending}
            icon={<Clock className="h-5 w-5 text-[var(--aethel-warning-light)]" />}
            color="border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-warning)]/5"
          />
          <StatsCard
            label="Executando"
            value={stats.running}
            icon={<Cpu className="h-5 w-5 text-[var(--aethel-info-light)]" />}
            color="border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[var(--aethel-info)]/5"
          />
          <StatsCard
            label="Concluidos"
            value={stats.completed}
            icon={<CheckCircle2 className="h-5 w-5 text-[var(--aethel-success-light)]" />}
            color="border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/5"
          />
          <StatsCard
            label="Falhos"
            value={stats.failed}
            icon={<AlertTriangle className="h-5 w-5 text-[var(--aethel-error-light)]" />}
            color="border border-rose-500/30 bg-[var(--aethel-error)]/5"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar jobs..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="aethel-input w-full pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as JobStatus | 'all')}
            className="aethel-input text-xs"
          >
            <option value="all">Todos status</option>
            <option value="pending">Pendente</option>
            <option value="running">Executando</option>
            <option value="completed">Concluido</option>
            <option value="failed">Falhou</option>
          </select>

          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as JobType | 'all')}
            className="aethel-input text-xs"
          >
            <option value="all">Todos tipos</option>
            <option value="render">Render</option>
            <option value="build">Build</option>
            <option value="ai">AI</option>
            <option value="export">Export</option>
            <option value="import">Import</option>
            <option value="other">Outro</option>
          </select>
        </div>
      </div>

      <div className="max-h-[500px] space-y-3 overflow-y-auto px-4 pb-4">
        {filteredJobs.length === 0 ? (
          <div className="aethel-state aethel-state-empty">
            <HardDrive className="mb-2 h-10 w-10 text-zinc-500" />
            <p>Nenhum job encontrado.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              isExpanded={expandedIds.has(job.id)}
              onToggle={() => toggleExpanded(job.id)}
              onRetry={() => handleRetry(job.id)}
              onCancel={() => handleCancel(job.id)}
              onPause={() => handlePause(job.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default JobQueueDashboard
