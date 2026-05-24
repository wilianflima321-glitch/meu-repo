import type { ReactNode } from 'react'

type SurfaceTone = 'available' | 'held' | 'blocked' | 'needs-review' | 'neutral'

export type SurfaceStatusChip = {
  label: string
  value?: string
  tone?: SurfaceTone
}

type SurfaceQualityShellProps = {
  eyebrow: string
  title: string
  subtitle: string
  status: SurfaceStatusChip[]
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  children: ReactNode
  density?: 'compact' | 'standard'
}

const toneClass: Record<SurfaceTone, string> = {
  available: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]',
  held: 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]',
  blocked: 'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]',
  'needs-review': 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]',
  neutral: 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] text-[var(--aethel-text-secondary)]',
}

export function SurfaceQualityShell({
  eyebrow,
  title,
  subtitle,
  status,
  primaryAction,
  secondaryAction,
  children,
  density = 'standard',
}: SurfaceQualityShellProps) {
  return (
    <section className={density === 'compact' ? 'space-y-4' : 'space-y-5'} data-surface-quality-shell="true">
      <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent),color-mix(in_srgb,var(--aethel-info)_6%,transparent))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.24)] md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-info-light)]">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--aethel-text-primary)] md:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">{subtitle}</p>
          </div>
          {(primaryAction || secondaryAction) && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {secondaryAction}
              {primaryAction}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Surface status">
          {status.map((chip) => (
            <span key={`${chip.label}:${chip.value ?? ''}`} className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClass[chip.tone ?? 'neutral']}`}>
              {chip.label}{chip.value ? `: ${chip.value}` : ''}
            </span>
          ))}
        </div>
      </div>
      {children}
    </section>
  )
}
