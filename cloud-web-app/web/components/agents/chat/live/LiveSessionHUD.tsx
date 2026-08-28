'use client'

/**
 * LiveSessionHUD — floating overlay for LiveVoice CORE (push-to-talk / generate→play).
 * Honesty badge: PTT Live vs duplex WebRTC [HELD] — no fake WebRTC room chrome.
 */

import { useEffect, useRef, useState } from 'react'
// @aethel-heavy-async-boundary
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff, PhoneOff, Wifi, WifiOff } from 'lucide-react'
import { LiveVoiceWaveform, type WaveformSpeaker } from './LiveVoiceWaveform'
import { LiveVoiceHonestyBadge } from '@/components/agents/chat/creative/LiveVoiceHonestyBadge'
import {
  LIVE_VOICE_CORE_LANE,
  LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  LIVE_VOICE_HONESTY,
} from '@/lib/production/live-voice-operator'

export type LiveConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface LiveSessionHUDProps {
  status: LiveConnectionStatus
  /** Who is speaking right now */
  speaker: WaveformSpeaker
  /** Realtime transcript of the user's current utterance / direction */
  transcript?: string
  isMuted: boolean
  onToggleMute: () => void
  onEndSession: () => void
  /** 0–1 audio amplitude for the waveform */
  amplitude?: number
  /** When true, fires the barge-in red flash */
  bargeIn?: boolean
  /** Optional blocked reason from CostGuard / claim reject */
  blockedReason?: string | null
  /** NIMP active domains being processed in background */
  activeDomains?: string[]
  /** NIMP intent label */
  nimpIntent?: string
}

const STATUS_LABEL: Record<LiveConnectionStatus, string> = {
  connecting: 'Generating…',
  connected: 'PTT Ready',
  reconnecting: 'Retrying…',
  disconnected: 'Offline',
}

export function LiveSessionHUD({
  status,
  speaker,
  transcript,
  isMuted,
  onToggleMute,
  onEndSession,
  amplitude = 0.5,
  bargeIn = false,
  blockedReason = null,
  activeDomains = ['GEO', 'MAT', 'LGT', 'AUD'],
  nimpIntent,
}: LiveSessionHUDProps) {
  const [bargeFlash, setBargeFlash] = useState(false)
  const bargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!bargeIn) return
    setBargeFlash(true)
    if (bargeTimerRef.current) clearTimeout(bargeTimerRef.current)
    bargeTimerRef.current = setTimeout(() => setBargeFlash(false), 200)
    return () => {
      if (bargeTimerRef.current) clearTimeout(bargeTimerRef.current)
    }
  }, [bargeIn])

  const isLive = status === 'connected' || status === 'connecting'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: [0.34, 1.1, 0.64, 1] }}
      className="pointer-events-auto relative mx-auto mb-2 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface)_92%,transparent)] shadow-[var(--aethel-shadow-lg)] backdrop-blur-xl"
      style={{
        borderColor: bargeFlash
          ? 'color-mix(in srgb, var(--aethel-error) 80%, transparent)'
          : undefined,
      }}
      role="region"
      aria-label="LiveVoice session controls"
      data-aethel-j10="live-session-hud"
      data-lane={LIVE_VOICE_CORE_LANE}
      data-webrtc={LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            {isLive && (
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--aethel-success)] opacity-50" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isLive ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-error)]'
              }`}
            />
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
              isLive ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]'
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        <LiveVoiceWaveform
          speaker={speaker}
          amplitude={isMuted ? 0 : amplitude}
          barCount={18}
          className="h-8 flex-1"
        />

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute playback energy' : 'Mute playback energy'}
          aria-pressed={isMuted}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--aethel-border-secondary)] text-[var(--aethel-info-light)] transition-opacity hover:opacity-90"
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onEndSession}
          aria-label="End LiveVoice session"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--aethel-error)]/40 text-[var(--aethel-error-light)] transition-opacity hover:opacity-90"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </button>

        <span className="shrink-0 text-[var(--aethel-text-tertiary)]" aria-hidden>
          {status === 'disconnected' ? (
            <WifiOff className="h-3.5 w-3.5" />
          ) : (
            <Wifi className="h-3.5 w-3.5" />
          )}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--aethel-border-secondary)] px-4 py-2">
        <LiveVoiceHonestyBadge compact />
        {activeDomains.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono uppercase text-[var(--aethel-text-quaternary)] mr-1">Squads:</span>
            {activeDomains.map((dom) => (
              <span
                key={dom}
                className="rounded border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_12%,transparent)] px-1.5 py-0.5 text-[8px] font-mono font-bold text-[var(--aethel-neon-cyan)] shadow-sm animate-pulse"
                title={`Active AI Squad Domain: ${dom}`}
              >
                {dom}
              </span>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {transcript && (
          <motion.div
            key="caption"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--aethel-border-secondary)] px-4 pb-3">
              <p
                className="pt-2 text-[11px] leading-[1.6] text-[var(--aethel-text-secondary)]"
                aria-live="polite"
                aria-label="LiveVoice transcript"
              >
                <span className="mr-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">
                  Direction:
                </span>
                {transcript}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(status === 'disconnected' || blockedReason) && (
        <div
          className="flex items-center gap-2 border-t border-[var(--aethel-error)]/20 bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] px-4 py-2.5 text-xs text-[var(--aethel-error-light)]"
          role="alert"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {blockedReason
              ? blockedReason
              : `${LIVE_VOICE_HONESTY.duplexWebRtcHeld} Use push-to-talk direction (CostGuard metered).`}
          </span>
        </div>
      )}

      {bargeFlash && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-[var(--aethel-error)]/60 bg-[color-mix(in_srgb,var(--aethel-error)_6%,transparent)]"
          aria-hidden
        />
      )}
    </motion.div>
  )
}
