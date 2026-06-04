import type { StudioMissionControlViewProps } from './StudioMissionControlView.types'
import { statusClass } from './StudioMissionControl.options'

export function StudioRunboardHeader({
  session,
  runtimeReady,
  selectedRuntimeMode,
}: Pick<StudioMissionControlViewProps, 'session' | 'runtimeReady' | 'selectedRuntimeMode'>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_9%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-primary-light)]">
            Studio runboard
          </span>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusClass(session?.status)}`}>
            {session?.status ?? 'No session'}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${runtimeReady ? statusClass('active') : statusClass('stopped')}`}>
            {selectedRuntimeMode.label}: {selectedRuntimeMode.badge}
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--aethel-text-primary)]">Plan the next Studio move.</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
          One mission, one verified next action. Production detail stays under review.
        </p>
      </div>
    </div>
  )
}
