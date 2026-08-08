'use client'

import { useEffect, useRef } from 'react'
import { tokenColor } from '@/lib/design-system/DesignTokenSync'
// @aethel-heavy-async-boundary
import { motion, AnimatePresence } from 'framer-motion'
import { resolveCssVarColor, resolveCssVarRgba } from '@/lib/style/resolve-css-var'

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
  colorVar,
  colorFallback,
  unit = '%',
}: {
  label: string
  value: number
  max?: number
  colorVar: string
  colorFallback: string
  unit?: string
}) {
  const fraction = Math.min(value / max, 1)
  const arcLength = ARC_FRACTION * CIRCUMFERENCE * fraction
  const dashOffset = -(ARC_FRACTION * CIRCUMFERENCE - arcLength)
  const stroke = `var(${colorVar})`

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={72} viewBox="0 0 72 72" role="img" aria-label={`${label}: ${value}${unit}`}>
        {/* Background track */}
        <path
          d={TRACK_D}
          fill="none"
          stroke="var(--aethel-surface-quaternary)"
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={TRACK_D}
          fill="none"
          stroke={stroke}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={`${ARC_FRACTION * CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)', color: colorFallback }}
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
          fill="var(--aethel-text-primary)"
          fontSize="12"
          fontWeight="700"
          fontFamily="monospace"
        >
          {Math.round(value)}
        </text>
        <text
          x={DIAL_CX}
          y={DIAL_CY + 14}
          textAnchor="middle"
          fill="var(--aethel-text-muted)"
          fontSize="8"
          fontFamily="monospace"
        >
          {unit}
        </text>
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-muted)]">
        {label}
      </span>
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

    const fade = resolveCssVarRgba('--aethel-surface-primary', 0.12, tokenColor('--aethel-surface-primary'))
    const bright = resolveCssVarColor('--aethel-neon-emerald', tokenColor('--aethel-neon-emerald'))
    const dim = resolveCssVarColor('--aethel-neon-cyan', tokenColor('--aethel-neon-cyan'))

    const draw = () => {
      ctx.fillStyle = fade
      ctx.fillRect(0, 0, W, H)
      ctx.font = `${COL_W - 2}px monospace`
      dropsRef.current.forEach((y, i) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const isBright = y > 0 && y < 14
        ctx.fillStyle = isBright ? bright : dim
        ctx.globalAlpha = isBright ? 1 : 0.35
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
        <circle
          cx="28"
          cy="28"
          r="26"
          fill="none"
          stroke="var(--aethel-neon-emerald)"
          strokeWidth="2"
          opacity="0.3"
        />
        <motion.path
          d="M16 28 L24 36 L40 20"
          fill="none"
          stroke="var(--aethel-neon-emerald)"
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
    <div className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_18%,transparent)] bg-[var(--aethel-surface-primary)]">
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
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--aethel-surface-primary)] via-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkmark on success */}
      <AnimatePresence>{isSuccess && <SuccessTick key="tick" />}</AnimatePresence>

      {/* Telemetry dials — always visible */}
      <div className="relative z-10 flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--aethel-neon-cyan)_70%,transparent)]">
            Verification Hub
          </span>
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]',
              isCompiling
                ? 'bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_14%,transparent)] text-[var(--aethel-neon-cyan)]'
                : isSuccess
                  ? 'bg-[color-mix(in_srgb,var(--aethel-neon-emerald)_14%,transparent)] text-[var(--aethel-neon-emerald)]'
                  : isError
                    ? 'bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)] text-[var(--aethel-error)]'
                    : 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-muted)]',
            ].join(' ')}
          >
            {state}
          </span>
        </div>

        <div className="flex items-center justify-around">
          <TelemetryDial
            label="CPU"
            value={cpuThreads}
            max={16}
            colorVar="--aethel-neon-cyan"
            colorFallback={tokenColor('--aethel-neon-cyan')}
            unit="thr"
          />
          <TelemetryDial
            label="MEM"
            value={memoryMB}
            max={4096}
            colorVar="--aethel-accent"
            colorFallback={tokenColor('--aethel-accent')}
            unit="MB"
          />
          <TelemetryDial
            label="HPM"
            value={hpmScore}
            max={100}
            colorVar="--aethel-neon-emerald"
            colorFallback={tokenColor('--aethel-neon-emerald')}
            unit="pts"
          />
        </div>

        {isError && (
          <p className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3 py-2 text-[10px] text-[var(--aethel-error-light)]">
            Compilation failed — check the terminal for details.
          </p>
        )}
      </div>
    </div>
  )
}
