import Link from 'next/link'
import {
  getEngineSpineDecisionMatrix,
  getEngineSpinePriorityModules,
  getEngineSpineReadinessModel,
  getEngineSpineSummary,
  type EngineSpineLoadStrategy,
  type EngineSpineReadinessState,
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

const READINESS_CLASS: Record<EngineSpineReadinessState, string> = {
  ready: 'border-[color-mix(in_srgb,var(--aethel-success)_36%,transparent)] text-[var(--aethel-success-light)]',
  'needs-review': 'border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)] text-[var(--aethel-info-light)]',
  'needs-adapters': 'border-[color-mix(in_srgb,var(--aethel-warning)_36%,transparent)] text-[var(--aethel-warning-light)]',
  'worker-held': 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[var(--aethel-error-light)]',
}

const LOAD_STRATEGY_LABEL: Record<EngineSpineLoadStrategy, string> = {
  'already-visible': 'Visible',
  'dynamic-client-only': 'Dynamic',
  'summary-adapter': 'Summary adapter',
  'worker-or-sidecar': 'Worker/sidecar',
  'native-or-cloud': 'Native/cloud',
}

type EngineModuleAdapterCockpitProps = {
  compact?: boolean
  className?: string
}

export default function EngineModuleAdapterCockpit({ compact = false, className = '' }: EngineModuleAdapterCockpitProps) {
  const summary = getEngineSpineSummary()
  const readiness = getEngineSpineReadinessModel()
  const domains = getEngineSpineDecisionMatrix('domain')
  const priorityModules = getEngineSpinePriorityModules(compact ? 4 : 7)

  return (
    <section
      className={`rounded-3xl border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] ${className}`}
      aria-label="Engine module adapter cockpit"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--aethel-primary-light)]">Engine adapter cockpit</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-[var(--aethel-text-primary)]">
            Large engine modules become governed work packets, not surprise runtime imports.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">
            Read-only adapter evidence keeps paid engine code visible while heavy runtimes stay worker/sidecar/native/cloud until capability exists.
            These modules are not loaded directly in public, dashboard, or default Studio bundles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${READINESS_CLASS[readiness.state]}`}>
            {readiness.label}
          </span>
          <Link
            href="/honest-status"
            className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus-ring)]"
          >
            Honest status
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Modules" value={summary.totalModules.toString()} />
        <Metric label="Approx LOC" value={summary.totalLoc.toLocaleString('en-US')} />
        <Metric label="Ready" value={summary.ready.toString()} />
        <Metric label="Adapters" value={summary.adapterNeeded.toString()} />
        <Metric label="Heavy held" value={summary.heavyHeld.toString()} />
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Readiness model</p>
        <p className="mt-2 text-sm leading-6 text-[var(--aethel-text-secondary)]">{readiness.summary}</p>
        {readiness.blockers.length > 0 ? (
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {readiness.blockers.slice(0, 3).map((blocker) => (
              <p key={blocker} className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_7%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--aethel-warning-light)]">
                {blocker}
              </p>
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-xs font-semibold text-[var(--aethel-primary-light)]">Next safe move: {readiness.nextAction}</p>
      </div>

      {!compact ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {domains.map((domain) => (
            <article key={domain.key} className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_44%,transparent)] p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--aethel-text-primary)]">{domain.label}</h4>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                  {domain.modules.length}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
                {domain.totalLoc.toLocaleString('en-US')} LOC tracked; {domain.highRisk} high-risk.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {domain.modules.slice(0, 3).map((module) => (
                  <span key={module.id} className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                    {module.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

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
