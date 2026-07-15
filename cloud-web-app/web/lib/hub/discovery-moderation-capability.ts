/**
 * I.1 — Discovery AI moderation capability probe + honesty evaluation.
 * Flip marketingAiModeratedDiscoveryAllowed only when durable store writable
 * and deterministic pipeline smoke passes. Lane C Promoted stays [HELD].
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { probeDiscoveryModerationWritable } from '@/lib/hub/discovery-moderation-authority'
import { smokeDiscoveryModerationPipeline } from '@/lib/hub/discovery-moderation-engine'

const log = createComponentLogger('discovery-moderation-capability')

export type DiscoveryModCapabilityStatus =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'NOT_IMPLEMENTED'
  | 'HELD'

export interface DiscoveryModerationHonestyReport {
  generatedAt: string
  wave: 'I.1'
  status: DiscoveryModCapabilityStatus
  connectable: boolean
  /** Durable `.aethel/hub/discovery-moderation` writable */
  moderationStoreWritable: boolean
  /** Deterministic deny-list + approve path callable */
  pipelineSmokePassed: boolean
  /** True only when store writable AND smoke passes */
  aiModerationReady: boolean
  marketingAiModeratedDiscoveryAllowed: boolean
  claim: string
  productCopy: string
  notes: string[]
  heldReason?: string
}

export interface DiscoveryModerationHonestyInput {
  moderationStoreWritable?: boolean
  pipelineSmokePassed?: boolean
}

export function evaluateDiscoveryModerationHonesty(
  input: DiscoveryModerationHonestyInput = {},
): DiscoveryModerationHonestyReport {
  const storeWritable = input.moderationStoreWritable === true
  const smoke =
    typeof input.pipelineSmokePassed === 'boolean'
      ? input.pipelineSmokePassed
      : smokeDiscoveryModerationPipeline()
  const aiModerationReady = storeWritable && smoke

  const report: DiscoveryModerationHonestyReport = {
    generatedAt: new Date().toISOString(),
    wave: 'I.1',
    status: aiModerationReady ? 'IMPLEMENTED' : 'HELD',
    connectable: aiModerationReady,
    moderationStoreWritable: storeWritable,
    pipelineSmokePassed: smoke,
    aiModerationReady,
    marketingAiModeratedDiscoveryAllowed: aiModerationReady,
    claim: aiModerationReady
      ? 'I.1 Discovery AI moderation live — deterministic deny-list + optional BYOK critic; Lane C Promoted [HELD]'
      : 'I.1 Discovery AI moderation [HELD] — marketing claim fail-closed',
    productCopy: aiModerationReady
      ? 'Discovery excludes unapproved titles via durable moderation + deny-list. Optional LLM critic requires BYOK (no free platform invent). Coins Promoted stays [HELD].'
      : 'AI-moderated discovery marketing stays [HELD] until the durable moderation path is writable and the deterministic pipeline smokes green.',
    notes: aiModerationReady
      ? [
          'Durable discovery moderation under `.aethel/hub/discovery-moderation`',
          'Deterministic deny-list / safety policy before ranking',
          'Optional LLM critic behind CostGuard BYOK only',
          'Lane C Promoted / Hub Coins [HELD]',
        ]
      : [
          'Discovery moderation store not writable or pipeline smoke failed',
          'No AI-moderated discovery marketing',
          'Lane C Promoted / Hub Coins [HELD]',
        ],
    heldReason: aiModerationReady ? undefined : 'discovery_ai_moderation_held',
  }

  log.info('discovery_moderation_honesty_evaluated', {
    aiModerationReady: report.aiModerationReady,
    storeWritable,
    smoke,
  })

  return report
}

/**
 * Server probe — production honesty for Hub AI-moderated discovery claim.
 */
export async function probeDiscoveryModerationHonesty(): Promise<DiscoveryModerationHonestyReport> {
  const storeProbe = await probeDiscoveryModerationWritable()
  const smoke = smokeDiscoveryModerationPipeline()
  return evaluateDiscoveryModerationHonesty({
    moderationStoreWritable: storeProbe.writable,
    pipelineSmokePassed: smoke,
  })
}
