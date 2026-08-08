'use client'

/**
 * Hub I.6 Showcase fail-closed panels — reviews / social / discovery / commerce.
 * Never render fake ratings, friends, ranked discovery, or Buy/Coins CTAs.
 * I.2: when hub-honesty unlocks verified reviews, show real star surface (empty-honest).
 * I.1: when discoveryFeedReady, show DiscoveryFeedPanel (empty-honest when none eligible).
 * I.7: when crossSavePolicyFieldReady, show CrossSavePolicyPanel (cloud sync marketing stay gated).
 */

import { useEffect, useState } from 'react'
import { evaluateHubHonesty, type HubHonestyReport } from '@/lib/hub/hub-honesty-capability'
import { VerifiedReviewsPanel } from '@/components/hub/VerifiedReviewsPanel'
import { DiscoveryFeedPanel } from '@/components/hub/DiscoveryFeedPanel'
import { SocialModerationPanel } from '@/components/hub/SocialModerationPanel'
import { PartyPresencePanel } from '@/components/hub/PartyPresencePanel'
import { CrossSavePolicyPanel } from '@/components/hub/CrossSavePolicyPanel'
import { TreasuryAuditStatusPanel } from '@/components/hub/TreasuryAuditStatusPanel'
import { createComponentLogger } from '@/lib/observability/logger'

type TreasuryHeldReason = {
  id: string
  kind?: string
  title: string
  status: string
  reason: string
  heldReason?: string
}

const log = createComponentLogger('ShowcaseHonestyPanels')

type CrossSaveHonestySlice = {
  marketingCrossSaveAllowed?: boolean
  crossSaveDefaultOnOptOutHeld?: boolean
  crossSavePolicyFieldReady?: boolean
  crossSaveStatus?: string
  gameSaveCloudReady?: boolean
}

type ShowcaseHonestyPanelsProps = {
  /** Engine transparency badges from real game fields */
  playable: boolean
  tags: string[]
  /** Arcade slug — also F.2 / I.2 gameId */
  gameId?: string
  /** Hub XIV — no web demo → Desktop Exclusive (honest, not Instant Play). */
  noWebDemo?: boolean
}

function HeldPanel({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-warning-light)]">
        {title}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{body}</p>
    </div>
  )
}

export function ShowcaseHonestyPanels({
  playable,
  tags,
  gameId,
  noWebDemo = false,
}: ShowcaseHonestyPanelsProps) {
  // Fail-closed defaults until hub-honesty probe returns (matches server report).
  const [report, setReport] = useState<HubHonestyReport>(() =>
    evaluateHubHonesty({ arcadeCatalogAvailable: true, hasPublishedGames: true }),
  )
  const [crossSave, setCrossSave] = useState<CrossSaveHonestySlice>({
    crossSavePolicyFieldReady: false,
    marketingCrossSaveAllowed: false,
    crossSaveDefaultOnOptOutHeld: true,
  })
  const [treasuryHeld, setTreasuryHeld] = useState<TreasuryHeldReason[]>([])
  const [treasuryClaim, setTreasuryClaim] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/runtime/hub-honesty', { cache: 'no-store' })
        if (!res.ok) throw new Error(`hub honesty ${res.status}`)
        const data = (await res.json()) as {
          report?: HubHonestyReport
          crossPlay?: CrossSaveHonestySlice
          f2?: { gameSaveCloudReady?: boolean }
          treasuryAudit?: {
            heldReasons?: TreasuryHeldReason[]
            claim?: string
          }
        }
        if (!cancelled && data.report) setReport(data.report)
        if (!cancelled) {
          setCrossSave({
            marketingCrossSaveAllowed: data.crossPlay?.marketingCrossSaveAllowed === true,
            crossSaveDefaultOnOptOutHeld: data.crossPlay?.crossSaveDefaultOnOptOutHeld !== false,
            crossSavePolicyFieldReady: data.crossPlay?.crossSavePolicyFieldReady === true,
            crossSaveStatus: data.crossPlay?.crossSaveStatus,
            gameSaveCloudReady: data.f2?.gameSaveCloudReady === true,
          })
          setTreasuryHeld(data.treasuryAudit?.heldReasons ?? [])
          setTreasuryClaim(data.treasuryAudit?.claim)
        }
      } catch (err) {
        log.warn('showcase_honesty_probe_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const lower = tags.map((t) => t.toLowerCase())
  const f2p = lower.some((t) =>
    ['f2p', 'free', 'free-to-play', 'free to play', 'freeware'].includes(t),
  )

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-text-quaternary)]">
          Engine transparency
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {noWebDemo ? (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-info-light)]">
              Desktop Exclusive
            </span>
          ) : playable ? (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-success-light)]">
              Web playable
            </span>
          ) : (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-warning-light)]">
              Build pending [HELD]
            </span>
          )}
          {f2p ? (
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-text-secondary)]">
              Free to Play
            </span>
          ) : null}
          {report.marketingCrossPlayAllowed ? (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-success-light)]">
              Cross-play live
            </span>
          ) : (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-warning-light)]">
              Same-platform only · Cross-play [HELD]
            </span>
          )}
          {crossSave.marketingCrossSaveAllowed ? (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-success-light)]">
              Cross-save live
            </span>
          ) : crossSave.crossSavePolicyFieldReady ? (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-warning-light)]">
              Cross-save policy · cloud sync [HELD]
            </span>
          ) : (
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-warning-light)]">
              Cross-save [HELD]
            </span>
          )}
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] px-3 py-1 text-[10px] font-semibold text-[var(--aethel-warning-light)]">
            Universal Backpack [HELD]
          </span>
        </div>
      </div>

      {!report.marketingCrossPlayAllowed ? (
        <HeldPanel
          title="Cross-play [HELD]"
          body="Desktop ↔ Web matchmaking stays fail-closed until G.2 netcode production + dedicated Agones. Showcase is Same-platform only — no fake cross-play lobbies."
        />
      ) : null}

      {crossSave.crossSavePolicyFieldReady && gameId ? (
        <CrossSavePolicyPanel gameId={gameId} />
      ) : (
        <HeldPanel
          title="Cross-save [HELD]"
          body="Desktop ↔ Web sync stays fail-closed until F.1 Prisma/R2 cloud GameSave + publish-manifest policy. Durable local slots are not cross-save."
        />
      )}

      {report.marketingVerifiedReviewsAllowed && gameId ? (
        <VerifiedReviewsPanel gameId={gameId} />
      ) : !report.marketingVerifiedReviewsAllowed ? (
        <HeldPanel
          title="Verified reviews [HELD]"
          body="Reviews stay disabled until F.2 playtime + GameReview store (2h gate). No star ratings or fake social proof."
        />
      ) : null}

      {report.marketingSocialModerationAllowed ? (
        <SocialModerationPanel gameId={gameId} />
      ) : (
        <HeldPanel
          title="Report / Block / COPPA [HELD]"
          body="Social moderation substrate not ready. Report, Block, and COPPA age gate stay fail-closed — no fake safety chrome."
        />
      )}

      {report.marketingSocialPartyAllowed ? (
        <PartyPresencePanel gameId={gameId} />
      ) : (
        <HeldPanel
          title="Friends / party join [HELD]"
          body="Party and deep-link join fail-closed until Report/Block/COPPA + rich presence + invite substrate. No fake online friends. Agones session host stays [HELD]."
        />
      )}

      {report.marketingDiscoveryAllowed ? (
        <DiscoveryFeedPanel enabled />
      ) : (
        <HeldPanel
          title="Ranked discovery [HELD]"
          body="I.1 Discovery Feed (launch guarantee + retention + promoted) not shipped. Catalog is publish order / tags only."
        />
      )}

      {!report.marketingHubCheckoutAllowed ? (
        <TreasuryAuditStatusPanel
          compact
          heldReasons={treasuryHeld}
          claim={treasuryClaim}
        />
      ) : null}
    </div>
  )
}

export default ShowcaseHonestyPanels
