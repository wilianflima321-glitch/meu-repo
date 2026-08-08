/**
 * P2b MEDIUM #46 — Spine AI router.
 *
 * HELD / NON-SHIP: prior revision claimed "0ms local LLM" / "GPT-5 cloud" routing
 * from prompt length alone. Real Apex routing lives in intelligent-model-router.
 * Not exported from the World Forge barrel.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('world-forge-spine-ai-router')

export const SPINE_AI_ROUTER_SHIP_READY = false as const

export type SpineRouteHint = 'LOCAL_HEURISTIC' | 'CLOUD_HEURISTIC'

export type SpineRouteResult = {
  ready: false
  heldReason: 'apex_router_not_wired_here'
  /** Keyword-length hint only — never a provider dispatch certificate. */
  heuristicHint: SpineRouteHint
}

export class SpineAiRouter {
  public routePrompt(intent: string): SpineRouteResult {
    const heuristicHint: SpineRouteHint =
      intent.length < 50 && !intent.includes('cidade inteira')
        ? 'LOCAL_HEURISTIC'
        : 'CLOUD_HEURISTIC'

    log.debug('spine_router_held', {
      heldReason: 'apex_router_not_wired_here',
      heuristicHint,
      intentLen: intent.length,
    })

    return {
      ready: false,
      heldReason: 'apex_router_not_wired_here',
      heuristicHint,
    }
  }
}
