'use client'

import dynamic from 'next/dynamic'

// @aethel-heavy-async-boundary: GameViewport stays behind this explicit Labs boundary.
const GameViewport = dynamic(() => import('./engine/GameViewport'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
      Preparing labs viewport...
    </div>
  ),
})

export default function VRPreview() {
  if (process.env.NEXT_PUBLIC_LABS_VR !== 'true') {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-6 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Labs held</p>
          <h3 className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">VR preview is not enabled in this environment.</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--aethel-text-secondary)]">
            Enable `NEXT_PUBLIC_LABS_VR=true` only when the runtime, device testing, and support policy are ready.
          </p>
        </div>
      </div>
    )
  }

  return <GameViewport mode="edit" />
}
