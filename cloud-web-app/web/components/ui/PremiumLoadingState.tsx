// cloud-web-app/web/components/ui/PremiumLoadingState.tsx
'use client'

import { useEffect, useState } from 'react'

type Variant = 'route' | 'data' | 'inline' | 'splash'

interface Props {
  variant?: Variant
  label?: string
  showProgress?: boolean
  estimatedMs?: number
}

const VARIANT_STYLES: Record<Variant, string> = {
  route: 'fixed inset-0 z-50 flex items-center justify-center bg-[var(--aethel-bg)]',
  data: 'flex items-center justify-center min-h-[200px]',
  inline: 'inline-flex items-center gap-2',
  splash:
    'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[var(--aethel-bg)] via-[var(--aethel-panel-strong)] to-[var(--aethel-bg)]',
}

export default function PremiumLoadingState({
  variant = 'data',
  label,
  showProgress = false,
  estimatedMs = 3000,
}: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!showProgress) return
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min((elapsed / estimatedMs) * 90, 90))
    }, 100)
    return () => clearInterval(interval)
  }, [showProgress, estimatedMs])

  if (variant === 'inline') {
    return (
      <span
        className="inline-flex items-center gap-2 text-sm text-[var(--aethel-text-tertiary)]"
        role="status"
        aria-live="polite"
      >
        <span
          className="h-3 w-3 rounded-full border-2 border-[var(--aethel-border-secondary)] border-t-[var(--aethel-primary)] animate-spin"
          aria-hidden
        />
        {label && <span>{label}</span>}
        <span className="sr-only">Loading</span>
      </span>
    )
  }

  if (variant === 'splash') {
    return (
      <div className={VARIANT_STYLES.splash} role="status" aria-live="polite">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--aethel-primary)] via-[var(--aethel-info)] to-[var(--aethel-primary)] opacity-90 animate-pulse" />
          <div className="absolute inset-[2px] rounded-2xl bg-[var(--aethel-bg)] flex items-center justify-center">
            <span className="text-2xl font-bold bg-gradient-to-br from-[var(--aethel-primary-light)] to-[var(--aethel-info-light)] bg-clip-text text-transparent">
              A
            </span>
          </div>
        </div>
        {showProgress && (
          <div className="w-64 h-1 bg-[var(--aethel-border-subtle)] rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {label && (
          <p className="text-sm text-[var(--aethel-text-secondary)]">{label}</p>
        )}
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  return (
    <div
      className={VARIANT_STYLES[variant]}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-6 w-6 rounded-full border-2 border-[var(--aethel-border-secondary)] border-t-[var(--aethel-primary)] animate-spin"
          aria-hidden
        />
        {label && (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">{label}</p>
        )}
        <span className="sr-only">Loading</span>
      </div>
    </div>
  )
}
