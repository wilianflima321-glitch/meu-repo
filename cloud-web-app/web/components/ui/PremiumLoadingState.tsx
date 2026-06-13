'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export type PremiumLoadingVariant = 'route' | 'splash' | 'data' | 'inline' | 'skeleton'

export interface PremiumLoadingStateProps {
  variant?: PremiumLoadingVariant
  label?: string
  /** Only used by the `splash` variant — renders an indeterminate-to-estimate progress bar. */
  showProgress?: boolean
  /** Approximate time the splash is expected to take, in ms. Drives the progress easing. */
  estimatedMs?: number
  /** Number of placeholder rows for the `skeleton` variant. */
  rows?: number
  className?: string
}

const Spinner = ({ className = '' }: { className?: string }) => (
  <Loader2 aria-hidden="true" className={`animate-spin text-[var(--aethel-primary)] ${className}`} />
)

function useEstimatedProgress(active: boolean, estimatedMs: number) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!active) return
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      // Ease toward 90% over the estimate, then crawl — never hit 100% on its own.
      const ratio = Math.min(elapsed / estimatedMs, 1)
      const eased = (1 - Math.pow(1 - ratio, 2)) * 90
      setProgress((prev) => Math.max(prev, Math.min(eased + (ratio >= 1 ? 5 : 0), 95)))
    }, 120)
    return () => clearInterval(interval)
  }, [active, estimatedMs])

  return progress
}

export default function PremiumLoadingState({
  variant = 'route',
  label = 'Loading',
  showProgress = false,
  estimatedMs = 5000,
  rows = 4,
  className = '',
}: PremiumLoadingStateProps) {
  const progress = useEstimatedProgress(variant === 'splash' && showProgress, estimatedMs)

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-live="polite">
        <Spinner className="h-4 w-4" />
        {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
      </span>
    )
  }

  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 ${className}`} role="status" aria-live="polite" aria-label={label || 'Loading'}>
        {Array.from({ length: Math.max(1, rows) }).map((_, i) => (
          <div
            key={i}
            className="h-4 w-full animate-pulse rounded bg-[var(--aethel-surface-secondary)]"
            style={{ width: `${88 - (i % 3) * 12}%` }}
          />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    )
  }

  if (variant === 'data') {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center ${className}`}
        role="status"
        aria-live="polite"
      >
        <Spinner className="h-6 w-6" />
        <p className="text-sm text-[var(--aethel-text-tertiary)]">{label}</p>
      </div>
    )
  }

  // route + splash share a full-bleed centered layout.
  const isSplash = variant === 'splash'
  return (
    <div
      className={`flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 ${
        isSplash ? 'min-h-screen bg-[var(--aethel-surface-primary)]' : ''
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-4 border-[var(--aethel-border-primary)]" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[var(--aethel-primary)] border-r-[var(--aethel-accent)]" />
      </div>

      <p className="text-sm font-medium text-[var(--aethel-text-secondary)]">{label}</p>

      {isSplash && showProgress && (
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-[var(--aethel-surface-secondary)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-accent)] transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
