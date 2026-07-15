import { invoke } from '@tauri-apps/api/core'
import { useEffect, useMemo, useState } from 'react'

import type { NativeKernelManifest, RuntimeAdapter, RuntimeProbe } from '../../../packages/aethel-ide-shared/src/runtime-adapter/types'
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

export function StudioLocalApp() {
  const adapter = useMemo<RuntimeAdapter>(() => createDesktopAdapter(invoke), [])
  const ideBackend = useMemo(() => new NativeIDEBackend(invoke), [])
  useEffect(() => () => ideBackend.dispose(), [ideBackend])
  const [probe, setProbe] = useState<RuntimeProbe | null>(null)
  const [kernel, setKernel] = useState<NativeKernelManifest | null>(null)
  const [sidecars, setSidecars] = useState<ReturnType<typeof normalizeSidecar>[]>([])
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [error, setError] = useState<string | null>(null)

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
    return () => {
      cancelled = true
    }
  }, [adapter])

  return (
    <div className="studio-local-app">
      <header className="studio-local-header">
        <div className="studio-local-brand">
          <span className="studio-local-mark" aria-hidden="true">AE</span>
          <div>
            <h1>Aethel Studio Local</h1>
            <p>Native bridge, sidecars, receipts, and held claims.</p>
          </div>
        </div>
        <span className="studio-local-channel">stable / v0.1.0</span>
      </header>

      <main className="studio-local-main">
        <aside className="studio-local-rail">
          <LocalRuntimeStatus probe={probe} error={error} />
          <CapabilityProbe manifest={STUDIO_LOCAL_DESKTOP_MANIFEST} kernel={kernel} />
        </aside>

        <section className="studio-local-workspace">
          <ScenePanel backend={ideBackend} />
          <TerminalPanel backend={ideBackend} />
          <HardwareProfilerPanel />
          <AssetCookerPanel />
          <JobsLane adapter={adapter} jobs={jobs} onJobsChange={setJobs} />
          <SidecarManager sidecars={sidecars} />
          <CloudHandoffBridge probe={probe} />
        </section>
      </main>

      <footer className="studio-local-footer">
        <span>{STUDIO_LOCAL_DESKTOP_MANIFEST.capabilities.length} governed capabilities</span>
        <span>{STUDIO_LOCAL_DESKTOP_MANIFEST.prohibitedClaims.length} blocked claims</span>
      </footer>
    </div>
  )
}
