'use client'

import { useEffect, useState } from 'react'

interface FlyCameraHUDProps {
  /** Fly-mode is active when the user holds right-mouse + moves */
  isActive: boolean
  /** Current fly speed multiplier (1x default, up with scroll) */
  speed?: number
}

/**
 * Small corner indicator that appears during fly-camera (WASD + right-mouse).
 * Located bottom-left of the viewport, styled as a cyberpunk HUD readout.
 */
export function FlyCameraHUD({ isActive, speed = 1 }: FlyCameraHUDProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      setVisible(true)
    } else {
      // Fade out with a short delay so the readout doesn't flicker on brief pauses
      const t = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(t)
    }
  }, [isActive])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none absolute bottom-16 left-4 z-20 flex items-center gap-2 overflow-hidden rounded-xl border border-[color-mix(in_srgb,#00e5ff_28%,transparent)] bg-[rgba(2,6,23,0.72)] px-3 py-2 [backdrop-filter:blur(10px)]"
      role="status"
      aria-live="polite"
      aria-label={`Fly camera ${isActive ? 'active' : 'inactive'}, speed ${speed}x`}
      style={{
        opacity: isActive ? 1 : 0,
        transition: 'opacity 300ms ease',
        boxShadow: isActive ? '0 0 16px rgba(0,229,255,0.12)' : 'none',
      }}
    >
      {/* Animated flight indicator */}
      <span className="relative flex h-2 w-2 shrink-0">
        {isActive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5ff] opacity-60" />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: isActive ? '#00e5ff' : '#374151' }}
        />
      </span>

      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
        Fly
      </span>

      <span className="text-[var(--aethel-border-subtle)] text-[10px]">|</span>

      {/* Speed readout */}
      <span className="font-mono text-[11px] font-bold text-[#e5e7eb]">
        {speed.toFixed(1)}
        <span className="ml-0.5 text-[9px] font-normal text-[#6b7280]">×</span>
      </span>

      {/* WASD hint — visible only first time */}
      <span className="ml-1 text-[9px] text-[#4b5563]">WASD</span>
    </div>
  )
}
