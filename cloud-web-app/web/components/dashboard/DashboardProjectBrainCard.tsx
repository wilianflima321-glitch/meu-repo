import { AlertCircle, BrainCircuit, CheckCircle2, CircleSlash2 } from 'lucide-react'

import type { ProjectBrainSnapshot, ProjectBrainStatus } from './dashboard-project-brain'

type DashboardProjectBrainCardProps = {
  snapshot: ProjectBrainSnapshot
  onOpenAiChat: () => void
  onOpenIde: () => void
  onOpenProjects: () => void
}

const statusClasses: Record<ProjectBrainStatus, string> = {
  ready:
    'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  attention:
    'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  blocked:
    'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
}

const statusIcons: Record<ProjectBrainStatus, typeof CheckCircle2> = {
  ready: CheckCircle2,
  attention: AlertCircle,
  blocked: CircleSlash2,
}

export function DashboardProjectBrainCard({
  snapshot,
  onOpenAiChat,
  onOpenIde,
  onOpenProjects,
}: DashboardProjectBrainCardProps) {
  const RiskIcon = statusIcons[snapshot.riskStatus]
  const actionHandler =
    snapshot.nextAction === 'Define the first mission'
      ? onOpenProjects
      : snapshot.nextAction === 'Expand Studio'
        ? onOpenIde
        : onOpenAiChat

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,rgba(15,23,42,0.8),rgba(8,10,16,0.96),rgba(14,165,233,0.08))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.3)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
              <BrainCircuit className="h-3.5 w-3.5" />
              Project Brain
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClasses[snapshot.riskStatus]}`}>
              <RiskIcon className="h-3.5 w-3.5" />
              {snapshot.riskLabel}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">
            {snapshot.title}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
            {snapshot.summary}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Domain</p>
            <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{snapshot.domain}</p>
          </div>
          <button
            type="button"
            onClick={actionHandler}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)]"
          >
            {snapshot.nextAction}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {snapshot.signals.map((signal) => {
          const SignalIcon = statusIcons[signal.status]

          return (
            <div
              key={signal.label}
              className="rounded-[20px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{signal.label}</p>
                <SignalIcon className={`h-3.5 w-3.5 ${signal.status === 'ready' ? 'text-[var(--aethel-success-light)]' : signal.status === 'attention' ? 'text-[var(--aethel-warning-light)]' : 'text-[var(--aethel-error)]'}`} />
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{signal.value}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Continuity rails
          </p>
          <div className="flex flex-wrap gap-2">
            {snapshot.continuity.map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses[item.status]}`}
              >
                {item.label}: {item.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
