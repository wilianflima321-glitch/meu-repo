'use client'

/**
 * AETHEL ENGINE - Job Queue Dashboard
 * ====================================
 *
 * Professional monitoring UI for the Persistent Job Queue.
 * Real-time visualization of job processing, stats, and history.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import {
  Icons,
  PRIORITY_COLORS,
  STATUS_COLORS,
  type Job,
  type JobPriority,
  type JobQueueDashboardProps,
  type JobStatus,
  type QueueStats,
} from './JobQueueDashboard.model'

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
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
          {trend.isUp ? 'up' : 'down'} {trend.value}% in the last hour
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
            <button type="button" aria-label={`Retry job ${job.id}`}
              onClick={(event) => {
                event.stopPropagation()
                onRetry(job.id)
              }}
              className={`rounded-xl p-1.5 text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:text-[var(--aethel-info-light)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
              title="Retry"
            >
              <Icons.Refresh />
            </button>
          )}
          {(job.status === 'pending' || job.status === 'running') && (
            <button type="button" aria-label={`Cancel job ${job.id}`}
              onClick={(event) => {
                event.stopPropagation()
                onCancel(job.id)
              }}
              className={`rounded-xl p-1.5 text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:text-[var(--aethel-error)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
              title="Cancel"
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
              <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--aethel-text-tertiary)]">Job details</h4>
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
              <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--aethel-error)]">Error</h4>
              <div className="rounded-md bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-2 text-xs font-mono text-[var(--aethel-error)]">
                {String(job.error)}
              </div>
            </div>
          )}

          {Boolean(job.result) && (
            <div className="mt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase text-[var(--aethel-success)]">Result</h4>
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
        throw new Error(`Failed to fetch jobs: ${jobsRes.status}`)
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats: ${statsRes.status}`)
      }

      const jobsData = await jobsRes.json()
      const statsData = await statsRes.json()

      setJobs(jobsData.jobs || [])
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
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
      if (!res.ok) throw new Error('Failed to requeue job')
      fetchData()
    } catch {
      setError('Failed to requeue job')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/${id}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to cancel job')
      fetchData()
    } catch {
      setError('Failed to cancel job')
    }
  }

  const handleToggleQueue = async () => {
    try {
      const res = await fetch(`${apiUrl}/${isQueueRunning ? 'stop' : 'start'}`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to toggle queue')
      setIsQueueRunning(!isQueueRunning)
    } catch {
      setError('Failed to toggle queue')
    }
  }

  if (isLoading && jobs.length === 0) {
    return (
      <div className={`flex h-64 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-sm text-[var(--aethel-info-light)] ${className}`} role="status">
        Loading job queue...
      </div>
    )
  }

  return (
    <div className={`${shellClass} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Icons.Server />
          <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">Job queue</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isQueueRunning ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
            }`}
          >
            {isQueueRunning ? 'Running' : 'Paused'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label={isQueueRunning ? 'Pause job queue' : 'Start job queue'}
            onClick={handleToggleQueue}
            className={`${primaryButtonClass} ${
              isQueueRunning
                ? 'border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)]'
                : 'bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] shadow-[0_14px_32px_rgba(56,189,248,0.24)]'
            }`}
          >
            <span className="flex items-center gap-2">
              {isQueueRunning ? <Icons.Pause /> : <Icons.Play />}
              {isQueueRunning ? 'Pause queue' : 'Start queue'}
            </span>
          </button>
          <button type="button" aria-label="Refresh job queue"
            onClick={fetchData}
            className={ghostButtonClass}
            title="Refresh"
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 border-b border-[var(--aethel-border-subtle)] p-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending" value={stats.pending} icon={<Icons.Clock />} color="text-[var(--aethel-warning)]" />
        <StatCard label="Running" value={stats.running} icon={<Icons.Play />} color="text-[var(--aethel-info)]" />
          <StatCard label="Completed" value={stats.completed} icon={<Icons.Check />} color="text-[var(--aethel-success)]" />
          <StatCard
            label="Success rate"
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
            aria-label="Filter jobs by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by ID or type..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={inputClass}
            aria-label="Search jobs by ID or type"
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
          <span className="w-24">Type</span>
          <span className="w-16">Priority</span>
          <span className="w-32">Progress</span>
          <span className="w-24 text-right">Duration</span>
          <span className="w-20 text-right">Created</span>
          <span className="ml-auto w-16">Actions</span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="m-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-6 text-sm text-[var(--aethel-text-tertiary)]">No jobs found.</div>
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
        <button type="button" aria-label="Previous queue page"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`${ghostButtonClass} text-xs disabled:opacity-50`}
        >
          &lt; Previous
        </button>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">Page {page}</span>
        <button type="button" aria-label="Next queue page"
          onClick={() => setPage(page + 1)}
          disabled={filteredJobs.length < pageSize}
          className={`${ghostButtonClass} text-xs disabled:opacity-50`}
        >
          Next &gt;
        </button>
      </div>
    </div>
  )
}

export default JobQueueDashboard
