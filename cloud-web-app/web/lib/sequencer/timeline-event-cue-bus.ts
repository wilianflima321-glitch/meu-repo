/**
 * Timeline3D event-cue bus (editor/runtime hooks only).
 *
 * Edge-triggered cues fire when the playhead crosses an authored event marker.
 * Optional GAS bind: `timeline-gas-cue-bridge.ts` (in-process GasWorld only;
 * desktop 60Hz IPC remains HELD).
 *
 * Fail-closed:
 * - demoMode must never call emit (production bus stays silent)
 * - missing authored cue name / empty crossings → no invent
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('timeline-event-cue-bus')

export const TIMELINE_EVENT_CUE_BUS_WIRED = true as const

/**
 * Typed cue delivered to subscribers on playhead crossing.
 * `value` is only present when authored — never fabricated.
 */
export type TimelineEventCue = {
  trackId: string
  /** Clip / keyframe id when authored. */
  clipId?: string
  /** Optional scene bind from targetNodeId / scene:<id>. */
  nodeId?: string
  /** Authored cue name (metadata.eventName or clip label). */
  cueName: string
  /** Optional authored payload value — omit when not authored. */
  value?: string | number | boolean
  timeMs: number
  timeSec: number
}

export type TimelineEventCueListener = (cue: TimelineEventCue) => void

const listeners = new Set<TimelineEventCueListener>()
const recent: TimelineEventCue[] = []
const MAX_RECENT = 32

export function subscribeTimelineEventCues(listener: TimelineEventCueListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Clear all subscribers (tests / teardown). */
export function clearTimelineEventCueSubscribers(): void {
  listeners.clear()
}

export function listRecentTimelineEventCues(): readonly TimelineEventCue[] {
  return recent
}

/** Test-only reset of subscribers + recent buffer. */
export function __resetTimelineEventCueBusForTests(): void {
  listeners.clear()
  recent.length = 0
}

/**
 * Emit authored cues to the production bus.
 * Callers must gate demoMode before invoking — this API never invents cues.
 */
export function emitTimelineEventCues(cues: readonly TimelineEventCue[]): number {
  if (!Array.isArray(cues) || cues.length === 0) return 0
  let emitted = 0
  for (const cue of cues) {
    const cueName = typeof cue.cueName === 'string' ? cue.cueName.trim() : ''
    if (!cueName || !Number.isFinite(cue.timeMs) || !cue.trackId) {
      // Fail-closed: incomplete authored data is not invented.
      continue
    }
    const normalized: TimelineEventCue = {
      trackId: cue.trackId,
      cueName,
      timeMs: cue.timeMs,
      timeSec: Number.isFinite(cue.timeSec) ? cue.timeSec : cue.timeMs / 1000,
      ...(cue.clipId ? { clipId: cue.clipId } : {}),
      ...(cue.nodeId ? { nodeId: cue.nodeId } : {}),
      ...(cue.value !== undefined ? { value: cue.value } : {}),
    }
    recent.push(normalized)
    if (recent.length > MAX_RECENT) recent.shift()
    for (const listener of listeners) {
      try {
        listener(normalized)
      } catch (err) {
        log.warn('timeline_event_cue_listener_failed', {
          trackId: normalized.trackId,
          cueName: normalized.cueName,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
    emitted += 1
  }
  return emitted
}
