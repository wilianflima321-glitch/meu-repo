'use client'

import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

type DashboardLoadingScreenProps = {
  theme: 'dark' | 'light'
}

export function DashboardLoadingScreen({ theme: _theme }: DashboardLoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div
        className={`rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-5 py-4 text-sm text-[var(--aethel-text-secondary)] shadow-[var(--aethel-shadow-lg)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
        role="status"
        aria-live="polite"
      >
        <p className={`${CANONICAL_TYPOGRAPHY.label} mb-1 text-[var(--aethel-text-primary)]`}>Studio Home</p>
        Loading Studio Home...
      </div>
    </div>
  )
}
