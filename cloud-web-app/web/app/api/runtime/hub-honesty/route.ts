import { NextRequest, NextResponse } from 'next/server'

import { evaluateHubHonesty } from '@/lib/hub/hub-honesty-capability'
import { probeCrossPlayHonesty } from '@/lib/hub/cross-play-capability'
import { probeDiscoveryModerationHonesty } from '@/lib/hub/discovery-moderation-capability'
import { probeSocialModerationHonesty } from '@/lib/hub/social-moderation-capability'
import { probeLiveOpsF2Honesty } from '@/lib/liveops/liveops-f2-capability'
import { createComponentLogger } from '@/lib/observability/logger'
import { getBillingRuntimeState } from '@/lib/server/billing-runtime'
import {
  isHubCheckoutProductionRuntime,
} from '@/lib/treasury/treasury-audit-authority'
import { evaluateTreasuryAudit } from '@/lib/treasury/treasury-audit-capability'

const log = createComponentLogger('api/runtime/hub-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * Hub RTv1 — public honesty report for Arcade / Showcase badges.
 * Defaults probe real F.2 LiveOps + I.1 AI-mod + I.4 social + I.8 cross-play + H.1+ Treasury audit.
 * Query overrides (non-production tests/ops only): playtime=1, reviewsStore=1, discovery=1,
 * aiModeration=1, social=1, socialParty=1, crossPlay=1, games=1.
 * `checkout=1` is IGNORED in production — hubCheckoutAudited comes only from Treasury audit probe.
 * FORCE_HUB_CHECKOUT / AETHEL_FORCE_HUB_CHECKOUT never unlock.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const parseBool = (key: string): boolean | undefined => {
    const v = sp.get(key)
    if (v === null) return undefined
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
    return undefined
  }

  const production = isHubCheckoutProductionRuntime()
  const checkoutQuery = parseBool('checkout')

  const [f2, social, discoveryMod, billing] = await Promise.all([
    probeLiveOpsF2Honesty(),
    probeSocialModerationHonesty(),
    probeDiscoveryModerationHonesty(),
    getBillingRuntimeState(),
  ])

  const crossPlayProbe = await probeCrossPlayHonesty({
    gameSaveDurableReady: f2.gameSaveDurableReady,
    gameSaveCloudReady: f2.gameSaveCloudReady,
  })

  const treasuryAudit = evaluateTreasuryAudit({
    stripeCheckoutConfigured: billing.checkoutReady,
  })

  // Production: audit probe only. Non-prod: allow checkout=1 for unit/e2e theater of honesty UI —
  // still never FORCE_* env. Prefer probe when query omitted.
  let hubCheckoutAudited = treasuryAudit.hubCheckoutAudited
  if (!production && checkoutQuery === true) {
    hubCheckoutAudited = true
  } else if (!production && checkoutQuery === false) {
    hubCheckoutAudited = false
  } else if (production && checkoutQuery === true) {
    log.warn('hub_checkout_query_override_ignored_in_production', {
      checkoutQuery: true,
    })
  }

  const report = evaluateHubHonesty({
    arcadeCatalogAvailable: parseBool('catalog') ?? true,
    hasPublishedGames: parseBool('games') === true,
    playtimeTelemetryReady: parseBool('playtime') ?? f2.playtimeTelemetryReady,
    reviewsStoreReady: parseBool('reviewsStore') ?? f2.reviewsStoreReady,
    discoveryFeedReady: parseBool('discovery') ?? f2.discoveryFeedReady,
    impressionLedgerReady: parseBool('impressions') ?? f2.impressionLedgerReady,
    aiModerationReady: parseBool('aiModeration') ?? discoveryMod.aiModerationReady,
    socialModerationReady: parseBool('social') ?? social.socialModerationReady,
    socialPartyReady: parseBool('socialParty') ?? social.socialPartyReady,
    hubCheckoutAudited,
    // Ops override only — production uses I.8 probe (G.2 + Agones), never invent.
    crossPlayReady: parseBool('crossPlay') ?? crossPlayProbe.crossPlayReady,
  })

  log.info('hub_honesty_api', {
    taxonomy: report.taxonomy.status,
    discovery: report.discovery.status,
    reviews: report.reviews.status,
    social: report.social.status,
    crossPlay: report.crossPlay.status,
    playtimeFromF2: f2.playtimeTelemetryReady,
    impressionsFromF2: f2.impressionLedgerReady,
    aiModerationFromProbe: discoveryMod.aiModerationReady,
    socialModerationFromProbe: social.socialModerationReady,
    crossPlayFromProbe: crossPlayProbe.crossPlayReady,
    checkout: report.hubCheckout.status,
    hubCheckoutAudited,
    treasuryHeldCount: treasuryAudit.heldItems.length,
    production,
  })

  return NextResponse.json({
    mock: false,
    wave: 'RTv1-a',
    f2: {
      playtimeTelemetryReady: f2.playtimeTelemetryReady,
      discoveryFeedReady: f2.discoveryFeedReady,
      impressionLedgerReady: f2.impressionLedgerReady,
      aiModerationReady: f2.aiModerationReady,
      reviewsStoreReady: f2.reviewsStoreReady,
      gameSaveDurableReady: f2.gameSaveDurableReady,
      gameSaveCloudReady: f2.gameSaveCloudReady,
    },
    discoveryModeration: {
      aiModerationReady: discoveryMod.aiModerationReady,
      marketingAiModeratedDiscoveryAllowed: discoveryMod.marketingAiModeratedDiscoveryAllowed,
    },
    social: {
      socialModerationReady: social.socialModerationReady,
      socialPartyReady: social.socialPartyReady,
      marketingSocialModerationAllowed: social.marketingSocialModerationAllowed,
      marketingSocialPartyAllowed: social.marketingSocialPartyAllowed,
      dedicatedSessionHeld: social.dedicatedSessionHeld,
    },
    crossPlay: {
      crossPlayReady: crossPlayProbe.crossPlayReady,
      marketingCrossPlayAllowed: crossPlayProbe.marketingCrossPlayAllowed,
      g2MarketingUnlockPresent: crossPlayProbe.g2MarketingUnlockPresent,
      dedicatedAgonesMarketingAllowed: crossPlayProbe.dedicatedAgonesMarketingAllowed,
      marketingCrossSaveAllowed: crossPlayProbe.marketingCrossSaveAllowed,
      crossSavePolicyFieldReady: crossPlayProbe.crossSavePolicyFieldReady,
      crossSaveDefaultOnOptOutHeld: crossPlayProbe.crossSaveDefaultOnOptOutHeld,
      dedicatedSessionHeld: crossPlayProbe.dedicatedSessionHeld,
      crossPlayStatus: crossPlayProbe.crossPlay.status,
      crossSaveStatus: crossPlayProbe.crossSave.status,
    },
    treasuryAudit: {
      hubCheckoutAudited: treasuryAudit.hubCheckoutAudited,
      heldCount: treasuryAudit.heldItems.length,
      heldReasons: treasuryAudit.heldItems.map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        status: item.status,
        reason: item.reason,
        heldReason: item.heldReason,
      })),
      forbiddenForceEnvPresent: treasuryAudit.forbiddenForceEnvPresent,
      claim: treasuryAudit.claim,
    },
    report,
  })
}
