'use client'

/**
 * Letter cb — Honesty badges: native ONNX vs BYOK clay path.
 */

import { useMemo } from 'react'
import {
  buildGameReadyCharacterHonestyBadges,
  type GameReadyCharacterRoute,
} from '@/lib/studio/game-ready-character-orchestrator'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'

const TONE: Record<string, string> = {
  available:
    'text-[var(--aethel-success)] border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)]',
  held: 'text-[var(--aethel-warning)] border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)]',
  'needs-review':
    'text-[var(--aethel-text-secondary)] border-[var(--aethel-border-primary)]',
}

export function MeshNativeGenHonestyBadge({
  route,
  liveClayPollReady = true,
  className = '',
}: {
  route?: GameReadyCharacterRoute
  liveClayPollReady?: boolean
  className?: string
}) {
  const badges = useMemo(
    () =>
      buildGameReadyCharacterHonestyBadges({
        nativeOnnxReady: NATIVE_ONNX_READY,
        liveClayPollReady,
        route,
      }),
    [route, liveClayPollReady],
  )

  return (
    <div
      role="status"
      aria-live="polite"
      className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}
    >
      {badges.map((b) => (
        <div
          key={b.id}
          title={b.detail}
          className={[
            'rounded-md border bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-sm',
            TONE[b.status] ?? TONE.held,
          ].join(' ')}
        >
          <span className="block">{b.label}</span>
          <span className="mt-0.5 block text-[10px] font-normal text-[var(--aethel-text-muted)]">
            {b.detail}
          </span>
        </div>
      ))}
    </div>
  )
}

