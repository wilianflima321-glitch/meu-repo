import { RefreshCw } from 'lucide-react'

type FinanceErrorStateProps = {
  error?: string | null
  onRetry: () => void
}

export function FinanceLoadingState() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
      <RefreshCw className="h-6 w-6 animate-spin text-[var(--aethel-text-tertiary)]" />
      <span className="sr-only">Loading finance metrics...</span>
    </div>
  )
}

export function FinanceErrorState({ error, onRetry }: FinanceErrorStateProps) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <p className="text-[var(--aethel-error)]">{error || 'No data available'}</p>
      <button type="button" onClick={onRetry} className="rounded-lg bg-[var(--aethel-primary-dark)] px-4 py-2 text-sm text-[var(--aethel-text-primary)]">
        Try again
      </button>
    </div>
  )
}
