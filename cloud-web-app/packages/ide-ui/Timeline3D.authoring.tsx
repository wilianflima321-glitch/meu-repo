import { Plus, Trash2 } from 'lucide-react'
import {
  GLASS_SURFACE,
  ICON_HOVER_BG,
  MUTED_ICON,
  PANEL_BORDER,
  PANEL_SURFACE,
  PRIMARY_MENU_BG,
  PRIMARY_SOFT_BG,
  SHADOW_MENU,
  TEXT_PRIMARY,
  TEXT_QUATERNARY,
  TEXT_TERTIARY,
  TRACK_CONFIGS,
  trackConfig,
} from './Timeline3D.styles'

export type TimelineAuthoringProps = {
  enabled: boolean
  availableLanes: string[]
  selectedTrack: string | null
  selectedKfId: string | null
  showAddTrackMenu: boolean
  onToggleAddTrackMenu: () => void
  onAddTrack: (laneId: string) => void
  onRemoveTrack?: (laneId: string) => void
  onRemoveKeyframe?: (keyframeId: string) => void
}

/** Toolbar cluster: Add Track + delete selection (live authoring only). */
export function TimelineAuthoringControls({
  enabled,
  availableLanes,
  selectedTrack,
  selectedKfId,
  showAddTrackMenu,
  onToggleAddTrackMenu,
  onAddTrack,
  onRemoveTrack,
  onRemoveKeyframe,
}: TimelineAuthoringProps) {
  if (!enabled) return null

  const canAdd = availableLanes.length > 0
  const canRemoveTrack = Boolean(selectedTrack && onRemoveTrack)
  const canRemoveKf = Boolean(selectedKfId && onRemoveKeyframe)

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          onClick={onToggleAddTrackMenu}
          disabled={!canAdd}
          className="flex items-center gap-1 px-2 h-7 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: canAdd ? TEXT_PRIMARY : MUTED_ICON,
            background: showAddTrackMenu ? PRIMARY_SOFT_BG : GLASS_SURFACE,
            border: `1px solid ${PANEL_BORDER}`,
          }}
          title={canAdd ? 'Add track lane' : 'All authorable lanes are present'}
          data-timeline-add-track="true"
        >
          <Plus size={12} />
          Track
        </button>
        {showAddTrackMenu && canAdd && (
          <div
            className="absolute top-full left-0 mt-1 min-w-[140px] rounded-lg overflow-hidden z-50"
            style={{
              background: PANEL_SURFACE,
              border: `1px solid ${PANEL_BORDER}`,
              boxShadow: SHADOW_MENU,
            }}
            data-timeline-add-track-menu="true"
          >
            {availableLanes.map((lane) => {
              const cfg = trackConfig(lane)
              return (
                <button
                  key={lane}
                  type="button"
                  onClick={() => onAddTrack(lane)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs capitalize transition-colors"
                  style={{ color: TEXT_QUATERNARY }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = PRIMARY_MENU_BG
                    e.currentTarget.style.color = TEXT_PRIMARY
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = TEXT_QUATERNARY
                  }}
                >
                  <span
                    className="rounded-full shrink-0"
                    style={{ width: 6, height: 6, background: cfg.color }}
                  />
                  {cfg.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (selectedKfId && onRemoveKeyframe) onRemoveKeyframe(selectedKfId)
          else if (selectedTrack && onRemoveTrack) onRemoveTrack(selectedTrack)
        }}
        disabled={!canRemoveKf && !canRemoveTrack}
        className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: MUTED_ICON }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.background = ICON_HOVER_BG
            e.currentTarget.style.color = TEXT_PRIMARY
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = MUTED_ICON
        }}
        title={
          canRemoveKf
            ? 'Delete selected keyframe'
            : canRemoveTrack
              ? 'Delete selected track'
              : 'Select a track or keyframe to delete'
        }
        data-timeline-delete="true"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export function TimelineEmptyAuthoringHint({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <span>
        No tracks bound to this project sequence.
      </span>
    )
  }
  return (
    <span>
      Empty sequence — use{' '}
      <span style={{ color: TEXT_TERTIARY }}>Add Track</span> to author lanes.
    </span>
  )
}

/** Stable menu order for Add Track dropdown (only lanes still missing). */
export function orderAvailableLanes(lanes: string[]): string[] {
  const order = Object.keys(TRACK_CONFIGS)
  return [...lanes].sort((a, b) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
  })
}
