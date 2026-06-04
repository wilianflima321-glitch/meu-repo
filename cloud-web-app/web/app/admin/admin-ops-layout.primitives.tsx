import type React from 'react'

export function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const color = status === 'healthy'
    ? 'bg-[var(--aethel-success)]'
    : status === 'degraded'
      ? 'bg-[var(--aethel-warning)]'
      : 'bg-[var(--aethel-error)]'
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color} ${status !== 'healthy' ? 'animate-pulse' : ''}`}
      aria-label={`Status: ${status}`}
    />
  )
}

export function QuickStatPill({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  alert?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        alert
          ? 'border-[var(--aethel-error)]/40 bg-[var(--aethel-error)]/10'
          : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/40'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${alert ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-tertiary)]'}`} />
      <div>
        <p className="text-[10px] text-[var(--aethel-text-tertiary)]">{label}</p>
        <p className={`font-semibold ${alert ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-text-primary)]'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
