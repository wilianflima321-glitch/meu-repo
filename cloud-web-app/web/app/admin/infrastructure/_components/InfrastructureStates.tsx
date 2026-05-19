import { RefreshCw, XCircle } from 'lucide-react'

type InfrastructureErrorStateProps = {
  error?: string | null
  onRetry: () => void
}

export function InfrastructureLoadingState() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
      <RefreshCw className="h-6 w-6 animate-spin text-[var(--aethel-text-tertiary)]" />
      <span className="sr-only">Loading infrastructure status...</span>
    </div>
  )
}

export function InfrastructureErrorState({ error, onRetry }: InfrastructureErrorStateProps) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <XCircle className="h-12 w-12 text-[var(--aethel-error)]" />
      <p className="text-[var(--aethel-error)]">{error || 'No data available'}</p>
      <button type="button" onClick={onRetry} className="rounded-lg bg-[var(--aethel-primary-dark)] px-4 py-2 text-sm text-[var(--aethel-text-primary)]">
        Try again
      </button>
    </div>
  )
}
