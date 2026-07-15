'use client'

import { useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/ai/change-feedback-client'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('MultiplayerHonestyBadge')

type HonestyPayload = {
  marketingDedicatedAllowed?: boolean
  marketingCrossPlayAllowed?: boolean
  claim?: string
  productCopy?: string
  dedicated?: { status?: string; connectable?: boolean }
  p2pLan?: { status?: string }
}

/**
 * Block 2B.3 — MP mode honesty badge (P2P/LAN live · dedicated [HELD]).
 */
export function MultiplayerHonestyBadge({ projectId }: { projectId?: string | null }) {
  const [report, setReport] = useState<HonestyPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/runtime/multiplayer-honesty', {
          headers: {
            ...getAuthHeaders(),
            ...(projectId ? { 'x-project-id': projectId } : {}),
          },
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(`mp honesty ${res.status}`)
        const data = (await res.json()) as { report?: HonestyPayload }
        if (!cancelled) {
          setReport(data.report ?? null)
          setError(null)
        }
      } catch (err) {
        log.warn('multiplayer_honesty_badge_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) {
          setError('Honesty probe unavailable')
          setReport({
            marketingDedicatedAllowed: false,
            claim: 'Multiplayer capability unknown — dedicated marketing blocked',
            dedicated: { status: 'held', connectable: false },
            p2pLan: { status: 'live' },
          })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const dedicatedLive = report?.marketingDedicatedAllowed === true
  const label = dedicatedLive
    ? `MP · dedicated live`
    : `[HELD] dedicated · P2P/LAN`

  return (
    <div
      role="status"
      aria-live="polite"
      title={report?.productCopy || report?.claim || error || 'Multiplayer honesty'}
      className="pointer-events-none absolute right-3 top-3 z-20 max-w-[min(100%,18rem)] rounded-md border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] shadow-sm backdrop-blur-sm"
    >
      <span
        className={
          dedicatedLive
            ? 'text-[var(--aethel-success)]'
            : 'text-[var(--aethel-warning)]'
        }
      >
        {label}
      </span>
      {!dedicatedLive ? (
        <span className="mt-0.5 block text-[10px] font-normal text-[var(--aethel-text-muted)]">
          Cross-play / Agones claims disabled
        </span>
      ) : null}
    </div>
  )
}
