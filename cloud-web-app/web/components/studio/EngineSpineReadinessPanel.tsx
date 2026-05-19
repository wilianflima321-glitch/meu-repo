import Link from 'next/link'
import {
  ENGINE_SPINE_MODULES,
  getEngineSpineSummary,
  type EngineSpineLoadStrategy,
  type EngineSpineStatus,
} from '@/lib/studio/engine-spine-modules'

const STATUS_LABEL: Record<EngineSpineStatus, string> = {
  visible: 'Visible',
  'ready-to-wire': 'Ready to wire',
  'adapter-needed': 'Adapter needed',
  'worker-held': 'Worker held',
}

const STATUS_CLASS: Record<EngineSpineStatus, string> = {
  visible: 'border-[color-mix(in_srgb,var(--aethel-success)_36%,transparent)] text-[var(--aethel-success-light)]',
  'ready-to-wire': 'border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)] text-[var(--aethel-info-light)]',
  'adapter-needed': 'border-[color-mix(in_srgb,var(--aethel-warning)_36%,transparent)] text-[var(--aethel-warning-light)]',
  'worker-held': 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[var(--aethel-error-light)]',
}

const LOAD_STRATEGY_LABEL: Record<EngineSpineLoadStrategy, string> = {
  'already-visible': 'Visible',
  'dynamic-client-only': 'Dynamic',
  'summary-adapter': 'Summary adapter',
  'worker-or-sidecar': 'Worker/sidecar',
  'native-or-cloud': 'Native/cloud',
}

export default function EngineSpineReadinessPanel() {
  const summary = getEngineSpineSummary()
  const priorityModules = ENGINE_SPINE_MODULES.slice(0, 6)

  return (
    <section className="mb-6 rounded-3xl border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aethel-primary-light)]">Engine spine exposure</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-[var(--aethel-text-primary)]">
            Hidden engine systems are now tracked as product work packets.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            This panel is intentionally evidence-first: it does not pretend every subsystem is production-ready. It tells creators which modules are visible, which need adapters, and which must stay in a worker or sidecar before they reach the UI.
          </p>
        </div>
        <Link
          href="/honest-status"
          className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
        >
          Honest status
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Modules" value={summary.totalModules.toString()} />
        <Metric label="Approx LOC" value={summary.totalLoc.toLocaleString('en-US')} />
        <Metric label="Ready" value={summary.ready.toString()} />
        <Metric label="Heavy held" value={summary.heavyHeld.toString()} />
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {priorityModules.map((module) => (
          <article key={module.id} className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_56%,transparent)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{module.targetSurface}</p>
                <h4 className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{module.label}</h4>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${STATUS_CLASS[module.status]}`}>
                {STATUS_LABEL[module.status]}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">{module.userValue}</p>
            <div className="mt-3 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Next safe move</p>
              <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{module.nextAction}</p>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[auto_minmax(0,1fr)]">
              <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                {LOAD_STRATEGY_LABEL[module.loadStrategy]}
              </span>
              <p className="text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">{module.limitation}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_52%,transparent)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--aethel-text-primary)]">{value}</p>
    </div>
  )
}
