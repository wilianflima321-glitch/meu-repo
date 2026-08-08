/**
 * Timeline3D scrub/play → live ISceneService apply (Zero-MVP).
 * Demo/fixture bindings must not mutate the real viewport scene graph
 * and must never emit to the production event-cue bus.
 *
 * Event cues are editor/runtime hooks only — GAS/gameplay bind is separate.
 */

import type { ISceneService, IDESceneNode } from '../../../packages/ide-ui/backend/types'
import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import {
  sampleTimelineSceneAtTime,
  type TimelineSceneApplySnapshot,
  type TimelineSceneNodeBaseline,
  type TimelineSceneVec3,
  TIMELINE_SCENE_APPLY_WIRED,
} from '@/lib/sequencer/timeline-scene-apply'
import {
  emitTimelineEventCues,
  TIMELINE_EVENT_CUE_BUS_WIRED,
} from '@/lib/sequencer/timeline-event-cue-bus'

export const TIMELINE_SCENE_VIEWPORT_WIRE_WIRED = true as const

export type TimelineSceneViewportApplyResult = {
  wired: typeof TIMELINE_SCENE_VIEWPORT_WIRE_WIRED
  applied: boolean
  /** Demo/fixture path — real scene left untouched; bus silent. */
  demoBlocked: boolean
  nodesUpdated: number
  transformsApplied: number
  visibilityApplied: number
  colorsApplied: number
  /** Material patches rejected (missing node / no live color channel / locked). */
  colorRejected: number
  /** Event cues emitted to the production bus this scrub step. */
  eventsEmitted: number
  /**
   * @deprecated Prefer eventsEmitted. Was “held” count when no cue bus existed;
   * now 0 when bus is wired (demo still reports sampled crossings without emit).
   */
  heldEvent: number
  /** @deprecated Prefer colorRejected; kept 0 when material applies (compat). */
  heldMaterial: number
  skippedMissingNode: number
  skippedOther: number
  snapshot: TimelineSceneApplySnapshot
  /** Node ids referenced in patches but absent from the live scene. */
  missingSceneNodes: string[]
  /** Nodes that do not paint color in the live R3F path. */
  noColorSupportNodes: string[]
}

function baselinesFromScene(scene: ISceneService): Record<string, TimelineSceneNodeBaseline> {
  const out: Record<string, TimelineSceneNodeBaseline> = {}
  for (const node of scene.getNodes()) {
    out[node.id] = {
      position: [...node.position] as TimelineSceneVec3,
      rotation: [...node.rotation] as TimelineSceneVec3,
      scale: [...node.scale] as TimelineSceneVec3,
      color: node.color,
    }
  }
  return out
}

function nodeExists(scene: ISceneService, nodeId: string): IDESceneNode | undefined {
  return scene.getNodes().find((n) => n.id === nodeId)
}

/**
 * Sample authored timeline at timeSec and push transforms/visibility/color into the live scene.
 * Fail-closed: demo binds, missing node ids, and absent/unsupported color channels do not invent targets.
 * Event crossings emit once per edge via `emitTimelineEventCues` (never in demoMode).
 */
export function applyTimelineScrubToScene(input: {
  timeline: SequencerTimeline
  timeSec: number
  scene: ISceneService
  isDemo: boolean
  prevTimeSec?: number
}): TimelineSceneViewportApplyResult {
  const timeMs = Math.max(0, Math.round(input.timeSec * 1000))
  const prevTimeMs =
    input.prevTimeSec == null ? -1 : Math.max(0, Math.round(input.prevTimeSec * 1000))

  if (input.isDemo) {
    const snapshot = sampleTimelineSceneAtTime(input.timeline, timeMs, prevTimeMs)
    // Fail-closed: demo never emits to the production cue bus.
    return {
      wired: TIMELINE_SCENE_VIEWPORT_WIRE_WIRED,
      applied: false,
      demoBlocked: true,
      nodesUpdated: 0,
      transformsApplied: 0,
      visibilityApplied: 0,
      colorsApplied: 0,
      colorRejected: 0,
      heldMaterial: 0,
      eventsEmitted: 0,
      heldEvent: snapshot.eventCues.length,
      skippedMissingNode: snapshot.skipped.filter((s) => s.reason === 'missing_node_id').length,
      skippedOther: snapshot.skipped.filter((s) => s.reason !== 'missing_node_id').length,
      snapshot,
      missingSceneNodes: [],
      noColorSupportNodes: [],
    }
  }

  const baselines = baselinesFromScene(input.scene)
  const snapshot = sampleTimelineSceneAtTime(input.timeline, timeMs, prevTimeMs, baselines)

  let transformsApplied = 0
  let visibilityApplied = 0
  let colorsApplied = 0
  let colorRejected = 0
  const touched = new Set<string>()
  const missingSceneNodes: string[] = []
  const noColorSupportNodes: string[] = []

  for (const patch of snapshot.patches) {
    const live = nodeExists(input.scene, patch.nodeId)
    if (!live) {
      missingSceneNodes.push(patch.nodeId)
      if (patch.color != null) colorRejected += 1
      continue
    }
    if (live.locked) {
      if (patch.color != null) colorRejected += 1
      continue
    }

    if (patch.position || patch.rotation || patch.scale) {
      input.scene.updateTransform(patch.nodeId, {
        ...(patch.position ? { position: patch.position } : {}),
        ...(patch.rotation ? { rotation: patch.rotation } : {}),
        ...(patch.scale ? { scale: patch.scale } : {}),
      })
      transformsApplied += 1
      touched.add(patch.nodeId)
    }
    if (patch.visible != null) {
      input.scene.setVisible(patch.nodeId, patch.visible)
      visibilityApplied += 1
      touched.add(patch.nodeId)
    }
    if (patch.color != null) {
      const result = input.scene.setColor(patch.nodeId, patch.color)
      if (result.ok) {
        colorsApplied += 1
        touched.add(patch.nodeId)
      } else {
        colorRejected += 1
        if (result.reason === 'missing_node') {
          missingSceneNodes.push(patch.nodeId)
        } else if (result.reason === 'no_color_support') {
          noColorSupportNodes.push(patch.nodeId)
        }
      }
    }
  }

  const eventsEmitted =
    TIMELINE_EVENT_CUE_BUS_WIRED && snapshot.eventCues.length > 0
      ? emitTimelineEventCues(snapshot.eventCues)
      : 0

  return {
    wired: TIMELINE_SCENE_APPLY_WIRED && TIMELINE_SCENE_VIEWPORT_WIRE_WIRED,
    applied: touched.size > 0 || eventsEmitted > 0,
    demoBlocked: false,
    nodesUpdated: touched.size,
    transformsApplied,
    visibilityApplied,
    colorsApplied,
    colorRejected,
    heldMaterial: 0,
    eventsEmitted,
    heldEvent: 0,
    skippedMissingNode: snapshot.skipped.filter((s) => s.reason === 'missing_node_id').length,
    skippedOther: snapshot.skipped.filter((s) => s.reason !== 'missing_node_id').length,
    snapshot,
    missingSceneNodes: [...new Set(missingSceneNodes)],
    noColorSupportNodes: [...new Set(noColorSupportNodes)],
  }
}
