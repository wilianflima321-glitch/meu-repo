'use client'

/**
 * AI-v1-g / J.10 — LiveVoice honesty badge (Live CORE vs duplex WebRTC HELD).
 */

import {
  LIVE_VOICE_CORE_LANE,
  LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  LIVE_VOICE_HONESTY,
} from '@/lib/production/live-voice-operator'

export interface LiveVoiceHonestyBadgeProps {
  className?: string
  /** When true, emphasize CORE lane as Live; always shows duplex HELD. */
  compact?: boolean
}

export function LiveVoiceHonestyBadge({ className, compact = false }: LiveVoiceHonestyBadgeProps) {
  return (
    <div
      className={
        className ??
        'inline-flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface)_80%,transparent)] px-2 py-1'
      }
      role="status"
      data-aethel-j10="live-voice-honesty"
      data-core-lane={LIVE_VOICE_CORE_LANE}
      data-webrtc={LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS}
      title={LIVE_VOICE_HONESTY.duplexWebRtcHeld}
    >
      <span
        className="rounded border border-[var(--aethel-success)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-success-light)]"
        title={LIVE_VOICE_HONESTY.coreLaneLive}
      >
        PTT Live
      </span>
      <span
        className="rounded border border-[var(--aethel-warning)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-warning-light)]"
        title={LIVE_VOICE_HONESTY.duplexWebRtcHeld}
      >
        WebRTC [{LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS}]
      </span>
      {!compact && (
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
          {LIVE_VOICE_HONESTY.productLabel}
        </span>
      )}
    </div>
  )
}
