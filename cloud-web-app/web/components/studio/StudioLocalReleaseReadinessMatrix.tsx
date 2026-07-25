import {
  STUDIO_LOCAL_RELEASE_MANIFEST,
  getStudioLocalReleaseReadinessSummary,
  type RuntimeReleaseStatus,
} from '@/lib/studio-local/release-manifest'

const STATUS_CLASS: Record<RuntimeReleaseStatus, string> = {
  available: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  beta: 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  held: 'border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]',
  planned: 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] text-[var(--aethel-text-tertiary)]',
}

type StudioLocalReleaseReadinessMatrixProps = {
  compact?: boolean
  className?: string
}

export default function StudioLocalReleaseReadinessMatrix({ compact = false, className = '' }: StudioLocalReleaseReadinessMatrixProps) {
  const summary = getStudioLocalReleaseReadinessSummary()
  const items = compact ? STUDIO_LOCAL_RELEASE_MANIFEST.releaseReadiness.slice(0, 5) : STUDIO_LOCAL_RELEASE_MANIFEST.releaseReadiness
  const signingHeld = summary.signingReadiness.lanes.filter((lane) => lane.status === 'held').length

  return (
    <section
      className={`rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] p-4 ${className}`}
      aria-label="Studio Local release readiness matrix"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Studio Local release readiness
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)]">
            Beta is usable; public downloads stay held until evidence lands.
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--aethel-text-secondary)]">
            Windows, macOS, Linux, updater, signing, sidecars, probe, and Cloud Stream handoff are tracked separately so Aethel does not present an unsigned installer as a finished desktop release.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${summary.publicDownloadReady ? STATUS_CLASS.available : STATUS_CLASS.held}`}>
          {summary.publicDownloadReady ? 'Public download ready' : 'Request beta only'}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Metric label="Available" value={summary.counts.available} status="available" />
        <Metric label="Beta" value={summary.counts.beta} status="beta" />
        <Metric label="Held" value={summary.counts.held} status="held" />
        <Metric label="Planned" value={summary.counts.planned} status="planned" />
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? '' : 'lg:grid-cols-2'}`}>
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_26%,transparent)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{item.label}</h3>
                <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Owner: {item.owner}</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${STATUS_CLASS[item.status]}`}>
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{item.evidence}</p>
            {item.blocker ? (
              <p className="mt-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_7%,transparent)] px-3 py-2 text-[11px] leading-5 text-[var(--aethel-warning-light)]">
                Blocker: {item.blocker}
              </p>
            ) : null}
            {!compact ? (
              <p className="mt-2 text-[11px] leading-5 text-[var(--aethel-primary-light)]">Next: {item.nextAction}</p>
            ) : null}
          </article>
        ))}
      </div>

      <p className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_42%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
        {summary.nextAction} Signing chain: {signingHeld} held lanes across Windows Artifact Signing, macOS notarization, Linux provenance, updater, and release attestation.
      </p>
    </section>
  )
}

function Metric({ label, value, status }: { label: string; value: number; status: RuntimeReleaseStatus }) {
  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${STATUS_CLASS[status]}`}>{value}</p>
    </div>
  )
}
