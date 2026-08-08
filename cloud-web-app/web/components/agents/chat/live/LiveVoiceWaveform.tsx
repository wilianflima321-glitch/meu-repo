'use client'

/**
 * LiveVoiceWaveform — animated pulsing waveform for real-time voice mode.
 *
 * Renders a row of vertical bars that animate at different phases and
 * amplitudes depending on who is speaking: AI (violet gradient) vs
 * User (cyan gradient), or idle (muted).
 */

import { useEffect, useRef } from 'react'
import { tokenColor, tokenRgba } from '@/lib/design-system/DesignTokenSync'

export type WaveformSpeaker = 'ai' | 'user' | 'idle'

interface LiveVoiceWaveformProps {
  /** Who is currently speaking */
  speaker: WaveformSpeaker
  /** Optional audio amplitude 0–1 from Web Audio AnalyserNode */
  amplitude?: number
  barCount?: number
  className?: string
}

// Canvas 2D cannot resolve CSS vars — concrete channels come from DesignTokenSync.
const SPEAKER_COLORS: Record<WaveformSpeaker, { from: string; to: string; glow: string }> = {
  ai:   { from: tokenColor('--aethel-accent'), to: tokenColor('--aethel-accent-light'), glow: tokenRgba('--aethel-accent', 0.4) },
  user: { from: tokenColor('--aethel-info-dark'), to: tokenColor('--aethel-neon-cyan'), glow: tokenRgba('--aethel-neon-cyan', 0.4) },
  idle: { from: tokenColor('--aethel-surface-tertiary'), to: tokenColor('--aethel-surface-quaternary'), glow: 'transparent' },
}

export function LiveVoiceWaveform({
  speaker,
  amplitude = 0.6,
  barCount = 28,
  className = '',
}: LiveVoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef<number>(0)
  const timeRef   = useRef(0)

  const colors = SPEAKER_COLORS[speaker]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W   = canvas.offsetWidth
    const H   = canvas.offsetHeight
    canvas.width  = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, W, H)

      const gap     = W / (barCount * 1.5)
      const barW    = gap * 0.7
      const spacing = gap * 1.5
      const eff     = speaker === 'idle' ? 0.08 : amplitude

      // Draw gradient on each bar
      for (let i = 0; i < barCount; i++) {
        const x = i * spacing + spacing * 0.5

        // Each bar has its own phase offset so they animate independently
        const phase  = timeRef.current * (2 + (i % 5) * 0.4) + i * 0.55
        const noise  = Math.sin(phase) * 0.5 + Math.sin(phase * 1.7) * 0.3 + 0.2
        const height = Math.max(2, H * eff * noise)
        const y      = (H - height) / 2

        const grad = ctx.createLinearGradient(0, y, 0, y + height)
        grad.addColorStop(0, colors.to)
        grad.addColorStop(1, colors.from)

        ctx.fillStyle = grad
        ctx.shadowBlur  = speaker !== 'idle' ? 6 : 0
        ctx.shadowColor = colors.glow
        ctx.beginPath()
        ctx.roundRect(x, y, barW, height, barW / 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      timeRef.current += 0.035
      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [speaker, amplitude, barCount, colors])

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      aria-label={`${speaker === 'idle' ? 'Idle' : speaker === 'ai' ? 'AI speaking' : 'You speaking'} voice waveform`}
      role="img"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: 'block' }}
      />
      {/* Speaker label */}
      {speaker !== 'idle' && (
        <span
          className="pointer-events-none absolute bottom-1 right-1 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
          style={{ color: colors.to, opacity: 0.75 }}
        >
          {speaker === 'ai' ? 'AI' : 'You'}
        </span>
      )}
    </div>
  )
}
