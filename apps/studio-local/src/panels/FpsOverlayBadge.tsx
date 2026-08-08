/**
 * Frame-time overlay — fail-closed when RuntimeProbe has no real frameTimeMs.
 * Prior revision defaulted to 16.7ms / 60 FPS theater when probe was empty.
 */

import type { RuntimeProbe } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types'

interface FpsOverlayBadgeProps {
  probe: RuntimeProbe | null
}

function readNumericField(probe: RuntimeProbe | null, key: string): number | null {
  if (!probe) return null
  const value = (probe as unknown as Record<string, unknown>)[key]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export function FpsOverlayBadge({ probe }: FpsOverlayBadgeProps) {
  const frameTimeMs = readNumericField(probe, 'frameTimeMs')
  const gpuPct = readNumericField(probe, 'gpuUsagePercent')
  const fps = frameTimeMs != null ? Math.round(1000 / frameTimeMs) : null

  const fpsColor =
    fps === null
      ? 'text-[var(--aethel-text-quaternary)]'
      : fps >= 60
        ? 'text-[var(--aethel-success-light)]'
        : fps >= 30
          ? 'text-[var(--aethel-warning)]'
          : 'text-[var(--aethel-error-light)]'

  return (
    <div className="pointer-events-none absolute top-2 right-2 z-20 flex items-center gap-1.5 font-mono">
      <div className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)] backdrop-blur border border-[var(--aethel-border-secondary)] rounded-lg px-2 py-1">
        <span className={`text-[11px] font-bold tabular-nums ${fpsColor}`}>
          {fps !== null ? `${fps} FPS` : 'FPS HELD'}
        </span>
        {frameTimeMs != null ? (
          <span className="text-[9px] text-[var(--aethel-text-quaternary)] tabular-nums">
            {frameTimeMs.toFixed(1)}ms
          </span>
        ) : (
          <span className="text-[9px] text-[var(--aethel-text-quaternary)]">no probe</span>
        )}
      </div>

      {gpuPct != null && (
        <div className="flex items-center gap-1 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_85%,transparent)] backdrop-blur border border-[var(--aethel-border-secondary)] rounded-lg px-2 py-1">
          <span className="text-[9px] text-[var(--aethel-text-quaternary)]">GPU</span>
          <span
            className={`text-[11px] font-bold tabular-nums ${
              gpuPct > 90
                ? 'text-[var(--aethel-error-light)]'
                : gpuPct > 70
                  ? 'text-[var(--aethel-warning)]'
                  : 'text-[var(--aethel-info-light)]'
            }`}
          >
            {gpuPct}%
          </span>
        </div>
      )}
    </div>
  )
}
