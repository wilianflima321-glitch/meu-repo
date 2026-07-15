'use client'

import type { ReactNode } from 'react'

type StudioActionRailProps = {
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
  onResetDashboard?: () => void
  onToggleTheme?: () => void
  theme?: 'dark' | 'light'
  backendOnline?: boolean
  aiProviderConfigured?: boolean
  onOpenProviderSettings?: () => void
  fullAccessActive?: boolean
  fullAccessExpiresAt?: string | null
  fullAccessBusy?: boolean
  onToggleFullAccess?: () => void
  onOpenIde?: () => void
  extraActions?: ReactNode
}

export default function StudioActionRail({
  sidebarOpen,
  onToggleSidebar,
  onResetDashboard,
  onToggleTheme,
  theme,
  backendOnline,
  aiProviderConfigured,
  onOpenProviderSettings,
  fullAccessActive,
  fullAccessExpiresAt,
  fullAccessBusy,
  onToggleFullAccess,
  onOpenIde,
  extraActions,
}: StudioActionRailProps) {
  const fullAccessExpiryLabel = fullAccessExpiresAt
    ? new Date(fullAccessExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const operationalTone =
    backendOnline && aiProviderConfigured
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  const operationalLabel = backendOnline
    ? aiProviderConfigured
      ? 'Operation OK'
      : 'AI pending'
    : 'Backend offline'

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {typeof backendOnline === 'boolean' && typeof aiProviderConfigured === 'boolean' && (
        <div className="hidden items-center gap-2 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-3 py-2 text-[10px] text-[var(--aethel-text-secondary)] xl:flex">
          <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${operationalTone}`}>
            <span
              className={`h-2 w-2 rounded-full ${
                backendOnline && aiProviderConfigured ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-warning)]'
              }`}
            />
            {operationalLabel}
          </span>
          {fullAccessActive ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--aethel-primary-light)]">
              Full Access{fullAccessExpiryLabel ? ` ate ${fullAccessExpiryLabel}` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-2 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
              Guardrails active
            </span>
          )}
        </div>
      )}

      {onResetDashboard && (
        <button
          type="button"
          onClick={onResetDashboard}
          className="hidden rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] lg:inline-flex"
        >
          Reset
        </button>
      )}

      {onOpenProviderSettings && aiProviderConfigured === false && (
        <button
          type="button"
          onClick={onOpenProviderSettings}
          className="hidden rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-warning-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] lg:inline-flex"
        >
          Configure AI
        </button>
      )}

      {onToggleFullAccess && (
        <button
          type="button"
          onClick={onToggleFullAccess}
          disabled={fullAccessBusy}
          className={`hidden rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-60 lg:inline-flex ${
            fullAccessActive
              ? 'border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)]'
              : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)]'
          }`}
        >
          {fullAccessBusy ? 'Aguarde...' : fullAccessActive ? 'Revogar Full Access' : 'Habilitar Full Access'}
        </button>
      )}

      {onToggleTheme && (
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      )}

      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] md:hidden"
          aria-label={sidebarOpen ? 'Close side menu' : 'Open side menu'}
          aria-expanded={sidebarOpen}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {onOpenIde && (
        <button
          type="button"
          onClick={onOpenIde}
          className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--aethel-accent,rgba(79,70,229,0.95)),var(--aethel-info,rgba(14,165,233,0.9)))] px-4 py-2 text-xs font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_color-mix(in_srgb,var(--aethel-info)_24%,transparent)] transition hover:brightness-110"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Open Studio
        </button>
      )}

      {extraActions}
    </div>
  )
}
