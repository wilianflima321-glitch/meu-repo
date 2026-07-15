'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  VIEWPORT_FIDELITY_OPTIONS,
  getViewportFidelityParams,
  readStoredViewportFidelity,
  writeStoredViewportFidelity,
  type ViewportFidelityLevel,
} from '@/lib/production/viewport-fidelity'
import {
  isCodeWorkspaceProfileActive,
  useViewportRenderActivity,
} from '@/lib/viewport/use-viewport-render-activity'
import {
  probeWebHardwareProfile,
  type HardwareStaticProfile,
} from '@aethel/engine/render/hardware-profile'

type ViewportFidelityControlProps = {
  value: ViewportFidelityLevel
  onChange: (level: ViewportFidelityLevel) => void
  resolvedLabel: string
  paused: boolean
  capabilityScore?: number
  renderTier?: string
}

/**
 * Block 3A.5 + 3B.1 — single Fidelity control + Capability Score readout.
 */
export function ViewportFidelityControl({
  value,
  onChange,
  resolvedLabel,
  paused,
  capabilityScore,
  renderTier,
}: ViewportFidelityControlProps) {
  return (
    <div
      className="absolute bottom-4 right-4 z-20 max-w-[240px] rounded-md border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] px-2.5 py-2 text-[11px] shadow-sm backdrop-blur-sm"
      data-viewport-fidelity-control="true"
    >
      <label
        htmlFor="aethel-viewport-fidelity"
        className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]"
      >
        Fidelity
      </label>
      <select
        id="aethel-viewport-fidelity"
        value={value}
        onChange={(event) => onChange(event.target.value as ViewportFidelityLevel)}
        className="w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-2 py-1.5 text-[11px] text-[var(--aethel-text-primary)]"
        aria-label="Viewport fidelity"
      >
        {VIEWPORT_FIDELITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {typeof capabilityScore === 'number' ? (
        <p className="mt-1 text-[10px] leading-4 text-[var(--aethel-text-secondary)]">
          Capability {capabilityScore}/100
          {renderTier ? ` · ${renderTier}` : ''}
        </p>
      ) : null}
      <p className="mt-1 text-[10px] leading-4 text-[var(--aethel-text-muted)]">
        {resolvedLabel}
        {paused ? ' · paused' : ''}
        {' · preview only [HELD final]'}
      </p>
    </div>
  )
}

export function useViewportFidelityState(webGpuAvailable: boolean) {
  const [fidelity, setFidelity] = useState<ViewportFidelityLevel>('balanced')
  const [profile, setProfile] = useState<HardwareStaticProfile | null>(null)

  useEffect(() => {
    setFidelity(readStoredViewportFidelity())
    setProfile(
      probeWebHardwareProfile({
        webgpuAvailable: webGpuAvailable,
      })
    )
  }, [webGpuAvailable])

  const commit = useCallback((level: ViewportFidelityLevel) => {
    setFidelity(level)
    writeStoredViewportFidelity(level)
  }, [])

  const params = useMemo(
    () =>
      getViewportFidelityParams(fidelity, {
        webgpuAvailable: webGpuAvailable,
        hardwareConcurrency: profile?.cpuCoreCount,
        deviceMemoryGb:
          typeof navigator !== 'undefined'
            ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
            : 4,
        capabilityScore: profile?.capabilityScore,
      }),
    [fidelity, webGpuAvailable, profile]
  )

  return {
    fidelity,
    setFidelity: commit,
    params,
    capabilityScore: profile?.capabilityScore,
    renderTier: profile?.tier,
    hardwareProfile: profile,
  }
}

export function useViewportActivityBridge(forcePause?: boolean) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [codeProfile, setCodeProfile] = useState(false)

  useEffect(() => {
    setCodeProfile(isCodeWorkspaceProfileActive())
    const onStorage = () => setCodeProfile(isCodeWorkspaceProfileActive())
    const onProfile = () => setCodeProfile(isCodeWorkspaceProfileActive())
    window.addEventListener('storage', onStorage)
    window.addEventListener('aethel.workspace.profile.changed', onProfile)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('aethel.workspace.profile.changed', onProfile)
    }
  }, [])

  const activity = useViewportRenderActivity({
    rootRef,
    forcePause: forcePause || codeProfile,
  })

  return { rootRef, ...activity, codeProfile }
}
