/**
 * I.4 — Social moderation capability probe + honesty evaluation.
 * Report/Block/COPPA ready ≠ party/deep-link ready (split marketing flags).
 * Party flips only when rich presence + party invite substrate are writable.
 * Dedicated multiplayer session host / Agones stays [HELD].
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { probeSocialModerationWritable } from '@/lib/hub/social-moderation-authority'
import { probeRichPresenceWritable } from '@/lib/hub/rich-presence-authority'
import { probePartyInviteWritable } from '@/lib/hub/party-invite-authority'
import {
  COPPA_AGE_THRESHOLD_YEARS,
  evaluateCoppaAgeGate,
} from '@/lib/hub/coppa-age-gate'

const log = createComponentLogger('social-moderation-capability')

export type SocialCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED' | 'HELD'

export interface SocialSurfaceReport {
  surface: string
  status: SocialCapabilityStatus
  connectable: boolean
  notes: string[]
  heldReason?: string
}

export interface SocialModerationHonestyReport {
  generatedAt: string
  wave: 'I.4'
  moderation: SocialSurfaceReport
  party: SocialSurfaceReport
  /** Durable Report + Block root writable + COPPA helpers live */
  socialModerationReady: boolean
  /** Rich presence + party invite + deep-link token substrate (not Agones) */
  socialPartyReady: boolean
  marketingSocialModerationAllowed: boolean
  marketingSocialPartyAllowed: boolean
  /** Always true until Agones / dedicated host ships */
  dedicatedSessionHeld: true
  claim: string
  productCopy: string
  coppaAgeThresholdYears: number
}

export interface SocialModerationHonestyInput {
  /** Disk social root writable (Report + Block) */
  moderationStoreWritable?: boolean
  /** COPPA helper module present (always true once shipped) */
  coppaGateReady?: boolean
  /** Rich presence root writable */
  presenceStoreWritable?: boolean
  /** Party invite + deep-link token root writable */
  partyInviteStoreWritable?: boolean
  /**
   * Override — when unset, derived from presence + party invite writable.
   * Tests may force true/false.
   */
  socialPartyReady?: boolean
}

export function evaluateSocialModerationHonesty(
  input: SocialModerationHonestyInput = {},
): SocialModerationHonestyReport {
  const storeWritable = input.moderationStoreWritable === true
  const coppaReady = input.coppaGateReady !== false
  const presenceWritable = input.presenceStoreWritable === true
  const partyInviteWritable = input.partyInviteStoreWritable === true
  const socialModerationReady = storeWritable && coppaReady
  const partyReady =
    typeof input.socialPartyReady === 'boolean'
      ? input.socialPartyReady
      : presenceWritable && partyInviteWritable
  const dedicatedSessionHeld = true as const

  const moderation: SocialSurfaceReport = socialModerationReady
    ? {
        surface: 'I.4 Report / Block / COPPA',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Durable Report + Block under `.aethel/hub/social`',
          `COPPA age gate (threshold ${COPPA_AGE_THRESHOLD_YEARS}) fail-closed without verified age/consent`,
          'Empty-honest when no blocks/reports — no fake moderation queue',
        ],
      }
    : {
        surface: 'I.4 Report / Block / COPPA',
        status: 'HELD',
        connectable: false,
        notes: [
          'Social moderation store not writable or COPPA helpers missing',
          'Party / deep-link stay fail-closed',
        ],
        heldReason: 'social_moderation_held',
      }

  const party: SocialSurfaceReport = partyReady
    ? {
        surface: 'I.4 Party / deep-link join',
        status: 'IMPLEMENTED',
        connectable: true,
        notes: [
          'Rich presence heartbeat durable under `.aethel/hub/presence`',
          'Party invite + deep-link token helpers under `.aethel/hub/party`',
          'No fake online friends wall — empty until real presence/invites',
          'Dedicated multiplayer session host / Agones [HELD]',
        ],
      }
    : {
        surface: 'I.4 Party / deep-link join',
        status: 'HELD',
        connectable: false,
        notes: [
          'Party / deep-link join fail-closed until moderation gates + presence + invite substrate',
          'No fake online friends list',
          'Dedicated multiplayer session host / Agones [HELD]',
        ],
        heldReason: 'social_party_held',
      }

  const report: SocialModerationHonestyReport = {
    generatedAt: new Date().toISOString(),
    wave: 'I.4',
    moderation,
    party,
    socialModerationReady,
    socialPartyReady: partyReady,
    marketingSocialModerationAllowed: socialModerationReady,
    marketingSocialPartyAllowed: socialModerationReady && partyReady,
    dedicatedSessionHeld,
    claim: socialModerationReady
      ? partyReady
        ? 'I.4 Social moderation + presence/party invite/deep-link live — Agones session host [HELD]'
        : 'I.4 Report / Block / COPPA live — party / deep-link [HELD]'
      : 'I.4 Social moderation [HELD] — party / deep-link fail-closed',
    productCopy: socialModerationReady
      ? partyReady
        ? 'Report, Block, COPPA, rich presence, party invites, and deep-link tokens are live. No fake online friends. Dedicated multiplayer session host / Agones remains [HELD].'
        : 'Report and Block are durable. COPPA age gate holds party for under-13 without consent. Friends list, rich presence, and deep-link join remain [HELD].'
      : 'Report, Block, COPPA, party, and deep-link stay [HELD] until social moderation substrate is writable.',
    coppaAgeThresholdYears: COPPA_AGE_THRESHOLD_YEARS,
  }

  log.info('social_moderation_honesty_evaluated', {
    socialModerationReady: report.socialModerationReady,
    socialPartyReady: report.socialPartyReady,
    dedicatedSessionHeld: report.dedicatedSessionHeld,
  })

  return report
}

/**
 * Server probe — production honesty for Hub social surfaces.
 * Party flips only when presence + party invite roots are writable.
 */
export async function probeSocialModerationHonesty(): Promise<SocialModerationHonestyReport> {
  const [moderationProbe, presenceProbe, partyProbe] = await Promise.all([
    probeSocialModerationWritable(),
    probeRichPresenceWritable(),
    probePartyInviteWritable(),
  ])
  // Sanity: COPPA helper is callable (module shipped).
  const smoke = evaluateCoppaAgeGate({ ageYears: 20 })
  const coppaGateReady = smoke.code === 'AGE_OK'
  return evaluateSocialModerationHonesty({
    moderationStoreWritable: moderationProbe.writable,
    coppaGateReady,
    presenceStoreWritable: presenceProbe.writable,
    partyInviteStoreWritable: partyProbe.writable,
  })
}
