import type { ElementType, ReactNode } from 'react'

export function ProfileSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="mb-6 rounded-xl border border-[var(--aethel-border-secondary)]/50 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-6">
      <h3 className="mb-1 text-lg font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
      {description ? <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">{description}</p> : null}
      {children}
    </section>
  )
}

export function SettingRow({
  icon: Icon,
  label,
  value,
  action,
  danger = false,
}: {
  icon: ElementType
  label: string
  value?: string | ReactNode
  action?: ReactNode
  danger?: boolean
}) {
  return (
    <div className={`flex items-center justify-between border-b border-[var(--aethel-border-secondary)]/50 py-3 last:border-0 ${danger ? 'text-[var(--aethel-error)]' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[var(--aethel-text-secondary)]" />
        <div>
          <div className={`text-sm font-medium ${danger ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-primary)]'}`}>{label}</div>
          {value ? <div className="text-xs text-[var(--aethel-text-tertiary)]">{value}</div> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export function ProfileToggle({
  enabled,
  label,
  onToggle,
}: {
  enabled: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={enabled}
      className={`h-6 w-12 rounded-full transition-colors ${
        enabled ? 'bg-[var(--aethel-primary-dark)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_70%,transparent)]'
      }`}
    >
      <span className={`block h-5 w-5 rounded-full bg-[var(--aethel-text-primary)] transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}
