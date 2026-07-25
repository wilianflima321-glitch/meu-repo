'use client'

import { useState } from 'react'
// @aethel-heavy-async-boundary
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu } from 'lucide-react'

// ─────────────────────────────────────────────────────────
// SVG Donut chart for token breakdown
// ─────────────────────────────────────────────────────────

interface DonutSlice {
  label: string
  value: number
  color: string
}

function DonutChart({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const R = 36
  const STROKE = 8
  const CIRC = 2 * Math.PI * R
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={88} height={88} viewBox="0 0 88 88" aria-label="Token usage breakdown">
        {/* Track */}
        <circle cx={44} cy={44} r={R} fill="none" stroke="var(--aethel-surface-quaternary)" strokeWidth={STROKE} />

        {slices.map((slice) => {
          const fraction = total > 0 ? slice.value / total : 0
          const len = CIRC * fraction
          const dashOffset = -offset * CIRC
          offset += fraction
          return (
            <circle
              key={slice.label}
              cx={44}
              cy={44}
              r={R}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${len} ${CIRC - len}`}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
              transform="rotate(-90 44 44)"
            />
          )
        })}

        {/* Centre label */}
        <text x={44} y={40} textAnchor="middle" fill="var(--aethel-text-primary)" fontSize="11" fontWeight="700" fontFamily="monospace">
          {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)}
        </text>
        <text x={44} y={52} textAnchor="middle" fill="var(--aethel-text-muted)" fontSize="8" fontFamily="monospace">
          tokens
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
          const count = s.value
          return (
            <div key={s.label} className="flex items-center gap-2">
              {/* Color pill */}
              <span
                className="h-2 w-2.5 shrink-0 rounded-sm"
                style={{ background: s.color, boxShadow: `0 0 4px ${s.color}88` }}
              />
              <span className="min-w-0 flex-1 text-[10px] text-[var(--aethel-text-tertiary)]">{s.label}</span>
              {/* Count */}
              <span className="font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
                {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
              </span>
              {/* Percent badge */}
              <span
                className="min-w-[28px] rounded px-1 py-0.5 text-center text-[9px] font-bold"
                style={{
                  background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
                  color: s.color,
                  border: `1px solid color-mix(in srgb, ${s.color} 22%, transparent)`,
                }}
              >
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Mini horizontal progress bar
// ─────────────────────────────────────────────────────────

function MiniBar({
  label,
  used,
  total,
  color,
  sublabel,
}: {
  label: string
  used: number
  total: number
  color: string
  sublabel?: string
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      {/* Color swatch dot */}
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="w-9 shrink-0 text-[10px] font-semibold text-[var(--aethel-text-tertiary)]">{label}</span>
      <div
        className="relative flex-1 overflow-hidden rounded-full"
        style={{ height: 4, background: 'var(--aethel-surface-secondary)' }}
      >
        {/* Segmented ticks */}
        {[25, 50, 75].map((tick) => (
          <span
            key={tick}
            className="absolute top-0 h-full w-px"
            style={{ left: `${tick}%`, background: 'var(--aethel-surface-quaternary)', zIndex: 1 }}
            aria-hidden
          />
        ))}
        {/* Fill bar with neon glow */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 60%, transparent), ${color})`,
            boxShadow: pct > 0 ? `0 0 6px ${color}55` : 'none',
          }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} usage`}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
        {sublabel ?? `${Math.round(pct)}%`}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Main exported component
// ─────────────────────────────────────────────────────────

export interface ResourceMonitorHUDProps {
  /** 0–1 fraction of local compute budget used */
  localFraction?: number
  /** 0–1 fraction of cloud token budget used */
  cloudFraction?: number
  /** Token counts for the donut breakdown */
  tokenBreakdown?: {
    prompt: number
    completion: number
    cached: number
  }
  isWorking?: boolean
  /** When true, show Local GPU mode: $0.00 cost, ciano glow, GPU badge */
  localAIMode?: boolean
}

export function ResourceMonitorHUD({
  localFraction = 0,
  cloudFraction = 0,
  tokenBreakdown = { prompt: 0, completion: 0, cached: 0 },
  isWorking = false,
  localAIMode = false,
}: ResourceMonitorHUDProps) {
  const [expanded, setExpanded] = useState(false)

  const totalTokens =
    tokenBreakdown.prompt + tokenBreakdown.completion + tokenBreakdown.cached

  const donutSlices: DonutSlice[] = [
    { label: 'Prompt',     value: tokenBreakdown.prompt,     color: 'var(--aethel-neon-cyan)' },
    { label: 'Completion', value: tokenBreakdown.completion, color: 'var(--aethel-neon-violet)' },
    { label: 'Cached',     value: tokenBreakdown.cached,     color: 'var(--aethel-neon-emerald)' },
  ]

  // When localAIMode — all compute is local, show $0.00 and GPU badge
  const effectiveLocalFraction  = localAIMode ? (isWorking ? 0.72 : 0.18) : localFraction
  const effectiveCloudFraction  = localAIMode ? 0 : cloudFraction
  const primaryColor            = localAIMode ? 'var(--aethel-neon-cyan)' : 'var(--aethel-neon-violet)'
  const localBarColor           = 'var(--aethel-neon-cyan)'
  const cloudBarColor           = localAIMode
    ? 'color-mix(in srgb, var(--aethel-surface-quaternary) 60%, transparent)'
    : 'var(--aethel-neon-violet)'

  return (
    <div
      className="border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]"
      style={localAIMode ? {
        borderColor: 'color-mix(in srgb, var(--aethel-neon-cyan) 18%, transparent)',
        boxShadow: isWorking ? '0 0 16px color-mix(in srgb, var(--aethel-neon-cyan) 6%, transparent)' : 'none',
        transition: 'box-shadow 400ms ease',
      } : undefined}
    >
      {/* Local AI Mode banner */}
      {localAIMode && (
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            borderBottom: '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 12%, transparent)',
            background: 'color-mix(in srgb, var(--aethel-neon-cyan) 4%, transparent)',
          }}
        >
          <Cpu className="h-2.5 w-2.5 text-[var(--aethel-neon-cyan)]" aria-hidden />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-neon-cyan)]">
            GPU Local
          </span>
          <span className="ml-auto font-mono text-[10px] font-bold text-[var(--aethel-neon-emerald)]">
            $0.00
          </span>
          <span className="text-[9px] text-[var(--aethel-text-quaternary)]">Local Compute</span>
        </div>
      )}

      {/* Compact row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="Toggle resource monitor"
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)] transition-colors"
      >
        {/* Pulse dot when AI is working */}
        <span className="relative flex h-2 w-2 shrink-0">
          {isWorking && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: primaryColor }}
            />
          )}
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: isWorking ? primaryColor : 'var(--aethel-surface-quaternary)' }}
          />
        </span>

        {/* The two compact bars */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <MiniBar
            label="Local"
            used={effectiveLocalFraction}
            total={1}
            color={localBarColor}
            sublabel={localAIMode ? '100%' : `${Math.round(effectiveLocalFraction * 100)}%`}
          />
          <MiniBar
            label="Cloud"
            used={effectiveCloudFraction}
            total={1}
            color={cloudBarColor}
            sublabel={localAIMode ? '—' : `${Math.round(effectiveCloudFraction * 100)}%`}
          />
        </div>

        {/* Expand chevron */}
        <svg
          width={14}
          height={14}
          viewBox="0 0 14 14"
          fill="none"
          className={`shrink-0 text-[var(--aethel-text-quaternary)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Collapsible donut graph */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="donut"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 py-3 border-t border-[var(--aethel-border-subtle)]">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
                Token breakdown
              </p>
              <DonutChart slices={donutSlices} total={totalTokens} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
