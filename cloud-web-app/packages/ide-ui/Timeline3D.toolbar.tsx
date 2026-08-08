import {
  KeyRound,
  Layers,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Repeat,
  ChevronDown,
} from 'lucide-react'
import {
  TimelineAuthoringControls,
  type TimelineAuthoringProps,
} from './Timeline3D.authoring'
import type { ReactNode } from 'react'
import {
  GLASS_SURFACE,
  ICON_HOVER_BG,
  ICON_HOVER_BG_SOFT,
  LOOP_ACTIVE,
  MUTED_DIVIDER,
  MUTED_ICON,
  MUTED_ICON_FAINT,
  MUTED_ICON_SOFT,
  PANEL_BORDER,
  PANEL_BORDER_SUBTLE,
  PANEL_SURFACE,
  PRIMARY_LIGHT,
  PRIMARY_MENU_BG,
  PRIMARY_SOFT_BG,
  SHADOW_MENU,
  TEXT_INVERSE,
  TEXT_PRIMARY,
  TEXT_QUATERNARY,
  TEXT_TERTIARY,
  formatTimecode,
  trackBorder,
  trackRgba,
  type TimelineTrackConfig,
} from './Timeline3D.styles'

const FPS_OPTIONS = [12, 24, 30, 60, 120]

type TimelineToolbarProps = {
  isPlaying: boolean
  isLooping: boolean
  currentTime: number
  duration: number
  fps: number
  showFpsMenu: boolean
  keyframeCount: number
  selectedTrack: string | null
  selectedCfg: TimelineTrackConfig | null
  onSeekStart: () => void
  onSeekEnd: () => void
  onPlayPause: () => void
  onToggleLoop: () => void
  onAddKeyframe: () => void
  onToggleFpsMenu: () => void
  onSelectFps: (fps: number) => void
  authoring?: TimelineAuthoringProps
  /** Optional curve-channel inspector (e.g. visibility.opacity). */
  channelSlot?: ReactNode
}

export function TimelineHonestyBadges({
  demoMode,
  isEmptyLive,
}: {
  demoMode: boolean
  isEmptyLive: boolean
}) {
  return (
    <>
      {demoMode && (
        <div
          className="flex shrink-0 items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{
            height: 22,
            background: 'color-mix(in srgb, var(--aethel-warning) 12%, transparent)',
            color: 'var(--aethel-warning)',
            borderBottom: '1px solid color-mix(in srgb, var(--aethel-warning) 25%, transparent)',
          }}
          role="status"
          data-timeline-demo="true"
        >
          Demo timeline — fixture keyframes only (not wired to scene/animation data)
        </div>
      )}
      {isEmptyLive && (
        <div
          className="flex shrink-0 items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{
            height: 22,
            background: 'color-mix(in srgb, var(--aethel-text-tertiary) 10%, transparent)',
            color: TEXT_TERTIARY,
            borderBottom: `1px solid ${PANEL_BORDER_SUBTLE}`,
          }}
          role="status"
          data-timeline-empty="true"
        >
          Empty timeline — no sequence tracks (add a track to begin authoring)
        </div>
      )}
    </>
  )
}

export function TimelineToolbar({
  isPlaying,
  isLooping,
  currentTime,
  duration,
  fps,
  showFpsMenu,
  keyframeCount,
  selectedTrack,
  selectedCfg,
  onSeekStart,
  onSeekEnd,
  onPlayPause,
  onToggleLoop,
  onAddKeyframe,
  onToggleFpsMenu,
  onSelectFps,
  authoring,
  channelSlot,
}: TimelineToolbarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-between px-3 z-20 relative"
      style={{
        height: 40,
        background: PANEL_SURFACE,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${PANEL_BORDER}`,
      }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onSeekStart}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100"
          style={{ color: MUTED_ICON }}
          onMouseEnter={e => { e.currentTarget.style.background = ICON_HOVER_BG; e.currentTarget.style.color = TEXT_PRIMARY }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED_ICON }}
          title="Return to start"
        >
          <SkipBack size={13} />
        </button>

        <button
          type="button"
          onClick={onPlayPause}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 hover:scale-105 active:scale-95"
          style={{
            background: isPlaying
              ? 'linear-gradient(135deg, var(--aethel-warning) 0%, var(--aethel-warning-dark) 100%)'
              : 'linear-gradient(135deg, var(--aethel-success) 0%, var(--aethel-success-dark) 100%)',
            boxShadow: isPlaying
              ? '0 0 12px rgba(var(--aethel-warning-rgb), 0.4)'
              : '0 0 12px rgba(var(--aethel-success-rgb), 0.35)',
            color: TEXT_INVERSE,
          }}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          type="button"
          onClick={onSeekEnd}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100"
          style={{ color: MUTED_ICON }}
          onMouseEnter={e => { e.currentTarget.style.background = ICON_HOVER_BG; e.currentTarget.style.color = TEXT_PRIMARY }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = MUTED_ICON }}
          title="Jump to end"
        >
          <SkipForward size={13} />
        </button>

        <button
          type="button"
          onClick={onToggleLoop}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100"
          style={{
            color: isLooping ? LOOP_ACTIVE : MUTED_ICON_SOFT,
            background: isLooping ? PRIMARY_SOFT_BG : 'transparent',
          }}
          title="Toggle loop"
        >
          <Repeat size={12} />
        </button>

        <div style={{ width: 1, height: 18, background: PANEL_BORDER }} />

        <button
          type="button"
          onClick={onAddKeyframe}
          disabled={!selectedTrack}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: MUTED_ICON }}
          onMouseEnter={e => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = ICON_HOVER_BG
              e.currentTarget.style.color = TEXT_PRIMARY
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = MUTED_ICON
          }}
          title={selectedTrack ? `Add keyframe to "${selectedTrack}"` : 'Select a track to add a keyframe'}
          data-timeline-add-keyframe="true"
        >
          <KeyRound size={13} />
        </button>

        {authoring && <TimelineAuthoringControls {...authoring} />}
        {channelSlot}
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-lg"
          style={{ background: GLASS_SURFACE, border: `1px solid ${PANEL_BORDER}` }}
        >
          <span
            className="font-mono text-sm font-bold tracking-widest tabular-nums"
            style={{ color: TEXT_PRIMARY, letterSpacing: '0.08em' }}
          >
            {formatTimecode(currentTime, fps)}
          </span>
          <span style={{ color: MUTED_DIVIDER, fontSize: 12 }}>/</span>
          <span className="font-mono text-xs tabular-nums" style={{ color: MUTED_ICON_SOFT }}>
            {formatTimecode(duration, fps)}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={onToggleFpsMenu}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all duration-100"
            style={{
              color: TEXT_QUATERNARY,
              background: GLASS_SURFACE,
              border: `1px solid ${PANEL_BORDER_SUBTLE}`,
            }}
          >
            <span className="font-mono">{fps}</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>fps</span>
            <ChevronDown size={10} style={{ opacity: 0.5 }} />
          </button>
          {showFpsMenu && (
            <div
              className="absolute bottom-full mb-1 right-0 rounded-lg overflow-hidden z-50"
              style={{
                background: PANEL_SURFACE,
                border: `1px solid ${PANEL_BORDER}`,
                boxShadow: SHADOW_MENU,
              }}
            >
              {FPS_OPTIONS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onSelectFps(f)}
                  className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-xs transition-colors"
                  style={{
                    color: f === fps ? PRIMARY_LIGHT : TEXT_QUATERNARY,
                    background: f === fps ? PRIMARY_MENU_BG : 'transparent',
                  }}
                  onMouseEnter={e => { if (f !== fps) e.currentTarget.style.background = ICON_HOVER_BG_SOFT }}
                  onMouseLeave={e => { if (f !== fps) e.currentTarget.style.background = 'transparent' }}
                >
                  <span className="font-mono">{f}</span>
                  <span style={{ opacity: 0.4, fontSize: 10 }}>fps</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5" style={{ color: MUTED_ICON_FAINT }}>
          <Layers size={11} />
          <span className="text-[10px] font-mono">{keyframeCount} kf</span>
        </div>
        {selectedCfg && selectedTrack && (
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: trackRgba(selectedCfg, 0.12),
              color: selectedCfg.color,
              border: trackBorder(selectedCfg, 0.2),
            }}
          >
            {selectedTrack}
          </div>
        )}
      </div>
    </div>
  )
}
