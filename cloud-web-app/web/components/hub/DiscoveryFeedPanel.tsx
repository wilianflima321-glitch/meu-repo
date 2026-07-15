'use client'

/**
 * I.1 — Discovery Feed surface for Hub / Arcade.
 * Empty-honest when no titles pass gates; shows real impression ledger when live.
 */

import { useEffect, useState } from 'react'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('DiscoveryFeedPanel')

type FeedItem = {
  gameId: string
  title: string
  tags: string[]
  lane: string
  rankScore: number
  badges: string[]
  impressionsLogged: number | null
  launchImpressionBudget: number | null
  impressionLedger: string
}

type FeedPayload = {
  empty?: boolean
  emptyCopy?: string
  items?: FeedItem[]
  gates?: {
    aiModerationClaim?: string
    impressionLedger?: string
    promotedLane?: string
  }
  notes?: string[]
  capabilityStatus?: string
  probe?: {
    impressionLedgerReady?: boolean
    aiModerationReady?: boolean
  }
}

type DiscoveryFeedPanelProps = {
  /** When false, parent already showed HeldPanel — skip fetch. */
  enabled?: boolean
  limit?: number
}

export function DiscoveryFeedPanel({
  enabled = true,
  limit = 12,
}: DiscoveryFeedPanelProps) {
  const [payload, setPayload] = useState<FeedPayload | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/hub/feed?limit=${limit}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`discovery feed ${res.status}`)
        const data = (await res.json()) as FeedPayload
        if (!cancelled) {
          setPayload(data)
          setError(null)
        }
      } catch (err) {
        log.warn('discovery_feed_panel_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) {
          setError('Discovery feed unavailable')
          setPayload(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, limit])

  if (!enabled) return null

  const ledgerLive =
    payload?.gates?.impressionLedger === 'IMPLEMENTED' ||
    payload?.probe?.impressionLedgerReady === true
  const aiModLive =
    payload?.gates?.aiModerationClaim === 'IMPLEMENTED' ||
    payload?.probe?.aiModerationReady === true

  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
        Discovery Feed · I.1
      </p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
        Ranked by 30-day launch window + Compression Mandate + provisional retention
        {ledgerLive
          ? ' + remaining 2k launch impressions (real served ledger)'
          : ''}
        {aiModLive ? ' + AI moderation eligibility gate' : ''}.{' '}
        {aiModLive
          ? 'Coins Promoted remains [HELD].'
          : 'AI moderation marketing and Coins Promoted remain [HELD].'}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
          Engine live
        </span>
        <span
          className={
            ledgerLive
              ? 'rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]'
              : 'rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]'
          }
        >
          {ledgerLive ? '2k impression ledger live' : 'Impression ledger [HELD]'}
        </span>
        <span
          className={
            aiModLive
              ? 'rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]'
              : 'rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]'
          }
        >
          {aiModLive ? 'AI moderation live' : 'AI moderation [HELD]'}
        </span>
        <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
          Promoted [HELD]
        </span>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-[var(--aethel-text-quaternary)]">Loading feed…</p>
      ) : error ? (
        <p className="mt-4 text-xs text-[var(--aethel-warning-light)]">{error}</p>
      ) : payload?.empty || !payload?.items?.length ? (
        <p className="mt-4 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
          {payload?.emptyCopy ||
            'No titles pass discovery gates yet. Empty is honest — no fake ranked rows.'}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {payload.items.map((item) => (
            <li
              key={item.gameId}
              className="rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a
                  href={`/arcade/${encodeURIComponent(item.gameId)}`}
                  className="text-sm font-semibold text-[var(--aethel-text-primary)] hover:underline"
                >
                  {item.title}
                </a>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
                  {item.lane} · {item.rankScore.toFixed(1)}
                </span>
              </div>
              {ledgerLive && item.impressionsLogged != null ? (
                <p className="mt-1 text-[10px] text-[var(--aethel-text-quaternary)]">
                  Served {item.impressionsLogged}
                  {item.launchImpressionBudget != null
                    ? ` · ${item.launchImpressionBudget} remaining`
                    : ''}
                </p>
              ) : null}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {item.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[9px] text-[var(--aethel-text-tertiary)]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DiscoveryFeedPanel
