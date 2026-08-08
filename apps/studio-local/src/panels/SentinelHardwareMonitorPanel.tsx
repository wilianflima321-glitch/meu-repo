import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { Activity, Thermometer, HardDrive, Cpu } from 'lucide-react'

/** Mirrors `hardware_profiler.rs` `HardwareSample` (camelCase via serde). */
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

/**
 * Replaces fabricated "SYSTEM HEALTHY" / fake WASM kernel RUNNING rows /
 * hardcoded GPU°C / "Hardware Happiness %" theater with the same native
 * `hardware_profiler` stream used by HardwareProfilerPanel.
 */
export function SentinelHardwareMonitorPanel() {
  const [sample, setSample] = useState<HardwareSample | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let unlisten: (() => void) | undefined

    invoke<HardwareSample>('hardware_profiler_sample_once')
      .then((initial) => {
        if (!cancelled) setSample(initial)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Native hardware profiler unavailable outside Tauri.')
        }
      })

    listen<HardwareSample>('hardware_sample', (event) => {
      if (cancelled) return
      setSample(event.payload)
      setError(null)
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
    sample && sample.memoryTotalMb > 0
      ? Math.round((sample.memoryUsedMb / sample.memoryTotalMb) * 100)
      : null

  return (
    <div className="flex flex-col h-full p-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] text-[var(--aethel-text-primary)]">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--aethel-border-secondary)]">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--aethel-error-light)]" />
          <h2 className="text-sm font-bold tracking-wide">Hardware Sentinel</h2>
        </div>
        <span
          className={[
            'text-[10px] px-2 py-1 rounded font-mono font-semibold border',
            sample
              ? 'text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]'
              : 'text-[var(--aethel-warning)] border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]',
          ].join(' ')}
        >
          {sample ? 'LIVE SAMPLE' : error ? 'UNAVAILABLE' : 'WAITING'}
        </span>
      </div>

      {error && !sample && (
        <p className="mt-3 text-xs text-[var(--aethel-error-light)]">{error}</p>
      )}

      {!sample ? (
        <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Waiting for native hardware_profiler…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)]">
              <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
                <span>GPU temperature</span>
                <Thermometer className="w-3.5 h-3.5 text-[var(--aethel-warning)]" />
              </div>
              <div className="text-lg font-mono font-bold mt-2">
                {sample.gpuTemperatureC != null ? `${sample.gpuTemperatureC}°C` : 'HELD'}
              </div>
              <div className="text-[10px] text-[var(--aethel-text-quaternary)] mt-1">
                {sample.gpuTemperatureC != null ? 'From native sampler' : sample.gpuMetricsReason || 'No sensor path'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)]">
              <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
                <span>VRAM used</span>
                <HardDrive className="w-3.5 h-3.5 text-[var(--aethel-info-light)]" />
              </div>
              <div className="text-lg font-mono font-bold mt-2 text-[var(--aethel-info-light)]">
                {sample.gpuVramUsedMb != null ? `${sample.gpuVramUsedMb} MB` : 'HELD'}
              </div>
              <div className="text-[10px] text-[var(--aethel-text-quaternary)] mt-1">
                {sample.gpuVramUsedMb != null ? 'Measured' : 'Never invent VRAM / Tier claims'}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)]">
              <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
                <span>CPU</span>
                <Cpu className="w-3.5 h-3.5 text-[var(--aethel-success-light)]" />
              </div>
              <div className="text-lg font-mono font-bold mt-2 text-[var(--aethel-success-light)]">
                {sample.cpuUsagePercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--aethel-text-quaternary)] mt-1">
                RAM {memoryPercent != null ? `${memoryPercent}%` : '—'} · {sample.cpuPerCorePercent.length} cores
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-lg border border-[var(--aethel-border-secondary)] p-3 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_30%,transparent)]">
            <div className="text-[10px] font-bold text-[var(--aethel-text-tertiary)] uppercase tracking-wider mb-2">
              Adapter honesty
            </div>
            <dl className="space-y-2 font-mono text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--aethel-text-tertiary)]">GPU</dt>
                <dd className="text-right text-[var(--aethel-text-secondary)]">
                  {sample.gpuName ?? 'Probing…'}
                  {sample.gpuBackend ? ` (${sample.gpuBackend})` : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--aethel-text-tertiary)]">WASM micro-kernels</dt>
                <dd className="text-[var(--aethel-warning)]">HELD — no RUNNING theater</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--aethel-text-tertiary)]">Native present (product WebView)</dt>
                <dd className="text-[var(--aethel-warning)]">HELD — secondary probe only</dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  )
}
