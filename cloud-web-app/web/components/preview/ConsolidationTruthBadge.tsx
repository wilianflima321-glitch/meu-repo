'use client'

/**
 * CW1 — Zero-UI Studio chip for consolidation truth matrix.
 * Fail-closed: never implies AAA marketing green.
 */

import { useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import { probeWebGpuAdapterAcquisition } from '@/lib/production/render-path-honesty'

const log = createComponentLogger('ConsolidationTruthBadge')

type MatrixSummary = {
  held?: number
  partial?: number
  implemented?: number
  marketingBlockedRows?: number
}

type TruthPayload = {
  marketingAaaAllowed?: boolean
  matrix?: {
    summary?: MatrixSummary
    rows?: Array<{ id: string; status: string; marketingAllowed: boolean }>
  }
}

export function ConsolidationTruthBadge({ projectId }: { projectId?: string | null }) {
  const [summary, setSummary] = useState<MatrixSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const webgpuAvailable =
          typeof navigator !== 'undefined' && 'gpu' in navigator
        let webgl2Available = false
        if (typeof document !== 'undefined') {
          const canvas = document.createElement('canvas')
          webgl2Available = Boolean(canvas.getContext('webgl2'))
        }
        const adapterProbe = await probeWebGpuAdapterAcquisition()
        const qs = new URLSearchParams({
          webgpu: webgpuAvailable ? '1' : '0',
          webgl2: webgl2Available ? '1' : '0',
          webgpuAdapterAcquired: adapterProbe.adapterAcquired ? '1' : '0',
        })
        const res = await fetch(`/api/runtime/consolidation-truth?${qs.toString()}`, {
          headers: {
            ...getAuthHeaders(),
            ...(projectId ? { 'x-project-id': projectId } : {}),
          },
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`truth ${res.status}`)
        const data = (await res.json()) as TruthPayload
        if (!cancelled) {
          setSummary(data.matrix?.summary ?? null)
          setError(null)
        }
      } catch (err) {
        log.warn('consolidation_truth_badge_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) {
          setError('Truth probe unavailable')
          setSummary({ held: 1, partial: 0, implemented: 0, marketingBlockedRows: 1 })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const held = summary?.held ?? 0
  const partial = summary?.partial ?? 0
  const implemented = summary?.implemented ?? 0
  // Matrix marketing is always fail-closed — do not paint every PARTIAL row as path-[HELD].
  const label = error
    ? 'Truth · probe unavailable'
    : `Truth · ${implemented} ok · ${partial} partial · ${held} held`

  return (
    <div
      role="status"
      aria-live="polite"
      data-aethel-cw1="consolidation-truth-badge"
      data-aethel-cw1-held={String(held)}
      data-aethel-cw1-partial={String(partial)}
      title={error || 'Consolidation truth matrix — AAA marketing blocked'}
      className="pointer-events-none absolute right-3 top-3 z-20 max-w-[min(100%,16rem)] rounded-md border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] shadow-sm backdrop-blur-sm"
    >
      <span className="text-[var(--aethel-warning)]">{label}</span>
      <span className="mt-0.5 block text-[10px] font-normal text-[var(--aethel-text-muted)]">
        Marketing AAA disabled
      </span>
    </div>
  )
}
