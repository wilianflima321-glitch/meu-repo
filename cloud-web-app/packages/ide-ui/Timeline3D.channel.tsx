/**
 * Curve-channel inspector for a selected Timeline3D keyframe.
 * First shipped channel: visibility.opacity (0–1) — real scrub-applied property.
 */

import {
  GLASS_SURFACE,
  MUTED_ICON,
  PANEL_BORDER,
  TEXT_PRIMARY,
  TEXT_TERTIARY,
  trackConfig,
} from './Timeline3D.styles'

export type TimelineChannelEditProps = {
  enabled: boolean
  selectedKfId: string | null
  selectedTrack: string | null
  /** Numeric channel value when the selected keyframe has one. */
  channelValue: number | null
  /** Curve property label (e.g. visibility.opacity). */
  channelProperty: string | null
  onChangeValue: (keyframeId: string, value: number) => void
}

function readNumericChannel(value: unknown, property: string | null): number | null {
  if (property == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value != null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const direct = record[property]
    if (typeof direct === 'number' && Number.isFinite(direct)) return direct
    // Timeline3D view packs `{ [property]: number }`.
    for (const v of Object.values(record)) {
      if (typeof v === 'number' && Number.isFinite(v)) return v
    }
  }
  return null
}

export function resolveChannelValue(
  value: unknown,
  track: string | null,
): { property: string | null; value: number | null } {
  if (track === 'visibility') {
    const property = 'visibility.opacity'
    return { property, value: readNumericChannel(value, property) }
  }
  return { property: null, value: null }
}

/** Compact toolbar strip: edit visibility.opacity for the selected keyframe. */
export function TimelineChannelInspector({
  enabled,
  selectedKfId,
  selectedTrack,
  channelValue,
  channelProperty,
  onChangeValue,
}: TimelineChannelEditProps) {
  if (!enabled || !selectedKfId || selectedTrack !== 'visibility' || channelProperty == null) {
    return null
  }

  const cfg = trackConfig('visibility')
  const display = channelValue ?? 1

  return (
    <div
      className="flex items-center gap-2 px-2 h-7 rounded-md"
      style={{
        background: GLASS_SURFACE,
        border: `1px solid ${PANEL_BORDER}`,
      }}
      data-timeline-channel="visibility.opacity"
    >
      <span
        className="text-[9px] font-semibold uppercase tracking-wider truncate"
        style={{ color: cfg.color, maxWidth: 88 }}
        title={channelProperty}
      >
        opacity
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={display}
        onChange={(e) => onChangeValue(selectedKfId, Number(e.target.value))}
        className="w-20 accent-[var(--aethel-primary)]"
        aria-label="visibility.opacity"
        data-timeline-channel-slider="true"
      />
      <input
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={Number(display.toFixed(2))}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (!Number.isFinite(next)) return
          onChangeValue(selectedKfId, Math.max(0, Math.min(1, next)))
        }}
        className="w-12 h-5 rounded px-1 text-[10px] font-mono"
        style={{
          color: TEXT_PRIMARY,
          background: 'transparent',
          border: `1px solid ${PANEL_BORDER}`,
        }}
        aria-label="visibility.opacity value"
        data-timeline-channel-input="true"
      />
      <span className="text-[9px] font-mono" style={{ color: channelValue == null ? MUTED_ICON : TEXT_TERTIARY }}>
        0–1
      </span>
    </div>
  )
}
