'use client'

export function ViewportAssetDropOverlay({ active }: { active: boolean }) {
  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-4 z-30 grid place-items-center rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--aethel-primary)_56%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_72%,transparent)] shadow-[inset_0_0_80px_rgba(0,0,0,0.42)] backdrop-blur-md">
      <div className="max-w-sm rounded-2xl border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.9)] px-5 py-4 text-center">
        <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">
          Drop assets into the Scene Graph
        </p>
        <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
          Preview first. license review stays held until approved.
        </p>
      </div>
    </div>
  )
}
