'use client'

import { useState } from 'react'
import type { RuntimeModeId, RuntimeModeViewModel } from '@aethel/runtime/runtime-mode-view-model'
import { formatViewportPresentGpuLabel } from '@/lib/production/render-path-honesty'

type ViewportRuntimeDepthStatusProps = {
  pipelineType: string
  quality: string
  /** `navigator.gpu` API surface only — never means adapter or present. */
  webGpuAvailable: boolean
  /** Result of requestAdapter(); null/undefined = unprobed. */
  webGpuAdapterAcquired?: boolean | null
  finalRenderSafe?: boolean
  currentRuntimeMode: RuntimeModeViewModel
  runtimeModes: RuntimeModeViewModel[]
  renderTarget: RuntimeModeId
  onRenderTargetChange: (mode: RuntimeModeId) => void
}

export function ViewportRuntimeDepthStatus({
  pipelineType,
  quality,
  webGpuAvailable,
  webGpuAdapterAcquired = null,
  finalRenderSafe = false,
  currentRuntimeMode,
  runtimeModes,
  renderTarget,
  onRenderTargetChange,
}: ViewportRuntimeDepthStatusProps) {
  const [expanded, setExpanded] = useState(false)
  // CW3 — present path is WebGL2; never label chrome "WebGPU" from API-exists alone.
  const gpuLabel = formatViewportPresentGpuLabel({
    webgpuApiAvailable: webGpuAvailable,
    webgpuAdapterAcquired: webGpuAdapterAcquired,
  })

  if (!expanded) {
    return (
      <div
        className="absolute bottom-4 left-4 z-20 max-w-[360px]"
        role="status"
        aria-label="Viewport runtime summary"
        data-viewport-runtime-status="collapsed"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[rgba(7,12,20,0.82)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)] shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-md transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          aria-label="Open viewport runtime details"
          aria-expanded={false}
        >
          <span className="font-semibold text-[var(--aethel-text-primary)]">Runtime</span>
          <span className="text-[var(--aethel-text-quaternary)]">/</span>
          <span>{currentRuntimeMode.label}</span>
          <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
            {gpuLabel}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-4 left-4 z-20 max-w-[360px] rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[rgba(7,12,20,0.82)] px-3 py-2 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-md"
      role="status"
      aria-label="Viewport render depth status"
      data-viewport-runtime-status="expanded"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">Runtime details</span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]"
          aria-label="Collapse viewport runtime details"
          aria-expanded={true}
        >
          Hide
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-primary-light)]">
          {pipelineType}
        </span>
        <span className="text-[var(--aethel-text-secondary)]">
          Fidelity {quality.toUpperCase()} / {gpuLabel} preview
        </span>
        {!finalRenderSafe ? (
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_36%,transparent)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-warning)]">
            Final [HELD]
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-quaternary)]">
        {currentRuntimeMode.detail}
        {currentRuntimeMode.fallbackReason ? ` ${currentRuntimeMode.fallbackReason}` : ''}
        {' High-fidelity WebGPU/WASM pipeline active with dynamic resolution scaling.'}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {runtimeModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              if (mode.selectable) onRenderTargetChange(mode.id)
            }}
            disabled={!mode.selectable}
            title={!mode.selectable ? mode.fallbackReason : mode.costNote}
            className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
              renderTarget === mode.id
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)]'
                : mode.selectable
                  ? 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
                  : 'cursor-not-allowed border-[var(--aethel-border-subtle)] text-[var(--aethel-text-quaternary)] opacity-65'
            }`}
          >
            {mode.label} - {mode.badge}
          </button>
        ))}
      </div>
    </div>
  )
}
