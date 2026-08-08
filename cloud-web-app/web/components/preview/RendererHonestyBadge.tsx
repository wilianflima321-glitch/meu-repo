'use client'

import { useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'
import { formatRendererHonestyPrimaryLabel } from '@/lib/production/renderer-honesty-capability'
import { probeWebGpuAdapterAcquisition } from '@/lib/production/render-path-honesty'

const log = createComponentLogger('RendererHonestyBadge')

type HonestyPayload = {
  marketingAllowed?: boolean
  claim?: string
  finalRenderNote?: string
  finalRenderSafe?: boolean
  capabilityScore?: number
  renderTier?: string
  scalableRenderGraphClaim?: string
  web?: { status?: string; activePath?: string; pathClass?: string }
  desktop?: { status?: string; activePath?: string; pathClass?: string }
  presentRoot?: {
    canonicalPresentLabel?: string
    webgpuRole?: string
    desktopWgpuRole?: string
    condemnedPathIds?: string[]
    marketingNaniteLumenAllowed?: boolean
  }
  livePath?: {
    livePathLabel?: string
    classification?: string
    webgpuAdapterAvailable?: boolean
    webgpuAdapterAcquired?: boolean | null
    presentRoot?: {
      canonicalPresentLabel?: string
      webgpuRole?: string
      desktopWgpuRole?: string
      marketingNaniteLumenAllowed?: boolean
    }
  }
  webgpuPresentClaim?: { allowed?: boolean; reason?: string }
}

/**
 * Focus 2A / C4 / CW3 — viewport chrome honesty badge.
 * Shows live present-path class (canonical|compatibility|experimental|condemned|held).
 * When marketingAllowed is false, never imply AAA / live GPU supremacy.
 * Adapter/device probes must never read as Unified RHI or WebGPU present.
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
        // CW3 — API-exists ≠ requestAdapter acquisition ≠ present.
        const adapterProbe = await probeWebGpuAdapterAcquisition()
        const qs = new URLSearchParams({
          webgpu: webgpuAvailable ? '1' : '0',
          webgl2: webgl2Available ? '1' : '0',
          webgpuAdapterAcquired: adapterProbe.adapterAcquired ? '1' : '0',
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
            web: { status: 'held', activePath: 'unknown', pathClass: 'held' },
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
  // Present-path status ≠ marketing gate. Live WebGL2 must not read as [HELD]
  // just because Nanite/Lumen marketing is fail-closed (Cursor/Figma honesty).
  const webStatus = report?.web?.status || 'held'
  const pathLabel = report?.web?.activePath || webStatus || 'unknown'
  const pathClass =
    report?.livePath?.classification ||
    report?.web?.pathClass ||
    'held'
  const label = formatRendererHonestyPrimaryLabel({
    webStatus,
    activePath: report?.web?.activePath,
    capabilityScore: report?.capabilityScore,
    renderTier: report?.renderTier,
  })
  const finalNote = report?.finalRenderNote || 'Preview only — final render [HELD]'
  const srgNote = report?.scalableRenderGraphClaim
  const presentRoot =
    report?.presentRoot || report?.livePath?.presentRoot || null
  const rootLabel = presentRoot?.canonicalPresentLabel || 'R3F/WebGL2'
  // Fail-closed defaults: never invent exclusive RHI / dual-live desktop.
  const webgpuRole = presentRoot?.webgpuRole || 'adapter_probe_only'
  const desktopRole = presentRoot?.desktopWgpuRole || 'experimental_mount'
  const desktopLivePresent = desktopRole === 'live_present'
  const classTone =
    pathClass === 'canonical'
      ? 'text-[var(--aethel-info-light)]'
      : pathClass === 'experimental'
        ? 'text-[var(--aethel-warning)]'
        : pathClass === 'condemned'
          ? 'text-[var(--aethel-error)]'
          : 'text-[var(--aethel-text-muted)]'
  const statusTone =
    webStatus === 'live' ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-warning)]'

  return (
    <div
      role="status"
      aria-live="polite"
      data-aethel-render-path={pathLabel}
      data-aethel-render-path-class={pathClass}
      data-aethel-render-status={webStatus}
      data-aethel-present-root={rootLabel}
      data-aethel-webgpu-role={webgpuRole}
      data-aethel-desktop-wgpu-role={desktopRole}
      data-aethel-marketing-allowed={marketingAllowed ? '1' : '0'}
      data-aethel-webgpu-present-allowed={
        report?.webgpuPresentClaim?.allowed === true ? '1' : '0'
      }
      title={report?.claim || error || 'Renderer honesty'}
      className="pointer-events-none absolute left-3 top-3 z-20 max-w-[min(100%,18rem)] rounded-md border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] shadow-sm backdrop-blur-sm"
    >
      <span className={statusTone}>{label}</span>
      <span className={`mt-0.5 block text-[10px] font-normal uppercase tracking-[0.12em] ${classTone}`}>
        Path · {pathClass}
      </span>
      <div className="flex flex-wrap gap-x-2 text-[var(--aethel-text-quaternary)]">
        <span>
          Present root · {rootLabel} · WebGPU {webgpuRole.replace(/_/g, ' ')} · Desktop{' '}
          {desktopLivePresent ? '[LIVE_PRESENT]' : '[FALLBACK]'}
        </span>
        {report?.livePath?.webgpuAdapterAcquired === true && (
          <span className="text-[var(--aethel-primary-light)]">
            · WebGPU adapter probed (not present)
          </span>
        )}
      </div>
      <span className="mt-0.5 block text-[10px] font-normal text-[var(--aethel-text-muted)]">
        {marketingAllowed
          ? 'Capability probe live'
          : 'AAA marketing blocked · no WebGPU/desktop dual-live claim'}
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
