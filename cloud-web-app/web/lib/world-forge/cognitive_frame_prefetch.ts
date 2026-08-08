/**
 * P2b MEDIUM #39 — Cognitive frame prefetch.
 *
 * HELD / NON-SHIP: prior revision logged "Neuro-Prefetch" theater and faked
 * cursor confidence. No intent model or GPU pre-click buffer exists.
 * Not exported from the World Forge barrel.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('world-forge-cognitive-prefetch')

export const COGNITIVE_FRAME_PREFETCH_SHIP_READY = false as const

export type CognitivePrefetchResult = {
  ready: false
  heldReason: 'intent_model_unavailable'
  confidence: number
}

export class CognitiveFramePrefetch {
  private cursorInertia = { x: 0, y: 0, confidence: 0 }

  public preemptUserIntent(
    mouseX: number,
    mouseY: number,
    isHoveringTool: boolean,
  ): CognitivePrefetchResult {
    this.cursorInertia.x = mouseX
    this.cursorInertia.y = mouseY
    // Honest: hover is not a calibrated intent model — confidence stays 0.
    this.cursorInertia.confidence = 0
    void isHoveringTool
    log.debug('cognitive_prefetch_held', {
      heldReason: 'intent_model_unavailable',
      mouseX,
      mouseY,
    })
    return {
      ready: false,
      heldReason: 'intent_model_unavailable',
      confidence: this.cursorInertia.confidence,
    }
  }
}
