import { AlertCircle, CheckCircle, Clock, Loader2, Pause, X } from 'lucide-react'

export type RenderJobStatus =
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'compositing'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'

export interface RenderFrame {
  frame: number
  status: 'pending' | 'rendering' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  thumbnail?: string
}

export interface RenderJob {
  id: string
  name: string
  type: 'image' | 'animation' | 'sequence'
  status: RenderJobStatus
  progress: number
  currentFrame: number
  totalFrames: number
  startTime?: number
  endTime?: number
  estimatedTimeRemaining?: number
  thumbnail?: string
  output?: string
  error?: string
  resolution: { width: number; height: number }
  samples: number
  engine: 'cycles' | 'eevee' | 'workbench'
  frames?: RenderFrame[]
  renderTime?: number
  peakMemory?: number
}

export interface RenderProgressProps {
  job: RenderJob
  onPause?: (jobId: string) => void
  onResume?: (jobId: string) => void
  onCancel?: (jobId: string) => void
  onRetry?: (jobId: string) => void
  onDownload?: (jobId: string, output: string) => void
  onViewFull?: (thumbnail: string) => void
  className?: string
  compact?: boolean
}

export interface RenderQueueProps {
  jobs: RenderJob[]
  onPause?: (jobId: string) => void
  onResume?: (jobId: string) => void
  onCancel?: (jobId: string) => void
  onRetry?: (jobId: string) => void
  onClearCompleted?: () => void
  className?: string
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function formatTimeRemaining(ms: number): string {
  if (ms < 60000) return '< 1 min'

  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `~${hours}h ${minutes % 60}m left`
  }
  return `~${minutes}m left`
}

export function getStatusColor(status: RenderJobStatus): string {
  switch (status) {
    case 'completed':
      return 'text-[var(--aethel-success-light)]'
    case 'rendering':
    case 'compositing':
      return 'text-[var(--aethel-primary)]'
    case 'preparing':
    case 'finalizing':
    case 'paused':
      return 'text-[var(--aethel-warning)]'
    case 'queued':
      return 'text-[var(--aethel-text-secondary)]'
    case 'failed':
    case 'cancelled':
      return 'text-[var(--aethel-error)]'
    default:
      return 'text-[var(--aethel-text-tertiary)]'
  }
}

export function getStatusBg(status: RenderJobStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
    case 'rendering':
    case 'compositing':
      return 'bg-[var(--aethel-primary)]'
    case 'preparing':
    case 'finalizing':
    case 'paused':
      return 'bg-[var(--aethel-warning)]'
    case 'queued':
      return 'bg-[var(--aethel-surface-secondary)]'
    case 'failed':
    case 'cancelled':
      return 'bg-[var(--aethel-error)]'
    default:
      return 'bg-[var(--aethel-surface-secondary)]'
  }
}

export function getStatusLabel(status: RenderJobStatus): string {
  switch (status) {
    case 'queued': return 'Queued'
    case 'preparing': return 'Preparing'
    case 'rendering': return 'Rendering'
    case 'compositing': return 'Compositing'
    case 'finalizing': return 'Finalizing'
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    case 'cancelled': return 'Cancelled'
    case 'paused': return 'Paused'
    default: return status
  }
}

interface StatusIconProps {
  status: RenderJobStatus
  size?: number
}

export function StatusIcon({ status, size = 16 }: StatusIconProps) {
  const className = getStatusColor(status)

  switch (status) {
    case 'completed':
      return <CheckCircle size={size} className={className} />
    case 'rendering':
    case 'compositing':
    case 'preparing':
    case 'finalizing':
      return <Loader2 size={size} className={`${className} animate-spin`} />
    case 'failed':
      return <AlertCircle size={size} className={className} />
    case 'cancelled':
      return <X size={size} className={className} />
    case 'paused':
      return <Pause size={size} className={className} />
    case 'queued':
    default:
      return <Clock size={size} className={className} />
  }
}
