'use client'

import { FileBox } from 'lucide-react'

/**
 * Drop target ghost overlay rendered on top of the 3D viewport when an asset
 * file is being dragged over the canvas.
 *
 * Shows the actual file name / file count extracted from the drag event so the
 * user knows exactly what they are about to import — UE5/Blender convention.
 */
export function ViewportAssetDropOverlay({
  active,
  draggedName,
}: {
  active: boolean
  draggedName?: string | null
}) {
  if (!active) return null

  const isMultiple = /^\d+ files$/.test(draggedName ?? '')

  return (
    <div
      className="pointer-events-none absolute inset-4 z-30 grid place-items-center rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--aethel-primary)_56%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] shadow-[inset_0_0_80px_rgba(0,0,0,0.42)] backdrop-blur-md"
      aria-live="assertive"
      aria-label={draggedName ? `Drop ${draggedName} into the scene` : 'Drop assets into the scene'}
    >
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-elevated)_90%,transparent)] px-6 py-5 text-center shadow-2xl">
        {/* Icon */}
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)]">
          <FileBox className="h-5 w-5 text-[var(--aethel-primary-light)]" aria-hidden="true" />
        </span>

        {/* Filename ghost */}
        {draggedName ? (
          <p className="max-w-[200px] truncate rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] px-3 py-1.5 font-mono text-xs font-semibold text-[var(--aethel-text-primary)]">
            {draggedName}
          </p>
        ) : null}

        <div>
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
            {isMultiple ? 'Drop files into the Scene Graph' : 'Drop asset into the Scene Graph'}
          </p>
          <p className="mt-1.5 text-xs text-[var(--aethel-text-tertiary)]">
            Preview first. License review stays held until approved.
          </p>
        </div>
      </div>
    </div>
  )
}
