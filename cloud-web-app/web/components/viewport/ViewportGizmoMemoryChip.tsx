'use client'

import type { GizmoTransformPersistenceChipTone } from '@/lib/viewport/gizmo-transform-persistence'

const memoryChipToneClass: Record<GizmoTransformPersistenceChipTone, string> = {
  neutral:
    'border-[var(--aethel-border-subtle)] bg-[rgba(var(--aethel-panel-ink-rgb), 0.78)] text-[var(--aethel-text-tertiary)]',
  saving:
    'border-[color-mix(in_srgb,var(--aethel-info)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,rgba(var(--aethel-panel-ink-rgb), 0.72))] text-[var(--aethel-info-light)]',
  success:
    'border-[color-mix(in_srgb,var(--aethel-success)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_14%,rgba(var(--aethel-panel-ink-rgb), 0.72))] text-[var(--aethel-success-light)]',
  warning:
    'border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_14%,rgba(var(--aethel-panel-ink-rgb), 0.72))] text-[var(--aethel-warning-light)]',
  error:
    'border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_14%,rgba(var(--aethel-panel-ink-rgb), 0.72))] text-[var(--aethel-error-light)]',
}

export function ViewportGizmoMemoryChip({
  chip,
}: {
  chip: {
    visible: boolean
    tone: GizmoTransformPersistenceChipTone
    label: string
    detail: string
  }
}) {
  if (!chip.visible) return null

  return (
    <div
      className={`absolute left-4 top-[58px] z-20 max-w-[360px] rounded-full border px-3 py-2 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-md ${memoryChipToneClass[chip.tone]}`}
      role={chip.tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="font-semibold">{chip.label}</span>
      <span className="mx-2 text-[var(--aethel-text-quaternary)]">/</span>
      <span className="text-[var(--aethel-text-secondary)]">{chip.detail}</span>
    </div>
  )
}
