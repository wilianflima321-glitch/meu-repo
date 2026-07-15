'use client'

/**
 * AI-v1-g / J.10 — LiveVoice receipt strip for Nexus / Agents UI.
 */

import {
  LIVE_VOICE_CORE_LANE,
  LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  LIVE_VOICE_HONESTY,
} from '@/lib/production/live-voice-operator'
import { LiveVoiceHonestyBadge } from './LiveVoiceHonestyBadge'

interface LiveVoiceReceiptProps {
  sessionId?: string | null
  turnId?: string | null
  playbackSource?: string | null
  rms?: number | null
  lipsyncFrames?: number | null
  evidenceReceiptId?: string | null
  blockedReason?: string | null
  className?: string
}

export function LiveVoiceReceipt({
  sessionId,
  turnId,
  playbackSource,
  rms,
  lipsyncFrames,
  evidenceReceiptId,
  blockedReason,
  className,
}: LiveVoiceReceiptProps) {
  if (!sessionId && !turnId && !blockedReason) return null

  const tone = blockedReason
    ? 'border-[var(--aethel-error)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]'
    : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]'

  return (
    <div
      className={className ?? `mx-4 mb-2 rounded-lg border px-3 py-2 ${tone}`}
      role="status"
      data-aethel-j10="live-voice-receipt"
      data-webrtc={LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS}
      data-lane={LIVE_VOICE_CORE_LANE}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-info-light)]">
          LiveVoice {blockedReason ? 'blocked' : 'direction'}
        </div>
        <LiveVoiceHonestyBadge compact />
      </div>
      {blockedReason ? (
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">{blockedReason}</p>
      ) : (
        <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-secondary)]">
          {LIVE_VOICE_HONESTY.coreLaneLive.split('.')[0]} · {playbackSource ?? 'formant-synth'}
          {typeof rms === 'number' ? ` · rms ${rms.toFixed(3)}` : ''}
          {typeof lipsyncFrames === 'number' ? ` · ${lipsyncFrames} lipsync frames` : ''}
        </p>
      )}
      {(sessionId || turnId || evidenceReceiptId) && (
        <p className="mt-1 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
          {sessionId ? `session:${sessionId}` : null}
          {sessionId && turnId ? ' · ' : null}
          {turnId ? `turn:${turnId}` : null}
          {(sessionId || turnId) && evidenceReceiptId ? ' · ' : null}
          {evidenceReceiptId ? `ev:${evidenceReceiptId.slice(0, 12)}` : null}
        </p>
      )}
    </div>
  )
}
