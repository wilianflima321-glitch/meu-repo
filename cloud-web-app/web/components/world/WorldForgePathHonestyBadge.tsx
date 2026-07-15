'use client'

/**
 * Letter cd — Honesty badge: math PCG ready vs LoRA HELD.
 */

import {
  selectWorldForgeRoute,
  type WorldForgeIdeHonestyBadge,
} from '@/lib/world-forge/world-forge-ide-route'
import { LORA_CLAY_READY } from '@/lib/world-forge/lora-clay-registry'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'

export interface WorldForgePathHonestyBadgeProps {
  className?: string
  compact?: boolean
  /** Override path for live session status after generate. */
  activeBadge?: WorldForgeIdeHonestyBadge
}

export function WorldForgePathHonestyBadge({
  className,
  compact = false,
  activeBadge,
}: WorldForgePathHonestyBadgeProps) {
  const route = selectWorldForgeRoute({
    loraClayReady: LORA_CLAY_READY,
    nativeOnnxReady: NATIVE_ONNX_READY,
  })
  const badge = activeBadge ?? route.honestyBadge

  return (
    <div
      className={
        className ??
        'inline-flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface)_80%,transparent)] px-2 py-1'
      }
      role="status"
      data-aethel-cd="world-forge-path-honesty"
      data-path={badge}
      data-lora-clay={String(LORA_CLAY_READY)}
      title={
        badge === 'lora-enriched'
          ? 'LoRA-enriched world — pager inject + math conveyor'
          : 'Math PCG ready — SDF/biome/scatter/NavMesh; LoRA HELD'
      }
    >
      {badge === 'lora-enriched' ? (
        <span
          className="rounded border border-[var(--aethel-success)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-success-light)]"
          title="LoRA clay enrich preferred"
        >
          LoRA enrich
        </span>
      ) : (
        <span
          className="rounded border border-[var(--aethel-info)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-info)]"
          title="Mathematical PCG world path"
        >
          Math PCG
        </span>
      )}
      <span
        className="rounded border border-[var(--aethel-warning)]/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--aethel-warning-light)]"
        title="loraClayReady false until ORT+LoRA soak"
      >
        LoRA [HELD]
      </span>
      {!compact && (
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
          {badge === 'lora-enriched'
            ? 'Local $0 + FusionTx'
            : 'SDF→PCG→NavMesh · Zero-UI'}
        </span>
      )}
    </div>
  )
}
