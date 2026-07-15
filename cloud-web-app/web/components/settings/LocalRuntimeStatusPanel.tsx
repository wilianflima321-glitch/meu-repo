'use client'

/**
 * LocalRuntimeStatusPanel — Settings → Local Runtime
 *
 * Displays the status of local native tools (FFmpeg, ONNX Runtime, etc.)
 * and listens for Tauri IPC events to show GPU / ONNX fallback banners.
 *
 * On non-Tauri (web) builds the panel shows a helpful "desktop-only" notice.
 */

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CloudOff, Download, Loader2, Monitor, XCircle } from 'lucide-react'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('LocalRuntimeStatusPanel')

interface SidecarEntry {
  kind: string
  label: string
  available: boolean
  version?: string
}

interface RuntimeCapabilityEvent {
  feature: 'wgpu' | 'ort'
  available: boolean
  reason: string
}

type DownloadState = 'idle' | 'downloading' | 'done' | 'error'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function fetchSidecars(): Promise<SidecarEntry[]> {
  if (!isTauri()) return []
  try {
    // @tauri-apps/api type shim declared in types/tauri-apps.d.ts
    // eslint-disable-next-line
    const tauriCore = await import('@tauri-apps/api/core') as any
    const invoke = tauriCore.invoke as (cmd: string) => Promise<unknown>
    const raw = (await invoke('local_runtime_sidecars')) as Array<{ kind: string; available: boolean; reason?: string }>
    return raw.map((s) => ({
      kind: s.kind,
      label: kindLabel(s.kind),
      available: s.available,
    }))
  } catch {
    return []
  }
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    'wgpu-renderer': 'Native GPU Renderer (wgpu)',
    'rapier-physics': 'Physics Engine (rapier3d)',
    'onnx-runtime': 'ONNX Runtime (local AI)',
    'ffmpeg': 'FFmpeg',
    'ffprobe': 'FFprobe',
    'asset-optimizer': 'Asset Optimizer',
    'shader-compiler': 'Shader Compiler (naga)',
    'native-compiler': 'Native Compiler (Zig)',
    'browser-automation': 'Browser Automation',
  }
  return map[kind] ?? kind
}

function StatusBadge({ available }: { available: boolean }) {
  return available ? (
    <span className="flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success)]">
      <CheckCircle2 className="h-3 w-3" />
      Installed
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-error)]">
      <XCircle className="h-3 w-3" />
      Not found
    </span>
  )
}

export function LocalRuntimeStatusPanel() {
  const [sidecars, setSidecars] = useState<SidecarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [capabilities, setCapabilities] = useState<RuntimeCapabilityEvent[]>([])
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadTarget, setDownloadTarget] = useState('')
  const isDesktop = isTauri()

  const load = useCallback(async () => {
    setLoading(true)
    const result = await fetchSidecars()
    setSidecars(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Listen for Tauri runtime_capability IPC events
  useEffect(() => {
    if (!isDesktop) return
    let unlisten: (() => void) | undefined

    // eslint-disable-next-line
    import('@tauri-apps/api/event').then((mod: any) => {
      const listen = mod.listen as (event: string, handler: (e: { payload: RuntimeCapabilityEvent }) => void) => Promise<() => void>
      listen('runtime_capability', (event) => {
        setCapabilities((prev) => {
          const next = prev.filter((c) => c.feature !== event.payload.feature)
          return [...next, event.payload]
        })
      }).then((fn: () => void) => { unlisten = fn })
    }).catch(() => {/* not in Tauri */})

    return () => { unlisten?.() }
  }, [isDesktop])

  const handleDownloadSidecar = async (kind: string) => {
    if (!isDesktop) return
    setDownloadTarget(kind)
    setDownloadState('downloading')
    setDownloadProgress(0)
    try {
      // eslint-disable-next-line
      const tauriCore = await import('@tauri-apps/api/core') as any
      const invoke = tauriCore.invoke as (cmd: string, args: unknown) => Promise<unknown>
      // Emit simulated progress via a loop until the command resolves
      const interval = setInterval(() => setDownloadProgress((p) => Math.min(p + 12, 92)), 400)
      await invoke('sidecar_download', { kind })
      clearInterval(interval)
      setDownloadProgress(100)
      setDownloadState('done')
      await load()
      setTimeout(() => { setDownloadState('idle'); setDownloadProgress(0) }, 3000)
    } catch (err) {
      setDownloadState('error')
      log.error('Sidecar download failed:', err)
    }
  }

  if (!isDesktop) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-5">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 text-[var(--aethel-text-tertiary)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Local Runtime</h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Desktop-only feature</p>
          </div>
        </div>
        <p className="text-xs text-[var(--aethel-text-secondary)] leading-relaxed">
          Native GPU rendering, local AI inference, and sidecar tools are only available in the Aethel Desktop app.
          In the browser, all rendering and AI tasks run in the cloud automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)]">
            <Monitor className="h-4.5 w-4.5 text-[var(--aethel-primary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Local Runtime</h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Native tools and hardware status</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-tertiary)] transition-colors"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
        </button>
      </div>

      {/* GPU / ORT fallback banners (from Tauri IPC events) */}
      {capabilities.filter((c) => !c.available).map((cap) => (
        <div
          key={cap.feature}
          className="flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-neon-amber)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-amber)_6%,transparent)] px-3 py-2.5"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--aethel-neon-amber)]" />
          <div>
            <p className="text-xs font-medium text-[var(--aethel-neon-amber)]">
              {cap.feature === 'wgpu' ? 'Native GPU unavailable' : 'Local AI inference unavailable'}
            </p>
            <p className="text-[11px] text-[var(--aethel-text-secondary)] mt-0.5 leading-relaxed">{cap.reason}</p>
          </div>
        </div>
      ))}

      {/* Sidecar list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sidecar status…
        </div>
      ) : sidecars.length === 0 ? (
        <p className="text-xs text-[var(--aethel-text-tertiary)]">No sidecar information available.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {sidecars.map((s) => (
            <div
              key={s.kind}
              className="flex items-center justify-between rounded-lg border border-[var(--aethel-border-secondary)]/50 bg-[var(--aethel-surface-primary)]/60 px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-xs text-[var(--aethel-text-primary)]">{s.label}</span>
                {s.version && (
                  <span className="text-[10px] text-[var(--aethel-text-tertiary)]">v{s.version}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge available={s.available} />
                {!s.available && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSidecar(s.kind)}
                    disabled={downloadState === 'downloading'}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] transition-colors"
                  >
                    {downloadState === 'downloading' && downloadTarget === s.kind ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download progress bar */}
      {downloadState === 'downloading' && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
            <span>Installing {kindLabel(downloadTarget)}…</span>
            <span>{downloadProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--aethel-surface-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--aethel-primary)] transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {downloadState === 'done' && (
        <p className="text-xs text-[var(--aethel-success)]">
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
          {kindLabel(downloadTarget)} installed successfully.
        </p>
      )}

      {downloadState === 'error' && (
        <p className="text-xs text-[var(--aethel-error)]">
          <CloudOff className="mr-1 inline h-3.5 w-3.5" />
          Installation failed. Check your connection and try again.
        </p>
      )}
    </div>
  )
}
