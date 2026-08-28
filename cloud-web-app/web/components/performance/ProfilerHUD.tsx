'use client'

/**
 * ProfilerHUD  -  Real-Time Performance Overlay
 *
 * PURPOSE: A non-intrusive corner overlay showing live engine metrics.
 * Addresses DEBT-UX-HITLIST-001 (missing performance feedback in viewport).
 * Uses JetBrains Mono for all numbers. Collapses to a minimal pill.
 *
 * HONESTY: Only renders metrics passed via props. Never shows fabricated numbers.
 * The backend/engine tick loop owns the data  -  this is purely display.
 *
 * WIRING: Connect `metrics` prop to your viewport/engine state store (Zustand).
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// --- Types ---

export interface EngineMetrics {
  fps: number
  /** in milliseconds */
  frameTime: number
  drawCalls: number
  triangleCount: number
  /** in MB */
  vramUsed: number
  /** in MB */
  vramTotal: number
  /** in milliseconds — SharedArrayBuffer sync latency */
  sabSyncMs?: number
  /** in milliseconds — physics tick time */
  physicsMs?: number
  domNodeCount?: number
  /** Overall capability score 0-100 per Law XV */
  capabilityScore?: number
}

type CornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface ProfilerHUDProps {
  metrics: EngineMetrics
  position?: CornerPosition
  /** If true renders a compact single-line pill instead of the full panel */
  compact?: boolean
  className?: string
}

// --- Helpers ---

function fmtMs(val: number) {
  return val < 1 ? `${(val * 1000).toFixed(0)}µs` : `${val.toFixed(1)}ms`
}

function fmtTriangles(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}

function MetricRow({ label, value, warn, crit }: { label: string; value: string; warn?: boolean; crit?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{label}</span>
      <span
        className={cn(
          'font-mono text-[11px] font-medium tabular-nums',
          crit
            ? 'text-[var(--aethel-error)]'
            : warn
            ? 'text-[var(--aethel-warning)]'
            : 'text-[var(--aethel-text-primary)]',
        )}
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
      >
        {value}
      </span>
    </div>
  )
}

function FrametimeSparkline({ history }: { history: number[] }) {
  if (history.length < 2) return null

  const width = 160
  const height = 24
  const maxMs = Math.max(33.3, ...history)
  const minMs = 0

  const points = history
    .map((val, idx) => {
      const x = (idx / (history.length - 1)) * width
      const clamped = Math.max(minMs, Math.min(maxMs, val))
      const y = height - (clamped / maxMs) * (height - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const target60Y = height - (16.6 / maxMs) * (height - 4) - 2
  const isHitching = history[history.length - 1] > 20

  return (
    <div className="mt-1 flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-[9px] text-[var(--aethel-text-quaternary)]">
        <span className="flex items-center gap-1">
          <Activity className="h-2.5 w-2.5 text-[var(--aethel-text-tertiary)]" />
          UnitGraph (60 frames)
        </span>
        <span className={cn('font-mono tabular-nums', isHitching ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-text-tertiary)]')}>
          {history[history.length - 1]?.toFixed(1)}ms
        </span>
      </div>
      <div className="relative h-6 w-full overflow-hidden rounded bg-[var(--aethel-surface-primary)] border border-[var(--aethel-border-subtle)]">
        {/* 16.6ms Target line */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]"
          style={{ top: `${target60Y}px` }}
        />
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="var(--aethel-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    </div>
  )
}

const CORNER_CLASSES: Record<CornerPosition, string> = {
  'top-left': 'top-3 left-3',
  'top-right': 'top-3 right-3',
  'bottom-left': 'bottom-3 left-3',
  'bottom-right': 'bottom-3 right-3',
}

// --- Main ---

export function ProfilerHUD({ metrics, position = 'bottom-right', compact = false, className }: ProfilerHUDProps) {
  const [expanded, setExpanded] = useState(!compact)
  const [history, setHistory] = useState<number[]>([metrics.frameTime || 16.6])
  const lastTimeRef = useRef(metrics.frameTime)

  useEffect(() => {
    if (metrics.frameTime !== lastTimeRef.current) {
      lastTimeRef.current = metrics.frameTime
      setHistory((prev) => {
        const next = [...prev, metrics.frameTime]
        return next.length > 60 ? next.slice(-60) : next
      })
    }
  }, [metrics.frameTime])

  const fpsCrit = metrics.fps < 30
  const fpsWarn = metrics.fps < 50
  const vramPct = metrics.vramTotal > 0 ? (metrics.vramUsed / metrics.vramTotal) * 100 : 0
  const vramWarn = vramPct > 75
  const vramCrit = vramPct > 90

  const fpsLabel = `${metrics.fps.toFixed(0)} FPS`

  return (
    <div
      className={cn('pointer-events-none absolute z-50', CORNER_CLASSES[position], className)}
      data-surface="profiler-hud"
    >
      <motion.div
        layout
        className="pointer-events-auto flex flex-col gap-0 overflow-hidden rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-md"
        style={{ minWidth: 175 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        {/* Header / pill */}
        <button
          type="button"
          id="profiler-hud-toggle"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-between gap-3 px-3 py-2 text-left"
          aria-expanded={expanded}
          aria-label="Toggle performance overlay"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                fpsCrit ? 'bg-[var(--aethel-error)]' : fpsWarn ? 'bg-[var(--aethel-warning)] animate-pulse' : 'bg-[var(--aethel-success)]',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'font-mono text-xs font-bold tabular-nums',
                fpsCrit ? 'text-[var(--aethel-error)]' : fpsWarn ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-success)]',
              )}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {fpsLabel}
            </span>
          </div>
          <span className="text-[10px] text-[var(--aethel-text-tertiary)]" aria-hidden>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </button>

        {/* Expanded metrics */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="metrics"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-1.5 border-t border-[var(--aethel-border-subtle)] px-3 py-2.5">
                <MetricRow
                  label="Frame Time"
                  value={fmtMs(metrics.frameTime)}
                  warn={metrics.frameTime > 20}
                  crit={metrics.frameTime > 33}
                />
                <FrametimeSparkline history={history} />
                <MetricRow
                  label="Draw Calls"
                  value={`${metrics.drawCalls}`}
                  warn={metrics.drawCalls > 800}
                  crit={metrics.drawCalls > 2000}
                />
                <MetricRow
                  label="Triangles"
                  value={fmtTriangles(metrics.triangleCount)}
                  warn={metrics.triangleCount > 2_000_000}
                  crit={metrics.triangleCount > 8_000_000}
                />
                <MetricRow
                  label="VRAM"
                  value={`${metrics.vramUsed.toFixed(0)} / ${metrics.vramTotal.toFixed(0)} MB`}
                  warn={vramWarn}
                  crit={vramCrit}
                />
                {metrics.sabSyncMs !== undefined && (
                  <MetricRow
                    label="SAB Sync"
                    value={fmtMs(metrics.sabSyncMs)}
                    warn={metrics.sabSyncMs > 8}
                    crit={metrics.sabSyncMs > 16}
                  />
                )}
                {metrics.physicsMs !== undefined && (
                  <MetricRow
                    label="Physics"
                    value={fmtMs(metrics.physicsMs)}
                    warn={metrics.physicsMs > 4}
                    crit={metrics.physicsMs > 10}
                  />
                )}
                {metrics.domNodeCount !== undefined && (
                  <MetricRow
                    label="DOM Nodes"
                    value={`${metrics.domNodeCount}`}
                    warn={metrics.domNodeCount > 1500}
                    crit={metrics.domNodeCount > 3000}
                  />
                )}
                {metrics.capabilityScore !== undefined && (
                  <>
                    <div className="mt-1 border-t border-[var(--aethel-border-subtle)] pt-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Capability Score</span>
                        <span
                          className="font-mono text-[11px] font-bold tabular-nums text-[var(--aethel-info)]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {metrics.capabilityScore}/100
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--aethel-surface-secondary)]">
                        <motion.div
                          className="h-full rounded-full bg-[var(--aethel-info)]"
                          style={{ width: `${metrics.capabilityScore}%` }}
                          layoutId="capability-bar"
                          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default ProfilerHUD
