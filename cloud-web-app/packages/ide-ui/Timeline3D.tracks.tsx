import { TimelineEmptyAuthoringHint } from './Timeline3D.authoring'
import {
  LABEL_WIDTH,
  MUTED_ICON,
  PANEL_BORDER_SUBTLE,
  PANEL_SURFACE,
  RULER_HEIGHT,
  TEXT_PRIMARY,
  TRACK_HEIGHT,
  trackConfig,
  trackRgba,
} from './Timeline3D.styles'

export function TimelineTrackLabels({
  trackList,
  keyframes,
  selectedTrack,
  isEmptyLive,
  authoringEnabled,
  onSelectTrack,
}: {
  trackList: string[]
  keyframes: { track: string }[]
  selectedTrack: string | null
  isEmptyLive: boolean
  authoringEnabled: boolean
  onSelectTrack: (track: string | null) => void
}) {
  return (
    <div
      className="shrink-0 z-10"
      style={{
        width: LABEL_WIDTH,
        background: PANEL_SURFACE,
        borderRight: `1px solid ${PANEL_BORDER_SUBTLE}`,
      }}
    >
      <div style={{ height: RULER_HEIGHT, borderBottom: `1px solid ${PANEL_BORDER_SUBTLE}` }} />

      {isEmptyLive && (
        <div
          className="flex items-center px-3 text-[11px] text-[var(--aethel-text-tertiary)]"
          style={{ height: TRACK_HEIGHT * 2 }}
          data-timeline-empty-tracks="true"
        >
          <TimelineEmptyAuthoringHint enabled={authoringEnabled} />
        </div>
      )}
      {trackList.map((track) => {
        const cfg = trackConfig(track)
        const isSelected = selectedTrack === track
        const kfCount = keyframes.filter((k) => k.track === track).length

        return (
          <div
            key={track}
            className="flex items-center gap-2 px-3 cursor-pointer transition-all duration-100"
            style={{
              height: TRACK_HEIGHT,
              background: isSelected ? trackRgba(cfg, 0.08) : 'transparent',
              borderBottom: `1px solid ${PANEL_BORDER_SUBTLE}`,
              borderLeft: `2px solid ${isSelected ? cfg.color : 'transparent'}`,
            }}
            onClick={() => onSelectTrack(isSelected ? null : track)}
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: 6,
                height: 6,
                background: cfg.color,
                boxShadow: isSelected ? `0 0 8px ${cfg.glow}` : 'none',
                flexShrink: 0,
              }}
            />
            <span
              className="text-[11px] font-medium flex-1 truncate capitalize"
              style={{ color: isSelected ? TEXT_PRIMARY : MUTED_ICON }}
            >
              {cfg.label}
            </span>
            {kfCount > 0 && (
              <span
                className="text-[9px] font-mono rounded px-1"
                style={{ color: cfg.color, background: trackRgba(cfg, 0.12) }}
              >
                {kfCount}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
