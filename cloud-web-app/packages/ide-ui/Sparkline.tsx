'use client'

/**
 * Sparkline — lightweight inline telemetry primitive (AGDS "Smart Inspector").
 *
 * Renders a value-history trend as a tiny inline SVG. Deliberately dependency-free
 * (no charting lib) so it's cheap enough to embed next to individual numeric fields
 * in PropertiesPanel3D, the Status Bar, or Console — anywhere a value has a short
 * rolling history worth glancing at without opening a full graph.
 */

export interface SparklineProps {
  /** Oldest-first sample history. Fewer than 2 points renders a flat baseline. */
  values: number[]
  width?: number
  height?: number
  strokeWidth?: number
  /** CSS color (usually a `var(--aethel-*)` token) for the line + fill. */
  color?: string
  /** Renders a soft area fill beneath the line in addition to the stroke. */
  filled?: boolean
  className?: string
  ariaLabel?: string
}

export function Sparkline({
  values,
  width = 64,
  height = 20,
  strokeWidth = 1.5,
  color = 'var(--aethel-info)',
  filled = true,
  className,
  ariaLabel,
}: SparklineProps) {
  const samples = values.length > 0 ? values : [0]
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const range = max - min || 1
  const stepX = samples.length > 1 ? width / (samples.length - 1) : width

  const points = samples.map((value, index) => {
    const x = index * stepX
    const y = height - ((value - min) / range) * height
    return [x, Number.isFinite(y) ? y : height / 2] as const
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`
  const last = samples[samples.length - 1]
  const first = samples[0]
  const trend = last === first ? 'flat' : last > first ? 'up' : 'down'

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `Trend sparkline, ${trend}, latest value ${last}`}
    >
      {filled && <path d={areaPath} fill={color} opacity={0.12} stroke="none" />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={strokeWidth} fill={color} />
    </svg>
  )
}

/**
 * Fixed-capacity ring buffer helper for feeding a `Sparkline` from a live
 * value stream (e.g. an `onPropertyChange` handler, a physics tick, or a
 * WebSocket telemetry frame) without the history array growing unbounded.
 */
export function pushSample(history: number[], value: number, capacity = 32): number[] {
  const next = [...history, value]
  return next.length > capacity ? next.slice(next.length - capacity) : next
}

export default Sparkline
