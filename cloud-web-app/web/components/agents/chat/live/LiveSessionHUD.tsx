'use client'

/**
 * LiveSessionHUD — floating overlay panel for real-time WebRTC/voice sessions.
 *
 * Shows:
 *  - Connection status pill (Connecting → Connected w/ pulsing green halo)
 *  - Mute / Unmute microphone button
 *  - Realtime user transcript caption strip
 *  - Barge-in flash feedback (red border flash when user interrupts AI)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
// @aethel-heavy-async-boundary
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff, PhoneOff, Wifi, WifiOff } from 'lucide-react'
import { LiveVoiceWaveform, type WaveformSpeaker } from './LiveVoiceWaveform'

export type LiveConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface LiveSessionHUDProps {
  status: LiveConnectionStatus
  /** Who is speaking right now */
  speaker: WaveformSpeaker
  /** Realtime transcript of the user's current utterance */
  transcript?: string
  isMuted: boolean
  onToggleMute: () => void
  onEndSession: () => void
  /** 0–1 audio amplitude for the waveform */
  amplitude?: number
  /** When true, fires the barge-in red flash */
  bargeIn?: boolean
}

const STATUS_LABEL: Record<LiveConnectionStatus, string> = {
  connecting:    'Connecting…',
  connected:     'Connected',
  reconnecting:  'Reconnecting…',
  disconnected:  'Disconnected',
}

const STATUS_COLOR: Record<LiveConnectionStatus, string> = {
  connecting:   '#fbbf24',
  connected:    '#10b981',
  reconnecting: '#f59e0b',
  disconnected: '#f87171',
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
}: LiveSessionHUDProps) {
  const [bargeFlash, setBargeFlash] = useState(false)
  const bargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trigger barge-in flash
  useEffect(() => {
    if (!bargeIn) return
    setBargeFlash(true)
    if (bargeTimerRef.current) clearTimeout(bargeTimerRef.current)
    bargeTimerRef.current = setTimeout(() => setBargeFlash(false), 200)
    return () => {
      if (bargeTimerRef.current) clearTimeout(bargeTimerRef.current)
    }
  }, [bargeIn])

  const statusColor = STATUS_COLOR[status]
  const isLive = status === 'connected'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: [0.34, 1.1, 0.64, 1] }}
      className="pointer-events-auto mx-auto mb-2 w-full max-w-md overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(2,6,23,0.90)',
        border: bargeFlash
          ? '1px solid rgba(248,113,113,0.80)'
          : `1px solid ${isLive ? 'rgba(16,185,129,0.30)' : 'rgba(51,65,85,0.60)'}`,
        backdropFilter: 'blur(20px) saturate(160%)',
        boxShadow: bargeFlash
          ? '0 0 20px rgba(248,113,113,0.30), 0 8px 32px rgba(0,0,0,0.5)'
          : isLive
          ? '0 0 20px rgba(16,185,129,0.12), 0 8px 32px rgba(0,0,0,0.5)'
          : '0 8px 32px rgba(0,0,0,0.45)',
        transition: 'border-color 80ms ease, box-shadow 80ms ease',
      }}
      role="region"
      aria-label="Live voice session controls"
    >
      {/* Top bar: status + controls */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Connection status pill */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            {isLive && (
              <span
                className="absolute inset-0 animate-ping rounded-full"
                style={{ background: statusColor, opacity: 0.5 }}
              />
            )}
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: statusColor }}
            />
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: statusColor }}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Waveform */}
        <LiveVoiceWaveform
          speaker={speaker}
          amplitude={isMuted ? 0 : amplitude}
          barCount={18}
          className="h-8 flex-1"
        />

        {/* Mute button */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          aria-pressed={isMuted}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
          style={{
            background: isMuted ? 'rgba(248,113,113,0.15)' : 'rgba(0,229,255,0.10)',
            border: isMuted ? '1px solid rgba(248,113,113,0.40)' : '1px solid rgba(0,229,255,0.25)',
            color: isMuted ? '#f87171' : '#00e5ff',
            boxShadow: isMuted ? '0 0 8px rgba(248,113,113,0.18)' : '0 0 8px rgba(0,229,255,0.12)',
          }}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* End session */}
        <button
          type="button"
          onClick={onEndSession}
          aria-label="End live session"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:opacity-90"
          style={{
            background: 'rgba(239,68,68,0.14)',
            border: '1px solid rgba(239,68,68,0.36)',
            color: '#f87171',
          }}
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </button>

        {/* Connection quality icon */}
        <span
          className="shrink-0"
          style={{ color: statusColor, opacity: 0.7 }}
          aria-hidden
        >
          {status === 'disconnected'
            ? <WifiOff className="h-3.5 w-3.5" />
            : <Wifi className="h-3.5 w-3.5" />
          }
        </span>
      </div>

      {/* Realtime transcript caption */}
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
            <div
              className="px-4 pb-3"
              style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}
            >
              <p
                className="pt-2 text-[11px] leading-[1.6] text-[#94a3b8]"
                style={{ fontFamily: "'Geist Mono', monospace" }}
                aria-live="polite"
                aria-label="Realtime transcript"
              >
                <span
                  className="mr-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#00e5ff]"
                  aria-hidden
                >
                  You:
                </span>
                {transcript}
                <span
                  className="ml-0.5 inline-block h-3 w-0.5 animate-pulse"
                  style={{ background: '#00e5ff', verticalAlign: 'text-bottom' }}
                  aria-hidden
                />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnected banner — instruct user to configure OpenAI key */}
      {status === 'disconnected' && (
        <div
          className="flex items-center gap-2 border-t px-4 py-2.5 text-xs"
          style={{
            borderTopColor: 'rgba(248,113,113,0.18)',
            background: 'rgba(248,113,113,0.06)',
            color: '#fca5a5',
          }}
          role="alert"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Voice session offline.{' '}
            <a
              href="/settings?tab=api"
              className="underline underline-offset-2 hover:text-white transition-colors"
            >
              Configure your OpenAI key
            </a>{' '}
            to enable realtime voice.
          </span>
        </div>
      )}

      {/* Barge-in flash overlay */}
      {bargeFlash && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: 'rgba(248,113,113,0.06)',
            border: '2px solid rgba(248,113,113,0.60)',
          }}
          aria-hidden
        />
      )}
    </motion.div>
  )
}
