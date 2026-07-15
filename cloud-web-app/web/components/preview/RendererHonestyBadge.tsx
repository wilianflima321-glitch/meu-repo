'use client'

import { useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('RendererHonestyBadge')

type HonestyPayload = {
  marketingAllowed?: boolean
  claim?: string
  finalRenderNote?: string
  finalRenderSafe?: boolean
  capabilityScore?: number
  renderTier?: string
  scalableRenderGraphClaim?: string
  web?: { status?: string; activePath?: string }
  desktop?: { status?: string; activePath?: string }
}

/**
 * Focus 2A / C4 — viewport chrome honesty badge.
 * When marketingAllowed is false, never imply AAA / live GPU supremacy.
 */
export function RendererHonestyBadge({ projectId }: { projectId?: string | null }) {
  const [report, setReport] = useState<HonestyPayload | null>(null)
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
        const qs = new URLSearchParams({
          webgpu: webgpuAvailable ? '1' : '0',
          webgl2: webgl2Available ? '1' : '0',
        })
        const res = await fetch(`/api/runtime/renderer-honesty?${qs.toString()}`, {
          headers: {
            ...getAuthHeaders(),
            ...(projectId ? { 'x-project-id': projectId } : {}),
          },
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`honesty ${res.status}`)
        const data = (await res.json()) as { report?: HonestyPayload } & HonestyPayload
        if (!cancelled) {
          setReport(data.report ?? data)
          setError(null)
        }
      } catch (err) {
        log.warn('renderer_honesty_badge_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) {
          setError('Honesty probe unavailable')
          setReport({
            marketingAllowed: false,
            claim: 'Renderer capability unknown — AAA marketing blocked',
            web: { status: 'held', activePath: 'unknown' },
          })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const marketingAllowed = report?.marketingAllowed === true
  const pathLabel = report?.web?.activePath || report?.web?.status || 'unknown'
  const scoreLabel =
    typeof report?.capabilityScore === 'number'
      ? ` · Cap ${report.capabilityScore}${report.renderTier ? `/${report.renderTier}` : ''}`
      : ''
  const label = marketingAllowed
    ? `Render · ${pathLabel}${scoreLabel}`
    : `[HELD] · ${pathLabel}${scoreLabel}`
  const finalNote = report?.finalRenderNote || 'Preview only — final render [HELD]'
  const srgNote = report?.scalableRenderGraphClaim

  return (
    <div
      role="status"
      aria-live="polite"
      title={report?.claim || error || 'Renderer honesty'}
      className="pointer-events-none absolute left-3 top-3 z-20 max-w-[min(100%,18rem)] rounded-md border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] shadow-sm backdrop-blur-sm"
    >
      <span
        className={
          marketingAllowed
            ? 'text-[var(--aethel-success)]'
            : 'text-[var(--aethel-warning)]'
        }
      >
        {label}
      </span>
      <span className="mt-0.5 block text-[10px] font-normal text-[var(--aethel-text-muted)]">
        {marketingAllowed ? 'Capability probe live' : 'AAA marketing claims disabled'}
      </span>
      <span className="mt-0.5 block text-[10px] font-normal text-[var(--aethel-text-muted)]">
        {finalNote}
      </span>
      {srgNote ? (
        <span className="mt-0.5 block text-[10px] font-normal text-[var(--aethel-text-muted)]">
          {srgNote}
        </span>
      ) : null}
    </div>
  )
}
