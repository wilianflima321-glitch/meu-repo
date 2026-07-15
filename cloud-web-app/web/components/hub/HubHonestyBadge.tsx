'use client'

import { useEffect, useState } from 'react'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('HubHonestyBadge')

type HubHonestyPayload = {
  claim?: string
  productCopy?: string
  taxonomy?: { status?: string }
  showcase?: { status?: string }
  discovery?: { status?: string }
  reviews?: { status?: string }
  social?: { status?: string }
  hubCheckout?: { status?: string }
  crossPlay?: { status?: string }
  marketingDiscoveryAllowed?: boolean
  marketingAiModeratedDiscoveryAllowed?: boolean
  marketingVerifiedReviewsAllowed?: boolean
  marketingSocialModerationAllowed?: boolean
  marketingSocialPartyAllowed?: boolean
  marketingHubCheckoutAllowed?: boolean
  marketingCrossPlayAllowed?: boolean
}

type CrossSaveChipSlice = {
  marketingCrossSaveAllowed?: boolean
  crossSavePolicyFieldReady?: boolean
  crossSaveDefaultOnOptOutHeld?: boolean
}

/**
 * Hub RTv1 — fail-closed honesty badge for Arcade / Showcase.
 */
export function HubHonestyBadge({ compact = false }: { compact?: boolean }) {
  const [report, setReport] = useState<HubHonestyPayload | null>(null)
  const [crossSave, setCrossSave] = useState<CrossSaveChipSlice>({
    marketingCrossSaveAllowed: false,
    crossSavePolicyFieldReady: false,
    crossSaveDefaultOnOptOutHeld: true,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/runtime/hub-honesty', { cache: 'no-store' })
        if (!res.ok) throw new Error(`hub honesty ${res.status}`)
        const data = (await res.json()) as {
          report?: HubHonestyPayload
          crossPlay?: CrossSaveChipSlice
        }
        if (!cancelled) {
          setReport(data.report ?? null)
          setCrossSave({
            marketingCrossSaveAllowed: data.crossPlay?.marketingCrossSaveAllowed === true,
            crossSavePolicyFieldReady: data.crossPlay?.crossSavePolicyFieldReady === true,
            crossSaveDefaultOnOptOutHeld: data.crossPlay?.crossSaveDefaultOnOptOutHeld !== false,
          })
        }
      } catch (err) {
        log.warn('hub_honesty_badge_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        if (!cancelled) {
          setReport({
            claim:
              'Hub honesty probe unavailable — discovery / reviews / social / checkout / cross-play blocked',
            discovery: { status: 'HELD' },
            reviews: { status: 'HELD' },
            social: { status: 'HELD' },
            hubCheckout: { status: 'HELD' },
            crossPlay: { status: 'HELD' },
            marketingDiscoveryAllowed: false,
            marketingAiModeratedDiscoveryAllowed: false,
            marketingVerifiedReviewsAllowed: false,
            marketingSocialModerationAllowed: false,
            marketingSocialPartyAllowed: false,
            marketingHubCheckoutAllowed: false,
            marketingCrossPlayAllowed: false,
          })
          setCrossSave({
            marketingCrossSaveAllowed: false,
            crossSavePolicyFieldReady: false,
            crossSaveDefaultOnOptOutHeld: true,
          })
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const discoveryHeld = report?.marketingDiscoveryAllowed !== true
  const aiModHeld = report?.marketingAiModeratedDiscoveryAllowed !== true
  const reviewsHeld = report?.marketingVerifiedReviewsAllowed !== true
  const socialModHeld = report?.marketingSocialModerationAllowed !== true
  const partyHeld = report?.marketingSocialPartyAllowed !== true
  const checkoutHeld = report?.marketingHubCheckoutAllowed !== true
  const crossPlayHeld = report?.marketingCrossPlayAllowed !== true
  const crossSaveCloudHeld = crossSave.marketingCrossSaveAllowed !== true
  const crossSavePolicyReady = crossSave.crossSavePolicyFieldReady === true

  if (compact) {
    return (
      <span
        role="status"
        title={report?.productCopy || report?.claim || 'Hub honesty'}
        className="inline-flex items-center rounded-md border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning)]"
      >
        Hub [HELD] lanes
      </span>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      title={report?.productCopy || report?.claim || 'Hub honesty'}
      className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]"
    >
      <span className="font-semibold text-[var(--aethel-text-secondary)]">Hub honesty</span>
      <span className="mt-1 flex flex-wrap gap-1.5">
        {discoveryHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Discovery [HELD]
          </span>
        ) : (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
            Discovery live · gates
          </span>
        )}
        {aiModHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            AI-mod [HELD]
          </span>
        ) : (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
            AI-mod live
          </span>
        )}
        {reviewsHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Reviews [HELD]
          </span>
        ) : (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
            Reviews live · 2h gate
          </span>
        )}
        {socialModHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Report/Block [HELD]
          </span>
        ) : (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
            Report/Block · COPPA
          </span>
        )}
        {partyHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Party [HELD]
          </span>
        ) : (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
            Presence · invite · Agones [HELD]
          </span>
        )}
        {checkoutHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Checkout [HELD]
          </span>
        ) : null}
        {crossPlayHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Cross-play [HELD]
          </span>
        ) : (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
            Cross-play live · G.2
          </span>
        )}
        {!crossSaveCloudHeld ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-success-light)]">
            Cross-save live
          </span>
        ) : crossSavePolicyReady ? (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Cross-save policy · cloud [HELD]
          </span>
        ) : (
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-warning-light)]">
            Cross-save [HELD]
          </span>
        )}
        <span className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-info-light)]">
          Showcase · F2P taxonomy live
        </span>
      </span>
    </div>
  )
}

export default HubHonestyBadge
