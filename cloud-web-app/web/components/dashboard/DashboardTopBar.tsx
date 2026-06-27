'use client'

import { ChevronDown, Menu, Moon, RotateCcw, Settings, ShieldCheck, Sun, Terminal, Zap } from 'lucide-react'
import CostMeter from '@/components/cost/CostMeter'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'

type DashboardTopBarProps = {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  backendOnline: boolean
  aiProviderConfigured: boolean
  fullAccessActive: boolean
  fullAccessExpiresAt?: string | null
  fullAccessBusy?: boolean
  onToggleSidebar: () => void
  onResetDashboard: () => void
  onToggleTheme: () => void
  onOpenProviderSettings: () => void
  onToggleFullAccess: () => void
  onOpenIde: () => void
}

function formatFullAccessExpiry(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DashboardTopBar({
  theme,
  sidebarOpen,
  backendOnline,
  aiProviderConfigured,
  fullAccessActive,
  fullAccessExpiresAt,
  fullAccessBusy,
  onToggleSidebar,
  onResetDashboard,
  onToggleTheme,
  onOpenProviderSettings,
  onToggleFullAccess,
  onOpenIde,
}: DashboardTopBarProps) {
  const statusLabel = backendOnline
    ? aiProviderConfigured
      ? 'Operations ready'
      : 'AI provider needed'
    : 'Backend offline'
  const statusClass = backendOnline
    ? aiProviderConfigured
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
    : 'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
  const fullAccessExpiry = formatFullAccessExpiry(fullAccessExpiresAt)

  return (
    <header className="relative z-20 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] backdrop-blur-xl" style={{ boxShadow: backendOnline && aiProviderConfigured ? '0 1px 0 rgba(34,197,94,0.06), 0 4px 16px rgba(0,0,0,0.14)' : !backendOnline ? '0 1px 0 rgba(239,68,68,0.08), 0 4px 16px rgba(0,0,0,0.14)' : '0 1px 0 rgba(245,158,11,0.08), 0 4px 16px rgba(0,0,0,0.14)' }}>
      <div className="mx-auto flex min-h-14 w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] md:hidden ${CANONICAL_FOCUS}`}
            aria-label={sidebarOpen ? 'Close Studio navigation' : 'Open Studio navigation'}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--aethel-text-quaternary)]">
                Studio Home
              </p>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-[var(--aethel-text-primary)] sm:text-xl">
              Mission control, compressed for one next action.
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CostMeter />
          <button
            type="button"
            onClick={onOpenIde}
            className={`inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--aethel-text-primary)] px-4 text-sm font-semibold text-[var(--aethel-surface-primary)] shadow-[var(--aethel-shadow-md)] transition hover:bg-[var(--aethel-text-secondary)] ${CANONICAL_FOCUS}`}
          >
            <Terminal className="h-4 w-4" />
            Open IDE
          </button>
          <details className="group relative">
            <summary className={`inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}>
              Operations
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-3 shadow-[var(--aethel-shadow-xl)]">
              <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">Full Access</p>
                <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
                  {fullAccessActive
                    ? `High-risk actions are enabled${fullAccessExpiry ? ` until ${fullAccessExpiry}` : ''}.`
                    : 'High-risk actions stay locked until explicitly enabled.'}
                </p>
                <button
                  type="button"
                  onClick={onToggleFullAccess}
                  disabled={fullAccessBusy}
                  className={`mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 text-xs font-semibold text-[var(--aethel-warning-light)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${CANONICAL_FOCUS}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {fullAccessBusy ? 'Waiting...' : fullAccessActive ? 'Revoke Full Access' : 'Enable Full Access'}
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={onResetDashboard} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset layout
                </button>
                <button type="button" onClick={onToggleTheme} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}>
                  {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  Toggle theme
                </button>
                <button type="button" onClick={onOpenProviderSettings} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] px-3 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] sm:col-span-2 ${CANONICAL_FOCUS}`}>
                  <Settings className="h-3.5 w-3.5" />
                  Provider settings
                </button>
              </div>
              {!aiProviderConfigured ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-2 text-xs text-[var(--aethel-warning-light)]">
                  <Zap className="h-3.5 w-3.5" />
                  Configure an AI provider before launching costly agent work.
                </p>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
