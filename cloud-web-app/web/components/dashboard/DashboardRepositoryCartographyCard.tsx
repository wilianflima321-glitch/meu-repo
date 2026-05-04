import { AlertTriangle, CheckCircle2, GitBranch, Loader2, Network, Route, ShieldCheck, UsersRound } from 'lucide-react'

import type {
  RepositoryCartographySnapshot,
  RepositoryCartographyStatus,
} from './dashboard-repository-cartography'

type DashboardRepositoryCartographyCardProps = {
  snapshot: RepositoryCartographySnapshot
  onOpenAiChat: () => void
  onOpenIde: () => void
  onScanContext?: () => void
  scanNote?: string | null
  scanState?: 'idle' | 'scanning' | 'complete' | 'error'
}

const statusClasses: Record<RepositoryCartographyStatus, string> = {
  ready:
    'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  attention:
    'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  blocked:
    'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
}

const statusIcons: Record<RepositoryCartographyStatus, typeof CheckCircle2> = {
  ready: CheckCircle2,
  attention: AlertTriangle,
  blocked: AlertTriangle,
}

export function DashboardRepositoryCartographyCard({
  snapshot,
  onOpenAiChat,
  onOpenIde,
  onScanContext,
  scanNote,
  scanState = 'idle',
}: DashboardRepositoryCartographyCardProps) {
  const StatusIcon = statusIcons[snapshot.status]
  const primaryAction = onScanContext ?? onOpenIde
  const primaryLabel =
    scanState === 'scanning'
      ? 'Scanning...'
      : onScanContext
        ? 'Scan context'
        : 'Open map'
  const primaryIcon =
    scanState === 'scanning' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />

  return (
    <section className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,rgba(8,10,16,0.94),rgba(15,23,42,0.72),rgba(34,197,94,0.07))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.24)] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-success-light)]">
              <Network className="h-3.5 w-3.5" />
              Repository Cartography
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses[snapshot.status]}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {snapshot.statusLabel}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
            Agent fleet sees the project before it edits.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {snapshot.summary}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
          <button
            type="button"
            onClick={primaryAction}
            disabled={scanState === 'scanning'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--aethel-success-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-success)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)]"
          >
            {primaryIcon}
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onOpenAiChat}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)]"
          >
            <Route className="h-4 w-4" />
            Agent handoff
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.58fr)]">
        <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Context gates
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {snapshot.signals.map((signal) => {
              const SignalIcon = statusIcons[signal.status]

              return (
                <div
                  key={signal.label}
                  className="rounded-[18px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{signal.label}</p>
                    <SignalIcon className={signal.status === 'ready' ? 'h-3.5 w-3.5 text-[var(--aethel-success-light)]' : signal.status === 'attention' ? 'h-3.5 w-3.5 text-[var(--aethel-warning-light)]' : 'h-3.5 w-3.5 text-[var(--aethel-error)]'} />
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{signal.value}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-3 rounded-[18px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                Reading plan
              </p>
              <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] font-semibold text-[var(--aethel-text-tertiary)]">
                {snapshot.contextBudget.summary}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot.contextBudget.batches.map((batch) => {
                const BatchIcon = statusIcons[batch.status]

                return (
                  <span
                    key={batch.label}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses[batch.status]}`}
                  >
                    <BatchIcon className="h-3.5 w-3.5" />
                    {batch.label}: {batch.value}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
              <UsersRound className="h-3.5 w-3.5" />
              Agent fleet
            </div>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] font-semibold text-[var(--aethel-text-tertiary)]">
              {snapshot.agents.length} lanes
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {snapshot.agents.map((agent) => (
              <span
                key={agent.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses[agent.status]}`}
                title={agent.scope}
              >
                {agent.label.replace(' Agent', '')}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {snapshot.guardrails.slice(0, 2).map((guardrail) => (
              <div key={guardrail} className="text-xs leading-5 text-[var(--aethel-text-secondary)]">
                {guardrail}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 py-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">
        <span className="font-semibold text-[var(--aethel-text-primary)]">{scanNote ? 'Scan:' : 'Next:'}</span>{' '}
        {scanNote ?? snapshot.nextAction}
      </div>
    </section>
  )
}
