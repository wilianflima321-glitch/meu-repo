import { invoke } from '@tauri-apps/api/core'
import { useEffect, useMemo, useState } from 'react'

import type { NativeKernelManifest, RuntimeAdapter, RuntimeProbe } from '../../../packages/aethel-ide-shared/src/runtime-adapter/types'
import { Activity, Clapperboard, ChevronLeft, ChevronRight, Cpu, MonitorCheck, Palette, ShieldCheck, Monitor } from 'lucide-react'
import { createDesktopAdapter } from './desktop-bridge/createDesktopAdapter'
import { STUDIO_LOCAL_DESKTOP_MANIFEST } from './desktop-capability-manifest'
import { NativeIDEBackend } from './ide/NativeIDEBackend'
import { AssetCookerPanel } from './panels/AssetCookerPanel'
import { CapabilityProbe } from './panels/CapabilityProbe'
import { CloudHandoffBridge } from './panels/CloudHandoffBridge'
import { HardwareProfilerPanel } from './panels/HardwareProfilerPanel'
import { JobsLane, type JobRecord } from './panels/JobsLane'
import { LocalRuntimeStatus } from './panels/LocalRuntimeStatus'
import { ScenePanel } from './panels/ScenePanel'
import { SidecarManager } from './panels/SidecarManager'
import { TerminalPanel } from './panels/TerminalPanel'
import { CinemaCompositorTimelinePanel } from './panels/CinemaCompositorTimelinePanel'
import { AestheticStyleStudioPanel } from './panels/AestheticStyleStudioPanel'
import { TelepathicArchitectDronePanel } from './panels/TelepathicArchitectDronePanel'
import { SentinelHardwareMonitorPanel } from './panels/SentinelHardwareMonitorPanel'
import { FpsOverlayBadge } from './panels/FpsOverlayBadge'
import { LspFarmStatusPanel } from './panels/LspFarmStatusPanel'
import { MonacoCodeEditorPanel } from './panels/MonacoCodeEditorPanel'

// P4: Canonical AssetBrowser shared from web (same component, no duplication)
import { AssetBrowserPanel } from '../../../cloud-web-app/web/components/studio/AssetBrowserPanel'

type NativeSidecarCapability = {
  kind: string
  label: string
  available: boolean
  reason: string
}

function normalizeSidecar(input: NativeSidecarCapability) {
  return {
    kind: input.kind,
    label: input.label,
    available: input.available,
    evidenceRef: input.label,
    nextAction: input.reason,
  }
}

type ActiveTab = 'editor' | 'cinema' | 'aesthetic' | 'sentinel'

/**
 * Navigation tabs — all colours reference aethel design tokens exclusively.
 * No hardcoded Tailwind palette classes (slate-*, indigo-*, purple-*, etc).
 */
const NAV_TABS: Array<{
  id: ActiveTab
  label: string
  Icon: typeof Clapperboard
  activeClass: string
}> = [
  {
    id: 'editor',
    label: 'Scene & Tools',
    Icon: Monitor,
    activeClass: 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-primary)] border-[var(--aethel-border-secondary)]',
  },
  {
    id: 'sentinel',
    label: 'Hardware & Policy',
    Icon: ShieldCheck,
    activeClass: 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]',
  },
  {
    id: 'cinema',
    label: 'Cinema (HELD)',
    Icon: Clapperboard,
    activeClass: 'bg-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)] text-[var(--aethel-primary-light)] border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)]',
  },
  {
    id: 'aesthetic',
    label: 'Aesthetic (Intent)',
    Icon: Palette,
    activeClass: 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
  },
]

export function StudioLocalApp() {
  const adapter = useMemo<RuntimeAdapter>(() => createDesktopAdapter(invoke), [])
  const ideBackend = useMemo(() => new NativeIDEBackend(invoke), [])
  useEffect(() => () => ideBackend.dispose(), [ideBackend])
  const [probe, setProbe] = useState<RuntimeProbe | null>(null)
  const [kernel, setKernel] = useState<NativeKernelManifest | null>(null)
  const [sidecars, setSidecars] = useState<ReturnType<typeof normalizeSidecar>[]>([])
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [probeResult, kernelResult, sidecarResult] = await Promise.all([
          adapter.runtime.probe(),
          adapter.runtime.nativeKernelManifest?.() ?? Promise.resolve(null),
          invoke<NativeSidecarCapability[]>('local_runtime_sidecars').catch(() => []),
        ])
        if (cancelled) return
        setProbe(probeResult)
        setKernel(kernelResult)
        setSidecars(sidecarResult.map(normalizeSidecar))
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Studio Local bridge is unavailable.')
      }
    }
    void load()
    return () => { cancelled = true }
  }, [adapter])

  const activeKernels = kernel?.capabilities?.length ?? probe?.services?.length ?? 0
  const totalCapabilities = STUDIO_LOCAL_DESKTOP_MANIFEST.capabilities.length
  const kernelHealthy = !error && activeKernels > 0

  return (
    <div className="studio-local-app">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="studio-local-header">
        {/* Brand */}
        <div className="studio-local-brand">
          <span className="studio-local-mark">AE</span>
          <div>
            <h1 className="text-[var(--aethel-text-primary)] font-extrabold tracking-tight text-[15px]">
              Aethel Studio
            </h1>
            <p className="text-[var(--aethel-text-tertiary)] text-[11px] mt-0.5">
              Desktop shell · honesty-first · AAA present HELD
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex items-center gap-1 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] p-1"
          aria-label="Studio sections"
        >
          {NAV_TABS.map(({ id, label, Icon, activeClass }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                activeTab === id
                  ? activeClass
                  : 'border-transparent text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <span
            className={[
              'studio-local-channel inline-flex items-center gap-1.5 text-[11px]',
              kernelHealthy
                ? 'text-[var(--aethel-success-light)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)]'
                : 'text-[var(--aethel-text-tertiary)]',
            ].join(' ')}
            title={error ?? `${activeKernels}/${totalCapabilities} capabilities active`}
          >
            <Cpu className="h-3 w-3" />
            {activeKernels}/{totalCapabilities}
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-primary)] transition-all"
          >
            {sidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex gap-3 p-3 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Sidebar rail */}
        <aside
          className="shrink-0 flex flex-col gap-3 transition-all duration-200 overflow-hidden"
          style={{ width: sidebarOpen ? 300 : 0, opacity: sidebarOpen ? 1 : 0, padding: sidebarOpen ? undefined : 0 }}
          aria-hidden={!sidebarOpen}
        >
          <LocalRuntimeStatus probe={probe} error={error} />
          <CapabilityProbe manifest={STUDIO_LOCAL_DESKTOP_MANIFEST} kernel={kernel} />
          <SidecarManager sidecars={sidecars} />
        </aside>

        {/* Content workspace */}
        <section className="flex-1 flex flex-col gap-4 overflow-y-auto min-w-0">
          {activeTab === 'cinema' && (
            <div className="grid grid-cols-1 gap-4 h-full">
              <CinemaCompositorTimelinePanel />
              <ScenePanel backend={ideBackend} />
            </div>
          )}
          {activeTab === 'aesthetic' && (
            <div className="grid grid-cols-2 gap-4 h-full">
              <AestheticStyleStudioPanel />
              <ScenePanel backend={ideBackend} />
            </div>
          )}
          {activeTab === 'sentinel' && (
            <div className="grid grid-cols-2 gap-4 h-full">
              <SentinelHardwareMonitorPanel />
              <TelepathicArchitectDronePanel />
            </div>
          )}
          {activeTab === 'editor' && (
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="flex flex-col gap-4 min-h-0">
                <MonacoCodeEditorPanel />
                <div className="relative">
                  <FpsOverlayBadge probe={probe} />
                  <ScenePanel backend={ideBackend} />
                </div>
                <TerminalPanel backend={ideBackend} />
                <JobsLane adapter={adapter} jobs={jobs} onJobsChange={setJobs} />
              </div>
              <div className="flex flex-col gap-4">
                <AssetBrowserPanel />
                <AssetCookerPanel />
                <HardwareProfilerPanel />
                <LspFarmStatusPanel />
                <CloudHandoffBridge probe={probe} />
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <footer className="studio-local-footer">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Activity
              className={['h-3 w-3', kernelHealthy
                ? 'text-[var(--aethel-success-light)]'
                : 'text-[var(--aethel-error-light)]'].join(' ')}
            />
            <span className="text-[var(--aethel-text-tertiary)]">
              {kernelHealthy ? `${activeKernels} capabilities active` : (error ?? 'Kernel offline')}
            </span>
          </span>
          {kernel?.version && (
            <span className="text-[var(--aethel-text-quaternary)]">Engine {kernel.version}</span>
          )}
        </div>
        <span className="text-[var(--aethel-text-quaternary)] flex items-center gap-1.5">
          <MonitorCheck className="h-3 w-3" />
          Studio Local · Tauri shell (not Unreal Editor parity)
        </span>
      </footer>
    </div>
  )
}
