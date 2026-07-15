/**
 * Hub RTv1 — I.5/I.6 honesty capability surface.
 * Showcase + F2P taxonomy deepen Arcade; discovery/reviews/social/checkout fail-closed.
 * Never invent fake store rows, verified reviews, earnings, or Coins.
 * I.4: Report/Block/COPPA ready ≠ party/deep-link ready (split marketing flags).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { HUB_PRIMARY_TABS } from '@/lib/hub/taxonomy'

const log = createComponentLogger('hub-honesty-capability')

export type HubCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'HELD'

export interface HubSurfaceReport {
  surface: string
  status: HubCapabilityStatus
  connectable: boolean
  notes: string[]
  heldReason?: string
}

export interface HubHonestyReport {
  generatedAt: string
  wave: 'RTv1-a'
  /** I.5 F2P tabs + tag taxonomy over real Arcade catalog */
  taxonomy: HubSurfaceReport
  /** I.6 Showcase = deepened /arcade/[slug] */
  showcase: HubSurfaceReport
  /** I.1 Discovery Feed — fail-closed until telemetry + retention scorer */
  discovery: HubSurfaceReport
  /** I.2 Verified reviews — fail-closed until F.2 playtime */
  reviews: HubSurfaceReport
  /** I.4 Social — moderation vs party split */
  social: HubSurfaceReport
  /** Law XII Hub commerce strip / Coins checkout — HELD (H.0 fail-closed) */
  hubCheckout: HubSurfaceReport
  /** I.8 cross-play marketing — HELD until G.2 */
  crossPlay: HubSurfaceReport
  /** Marketing gates — true only when surface IMPLEMENTED/PARTIAL + connectable */
  marketingDiscoveryAllowed: boolean
  /** I.1 AI-moderated discovery claim — only when moderation path ready */
  marketingAiModeratedDiscoveryAllowed: boolean
  marketingVerifiedReviewsAllowed: boolean
  /** Report / Block / COPPA surfaces — not party */
  marketingSocialModerationAllowed: boolean
  /** Friends / party / deep-link — separate from moderation */
  marketingSocialPartyAllowed: boolean
  marketingHubCheckoutAllowed: boolean
  marketingCrossPlayAllowed: boolean
  marketingCoinsAllowed: boolean
  claim: string
  productCopy: string
}

export interface HubHonestyInput {
  /** PublishedGame rows available (Arcade catalog live) */
  arcadeCatalogAvailable?: boolean
  /** At least one public game in catalog */
  hasPublishedGames?: boolean
  /** F.2 session_playtime_seconds TelemetrySpool + PlayerGameStats proven */
  playtimeTelemetryReady?: boolean
  /**
   * I.2 GameReview store / POST API live.
   * Required with playtimeTelemetryReady before marketing verified reviews.
   */
  reviewsStoreReady?: boolean
  /** I.1 discovery feed engine live */
  discoveryFeedReady?: boolean
  /** I.1 2k impression ledger durable + wired */
  impressionLedgerReady?: boolean
  /** I.1 discovery AI moderation path ready */
  aiModerationReady?: boolean
  /** I.4 Report + Block + COPPA substrate ready */
  socialModerationReady?: boolean
  /** I.4 friends / rich presence / deep-link — independent of moderation */
  socialPartyReady?: boolean
  /** Wave H Treasury / Coins audit complete — Hub checkout unlock */
  hubCheckoutAudited?: boolean
  /** G.2 cross-play unlock */
  crossPlayReady?: boolean
}

/**
 * Evaluate Hub honesty for badges / Critic / product chrome.
 * Defaults are fail-closed for discovery, reviews, social, checkout, cross-play.
 */
export function evaluateHubHonesty(input: HubHonestyInput = {}): HubHonestyReport {
  const catalogAvailable = input.arcadeCatalogAvailable !== false
  const hasGames = input.hasPublishedGames === true
  const playtimeReady = input.playtimeTelemetryReady === true
  const reviewsStoreReady = input.reviewsStoreReady === true
  const discoveryReady = input.discoveryFeedReady === true
  const impressionLedgerReady = input.impressionLedgerReady === true
  const aiModerationReady = input.aiModerationReady === true
  const socialModerationReady = input.socialModerationReady === true
  const socialPartyReady = input.socialPartyReady === true
  const checkoutAudited = input.hubCheckoutAudited === true
  const crossPlayReady = input.crossPlayReady === true

  const taxonomy: HubSurfaceReport = catalogAvailable
    ? {
        surface: 'I.5 Hub F2P taxonomy',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          `${HUB_PRIMARY_TABS.length} primary tabs over real Arcade PublishedGame tags`,
          'Empty tabs render honest empty copy — no fake catalog rows',
          'Free Cosmetics tab empty until Universal Store (Wave H)',
        ],
      }
    : {
        surface: 'I.5 Hub F2P taxonomy',
        status: 'PARTIAL',
        connectable: false,
        notes: ['Arcade catalog unavailable — taxonomy UI still honest-empty'],
        heldReason: 'arcade_catalog_unavailable',
      }

  const showcase: HubSurfaceReport = {
    surface: 'I.6 Game Showcase (/arcade/[slug])',
    status: hasGames || catalogAvailable ? 'IMPLEMENTED' : 'PARTIAL',
    connectable: catalogAvailable,
    notes: [
      'Showcase deepens existing Arcade detail — no parallel fake store',
      'Playable only with real playUrl; else Build pending / [HELD]',
      'Engine transparency + fail-closed panels for reviews/social/commerce',
    ],
    heldReason: catalogAvailable ? undefined : 'arcade_catalog_unavailable',
  }

  const discoveryNotes: string[] = discoveryReady
    ? [
        'Discovery feed engine live — 30-day launch window + Compression Mandate ranking',
        ...(impressionLedgerReady
          ? [
              '2k impression ledger live — unique served counts within 30d; exhausted titles lose Lane A boost',
            ]
          : ['2k impression ledger [HELD] — no fake served counts']),
        ...(aiModerationReady
          ? ['AI moderation path live — unapproved titles excluded before ranking']
          : ['AI moderation marketing [HELD]']),
        'Lane C Promoted [HELD]',
        'Empty-honest when no titles pass gates — no fake ranked rows',
      ]
    : [
        'Three-lane discovery (launch guarantee + retention + promoted) not shipped',
        'New & Rising shows recency only — not marketed as ranked discovery',
      ]

  const discovery: HubSurfaceReport = discoveryReady
    ? {
        surface: 'I.1 Discovery Feed',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: discoveryNotes,
      }
    : {
        surface: 'I.1 Discovery Feed',
        status: 'HELD',
        connectable: false,
        notes: discoveryNotes,
        heldReason: 'discovery_feed_held',
      }

  let reviews: HubSurfaceReport
  if (playtimeReady && reviewsStoreReady) {
    reviews = {
      surface: 'I.2 Verified reviews',
      status: 'IMPLEMENTED',
      connectable: true,
      notes: [
        'F.2 playtime + GameReview store live — verified reviews enabled',
        'Helpful votes durable (1/user/review) + playtime-tier weight ranking — no fake counts',
        'Early-access creator opt-in — 30m gate + Early Access badge when enabled',
      ],
    }
  } else if (playtimeReady && !reviewsStoreReady) {
    reviews = {
      surface: 'I.2 Verified reviews',
      status: 'PARTIAL',
      connectable: false,
      notes: [
        'F.2 TelemetrySpool + PlayerGameStats live — 2h playtime gate can evaluate',
        'GameReview store / star UI not shipped — reviews stay fail-closed',
        'No fake ratings on Showcase',
      ],
      heldReason: 'reviews_store_held',
    }
  } else {
    reviews = {
      surface: 'I.2 Verified reviews',
      status: 'HELD',
      connectable: false,
      notes: [
        'Reviews fail-closed until F.2 session_playtime_seconds telemetry',
        'No star ratings / fake social proof on Showcase',
      ],
      heldReason: 'playtime_telemetry_held',
    }
  }

  let social: HubSurfaceReport
  if (socialModerationReady && socialPartyReady) {
    social = {
      surface: 'I.4 Social graph',
      status: 'IMPLEMENTED',
      connectable: true,
      notes: [
        'Report + Block + COPPA live',
        'Rich presence + party invite + deep-link tokens live',
        'No fake online friends wall — empty until real presence/invites',
        'Dedicated multiplayer session host / Agones [HELD]',
      ],
    }
  } else if (socialModerationReady) {
    social = {
      surface: 'I.4 Social graph',
      status: 'PARTIAL',
      connectable: true,
      notes: [
        'Report + Block durable authority live',
        `COPPA age gate live — under-13 fail-closed without parental consent`,
        'Party / deep-link join [HELD] until rich presence + invite substrate',
        'No fake online friends list',
      ],
      heldReason: 'social_party_held',
    }
  } else {
    social = {
      surface: 'I.4 Social graph',
      status: 'HELD',
      connectable: false,
      notes: [
        'Report / Block / COPPA fail-closed until social moderation substrate',
        'Party / deep-link join fail-closed — no fake online friends list',
      ],
      heldReason: 'social_moderation_held',
    }
  }

  const hubCheckout: HubSurfaceReport = checkoutAudited
    ? {
        surface: 'Hub commerce / Coins checkout',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: ['Hub checkout audited and live'],
      }
    : {
        surface: 'Hub commerce / Coins checkout',
        status: 'HELD',
        connectable: false,
        notes: [
          'RTv1 Hub checkout held until H audit — fail-closed, not mock UI',
          'No fake Buy / earnings / Aethel Coins on Showcase strip',
          'IDE marketplace fiat Stripe remains separate (Wave H-a)',
        ],
        heldReason: 'hub_checkout_held',
      }

  const crossPlay: HubSurfaceReport = crossPlayReady
    ? {
        surface: 'I.8 Cross-play',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'G.2 unlock + dedicated Agones live — cross-play marketing unlocked',
          'I.8 honesty probe wired (no fake lobbies)',
        ],
      }
    : {
        surface: 'I.8 Cross-play',
        status: 'HELD',
        connectable: false,
        notes: [
          'Showcase shows Same-platform only — no false cross-play marketing',
          'I.8 honesty probe live — marketing fail-closed until G.2 + Agones',
          'Dedicated Agones fleet [HELD]',
        ],
        heldReason: 'g2_cross_play_held',
      }

  const marketingSocialModerationAllowed =
    socialModerationReady && (social.status === 'IMPLEMENTED' || social.status === 'PARTIAL')
  const marketingSocialPartyAllowed =
    socialModerationReady && socialPartyReady && social.status === 'IMPLEMENTED'

  const claimParts: string[] = ['Hub RTv1 = Arcade Showcase + F2P taxonomy']
  if (discoveryReady) claimParts.push('+ I.1 discovery')
  if (playtimeReady && reviewsStoreReady) claimParts.push('+ I.2 verified reviews')
  if (socialModerationReady) {
    claimParts.push(
      socialPartyReady
        ? '+ I.4 Report/Block/COPPA + presence/party'
        : '+ I.4 Report/Block/COPPA',
    )
  }
  const heldBits: string[] = []
  if (!discoveryReady) heldBits.push('discovery')
  if (!(playtimeReady && reviewsStoreReady)) heldBits.push('verified reviews')
  if (!socialModerationReady) heldBits.push('social moderation')
  if (!socialPartyReady) heldBits.push('party')
  heldBits.push('Agones session')
  heldBits.push('Hub checkout')
  const claim = `${claimParts.join(' ')} — ${heldBits.join(' / ')} [HELD]`

  const productCopy =
    discoveryReady && impressionLedgerReady && playtimeReady && reviewsStoreReady && socialModerationReady
      ? socialPartyReady
        ? 'Play published games in Arcade. Discovery ranks eligible titles. Verified reviews require 2h F.2 playtime (or 30m when creator early-access opted in); helpful votes rank honestly. Report/Block/COPPA + rich presence + party invites + deep-link tokens live. No fake online friends. Dedicated session host / Agones, Hub Coins, and cross-play remain [HELD].'
        : 'Play published games in Arcade. Discovery ranks eligible titles (30d + Compression Mandate + remaining 2k impressions) — empty when none. Verified reviews require 2h F.2 playtime (or 30m early-access opt-in); helpful votes rank honestly. Report + Block + COPPA age gate are live. Party join, Hub Coins, and cross-play remain [HELD].'
      : discoveryReady && impressionLedgerReady && socialModerationReady
        ? socialPartyReady
          ? 'Play published games in Arcade. I.1 Discovery Feed ranks compression-eligible publishes with honest 2k launch impressions (30d). Report/Block/COPPA + presence/party invites live. Verified reviews, dedicated Agones session, Hub Coins, and cross-play remain [HELD].'
          : 'Play published games in Arcade. I.1 Discovery Feed ranks compression-eligible publishes with honest 2k launch impressions (30d). Report + Block + COPPA live. Verified reviews, party join, Hub Coins, and cross-play remain [HELD].'
        : discoveryReady && impressionLedgerReady && playtimeReady && reviewsStoreReady
          ? 'Play published games in Arcade. Discovery ranks eligible titles (30d + Compression Mandate + remaining 2k impressions) — empty when none. Verified reviews require 2h F.2 playtime (or 30m early-access opt-in); helpful votes rank honestly. Party join, Hub Coins, and cross-play remain [HELD].'
          : discoveryReady && impressionLedgerReady
            ? 'Play published games in Arcade. I.1 Discovery Feed ranks compression-eligible publishes with honest 2k launch impressions (30d) — empty when none pass gates. Verified reviews, party join, Hub Coins, and cross-play remain [HELD].'
            : discoveryReady && playtimeReady && reviewsStoreReady
              ? 'Play published games in Arcade. Discovery ranks eligible titles (30d + Compression Mandate) — empty when none. Verified reviews require 2h F.2 playtime (or 30m early-access opt-in); helpful votes rank honestly. Party join, Hub Coins, and cross-play remain [HELD].'
              : discoveryReady
                ? 'Play published games in Arcade. I.1 Discovery Feed ranks compression-eligible publishes in the launch window — empty when none pass gates. Verified reviews, party join, Hub Coins, and cross-play remain [HELD].'
                : playtimeReady && reviewsStoreReady && socialModerationReady
                  ? 'Play published games in Arcade. Verified reviews require 2h F.2 playtime (or 30m early-access opt-in); helpful votes rank honestly. Report + Block + COPPA live. Party join, Hub Coins, and cross-play remain [HELD].'
                  : playtimeReady && reviewsStoreReady
                    ? 'Play published games in Arcade. Verified reviews require 2h F.2 playtime (or 30m early-access opt-in) — empty when none, no fake stars; helpful votes rank honestly. Ranked discovery, party join, Hub Coins, and cross-play remain [HELD].'
                    : socialModerationReady && socialPartyReady
                      ? 'Play published games in Arcade. Report + Block + COPPA + rich presence + party invites + deep-link tokens live. No fake online friends. Ranked discovery, dedicated Agones session, Hub Coins, and cross-play remain [HELD].'
                      : socialModerationReady
                      ? 'Play published games in Arcade. Report + Block durable; COPPA age gate holds party for under-13. Friends/party/deep-link, ranked discovery, Hub Coins, and cross-play remain [HELD].'
                      : playtimeReady && !reviewsStoreReady
                        ? 'Play published games in Arcade. F.2 playtime TelemetrySpool is live for the 2h gate — GameReview store, ranked discovery, party join, Hub Coins, and cross-play remain [HELD].'
                        : 'Play published games in Arcade. F2P tabs filter real tags or stay empty. Discovery ranking, verified reviews, party join, Hub Coins checkout, and cross-play remain [HELD] — no fake store.'

  const report: HubHonestyReport = {
    generatedAt: new Date().toISOString(),
    wave: 'RTv1-a',
    taxonomy,
    showcase,
    discovery,
    reviews,
    social,
    hubCheckout,
    crossPlay,
    marketingDiscoveryAllowed:
      discovery.status === 'IMPLEMENTED' && discovery.connectable,
    marketingAiModeratedDiscoveryAllowed:
      discoveryReady && aiModerationReady && discovery.connectable,
    marketingVerifiedReviewsAllowed:
      reviews.status === 'IMPLEMENTED' && reviews.connectable,
    marketingSocialModerationAllowed,
    marketingSocialPartyAllowed,
    marketingHubCheckoutAllowed:
      hubCheckout.status === 'IMPLEMENTED' && hubCheckout.connectable,
    marketingCrossPlayAllowed:
      crossPlay.status === 'IMPLEMENTED' && crossPlay.connectable,
    marketingCoinsAllowed:
      hubCheckout.status === 'IMPLEMENTED' && hubCheckout.connectable,
    claim,
    productCopy,
  }

  log.info('hub_honesty_evaluated', {
    taxonomy: taxonomy.status,
    showcase: showcase.status,
    discovery: discovery.status,
    reviews: reviews.status,
    social: social.status,
    checkout: hubCheckout.status,
  })

  return report
}

/**
 * Gate: allow posting a verified review only when F.2 playtime ready + threshold met.
 * Fail-closed by default.
 */
export function evaluateVerifiedReviewGate(input: {
  playtimeTelemetryReady?: boolean
  reviewsStoreReady?: boolean
  playtimeSeconds?: number
  requiredSeconds?: number
}): { allowed: boolean; code?: string; reason: string } {
  const required = input.requiredSeconds ?? 7200
  if (input.playtimeTelemetryReady !== true) {
    return {
      allowed: false,
      code: 'REVIEWS_HELD',
      reason: 'Verified reviews [HELD] until F.2 playtime telemetry',
    }
  }
  if (input.reviewsStoreReady !== true) {
    return {
      allowed: false,
      code: 'REVIEWS_STORE_HELD',
      reason: 'F.2 playtime live — GameReview store [HELD]; no star POST',
    }
  }
  const seconds = input.playtimeSeconds ?? 0
  if (seconds < required) {
    return {
      allowed: false,
      code: 'PLAYTIME_GATE',
      reason: `Need ${required}s verified playtime (have ${seconds}s)`,
    }
  }
  return { allowed: true, reason: 'playtime_gate_passed' }
}

/**
 * Gate: Hub commerce CTA. Always fail-closed until checkout audited.
 */
export function evaluateHubCheckoutGate(input: {
  hubCheckoutAudited?: boolean
} = {}): { allowed: boolean; code?: string; reason: string } {
  if (input.hubCheckoutAudited === true) {
    return { allowed: true, reason: 'hub_checkout_audited' }
  }
  return {
    allowed: false,
    code: 'HUB_CHECKOUT_HELD',
    reason: 'Hub Coins / checkout [HELD] — fail-closed, not mock',
  }
}

/**
 * Gate: social party / deep-link join.
 * Requires BOTH moderation substrate AND party/presence readiness.
 */
export function evaluateHubSocialGate(input: {
  socialModerationReady?: boolean
  socialPartyReady?: boolean
} = {}): { allowed: boolean; code?: string; reason: string } {
  if (input.socialModerationReady !== true) {
    return {
      allowed: false,
      code: 'SOCIAL_HELD',
      reason: 'Party / deep-link join [HELD] until social moderation (Report/Block/COPPA)',
    }
  }
  if (input.socialPartyReady !== true) {
    return {
      allowed: false,
      code: 'SOCIAL_PARTY_HELD',
      reason: 'Moderation live — party / deep-link [HELD] until rich presence',
    }
  }
  return { allowed: true, reason: 'social_party_ready' }
}

/**
 * Gate: ranked discovery marketing (not recency list).
 */
export function evaluateHubDiscoveryGate(input: {
  discoveryFeedReady?: boolean
} = {}): { allowed: boolean; code?: string; reason: string } {
  if (input.discoveryFeedReady === true) {
    return { allowed: true, reason: 'discovery_feed_ready' }
  }
  return {
    allowed: false,
    code: 'DISCOVERY_HELD',
    reason: 'Ranked discovery [HELD] until I.1 Discovery Feed',
  }
}
