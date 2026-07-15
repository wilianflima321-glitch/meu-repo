import type { StudioMissionControlViewProps } from './StudioMissionControlView.types'

export function StudioRuntimeTruthPanel({
  selectedRuntimeMode,
  quietPanelClass,
}: Pick<StudioMissionControlViewProps, 'selectedRuntimeMode'> & {
  quietPanelClass: string
}) {
  return (
    <div className={`mt-3 ${quietPanelClass} px-3 py-2`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Runtime state: {selectedRuntimeMode.label} / {selectedRuntimeMode.badge}
        </p>
        <span className="text-[11px] text-[var(--aethel-text-tertiary)]">{selectedRuntimeMode.costNote}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">{selectedRuntimeMode.detail}</p>
      {selectedRuntimeMode.fallbackReason ? (
        <p className="mt-1 text-[11px] text-[var(--aethel-warning-light)]">{selectedRuntimeMode.fallbackReason}</p>
      ) : null}
    </div>
  )
}
