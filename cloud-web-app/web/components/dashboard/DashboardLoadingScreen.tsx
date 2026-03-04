'use client'

type DashboardLoadingScreenProps = {
  theme: 'dark' | 'light'
}

export function DashboardLoadingScreen({ theme }: DashboardLoadingScreenProps) {
  const surfaceClass =
    theme === 'dark'
      ? 'aethel-bg-slate-950 aethel-text-slate-50'
      : 'aethel-bg-slate-100 aethel-text-slate-900'

  return (
    <div className={`aethel-min-h-screen aethel-flex aethel-items-center aethel-justify-center ${surfaceClass}`}>
      <div className="aethel-state aethel-state-loading aethel-text-sm" role="status" aria-live="polite">
        Carregando Studio Home...
      </div>
    </div>
  )
}
