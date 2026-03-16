'use client'

type DashboardLoadingScreenProps = {
  theme: 'dark' | 'light'
}

export function DashboardLoadingScreen({ theme }: DashboardLoadingScreenProps) {
  return (
    <div className="min-h-screen aethel-flex aethel-items-center aethel-justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="aethel-state aethel-state-loading text-sm" role="status" aria-live="polite">
        Carregando Studio Home...
      </div>
    </div>
  )
}
