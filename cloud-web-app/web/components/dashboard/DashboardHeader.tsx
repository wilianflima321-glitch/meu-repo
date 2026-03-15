import Image from 'next/image'

type DashboardHeaderProps = {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onResetDashboard: () => void
  onToggleTheme: () => void
  onOpenIde: () => void
  onToggleFullAccess: () => void
  theme: 'dark' | 'light'
  backendOnline: boolean
  aiProviderConfigured: boolean
  onOpenProviderSettings: () => void
  fullAccessActive: boolean
  fullAccessExpiresAt?: string | null
  fullAccessBusy?: boolean
  authErrorText?: string | null
  billingErrorText?: string | null
}

export function DashboardHeader({
  sidebarOpen,
  onToggleSidebar,
  onResetDashboard,
  onToggleTheme,
  onOpenIde,
  onToggleFullAccess,
  theme,
  backendOnline,
  aiProviderConfigured,
  onOpenProviderSettings,
  fullAccessActive,
  fullAccessExpiresAt,
  fullAccessBusy = false,
  authErrorText,
  billingErrorText,
}: DashboardHeaderProps) {
  const fullAccessExpiryLabel = fullAccessExpiresAt
    ? new Date(fullAccessExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <header className="aethel-card aethel-m-4 aethel-rounded-xl aethel-shadow-lg">
      <div className="aethel-flex aethel-items-center aethel-justify-between aethel-gap-4">
        <div className="aethel-flex aethel-items-center aethel-gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden aethel-button aethel-button-ghost aethel-p-2"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="aethel-flex aethel-items-center aethel-gap-3">
            <Image
              src="/branding/aethel-icon-source.png"
              alt="Aethel"
              width={36}
              height={36}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-1 shadow-[0_12px_30px_rgba(56,189,248,0.25)]"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Studio Home</p>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-100">
                Aethel Studio
              </h1>
            </div>
          </div>
        </div>

        <div className="aethel-flex aethel-items-center aethel-gap-2 md:aethel-gap-4">
          <button type="button" onClick={onResetDashboard} className="hidden md:inline-flex aethel-button aethel-button-ghost text-xs">
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
            className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              backendOnline
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            Backend {backendOnline ? 'online' : 'offline'}
          </div>

          {authErrorText && (
            <span className="hidden lg:inline text-xs text-red-400" title={authErrorText}>
              Auth providers indisponiveis
            </span>
          )}
          {billingErrorText && (
            <span className="hidden lg:inline text-xs text-yellow-400" title={billingErrorText}>
              Planos indisponiveis
            </span>
          )}
          {!aiProviderConfigured && (
            <button
              type="button"
              onClick={onOpenProviderSettings}
              className="hidden lg:inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-200 hover:bg-amber-500/20"
              title="Configure ao menos um provider para liberar o chat de IA"
            >
              Configurar IA
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFullAccess}
            disabled={fullAccessBusy}
            className={`hidden lg:inline-flex rounded-full border px-3 py-1 text-xs disabled:opacity-60 ${
              fullAccessActive
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
            }`}
            title={
              fullAccessActive
                ? `Acesso total ativo${fullAccessExpiryLabel ? ` ate ${fullAccessExpiryLabel}` : ''}. Clique para revogar.`
                : 'Habilitar acesso total temporario auditado.'
            }
          >
            {fullAccessBusy
              ? 'Aguarde...'
              : fullAccessActive
                ? `Full Access ON${fullAccessExpiryLabel ? ` (${fullAccessExpiryLabel})` : ''}`
                : 'Full Access'}
          </button>

          <button
            type="button"
            onClick={onOpenIde}
            className="aethel-button aethel-button-primary shadow-md hover:aethel-shadow-lg aethel-transition"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="hidden sm:inline">Abrir IDE</span>
            <span className="sm:hidden">IDE</span>
          </button>
        </div>
      </div>
    </header>
  )
}
