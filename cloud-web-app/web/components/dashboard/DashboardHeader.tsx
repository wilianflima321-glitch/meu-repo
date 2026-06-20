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
    <header className="sticky top-0 z-30 border-b border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(8,12,20,0.96),rgba(11,13,18,0.92))] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] md:hidden"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-sidebar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent),color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent))] px-3 py-1.5 shadow-[0_20px_50px_var(--aethel-shadow-xl,rgba(2,6,23,0.42))]">
            <Image
              src="/branding/aethel-mark.svg"
              alt="Aethel"
              width={40}
              height={40}
              className="rounded-2xl shadow-[0_0_0_1px_var(--aethel-border-subtle),0_12px_30px_color-mix(in_srgb,var(--aethel-info)_18%,transparent)]"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--aethel-text-tertiary)]">Studio Home</p>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
                  Apps control plane
                </span>
              </div>
              <h1 className="truncate text-xl font-semibold text-[var(--aethel-text-primary)] sm:text-2xl">
                Aethel Studio
              </h1>
              <p className="hidden text-xs text-[var(--aethel-text-secondary)] sm:block">
                Operations, AI, preview, and billing in one focused workspace.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-2.5 py-1.5 xl:flex">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              backendOnline
                ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]'
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-error)]'}`}
            />
            Backend {backendOnline ? 'online' : 'offline'}
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              aiProviderConfigured
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
            }`}
          >
            AI {aiProviderConfigured ? 'configured' : 'pending'}
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              fullAccessActive
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            {fullAccessActive ? `Full Access${fullAccessExpiryLabel ? ` until ${fullAccessExpiryLabel}` : ''}` : 'Guardrails active'}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={onResetDashboard}
            className="hidden min-h-10 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] lg:inline-flex"
          >
            Reset view
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {!aiProviderConfigured && (
            <button
              type="button"
              onClick={onOpenProviderSettings}
              className="hidden min-h-10 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-warning-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] lg:inline-flex"
              title="Configure at least one provider to unlock AI chat"
            >
              Configure AI
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFullAccess}
            disabled={fullAccessBusy}
            className={`hidden min-h-10 rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)] lg:inline-flex ${
              fullAccessActive
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]'
                : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]'
            }`}
            title={
              fullAccessActive
                ? `Full Access active${fullAccessExpiryLabel ? ` until ${fullAccessExpiryLabel}` : ''}. Click to revoke.`
                : 'Enable temporary audited full access.'
            }
          >
            {fullAccessBusy ? 'Working...' : fullAccessActive ? 'Revoke Full Access' : 'Enable Full Access'}
          </button>

          <button
            type="button"
            onClick={onOpenIde}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--aethel-accent,rgba(79,70,229,0.95)),var(--aethel-info,rgba(14,165,233,0.9)))] px-4 py-2.5 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_16px_40px_color-mix(in_srgb,var(--aethel-info)_24%,transparent)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="hidden sm:inline">Open IDE</span>
            <span className="sm:hidden">IDE</span>
          </button>
        </div>
      </div>

      {(authErrorText || billingErrorText) && (
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap gap-3 px-4 pb-3 sm:px-6 lg:px-8">
          {authErrorText && (
            <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-error)]">
              Auth: {authErrorText}
            </span>
          )}
          {billingErrorText && (
            <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-warning-light)]">
              Billing: {billingErrorText}
            </span>
          )}
        </div>
      )}
    </header>
  )
}
