type DashboardHeaderProps = {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onResetDashboard: () => void
  onToggleTheme: () => void
  theme: 'dark' | 'light'
  backendOnline: boolean
  authErrorText?: string | null
  billingErrorText?: string | null
}

export function DashboardHeader({
  sidebarOpen,
  onToggleSidebar,
  onResetDashboard,
  onToggleTheme,
  theme,
  backendOnline,
  authErrorText,
  billingErrorText,
}: DashboardHeaderProps) {
  return (
    <header className="aethel-card aethel-m-4 aethel-rounded-xl aethel-shadow-lg">
      <div className="aethel-flex aethel-items-center aethel-justify-between aethel-p-4">
        <div className="aethel-flex aethel-items-center aethel-gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden aethel-button aethel-button-ghost aethel-p-2"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="aethel-flex aethel-items-center aethel-gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg aethel-flex aethel-items-center aethel-justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Aethel IDE
            </h1>
          </div>
        </div>

        <div className="aethel-flex aethel-items-center aethel-gap-4">
          <button type="button" onClick={onResetDashboard} className="aethel-button aethel-button-ghost aethel-text-xs">
            Redefinir painel
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="aethel-button aethel-button-ghost aethel-p-2"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <div
            className={`aethel-flex aethel-items-center aethel-gap-2 aethel-px-3 aethel-py-1 aethel-rounded-full text-sm font-medium ${
              backendOnline
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            <div className={`w-2 h-2 aethel-rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            Backend: {backendOnline ? 'Online' : 'Offline'}
          </div>

          {authErrorText && (
            <span className="text-xs aethel-text-red-400" title={authErrorText}>
              Auth providers indisponiveis
            </span>
          )}
          {billingErrorText && (
            <span className="text-xs aethel-text-yellow-400" title={billingErrorText}>
              Planos indisponiveis
            </span>
          )}

          <button type="button" className="aethel-button aethel-button-primary aethel-shadow-md hover:aethel-shadow-lg aethel-transition">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Abrir IDE Desktop
          </button>
        </div>
      </div>
    </header>
  )
}
