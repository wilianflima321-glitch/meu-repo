export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
export type JobPriority = 'low' | 'normal' | 'high' | 'critical'

export interface Job {
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

export interface QueueStats {
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
  total: number
  avgProcessingTime: number
  successRate: number
}

export interface JobQueueDashboardProps {
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

export const Icons = {
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

export const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]', text: 'text-[var(--aethel-warning)]', dot: 'bg-[var(--aethel-warning-light)]' },
  running: { bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]', text: 'text-[var(--aethel-info)]', dot: 'bg-[var(--aethel-info-light)] animate-pulse' },
  completed: { bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)]', text: 'text-[var(--aethel-success)]', dot: 'bg-[var(--aethel-success-light)]' },
  failed: { bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]', text: 'text-[var(--aethel-error)]', dot: 'bg-[var(--aethel-error-light)]' },
  cancelled: { bg: 'bg-[color-mix(in_srgb,var(--aethel-border-secondary)_30%,transparent)]', text: 'text-[var(--aethel-text-secondary)]', dot: 'bg-[var(--aethel-text-tertiary)]' },
  timeout: { bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]', text: 'text-[var(--aethel-warning-light)]', dot: 'bg-[var(--aethel-warning)]' },
}

export const PRIORITY_COLORS: Record<JobPriority, string> = {
  critical: 'text-[var(--aethel-error)]',
  high: 'text-[var(--aethel-warning-light)]',
  normal: 'text-[var(--aethel-info)]',
  low: 'text-[var(--aethel-text-secondary)]',
}
