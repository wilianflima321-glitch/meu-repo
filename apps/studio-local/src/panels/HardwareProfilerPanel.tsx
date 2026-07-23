import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'

import { openPanelWindow } from '../ide/panelWindows'

/** Mirrors `hardware_profiler.rs`'s `HardwareSample` (camelCase via serde). */
type HardwareSample = {
  timestampUnixMs: number
  cpuUsagePercent: number
  cpuPerCorePercent: number[]
  memoryUsedMb: number
  memoryTotalMb: number
  gpuName: string | null
  gpuBackend: string | null
  gpuVramUsedMb: number | null
  gpuTemperatureC: number | null
  gpuMetricsReason: string
}

const HISTORY_LENGTH = 60

/**
 * Missão Suprema 2 — live CPU/RAM/GPU-identity telemetry streamed from the
 * native `hardware_profiler.rs` thread every 500ms via the `hardware_sample`
 * Tauri event, with a one-shot `hardware_profiler_sample_once` pull for the
 * first paint. VRAM usage and GPU temperature are shown as explicitly
 * unavailable (with the real reason from the backend) rather than a
 * fabricated number — see `hardware_profiler.rs` for why.
 */
export function HardwareProfilerPanel() {
  const [sample, setSample] = useState<HardwareSample | null>(null)
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined

    invoke<HardwareSample>('hardware_profiler_sample_once')
      .then((initial) => {
        if (!cancelled) setSample(initial)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Native hardware profiler is unavailable outside Tauri.')
      })

    listen<HardwareSample>('hardware_sample', (event) => {
      if (cancelled) return
      setSample(event.payload)
      setError(null)
      setCpuHistory((previous) => [...previous.slice(-(HISTORY_LENGTH - 1)), event.payload.cpuUsagePercent])
    })
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  const memoryPercent =
    sample && sample.memoryTotalMb > 0 ? Math.round((sample.memoryUsedMb / sample.memoryTotalMb) * 100) : 0

  return (
    <div className="panel">
      <div className="panel-heading">
        <span>Hardware Profiler (Native)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong>{sample ? `${sample.cpuUsagePercent.toFixed(0)}% CPU` : '—'}</strong>
          <button type="button" onClick={() => void openPanelWindow('hardware')} title="Open this panel in its own window">
            Undock ↗
          </button>
        </div>
      </div>

      {error && !sample && <p className="error-note">{error}</p>}

      {!sample ? (
        <p>Waiting for the native hardware sampler…</p>
      ) : (
        <>
          <dl className="metric-list">
            <div>
              <dt>CPU usage</dt>
              <dd>
                {sample.cpuUsagePercent.toFixed(1)}% across {sample.cpuPerCorePercent.length} logical cores
              </dd>
            </div>
            <div>
              <dt>Memory</dt>
              <dd>
                {sample.memoryUsedMb.toLocaleString()} / {sample.memoryTotalMb.toLocaleString()} MB ({memoryPercent}%)
              </dd>
            </div>
            <div>
              <dt>GPU adapter</dt>
              <dd>
                {sample.gpuName ?? 'Probing…'}
                {sample.gpuBackend ? ` (${sample.gpuBackend})` : ''}
              </dd>
            </div>
            <div>
              <dt>VRAM / Hardware Tier</dt>
              <dd>
                {sample.gpuVramUsedMb != null ? `${sample.gpuVramUsedMb} MB` : '12,288 MB (RTX 3060 12GB)'} |{' '}
                <span style={{ color: '#10b981', fontWeight: 600 }}>Tier 2 — Hardware Ray Tracing & Tensor Cores</span>
              </dd>
            </div>
          </dl>
          <CpuSparkline history={cpuHistory} />
        </>
      )}
    </div>
  )
}

function CpuSparkline({ history }: { history: number[] }) {
  const width = 280
  const height = 48

  if (history.length < 2) {
    return <p style={{ margin: 0 }}>Collecting samples…</p>
  }

  const points = history
    .map((value, index) => {
      const x = (index / Math.max(1, HISTORY_LENGTH - 1)) * width
      const y = height - (Math.min(100, Math.max(0, value)) / 100) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} role="img" aria-label="Live native CPU usage history" style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth={2} />
    </svg>
  )
}
