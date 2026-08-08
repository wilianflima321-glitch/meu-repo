/**
 * P2b MEDIUM #40 — Darwinian recovery.
 *
 * HELD / NON-SHIP: prior revision console.log'd "Darwinian AI" evolution claims
 * with no adversarial training path. Undo feedback is not a neural update.
 * Not exported from the World Forge barrel.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('world-forge-darwinian-recovery')

export const DARWINIAN_RECOVERY_SHIP_READY = false as const

export type DarwinianRecoveryResult = {
  ready: false
  heldReason: 'adversarial_training_unavailable'
  rejectedHash: string
}

export class DarwinianRecoverySystem {
  public consumeFailedSeed(rejectedHash: string, userFeedback: string): DarwinianRecoveryResult {
    log.info('darwinian_recovery_held', {
      heldReason: 'adversarial_training_unavailable',
      rejectedHash,
      feedbackLen: userFeedback.length,
    })
    return {
      ready: false,
      heldReason: 'adversarial_training_unavailable',
      rejectedHash,
    }
  }
}
