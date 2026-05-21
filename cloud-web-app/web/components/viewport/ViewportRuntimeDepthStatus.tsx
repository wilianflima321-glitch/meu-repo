'use client'

import type { RuntimeModeId, RuntimeModeViewModel } from '@/lib/runtime/runtime-mode-view-model'

type ViewportRuntimeDepthStatusProps = {
  pipelineType: string
  quality: string
  webGpuAvailable: boolean
  currentRuntimeMode: RuntimeModeViewModel
  runtimeModes: RuntimeModeViewModel[]
  renderTarget: RuntimeModeId
  onRenderTargetChange: (mode: RuntimeModeId) => void
}

export function ViewportRuntimeDepthStatus({
  pipelineType,
  quality,
  webGpuAvailable,
  currentRuntimeMode,
  runtimeModes,
  renderTarget,
  onRenderTargetChange,
}: ViewportRuntimeDepthStatusProps) {
  return (
    <div
      className="absolute bottom-4 left-4 z-20 max-w-[360px] rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[rgba(7,12,20,0.82)] px-3 py-2 text-xs shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur-md"
      role="status"
      aria-label="Viewport render depth status"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-primary-light)]">
          {pipelineType}
        </span>
        <span className="text-[var(--aethel-text-secondary)]">
          {quality.toUpperCase()} / {webGpuAvailable ? 'WebGPU ready' : 'WebGL2 fallback'}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-[var(--aethel-text-quaternary)]">
        {currentRuntimeMode.detail}
        {currentRuntimeMode.fallbackReason ? ` ${currentRuntimeMode.fallbackReason}` : ''}
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
