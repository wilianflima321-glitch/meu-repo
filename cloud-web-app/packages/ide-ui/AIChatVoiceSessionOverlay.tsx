'use client'

/**
 * Live voice session overlay + disconnected fallback banner for AIChatPanelPro.
 * Extracted to keep AIChatPanelPro.tsx under the 500 LoC component budget.
 */

import { LiveSessionHUD } from '../../web/components/agents/chat/live/LiveSessionHUD'
import type { useRealtimeVoiceSession } from '../../web/components/agents/chat/voice/useRealtimeVoiceSession'

type VoiceSession = ReturnType<typeof useRealtimeVoiceSession>

export interface AIChatVoiceSessionOverlayProps {
  isLiveMode?: boolean
  voiceSession: VoiceSession
}

export function AIChatVoiceSessionOverlay({ isLiveMode, voiceSession }: AIChatVoiceSessionOverlayProps) {
  if (!isLiveMode) return null

  if (voiceSession.status === 'disconnected') {
    return (
      <div
        role="alert"
        className="mx-3 mb-2 flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-3 py-2.5"
      >
        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aethel-warning)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-[var(--aethel-warning-light)]">
            Voice unavailable
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--aethel-text-tertiary)]">
            WebRTC connection failed.{' '}
            <a
              href="/settings?tab=byok"
              className="underline decoration-[var(--aethel-warning)]/40 hover:decoration-[var(--aethel-warning)] text-[var(--aethel-warning-light)]"
            >
              Configure your OpenAI key in Settings
            </a>{' '}
            to enable live voice.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-x-0 bottom-20 z-30 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {voiceSession.lastBlockedReason && (
        <div
          role="alert"
          aria-live="assertive"
          className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] px-3 py-2.5"
        >
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aethel-error)]" aria-hidden />
          <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-[var(--aethel-error-light)]">
            Voice direction failed: {voiceSession.lastBlockedReason}
          </p>
        </div>
      )}
      <div className="pointer-events-auto w-full max-w-sm">
        <LiveSessionHUD
          status={voiceSession.status}
          speaker={voiceSession.speaker}
          transcript={voiceSession.transcript}
          isMuted={voiceSession.isMuted}
          amplitude={voiceSession.amplitude}
          onToggleMute={voiceSession.toggleMute}
          onEndSession={voiceSession.endSession}
        />
      </div>
    </div>
  )
}
