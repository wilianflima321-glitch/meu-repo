'use client'

import { useEffect, useRef, useState } from 'react'
// @aethel-heavy-async-boundary
import { motion, AnimatePresence } from 'framer-motion'

// ─────────────────────────────────────────────────────────
// Radial SVG Telemetry Dial
// ─────────────────────────────────────────────────────────

const DIAL_R = 28
const DIAL_CX = 36
const DIAL_CY = 36
const CIRCUMFERENCE = 2 * Math.PI * DIAL_R
// Arc sweeps 270° (gap at bottom)
const ARC_FRACTION = 0.75

function radialArcD(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

// Arc: 135° → 405° (270° sweep)
const TRACK_D = radialArcD(DIAL_CX, DIAL_CY, DIAL_R, 135, 405)

function TelemetryDial({
  label,
  value,
  max = 100,
  color,
  unit = '%',
}: {
  label: string
  value: number
  max?: number
  color: string
  unit?: string
}) {
  const fraction = Math.min(value / max, 1)
  const arcLength = ARC_FRACTION * CIRCUMFERENCE * fraction
  const dashOffset = -(ARC_FRACTION * CIRCUMFERENCE - arcLength)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72} viewBox="0 0 72 72" role="img" aria-label={`${label}: ${value}${unit}`}>
        {/* Background track */}
        <path d={TRACK_D} fill="none" stroke="#1e2a3a" strokeWidth={5} strokeLinecap="round" />

        {/* Value arc */}
        <path
          d={TRACK_D}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${ARC_FRACTION * CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />

        {/* Glow filter */}
        <defs>
          <filter id={`glow-${label}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Value text */}
        <text
          x={DIAL_CX}
          y={DIAL_CY + 4}
          textAnchor="middle"
          fill="#e5e7eb"
          fontSize="12"
          fontWeight="700"
          fontFamily="monospace"
        >
          {Math.round(value)}
        </text>
        <text x={DIAL_CX} y={DIAL_CY + 14} textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="monospace">
          {unit}
        </text>
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6b7280]">{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Matrix Rain Canvas
// ─────────────────────────────────────────────────────────

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナ01ABCDEF'

function MatrixRain({ visible }: { visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | null>(null)
  const dropsRef = useRef<number[]>([])

  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth || 320
    const H = canvas.offsetHeight || 160
    canvas.width = W
    canvas.height = H

    const COL_W = 14
    const cols = Math.floor(W / COL_W)
    dropsRef.current = Array.from({ length: cols }, () => Math.random() * -H)

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(0, 0, W, H)
      ctx.font = `${COL_W - 2}px monospace`
      dropsRef.current.forEach((y, i) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const bright = y > 0 && y < 14
        ctx.fillStyle = bright ? '#00ffcc' : '#00e5ff'
        ctx.globalAlpha = bright ? 1 : 0.35
        ctx.fillText(char, i * COL_W, y)
        ctx.globalAlpha = 1
        dropsRef.current[i] = y > H + Math.random() * 80 ? -COL_W * 2 : y + COL_W
      })
      frameRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [visible])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

// ─────────────────────────────────────────────────────────
// Success checkmark tick
// ─────────────────────────────────────────────────────────

function SuccessTick() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" aria-label="Verification passed">
        <circle cx="28" cy="28" r="26" fill="none" stroke="#00ffcc" strokeWidth="2" opacity="0.3" />
        <motion.path
          d="M16 28 L24 36 L40 20"
          fill="none"
          stroke="#00ffcc"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────

export type SandboxVerificationState = 'idle' | 'compiling' | 'success' | 'error'

export interface SandboxVerificationHubProps {
  state?: SandboxVerificationState
  cpuThreads?: number
  memoryMB?: number
  hpmScore?: number
}

export function SandboxVerificationHub({
  state = 'idle',
  cpuThreads = 0,
  memoryMB = 0,
  hpmScore = 0,
}: SandboxVerificationHubProps) {
  const isCompiling = state === 'compiling'
  const isSuccess = state === 'success'
  const isError = state === 'error'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,#00e5ff_18%,transparent)] bg-[#060d16]">
      {/* Matrix rain — visible only during compilation */}
      <AnimatePresence>
        {isCompiling && (
          <motion.div
            key="matrix"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <MatrixRain visible={isCompiling} />
            {/* Gradient vignette so dials are still readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d16] via-[#060d16]/60 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkmark on success */}
      <AnimatePresence>{isSuccess && <SuccessTick key="tick" />}</AnimatePresence>

      {/* Telemetry dials — always visible */}
      <div className="relative z-10 flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,#00e5ff_70%,transparent)]">
            Verification Hub
          </span>
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]',
              isCompiling
                ? 'bg-[color-mix(in_srgb,#00e5ff_14%,transparent)] text-[#00e5ff]'
                : isSuccess
                  ? 'bg-[color-mix(in_srgb,#00ffcc_14%,transparent)] text-[#00ffcc]'
                  : isError
                    ? 'bg-[color-mix(in_srgb,#ef4444_14%,transparent)] text-[#ef4444]'
                    : 'bg-[#0d1a26] text-[#4b5563]',
            ].join(' ')}
          >
            {state}
          </span>
        </div>

        <div className="flex items-center justify-around">
          <TelemetryDial label="CPU" value={cpuThreads} max={16} color="#00e5ff" unit="thr" />
          <TelemetryDial label="MEM" value={memoryMB} max={4096} color="#9333ea" unit="MB" />
          <TelemetryDial label="HPM" value={hpmScore} max={100} color="#00ffcc" unit="pts" />
        </div>

        {isError && (
          <p className="rounded-lg border border-[color-mix(in_srgb,#ef4444_30%,transparent)] bg-[color-mix(in_srgb,#ef4444_10%,transparent)] px-3 py-2 text-[10px] text-[#f87171]">
            Compilation failed — check the terminal for details.
          </p>
        )}
      </div>
    </div>
  )
}
