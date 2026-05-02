import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, PauseCircle } from 'lucide-react'

import type { MissionLedgerSnapshot, MissionLedgerState } from './dashboard-mission-ledger'

type DashboardMissionLedgerCardProps = {
  snapshot: MissionLedgerSnapshot
  onOpenAiChat: () => void
  onOpenIde: () => void
  onOpenProjects: () => void
}

const stateClasses: Record<MissionLedgerState, string> = {
  planned:
    'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] text-[var(--aethel-text-secondary)]',
  running:
    'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]',
  needs_approval:
    'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  blocked:
    'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
  paused:
    'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_42%,transparent)] text-[var(--aethel-text-secondary)]',
  complete:
    'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
}

const stateIcons: Record<MissionLedgerState, typeof Clock3> = {
  planned: Clock3,
  running: FileCheck2,
  needs_approval: AlertTriangle,
  blocked: AlertTriangle,
  paused: PauseCircle,
  complete: CheckCircle2,
}

export function DashboardMissionLedgerCard({
  snapshot,
  onOpenAiChat,
  onOpenIde,
  onOpenProjects,
}: DashboardMissionLedgerCardProps) {
  const StateIcon = stateIcons[snapshot.state]
  const actionHandler =
    snapshot.nextAction === 'Define mission'
      ? onOpenProjects
      : snapshot.nextAction === 'Continue execution'
        ? onOpenIde
        : onOpenAiChat

  return (
    <section className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(8,10,16,0.94))] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.26)] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
              <FileCheck2 className="h-3.5 w-3.5" />
              Mission Ledger
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${stateClasses[snapshot.state]}`}>
              <StateIcon className="h-3.5 w-3.5" />
              {snapshot.stateLabel}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">{snapshot.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">{snapshot.summary}</p>
        </div>

        <button
          type="button"
          onClick={actionHandler}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--aethel-primary-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)]"
        >
          {snapshot.nextAction}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
        <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Acceptance checks
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {snapshot.checks.map((check) => (
              <span
                key={check.label}
                className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold ${check.ready ? stateClasses.complete : stateClasses.planned}`}
              >
                {check.ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                {check.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Evidence
          </p>
          <div className="mt-3 space-y-2">
            {snapshot.evidence.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--aethel-text-tertiary)]">{item.label}</span>
                <span className={item.ready ? 'font-semibold text-[var(--aethel-success-light)]' : 'font-semibold text-[var(--aethel-warning-light)]'}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
