import { getEngineSpineModulesByIds, type EngineSpineStatus } from '@/lib/studio/engine-spine-modules'

const STATUS_LABEL: Record<EngineSpineStatus, string> = {
  visible: 'Visible',
  'ready-to-wire': 'Ready',
  'adapter-needed': 'Adapter',
  'worker-held': 'Held',
}

const STATUS_CLASS: Record<EngineSpineStatus, string> = {
  visible: 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] text-[var(--aethel-success-light)]',
  'ready-to-wire': 'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] text-[var(--aethel-info-light)]',
  'adapter-needed': 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] text-[var(--aethel-warning-light)]',
  'worker-held': 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] text-[var(--aethel-error-light)]',
}

interface StudioEngineModuleMiniPanelProps {
  title: string
  moduleIds: readonly string[]
  className?: string
}

export default function StudioEngineModuleMiniPanel({ title, moduleIds, className = '' }: StudioEngineModuleMiniPanelProps) {
  const modules = getEngineSpineModulesByIds(moduleIds)

  if (modules.length === 0) return null

  return (
    <section className={`border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_52%,transparent)] p-3 ${className}`} aria-label={`${title} engine modules`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">Runtime modules</p>
          <h3 className="text-xs font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
        </div>
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1 text-[10px] font-semibold text-[var(--aethel-text-tertiary)]">
          {modules.length} modules
        </span>
      </div>

      <div className="space-y-2">
        {modules.map((module) => (
          <article key={module.id} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--aethel-text-primary)]">{module.label}</p>
                <p className="mt-1 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">{module.modulePath}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${STATUS_CLASS[module.status]}`}>
                {STATUS_LABEL[module.status]}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[var(--aethel-text-secondary)]">{module.nextAction}</p>
            <p className="mt-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_40%,transparent)] px-2 py-1.5 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">
              Load: {module.loadStrategy}. Limit: {module.limitation}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
