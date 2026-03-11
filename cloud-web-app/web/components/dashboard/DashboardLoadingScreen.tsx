'use client'

type DashboardLoadingScreenProps = {
  theme: 'dark' | 'light'
}

export function DashboardLoadingScreen({ theme }: DashboardLoadingScreenProps) {
  const surfaceClass =
    theme === 'dark'
      ? 'bg-slate-950 text-slate-50'
      : 'bg-slate-100 text-slate-900'

  return (
    <div className={`min-h-screen aethel-flex aethel-items-center aethel-justify-center ${surfaceClass}`}>
      <div className="aethel-state aethel-state-loading text-sm" role="status" aria-live="polite">
        Carregando Studio Home...
      </div>
    </div>
  )
}
