import type { CoreLoopPromotionSnapshot, MonitoringTone } from './monitoring-types'
import { monitoringDescription, monitoringTitle } from './monitoring-utils'

type MonitoringHeroProps = {
  tone: MonitoringTone
  coreLoop: CoreLoopPromotionSnapshot | null
  loading: boolean
  lastRefresh: string | null
  onRefresh: () => void
}

export function MonitoringHero({ tone, coreLoop, loading, lastRefresh, onRefresh }: MonitoringHeroProps) {
  const nextActions = coreLoop?.blockers?.slice(0, 3) ?? []

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent))] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Infrastructure monitoring</p>
            <h1 className="mt-3 text-2xl font-bold">{monitoringTitle(tone)}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">{monitoringDescription(tone)}</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh ? <span className="text-xs text-[var(--aethel-text-tertiary)]">Last update: {new Date(lastRefresh).toLocaleTimeString()}</span> : null}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Next best action</p>
        <div className="mt-4 space-y-3">
          {nextActions.length > 0 ? nextActions.map((action) => (
            <div key={action} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">{action}</div>
          )) : (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              No blocker returned by the core loop right now. Focus shifts to preview, billing, and onboarding with real evidence.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
