'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Cpu, HardDrive, RadioTower, ShieldCheck, Zap, type LucideIcon } from 'lucide-react'

import {
  buildLocalRuntimeBridgeState,
  LOCAL_RUNTIME_CAPABILITY_EVENT,
  LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT,
  LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY,
  sanitizeLocalRuntimeCapabilityReport,
  type LocalRuntimeCapabilityReport,
} from '@/lib/device/local-runtime-bridge'

function readStoredReport(): LocalRuntimeCapabilityReport | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY)
  if (!raw) return null
  try {
    return sanitizeLocalRuntimeCapabilityReport(JSON.parse(raw))
  } catch {
    return null
  }
}

export function StudioLocalRuntimeCapsule() {
  const [report, setReport] = useState<LocalRuntimeCapabilityReport | null>(null)
  const [requestedAt, setRequestedAt] = useState<string | null>(null)

  const refreshReport = useCallback(() => {
    setReport(readStoredReport())
  }, [])

  useEffect(() => {
    refreshReport()

    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY) refreshReport()
    }
    const onCapability = (event: Event) => {
      const custom = event as CustomEvent<unknown>
      const nextReport = sanitizeLocalRuntimeCapabilityReport(custom.detail)
      if (nextReport) setReport(nextReport)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(LOCAL_RUNTIME_CAPABILITY_EVENT, onCapability)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(LOCAL_RUNTIME_CAPABILITY_EVENT, onCapability)
    }
  }, [refreshReport])

  const bridge = useMemo(() => buildLocalRuntimeBridgeState(report), [report])
  const statusTone =
    bridge.connection === 'connected'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_32%,transparent)] text-[var(--aethel-success-light)]'
      : bridge.connection === 'stale'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] text-[var(--aethel-warning-light)]'
        : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)]'

  const requestProbe = () => {
    setRequestedAt(new Date().toLocaleTimeString())
    window.dispatchEvent(new CustomEvent(LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT, { detail: { source: 'studio-mission-control' } }))
  }

  const toolCount = (report?.localToolchain?.length ?? 0) + (report?.rendererBackends?.length ?? 0)

  return (
    <section className="mt-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_58%,transparent)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
            Studio Local runtime
          </p>
          <h3 className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">{bridge.executorLabel}</h3>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone}`}>
          {bridge.connection}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">{bridge.summary}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric icon={Cpu} label="Accelerator" value={bridge.acceleratorLabel} />
        <Metric icon={Zap} label="Executor" value={report?.preferredExecutor ?? 'browser'} />
        <Metric icon={HardDrive} label="Free disk" value={report?.freeStorageGb ? `${Math.round(report.freeStorageGb)} GB` : 'unknown'} />
        <Metric icon={ShieldCheck} label="Sidecars" value={toolCount ? `${toolCount} detected` : 'not attached'} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={requestProbe}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] px-3 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
        >
          <RadioTower className="h-3.5 w-3.5" />
          Request probe
        </button>
        <Link
          href="/download"
          className="inline-flex min-h-9 items-center rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--aethel-primary-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-primary)_42%,transparent)]"
        >
          Download Studio Local
        </Link>
      </div>
      {requestedAt ? (
        <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          Probe requested at {requestedAt}. If Studio Local is open, it can answer through the capability bridge.
        </p>
      ) : null}
    </section>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-[var(--aethel-text-primary)]">{value}</p>
    </div>
  )
}
