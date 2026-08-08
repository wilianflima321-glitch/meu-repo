/**
 * Timeline3D authored lanes → scene-node sample at playhead (pure).
 * Maps position / rotation / scale / visibility / material intensity→color.
 *
 * Event remains HELD (fail-closed):
 * - Event: no IDE event-cue bus / gameplay dispatch on `ISceneService` — crossing
 *   markers are reported in `held` only (no fake gameplay fire).
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

export type TimelineSceneNodeBaseline = {
  position: TimelineSceneVec3
  rotation: TimelineSceneVec3
  scale: TimelineSceneVec3
  /** Baseline CSS color for material intensity scaling (live R3F channel). */
  color?: string
}

export type TimelineSceneNodePatch = {
  nodeId: string
  lane: AuthorableTimelineLane
  position?: TimelineSceneVec3
  rotation?: TimelineSceneVec3
  scale?: TimelineSceneVec3
  visible?: boolean
  /** Scaled CSS color from material.intensity × baseline (when lane === material). */
  color?: string
  intensity?: number
}

export type TimelineSceneHeldLane = {
  lane: 'event'
  reason: 'event_held'
  trackId: string
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

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function parseColorChannels(input: string): { r: number; g: number; b: number } | null {
  const t = input.trim()
  const hex6 = t.match(/^#([0-9a-fA-F]{6})$/)
  if (hex6) {
    const n = parseInt(hex6[1]!, 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  const hex3 = t.match(/^#([0-9a-fA-F]{3})$/)
  if (hex3) {
    const h = hex3[1]!
    return {
      r: parseInt(h[0]! + h[0]!, 16),
      g: parseInt(h[1]! + h[1]!, 16),
      b: parseInt(h[2]! + h[2]!, 16),
    }
  }
  const rgb = t.match(/^rgba?\(\s*([\d.]+)\s*[,/\s]\s*([\d.]+)\s*[,/\s]\s*([\d.]+)/i)
  if (rgb) {
    const channel = (raw: string) => Math.round(Math.min(255, Math.max(0, Number(raw))))
    return {
      r: channel(rgb[1]!),
      g: channel(rgb[2]!),
      b: channel(rgb[3]!),
    }
  }
  return null
}

/**
 * Scale a baseline CSS color by authored material.intensity (0–1).
 * Intensity 1 = baseline; 0 = black. Used so scrub paints real R3F pixels.
 */
export function scaleCssColorByIntensity(baselineColor: string, intensity: number): string {
  const t = clamp01(intensity)
  const channels = parseColorChannels(baselineColor) ?? { r: 255, g: 255, b: 255 }
  const r = Math.round(channels.r * t)
  const g = Math.round(channels.g * t)
  const b = Math.round(channels.b * t)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Pure sample of authored Timeline3D lanes at timeMs.
 * Fail-closed: tracks without a documented target node id are skipped (not invented).
 */
export function sampleTimelineSceneAtTime(
  timeline: SequencerTimeline,
  timeMs: number,
  prevTimeMs = -1,
  baselines?: Record<string, TimelineSceneNodeBaseline>,
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
      color: '#ffffff',
    }

    if (lane === 'material') {
      const intensity =
        sampleProperty(track, 'material.intensity', t) ??
        sampleAnyMatching(track, (p) => p.includes('intensity') || p.includes('material'), t)
      if (intensity == null) {
        skipped.push({
          trackId: track.id,
          lane,
          reason: 'no_curves',
          message: `Material track "${track.id}" has no sampleable keyframes at t=${t}.`,
        })
        continue
      }
      const baselineColor = base.color && base.color.trim().length > 0 ? base.color : '#ffffff'
      patches.push({
        nodeId,
        lane,
        intensity,
        color: scaleCssColorByIntensity(baselineColor, intensity),
      })
      continue
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
