'use client'

/**
 * AI-v1-g / J.10 — LiveVoice client session.
 * CORE: governed push-to-talk → POST /api/agents/live-voice/direction → play PCM + waveform.
 * Full-duplex WebRTC remains [HELD] — never presents a fake WebRTC room as LIVE.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveConnectionStatus } from '../live/LiveSessionHUD'
import type { WaveformSpeaker } from '../live/LiveVoiceWaveform'
import {
  LIVE_VOICE_CORE_LANE,
  LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS,
  LIVE_VOICE_HONESTY,
} from '@/lib/production/live-voice-operator'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('useRealtimeVoiceSession')

interface UseRealtimeVoiceSessionOptions {
  isEnabled: boolean
  modelId: string
  projectId?: string
  planId?: string
  onMessageReceived?: (text: string) => void
  onTurnReceipt?: (receipt: {
    sessionId: string
    turnId: string
    playbackSource: string
    rms: number
    lipsyncFrames: number
    evidenceReceiptId: string
  }) => void
}

interface DirectionApiSuccess {
  success: true
  turn: {
    sessionId: string
    turnId: string
    directionText: string
    playbackSource: string
    waveform: { rms: number; peaks: number[]; durationSec: number; sampleRate: number }
    lipsync: Array<{ timeSec: number; energy: number }>
    pcmBase64: string
  }
  evidenceReceiptId: string
}

function decodeBase64Float32(base64: string): Float32Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
}

export function useRealtimeVoiceSession({
  isEnabled,
  modelId,
  projectId = 'studio-default',
  planId = 'pro',
  onMessageReceived,
  onTurnReceipt,
}: UseRealtimeVoiceSessionOptions) {
  const [status, setStatus] = useState<LiveConnectionStatus>('disconnected')
  const [speaker, setSpeaker] = useState<WaveformSpeaker>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [amplitude, setAmplitude] = useState<number>(0.05)
  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [lastBlockedReason, setLastBlockedReason] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const playingSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const amplitudeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const duplexWebRtcStatus = LIVE_VOICE_DUPLEX_WEBRTC_SHIP_STATUS
  const executionLane = LIVE_VOICE_CORE_LANE
  const honesty = LIVE_VOICE_HONESTY

  const stopPlayback = useCallback(() => {
    if (playingSourceRef.current) {
      try {
        playingSourceRef.current.stop()
      } catch {
        /* already stopped */
      }
      playingSourceRef.current = null
    }
    if (amplitudeTimerRef.current) {
      clearInterval(amplitudeTimerRef.current)
      amplitudeTimerRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    setStatus('disconnected')
    setSpeaker('idle')
    setTranscript('')
    setAmplitude(0.05)
    setLastBlockedReason(null)
    stopPlayback()
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close()
    }
    audioContextRef.current = null
  }, [stopPlayback])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const playPcmAndWaveform = useCallback(
    async (
      pcmBase64: string,
      sampleRate: number,
      peaks: number[],
      lipsync: Array<{ energy: number }>,
      spokenText: string,
    ) => {
      const ctx = await ensureAudioContext()
      stopPlayback()
      const samples = decodeBase64Float32(pcmBase64)
      const buffer = ctx.createBuffer(1, samples.length, sampleRate)
      buffer.copyToChannel(samples, 0)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      playingSourceRef.current = source

      setSpeaker('ai')
      setTranscript(spokenText)
      setStatus('connected')

      let peakIdx = 0
      amplitudeTimerRef.current = setInterval(() => {
        if (isMuted) {
          setAmplitude(0.02)
          return
        }
        const fromPeaks = peaks[peakIdx % peaks.length] ?? 0.2
        const fromLipsync = lipsync[peakIdx % Math.max(1, lipsync.length)]?.energy ?? fromPeaks
        setAmplitude(Math.min(1, Math.max(0.08, fromPeaks * 0.7 + fromLipsync * 2)))
        peakIdx += 1
      }, 40)

      await new Promise<void>((resolve) => {
        source.onended = () => resolve()
        source.start()
      })

      stopPlayback()
      setSpeaker('idle')
      setAmplitude(0.05)
      onMessageReceived?.(spokenText)
    },
    [ensureAudioContext, isMuted, onMessageReceived, stopPlayback],
  )

  /**
   * CORE path: push-to-talk / typed direction → governed generate→play.
   */
  const pushToTalkDirection = useCallback(
    async (directionText: string) => {
      const text = directionText.trim()
      if (!text) return { ok: false as const, blockedReason: 'invalid_input' }

      setStatus('connecting')
      setSpeaker('user')
      setTranscript(text)
      setLastBlockedReason(null)

      try {
        const response = await fetch('/api/agents/live-voice/direction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            directionText: text,
            planId,
            sessionId: sessionId ?? undefined,
            voiceId: modelId,
            // Honesty: never claim duplex WebRTC live from this CORE client.
            claimFullDuplexWebRtcLive: false,
          }),
        })

        const payload = (await response.json()) as
          | DirectionApiSuccess
          | { success: false; blockedReason?: string; message?: string }

        if (!response.ok || !payload.success) {
          const blocked =
            ('blockedReason' in payload && payload.blockedReason) ||
            ('message' in payload && payload.message) ||
            'direction_failed'
          setLastBlockedReason(String(blocked))
          setStatus('disconnected')
          setSpeaker('idle')
          log.warn('live_voice_direction_blocked', { blocked })
          return { ok: false as const, blockedReason: String(blocked) }
        }

        setSessionId(payload.turn.sessionId)
        onTurnReceipt?.({
          sessionId: payload.turn.sessionId,
          turnId: payload.turn.turnId,
          playbackSource: payload.turn.playbackSource,
          rms: payload.turn.waveform.rms,
          lipsyncFrames: payload.turn.lipsync.length,
          evidenceReceiptId: payload.evidenceReceiptId,
        })

        await playPcmAndWaveform(
          payload.turn.pcmBase64,
          payload.turn.waveform.sampleRate,
          payload.turn.waveform.peaks,
          payload.turn.lipsync,
          payload.turn.directionText,
        )

        return { ok: true as const, turnId: payload.turn.turnId }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'provider_down'
        setLastBlockedReason(message)
        setStatus('disconnected')
        setSpeaker('idle')
        log.error('live_voice_direction_client_error', error instanceof Error ? error : new Error(message))
        return { ok: false as const, blockedReason: message }
      }
    },
    [modelId, onTurnReceipt, planId, playPcmAndWaveform, projectId, sessionId],
  )

  // Enabling voice mode arms the CORE PTT lane — does NOT invent a WebRTC room.
  useEffect(() => {
    if (isEnabled) {
      setStatus('connected')
      setSpeaker('idle')
      setTranscript('')
      setLastBlockedReason(null)
    } else {
      cleanup()
    }
    return () => {
      cleanup()
    }
  }, [isEnabled, cleanup])

  return {
    status,
    speaker,
    transcript,
    amplitude,
    isMuted,
    toggleMute,
    endSession: cleanup,
    /** CORE: governed generate→play turn */
    pushToTalkDirection,
    duplexWebRtcStatus,
    executionLane,
    honesty,
    lastBlockedReason,
    sessionId,
  }
}
