'use client'

/**
 * Letter dp — Studio IDE Kernel Rust foundation honesty badge.
 * Wire (do) vs ready (dn) — fail-closed HELD for ready until desktop soak.
 * Zero-UI when probe unavailable. Tokens only; EN UI.
 */

import { useEffect, useState } from 'react'

import {
  resolveKernelRustFoundationStudioBadge,
  type KernelRustFoundationStudioBadgeModel,
} from '@/lib/kernel/kernel-rust-foundation-studio-badge'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('KernelRustFoundationHonestyBadge')

const CHIP_TONE: Record<
  KernelRustFoundationStudioBadgeModel['chips'][number]['tone'],
  string
> = {
  success:
    'border-[var(--aethel-success)]/40 text-[var(--aethel-success-light)]',
  info: 'border-[var(--aethel-info)]/40 text-[var(--aethel-info)]',
  warning:
    'border-[var(--aethel-warning)]/40 text-[var(--aethel-warning-light)]',
}

export interface KernelRustFoundationHonestyBadgeProps {
  className?: string
  compact?: boolean
  /** Injected model (Vitest / story). When set, skips live sync. */
  model?: KernelRustFoundationStudioBadgeModel
}

export function KernelRustFoundationHonestyBadge({
  className,
  compact = false,
  model: injected,
}: KernelRustFoundationHonestyBadgeProps) {
  const [model, setModel] = useState<KernelRustFoundationStudioBadgeModel | null>(
    injected ?? null,
  )

  useEffect(() => {
    if (injected) {
      setModel(injected)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const next = await resolveKernelRustFoundationStudioBadge()
        if (!cancelled) setModel(next)
      } catch (err) {
        log.warn('kernel_rust_foundation_honesty_badge_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) setModel(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [injected])

  const view = injected ?? model
  if (!view || view.show !== true) {
    return null
  }

  return (
    <div
      className={
        className ??
        'pointer-events-none absolute bottom-3 left-3 z-20 inline-flex max-w-[min(100%,20rem)] flex-wrap items-center gap-1.5 rounded-md border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface)_80%,transparent)] px-2 py-1 shadow-sm backdrop-blur-sm'
      }
      role="status"
      aria-live="polite"
      data-aethel-dp="kernel-rust-foundation-honesty"
      data-wire={String(view.kernelRustFoundationWebWireReady)}
      data-ready={String(view.kernelRustFoundationReady)}
      data-extended={String(view.kernelRustExtendedSurfaceDocumented)}
      data-stamp={view.stamp}
      data-evidence={view.evidenceSource}
      title={view.title}
    >
      {view.chips.map((chip) => (
        <span
          key={chip.id}
          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${CHIP_TONE[chip.tone]}`}
          title={chip.title}
        >
          {chip.label}
        </span>
      ))}
      {!compact && view.productLabel ? (
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
          {view.productLabel}
        </span>
      ) : null}
    </div>
  )
}

export default KernelRustFoundationHonestyBadge
