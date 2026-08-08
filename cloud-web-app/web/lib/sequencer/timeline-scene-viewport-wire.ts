/**
 * Timeline3D scrub/play → live ISceneService apply (Zero-MVP).
 * Demo/fixture bindings must not mutate the real viewport scene graph.
 */

import type { ISceneService, IDESceneNode } from '../../../packages/ide-ui/backend/types'
import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import {
  sampleTimelineSceneAtTime,
  type TimelineSceneApplySnapshot,
  type TimelineSceneVec3,
  TIMELINE_SCENE_APPLY_WIRED,
} from '@/lib/sequencer/timeline-scene-apply'

export const TIMELINE_SCENE_VIEWPORT_WIRE_WIRED = true as const

export type TimelineSceneViewportApplyResult = {
  wired: typeof TIMELINE_SCENE_VIEWPORT_WIRE_WIRED
  applied: boolean
  /** Demo/fixture path — real scene left untouched. */
  demoBlocked: boolean
  nodesUpdated: number
  transformsApplied: number
  visibilityApplied: number
  heldMaterial: number
  heldEvent: number
  skippedMissingNode: number
  skippedOther: number
  snapshot: TimelineSceneApplySnapshot
  /** Node ids referenced in patches but absent from the live scene. */
  missingSceneNodes: string[]
}

function baselinesFromScene(scene: ISceneService): Record<
  string,
  { position: TimelineSceneVec3; rotation: TimelineSceneVec3; scale: TimelineSceneVec3 }
> {
  const out: Record<
    string,
    { position: TimelineSceneVec3; rotation: TimelineSceneVec3; scale: TimelineSceneVec3 }
  > = {}
  for (const node of scene.getNodes()) {
    out[node.id] = {
      position: [...node.position] as TimelineSceneVec3,
      rotation: [...node.rotation] as TimelineSceneVec3,
      scale: [...node.scale] as TimelineSceneVec3,
    }
  }
  return out
}

function nodeExists(scene: ISceneService, nodeId: string): IDESceneNode | undefined {
  return scene.getNodes().find((n) => n.id === nodeId)
}

/**
 * Sample authored timeline at timeSec and push transforms/visibility into the live scene.
 * Fail-closed: demo binds, missing node ids, and absent scene nodes do not invent targets.
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
    return {
      wired: TIMELINE_SCENE_VIEWPORT_WIRE_WIRED,
      applied: false,
      demoBlocked: true,
      nodesUpdated: 0,
      transformsApplied: 0,
      visibilityApplied: 0,
      heldMaterial: snapshot.held.filter((h) => h.lane === 'material').length,
      heldEvent: snapshot.held.filter((h) => h.lane === 'event').length,
      skippedMissingNode: snapshot.skipped.filter((s) => s.reason === 'missing_node_id').length,
      skippedOther: snapshot.skipped.filter((s) => s.reason !== 'missing_node_id').length,
      snapshot,
      missingSceneNodes: [],
    }
  }

  const baselines = baselinesFromScene(input.scene)
  const snapshot = sampleTimelineSceneAtTime(input.timeline, timeMs, prevTimeMs, baselines)

  let transformsApplied = 0
  let visibilityApplied = 0
  const touched = new Set<string>()
  const missingSceneNodes: string[] = []

  for (const patch of snapshot.patches) {
    const live = nodeExists(input.scene, patch.nodeId)
    if (!live) {
      missingSceneNodes.push(patch.nodeId)
      continue
    }
    if (live.locked) continue

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
  }

  return {
    wired: TIMELINE_SCENE_APPLY_WIRED && TIMELINE_SCENE_VIEWPORT_WIRE_WIRED,
    applied: touched.size > 0,
    demoBlocked: false,
    nodesUpdated: touched.size,
    transformsApplied,
    visibilityApplied,
    heldMaterial: snapshot.held.filter((h) => h.lane === 'material').length,
    heldEvent: snapshot.held.filter((h) => h.lane === 'event').length,
    skippedMissingNode: snapshot.skipped.filter((s) => s.reason === 'missing_node_id').length,
    skippedOther: snapshot.skipped.filter((s) => s.reason !== 'missing_node_id').length,
    snapshot,
    missingSceneNodes: [...new Set(missingSceneNodes)],
  }
}
