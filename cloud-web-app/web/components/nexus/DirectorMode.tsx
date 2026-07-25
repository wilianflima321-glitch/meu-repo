'use client'

/**
 * Film Director Mode — deepens existing Sequencer + Cinematic Director #63 bridge.
 * Not a Master-UX hero panel; wires the real IDE sequencer play/scrub surface
 * into the Film Studio viewport. Final footage / GPU soak remain [HELD].
 */

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useMemo, useState } from 'react'

import {
  planCinematicDirectorShoot,
  type CinematicDirectorIntent,
} from '@/lib/sequencer/cinematic-director-bridge'
import type { SequencerCameraTarget, SequencerLightTarget, SequencerViewportTargets } from '@/lib/sequencer/sequencer-viewport-wire'

const SequencerIdePanel = dynamic(() => import('@/components/sequencer/SequencerIdePanel'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-secondary)]">
      Loading director timeline…
    </div>
  ),
})

const DirectorModePreviewStage = dynamic(
  () => import('@/components/nexus/DirectorModePreviewStage').then((mod) => mod.DirectorModePreviewStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[var(--aethel-bg-base)] text-[var(--aethel-text-tertiary)]">
        Loading previz stage…
      </div>
    ),
  },
)

const INTENTS: { id: CinematicDirectorIntent; label: string }[] = [
  { id: 'establishing', label: 'Establishing' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'action', label: 'Action' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'custom', label: 'Custom' },
]

export default function DirectorMode() {
  const [intent, setIntent] = useState<CinematicDirectorIntent>('establishing')
  const plan = useMemo(() => planCinematicDirectorShoot({ intent }), [intent])
  const [viewportTargets, setViewportTargets] = useState<SequencerViewportTargets | null>(null)

  const handleStageReady = useCallback(
    (targets: { camera: SequencerCameraTarget; light: SequencerLightTarget }) => {
      setViewportTargets({ camera: targets.camera, lights: [targets.light] })
    },
    [],
  )

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-[var(--aethel-surface-primary)]"
      data-testid="director-mode"
      data-director-backend={plan.shootBackend}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--aethel-border-subtle)] px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
            Director Mode
          </p>
          <p className="truncate text-[12px] text-[var(--aethel-text-secondary)]">
            Engine sequencer shoot · {plan.shootBackend} · final footage held
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Director intent">
          {INTENTS.map((item) => {
            const active = item.id === intent
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setIntent(item.id)}
                aria-pressed={active}
                className={[
                  'rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
                  active
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
                    : 'border-transparent text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-subtle)] hover:text-[var(--aethel-text-primary)]',
                ].join(' ')}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2" data-director-intent={intent}>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[var(--aethel-border-subtle)]" data-director-live-bind={viewportTargets ? 'true' : 'false'}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-[var(--aethel-bg-base)] text-[var(--aethel-text-tertiary)]">
                Loading previz stage…
              </div>
            }
          >
            <DirectorModePreviewStage onTargetsReady={handleStageReady} />
          </Suspense>
        </div>
        <div className="h-[300px] shrink-0 overflow-auto">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-[var(--aethel-text-secondary)]">
                Loading director timeline…
              </div>
            }
          >
            <SequencerIdePanel intent={intent} viewportTargets={viewportTargets} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
