/**
 * Timeline3D authored lanes → scene-node sample at playhead (pure).
 * Maps position / rotation / scale / visibility curves to IDESceneNode patches.
 * Material + event lanes are sampled as HELD (no scene graph mutation contract yet).
 */

import type { SequencerTimeline, SequencerTrack } from '@/lib/sequencer/core/types'
import { clampTime } from '@/lib/sequencer/core/types'
import { evaluateSequencerCurve } from '@/lib/sequencer/core/curves'
import {
  resolveTrackLane,
  type AuthorableTimelineLane,
} from '@/lib/sequencer/timeline-authoring'

export const TIMELINE_SCENE_APPLY_WIRED = true as const

export type TimelineSceneVec3 = [number, number, number]

export type TimelineSceneNodePatch = {
  nodeId: string
  lane: AuthorableTimelineLane
  position?: TimelineSceneVec3
  rotation?: TimelineSceneVec3
  scale?: TimelineSceneVec3
  visible?: boolean
}

export type TimelineSceneHeldLane = {
  lane: 'material' | 'event'
  reason: 'material_held' | 'event_held'
  trackId: string
  /** Sampled numeric intensity for material; event fires are listed separately. */
  sample?: number
  eventName?: string
  timeMs?: number
}

export type TimelineSceneSkip = {
  trackId: string
  lane: string | null
  reason: 'missing_node_id' | 'muted' | 'no_curves' | 'unknown_lane'
  message: string
}

export type TimelineSceneApplySnapshot = {
  timeMs: number
  patches: TimelineSceneNodePatch[]
  held: TimelineSceneHeldLane[]
  skipped: TimelineSceneSkip[]
}

/** Documented binding: clip.metadata.targetNodeId or sourceRef `scene:<nodeId>`. */
export function resolveTrackTargetNodeId(track: SequencerTrack): string | null {
  for (const clip of track.clips) {
    const meta = clip.metadata?.targetNodeId
    if (typeof meta === 'string' && meta.trim().length > 0) {
      return meta.trim()
    }
    const ref = clip.sourceRef?.trim() ?? ''
    if (ref.startsWith('scene:')) {
      const id = ref.slice('scene:'.length).trim()
      if (id.length > 0) return id
    }
  }
  return null
}

function sampleProperty(track: SequencerTrack, property: string, timeMs: number): number | null {
  for (const clip of track.clips) {
    if (timeMs < clip.startMs || timeMs > clip.endMs) continue
    const curve = clip.curves?.find((c) => c.property === property)
    if (!curve || curve.keyframes.length === 0) continue
    return evaluateSequencerCurve(curve, timeMs)
  }
  return null
}

function sampleAnyMatching(
  track: SequencerTrack,
  predicate: (property: string) => boolean,
  timeMs: number,
): number | null {
  for (const clip of track.clips) {
    if (timeMs < clip.startMs || timeMs > clip.endMs) continue
    for (const curve of clip.curves ?? []) {
      if (!predicate(curve.property) || curve.keyframes.length === 0) continue
      return evaluateSequencerCurve(curve, timeMs)
    }
  }
  return null
}

function sampleVec3Channel(
  track: SequencerTrack,
  prefix: string,
  timeMs: number,
  fallback: TimelineSceneVec3,
): { vec: TimelineSceneVec3; hit: boolean } {
  const x = sampleProperty(track, `${prefix}.x`, timeMs)
  const y = sampleProperty(track, `${prefix}.y`, timeMs)
  const z = sampleProperty(track, `${prefix}.z`, timeMs)
  const hit = x != null || y != null || z != null
  return {
    hit,
    vec: [x ?? fallback[0], y ?? fallback[1], z ?? fallback[2]],
  }
}

function eventsCrossing(track: SequencerTrack, prevMs: number, timeMs: number): TimelineSceneHeldLane[] {
  const held: TimelineSceneHeldLane[] = []
  for (const clip of track.clips) {
    if (clip.metadata?.bindOnly === true) continue
    const t = clip.startMs
    if (t > prevMs && t <= timeMs) {
      held.push({
        lane: 'event',
        reason: 'event_held',
        trackId: track.id,
        eventName: String(clip.metadata?.eventName ?? clip.label),
        timeMs: t,
      })
    }
  }
  return held
}

/**
 * Pure sample of authored Timeline3D lanes at timeMs.
 * Fail-closed: tracks without a documented target node id are skipped (not invented).
 */
export function sampleTimelineSceneAtTime(
  timeline: SequencerTimeline,
  timeMs: number,
  prevTimeMs = -1,
  baselines?: Record<string, { position: TimelineSceneVec3; rotation: TimelineSceneVec3; scale: TimelineSceneVec3 }>,
): TimelineSceneApplySnapshot {
  const t = clampTime(timeMs, timeline.durationMs)
  const patches: TimelineSceneNodePatch[] = []
  const held: TimelineSceneHeldLane[] = []
  const skipped: TimelineSceneSkip[] = []

  for (const track of timeline.tracks) {
    if (track.muted) {
      skipped.push({
        trackId: track.id,
        lane: resolveTrackLane(track),
        reason: 'muted',
        message: `Track "${track.id}" is muted.`,
      })
      continue
    }

    const lane = resolveTrackLane(track)
    if (!lane) {
      skipped.push({
        trackId: track.id,
        lane: null,
        reason: 'unknown_lane',
        message: `Track "${track.id}" has no Timeline3D lane mapping.`,
      })
      continue
    }

    if (lane === 'event') {
      held.push(...eventsCrossing(track, prevTimeMs, t))
      continue
    }

    if (lane === 'material') {
      const intensity =
        sampleProperty(track, 'material.intensity', t) ??
        sampleAnyMatching(track, (p) => p.includes('intensity') || p.includes('material'), t)
      held.push({
        lane: 'material',
        reason: 'material_held',
        trackId: track.id,
        sample: intensity ?? undefined,
      })
      continue
    }

    const nodeId = resolveTrackTargetNodeId(track)
    if (!nodeId) {
      skipped.push({
        trackId: track.id,
        lane,
        reason: 'missing_node_id',
        message: `Track "${track.id}" has no targetNodeId / scene:<id> sourceRef — fail-closed.`,
      })
      continue
    }

    const base = baselines?.[nodeId] ?? {
      position: [0, 0, 0] as TimelineSceneVec3,
      rotation: [0, 0, 0] as TimelineSceneVec3,
      scale: [1, 1, 1] as TimelineSceneVec3,
    }

    if (lane === 'position') {
      const { vec, hit } = sampleVec3Channel(track, 'transform.position', t, base.position)
      // Also accept camera.position.* authored via cutscene demos mapped to position lane.
      const cam = sampleVec3Channel(track, 'camera.position', t, vec)
      if (!hit && !cam.hit) {
        skipped.push({
          trackId: track.id,
          lane,
          reason: 'no_curves',
          message: `Position track "${track.id}" has no sampleable keyframes at t=${t}.`,
        })
        continue
      }
      patches.push({ nodeId, lane, position: cam.hit ? cam.vec : vec })
      continue
    }

    if (lane === 'rotation') {
      const { vec, hit } = sampleVec3Channel(track, 'transform.rotation', t, base.rotation)
      if (!hit) {
        skipped.push({
          trackId: track.id,
          lane,
          reason: 'no_curves',
          message: `Rotation track "${track.id}" has no sampleable keyframes at t=${t}.`,
        })
        continue
      }
      patches.push({ nodeId, lane, rotation: vec })
      continue
    }

    if (lane === 'scale') {
      const { vec, hit } = sampleVec3Channel(track, 'transform.scale', t, base.scale)
      if (!hit) {
        skipped.push({
          trackId: track.id,
          lane,
          reason: 'no_curves',
          message: `Scale track "${track.id}" has no sampleable keyframes at t=${t}.`,
        })
        continue
      }
      patches.push({ nodeId, lane, scale: vec })
      continue
    }

    if (lane === 'visibility') {
      const opacity =
        sampleProperty(track, 'visibility.opacity', t) ??
        sampleAnyMatching(track, (p) => p.includes('visibility') || p.includes('opacity'), t)
      if (opacity == null) {
        skipped.push({
          trackId: track.id,
          lane,
          reason: 'no_curves',
          message: `Visibility track "${track.id}" has no sampleable keyframes at t=${t}.`,
        })
        continue
      }
      patches.push({ nodeId, lane, visible: opacity >= 0.5 })
    }
  }

  return { timeMs: t, patches, held, skipped }
}
