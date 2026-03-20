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

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {typeof backendOnline === 'boolean' && typeof aiProviderConfigured === 'boolean' && (
        <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] text-slate-300 xl:flex">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              backendOnline
                ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-error)]'}`} />
            Backend {backendOnline ? 'online' : 'offline'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              aiProviderConfigured
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                : 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
            }`}
          >
            IA {aiProviderConfigured ? 'configurada' : 'pendente'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              fullAccessActive
                ? 'border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
                : 'border-white/10 bg-white/[0.04] text-slate-300'
            }`}
          >
            {fullAccessActive ? `Full Access${fullAccessExpiryLabel ? ` ate ${fullAccessExpiryLabel}` : ''}` : 'Guardrails ativos'}
          </span>
        </div>
      )}

      {onResetDashboard && (
        <button
          type="button"
          onClick={onResetDashboard}
          className="hidden rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white lg:inline-flex"
        >
          Redefinir painel
        </button>
      )}

      {onOpenProviderSettings && aiProviderConfigured === false && (
        <button
          type="button"
          onClick={onOpenProviderSettings}
          className="hidden rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-warning-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] lg:inline-flex"
        >
          Configurar IA
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
              : 'border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20'
          }`}
        >
          {fullAccessBusy ? 'Aguarde...' : fullAccessActive ? 'Revogar Full Access' : 'Habilitar Full Access'}
        </button>
      )}

      {onToggleTheme && (
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:text-white"
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:text-white md:hidden"
          aria-label={sidebarOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
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
          className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition hover:brightness-110"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Abrir IDE
        </button>
      )}

      {extraActions}
    </div>
  )
}
