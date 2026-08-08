/**
 * Timeline3D event cues → in-process GasWorld GameplayCueDispatcher.
 *
 * Real bind: edge-triggered editor/runtime cues dispatch typed GameplayCueEvents.
 * Fail-closed honesty:
 * - Bridge must be explicitly enabled (no silent global side effects)
 * - Empty / non-GAS cue names are skipped (no invent)
 * - Desktop 60Hz GAS binary IPC remains HELD (`gas-ipc-honesty.ts`) — this path
 *   is web ECS-local only; never claim IPC or network replication
 * - Demo timelines must never arm the bridge (callers gate before enable)
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { GameplayCueEvent } from '@/lib/gas/cue'
import { GAS_IPC_SHIP_STATUS } from '@/lib/gas/gas-ipc-honesty'
import {
  getDefaultGasWorld,
  getOrCreateEntityForTargetId,
} from '@/lib/gas/visual-script-bridge'
import {
  subscribeTimelineEventCues,
  type TimelineEventCue,
} from '@/lib/sequencer/timeline-event-cue-bus'

const log = createComponentLogger('timeline-gas-cue-bridge')

export const TIMELINE_GAS_CUE_BRIDGE_WIRED = true as const

/** Honest ship status — in-process bind PARTIAL; desktop IPC HELD. */
export const TIMELINE_GAS_CUE_BRIDGE_SHIP_STATUS = 'PARTIAL' as const

export type TimelineGasCueBridgeOptions = {
  /**
   * When false, subscription stays live but dispatches are dropped.
   * Use for editor-stopped vs play scrub.
   */
  armed?: boolean
  /**
   * Prefix applied when cueName does not already look like a GAS tag (`Cue.`…).
   * Default `Cue.Timeline.` keeps authored labels namespaced.
   */
  defaultTagPrefix?: string
  /** Optional override world factory (tests). */
  getWorld?: typeof getDefaultGasWorld
  getEntity?: typeof getOrCreateEntityForTargetId
}

export type TimelineGasCueDispatchReceipt = {
  cueTag: string
  nodeId: string
  timeMs: number
  effectId: string
  ipcStatus: typeof GAS_IPC_SHIP_STATUS
}

let unsub: (() => void) | null = null
let armed = false
let defaultTagPrefix = 'Cue.Timeline.'
let getWorldImpl: typeof getDefaultGasWorld = getDefaultGasWorld
let getEntityImpl: typeof getOrCreateEntityForTargetId = getOrCreateEntityForTargetId
const recentDispatches: TimelineGasCueDispatchReceipt[] = []
const MAX_RECENT = 32

export function isTimelineGasCueBridgeEnabled(): boolean {
  return unsub !== null
}

export function isTimelineGasCueBridgeArmed(): boolean {
  return armed
}

export function setTimelineGasCueBridgeArmed(next: boolean): void {
  armed = next
}

export function listRecentTimelineGasCueDispatches(): readonly TimelineGasCueDispatchReceipt[] {
  return recentDispatches
}

/** Normalize authored cue → GAS cueTag. Empty → null (fail-closed). */
export function resolveTimelineGameplayCueTag(
  cueName: string,
  prefix: string = defaultTagPrefix,
): string | null {
  const raw = typeof cueName === 'string' ? cueName.trim() : ''
  if (!raw) return null
  // Skip auto-generated placeholder labels that are not authored GAS tags.
  if (/^Event @\s*\d/i.test(raw)) return null
  if (raw.startsWith('Cue.')) return raw
  const p = prefix.endsWith('.') ? prefix : `${prefix}.`
  return `${p}${raw.replace(/\s+/g, '_')}`
}

function handleCue(cue: TimelineEventCue): void {
  if (!armed) return
  const cueTag = resolveTimelineGameplayCueTag(cue.cueName, defaultTagPrefix)
  if (!cueTag) return

  const nodeId = (cue.nodeId?.trim() || cue.trackId || 'timeline').trim()
  if (!nodeId) return

  const target = getEntityImpl(nodeId)
  const effectId = cue.clipId?.trim() || `timeline:${cue.trackId}:${cue.timeMs}`
  const event: GameplayCueEvent = {
    cueTag,
    eventType: 'applied',
    target,
    effectId,
    timestampMs: Number.isFinite(cue.timeMs) ? cue.timeMs : Date.now(),
  }

  getWorldImpl().cues.dispatch(event)

  const receipt: TimelineGasCueDispatchReceipt = {
    cueTag,
    nodeId,
    timeMs: event.timestampMs,
    effectId,
    ipcStatus: GAS_IPC_SHIP_STATUS,
  }
  recentDispatches.push(receipt)
  if (recentDispatches.length > MAX_RECENT) recentDispatches.shift()

  log.debug('timeline_gas_cue_dispatched', {
    cueTag,
    nodeId,
    timeMs: event.timestampMs,
    ipcStatus: GAS_IPC_SHIP_STATUS,
  })
}

/**
 * Subscribe timeline event bus → GasWorld cues.
 * Idempotent: re-enable refreshes options without double-subscribe.
 */
export function enableTimelineGasCueBridge(options?: TimelineGasCueBridgeOptions): () => void {
  armed = options?.armed !== false
  if (typeof options?.defaultTagPrefix === 'string' && options.defaultTagPrefix.trim()) {
    defaultTagPrefix = options.defaultTagPrefix.trim()
  }
  if (options?.getWorld) getWorldImpl = options.getWorld
  if (options?.getEntity) getEntityImpl = options.getEntity

  if (!unsub) {
    unsub = subscribeTimelineEventCues(handleCue)
  }

  return () => {
    disableTimelineGasCueBridge()
  }
}

export function disableTimelineGasCueBridge(): void {
  if (unsub) {
    unsub()
    unsub = null
  }
  armed = false
}

/** Test isolation — clears subscription, arm state, and recent buffer. */
export function __resetTimelineGasCueBridgeForTests(): void {
  disableTimelineGasCueBridge()
  recentDispatches.length = 0
  defaultTagPrefix = 'Cue.Timeline.'
  getWorldImpl = getDefaultGasWorld
  getEntityImpl = getOrCreateEntityForTargetId
}

export function describeTimelineGasCueBridgeHonesty(): {
  wired: true
  shipStatus: typeof TIMELINE_GAS_CUE_BRIDGE_SHIP_STATUS
  ipcStatus: typeof GAS_IPC_SHIP_STATUS
  enabled: boolean
  armed: boolean
  claim: string
} {
  return {
    wired: true,
    shipStatus: TIMELINE_GAS_CUE_BRIDGE_SHIP_STATUS,
    ipcStatus: GAS_IPC_SHIP_STATUS,
    enabled: isTimelineGasCueBridgeEnabled(),
    armed,
    claim:
      'Timeline event cues dispatch in-process GasWorld GameplayCueEvents when bridge armed. Desktop 60Hz GAS IPC remains HELD.',
  }
}
