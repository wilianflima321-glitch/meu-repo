/**
 * In-product Timeline3D authoring mutations against SequencerTimeline (aethel.timeline.v1).
 * Empty projects stay empty until the user adds a lane/keyframe — no fabricated tracks.
 */

import type {
  SequencerClip,
  SequencerCurve,
  SequencerKeyframe,
  SequencerTimeline,
  SequencerTrack,
  SequencerTrackKind,
} from '@/lib/sequencer/core/types'
import { createSequencerClip } from '@/lib/sequencer/core/clip'
import { createSequencerTrack } from '@/lib/sequencer/core/track'
import { createSequencerTimeline, upsertSequencerTrack } from '@/lib/sequencer/core/timeline'
import { normalizeSequencerCurve } from '@/lib/sequencer/core/curves'
import { propertyToTimelineLane } from '@/lib/sequencer/timeline-ui-adapter'

/** Coarse Timeline3D lanes the authoring UI can create. */
export const AUTHORABLE_TIMELINE_LANES = [
  'position',
  'rotation',
  'scale',
  'visibility',
  'material',
  'event',
] as const

export type AuthorableTimelineLane = (typeof AUTHORABLE_TIMELINE_LANES)[number]

export type TimelineAuthorResult =
  | { ok: true; timeline: SequencerTimeline }
  | { ok: false; reason: 'demo_blocked' | 'unknown_lane' | 'lane_exists' | 'no_lane' | 'locked' | 'not_found'; message: string }

type LaneDef = {
  kind: SequencerTrackKind
  label: string
  /** Curve property for transform/fx lanes; null = marker/event clips. */
  property: string | null
  defaultValue: number
}

const LANE_DEFS: Record<AuthorableTimelineLane, LaneDef> = {
  position: {
    kind: 'animation',
    label: 'Position',
    property: 'transform.position.x',
    defaultValue: 0,
  },
  rotation: {
    kind: 'animation',
    label: 'Rotation',
    property: 'transform.rotation.y',
    defaultValue: 0,
  },
  scale: {
    kind: 'animation',
    label: 'Scale',
    property: 'transform.scale.x',
    defaultValue: 1,
  },
  visibility: {
    kind: 'animation',
    label: 'Visibility',
    property: 'visibility.opacity',
    defaultValue: 1,
  },
  material: {
    kind: 'fx',
    label: 'Material',
    property: 'material.intensity',
    defaultValue: 1,
  },
  event: {
    kind: 'marker',
    label: 'Event',
    property: null,
    defaultValue: 0,
  },
}

export function isAuthorableTimelineLane(lane: string): lane is AuthorableTimelineLane {
  return (AUTHORABLE_TIMELINE_LANES as readonly string[]).includes(lane)
}

export function authoringTrackIdForLane(lane: AuthorableTimelineLane): string {
  return `lane-${lane}`
}

export function laneFromAuthoringTrackId(trackId: string): AuthorableTimelineLane | null {
  if (!trackId.startsWith('lane-')) return null
  const lane = trackId.slice('lane-'.length)
  return isAuthorableTimelineLane(lane) ? lane : null
}

/** Resolve which Timeline3D lane a Sequencer track currently maps to. */
export function resolveTrackLane(track: SequencerTrack): string | null {
  const fromId = laneFromAuthoringTrackId(track.id)
  if (fromId) return fromId
  for (const clip of track.clips) {
    for (const curve of clip.curves ?? []) {
      return propertyToTimelineLane(curve.property)
    }
    if (track.kind === 'marker') return 'event'
  }
  return null
}

export function listPresentAuthoringLanes(timeline: SequencerTimeline): string[] {
  const lanes = new Set<string>()
  for (const track of timeline.tracks) {
    const lane = resolveTrackLane(track)
    if (lane) lanes.add(lane)
  }
  return [...lanes]
}

export function listAvailableAuthoringLanes(timeline: SequencerTimeline): AuthorableTimelineLane[] {
  const present = new Set(listPresentAuthoringLanes(timeline))
  return AUTHORABLE_TIMELINE_LANES.filter((lane) => !present.has(lane))
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function createAuthoringTimelineShell(projectId: string, durationSec = 10): SequencerTimeline {
  const id = projectId.trim() ? `timeline-${projectId}` : 'timeline-unbound'
  return createSequencerTimeline({
    id,
    label: 'Untitled Sequence',
    durationMs: Math.max(1000, Math.round(durationSec * 1000)),
    frameRate: 30,
    tracks: [],
    evidenceRefs: [],
  })
}

function findLaneTrack(
  timeline: SequencerTimeline,
  lane: AuthorableTimelineLane,
): SequencerTrack | undefined {
  const expectedId = authoringTrackIdForLane(lane)
  return (
    timeline.tracks.find((track) => track.id === expectedId) ??
    timeline.tracks.find((track) => resolveTrackLane(track) === lane)
  )
}

export type TimelineAuthorBindOptions = {
  /** Scene node id to bind (stored as metadata.targetNodeId + sourceRef `scene:<id>`). */
  targetNodeId?: string
}

function sceneSourceRef(trackId: string, targetNodeId?: string): string {
  const id = targetNodeId?.trim()
  return id ? `scene:${id}` : `authored://${trackId}`
}

function withTargetNodeMetadata(
  metadata: Record<string, string | number | boolean> | undefined,
  targetNodeId?: string,
): Record<string, string | number | boolean> | undefined {
  const id = targetNodeId?.trim()
  if (!id) return metadata
  return { ...(metadata ?? {}), targetNodeId: id, authored: true }
}

function stampTargetNodeOnTrack(track: SequencerTrack, targetNodeId?: string): SequencerTrack {
  const id = targetNodeId?.trim()
  if (!id || track.clips.length === 0) return track
  const clips = track.clips.map((clip) =>
    createSequencerClip({
      ...clip,
      sourceRef: sceneSourceRef(track.id, id),
      metadata: withTargetNodeMetadata(clip.metadata, id),
    }),
  )
  return { ...track, clips }
}

function ensureCurveClip(
  track: SequencerTrack,
  def: LaneDef,
  durationMs: number,
  targetNodeId?: string,
): SequencerTrack {
  if (def.property == null) return track
  const existing = track.clips[0]
  if (existing) {
    const curves = existing.curves ?? []
    const hasProp = curves.some((c) => c.property === def.property)
    const stamped = createSequencerClip({
      ...existing,
      endMs: Math.max(existing.endMs, durationMs),
      sourceRef: sceneSourceRef(track.id, targetNodeId ?? (typeof existing.metadata?.targetNodeId === 'string' ? existing.metadata.targetNodeId : undefined)),
      metadata: withTargetNodeMetadata(
        existing.metadata,
        targetNodeId ?? (typeof existing.metadata?.targetNodeId === 'string' ? existing.metadata.targetNodeId : undefined),
      ),
      curves: hasProp
        ? curves
        : [
            ...curves,
            {
              id: newId('curve'),
              property: def.property,
              keyframes: [],
            },
          ],
    })
    return { ...track, clips: [stamped, ...track.clips.slice(1)] }
  }
  const clip = createSequencerClip({
    id: newId('clip'),
    trackId: track.id,
    label: def.label,
    sourceRef: sceneSourceRef(track.id, targetNodeId),
    startMs: 0,
    endMs: durationMs,
    metadata: withTargetNodeMetadata({ timelineLane: def.property ?? def.label, authored: true }, targetNodeId),
    curves: [
      {
        id: newId('curve'),
        property: def.property,
        keyframes: [],
      },
    ],
  })
  return { ...track, clips: [clip] }
}

export function addAuthoringLane(
  timeline: SequencerTimeline,
  laneInput: string,
  options?: TimelineAuthorBindOptions,
): TimelineAuthorResult {
  if (!isAuthorableTimelineLane(laneInput)) {
    return { ok: false, reason: 'unknown_lane', message: `Unknown timeline lane "${laneInput}".` }
  }
  if (findLaneTrack(timeline, laneInput)) {
    return { ok: false, reason: 'lane_exists', message: `Lane "${laneInput}" already exists.` }
  }
  const def = LANE_DEFS[laneInput]
  const trackId = authoringTrackIdForLane(laneInput)
  let track = createSequencerTrack({
    id: trackId,
    kind: def.kind,
    label: def.label,
    clips: [],
  })
  if (def.property != null) {
    track = ensureCurveClip(track, def, timeline.durationMs, options?.targetNodeId)
  } else if (options?.targetNodeId?.trim()) {
    // Marker lanes bind via a zero-length placeholder clip so scrub mapping can resolve the node.
    const nodeId = options.targetNodeId.trim()
    track = {
      ...track,
      clips: [
        createSequencerClip({
          id: newId('bind'),
          trackId,
          label: `${def.label} bind`,
          sourceRef: sceneSourceRef(trackId, nodeId),
          startMs: 0,
          endMs: 0,
          metadata: withTargetNodeMetadata({ timelineLane: 'event', authored: true, bindOnly: true }, nodeId),
        }),
      ],
    }
  }
  return { ok: true, timeline: upsertSequencerTrack(timeline, track) }
}

function upsertCurveKeyframe(
  curve: SequencerCurve,
  timeMs: number,
  value: number,
  keyframeId?: string,
): SequencerCurve {
  const existing = curve.keyframes.find((kf) => kf.timeMs === timeMs)
  const next: SequencerKeyframe = {
    id: existing?.id ?? keyframeId ?? newId('kf'),
    timeMs,
    value,
    interpolation: existing?.interpolation ?? 'linear',
  }
  const keyframes = [...curve.keyframes.filter((kf) => kf.timeMs !== timeMs), next]
  return normalizeSequencerCurve({ ...curve, keyframes })
}

export function addAuthoringKeyframe(
  timeline: SequencerTimeline,
  input: {
    lane: string
    timeSec: number
    value?: number
    keyframeId?: string
    targetNodeId?: string
    /**
     * Event-lane GAS / gameplay cue tag (e.g. `Cue.Fire.Burn` or short `Fire.Burn`).
     * Stored as `metadata.eventName` so scrub → cue bus → GasWorld bind can resolve it.
     * Ignored on curve lanes.
     */
    eventName?: string
    /** Alias of eventName for callers that use cue vocabulary. */
    cueName?: string
  },
): TimelineAuthorResult {
  if (!isAuthorableTimelineLane(input.lane)) {
    return { ok: false, reason: 'unknown_lane', message: `Unknown timeline lane "${input.lane}".` }
  }
  const def = LANE_DEFS[input.lane]
  let working = timeline
  let track = findLaneTrack(working, input.lane)
  if (!track) {
    const added = addAuthoringLane(working, input.lane, { targetNodeId: input.targetNodeId })
    if (!added.ok) return added
    working = added.timeline
    track = findLaneTrack(working, input.lane)
  }
  if (!track) {
    return { ok: false, reason: 'no_lane', message: `Failed to resolve lane "${input.lane}".` }
  }
  if (track.locked) {
    return { ok: false, reason: 'locked', message: `Lane "${input.lane}" is locked.` }
  }

  const timeMs = Math.max(0, Math.min(working.durationMs, Math.round(input.timeSec * 1000)))
  const value = input.value ?? def.defaultValue
  const bindId = input.targetNodeId?.trim()

  if (def.property == null) {
    const clipId = input.keyframeId ?? newId('evt')
    const authoredCue =
      (typeof input.eventName === 'string' && input.eventName.trim()) ||
      (typeof input.cueName === 'string' && input.cueName.trim()) ||
      ''
    const clip: SequencerClip = createSequencerClip({
      id: clipId,
      trackId: track.id,
      label: authoredCue || `Event @ ${(timeMs / 1000).toFixed(2)}s`,
      sourceRef: sceneSourceRef(`event/${clipId}`, bindId),
      startMs: timeMs,
      endMs: timeMs,
      metadata: withTargetNodeMetadata(
        {
          timelineLane: 'event',
          authored: true,
          ...(authoredCue ? { eventName: authoredCue, cueName: authoredCue } : {}),
        },
        bindId,
      ),
    })
    const withoutDup = track.clips.filter(
      (c) => c.startMs !== timeMs && c.metadata?.bindOnly !== true,
    )
    const nextTrack: SequencerTrack = {
      ...track,
      clips: [...withoutDup, clip].sort((a, b) => a.startMs - b.startMs),
    }
    return { ok: true, timeline: upsertSequencerTrack(working, stampTargetNodeOnTrack(nextTrack, bindId)) }
  }

  track = ensureCurveClip(track, def, working.durationMs, bindId)
  const clip = track.clips[0]
  if (!clip) {
    return { ok: false, reason: 'not_found', message: 'Authoring clip missing after ensure.' }
  }
  const curves = (clip.curves ?? []).map((curve) =>
    curve.property === def.property
      ? upsertCurveKeyframe(curve, timeMs, value, input.keyframeId)
      : curve,
  )
  const nextClip = createSequencerClip({
    ...clip,
    curves,
    sourceRef: sceneSourceRef(track.id, bindId ?? (typeof clip.metadata?.targetNodeId === 'string' ? clip.metadata.targetNodeId : undefined)),
    metadata: withTargetNodeMetadata(
      clip.metadata,
      bindId ?? (typeof clip.metadata?.targetNodeId === 'string' ? clip.metadata.targetNodeId : undefined),
    ),
  })
  const nextTrack: SequencerTrack = { ...track, clips: [nextClip, ...track.clips.slice(1)] }
  return { ok: true, timeline: upsertSequencerTrack(working, nextTrack) }
}

export function removeAuthoringKeyframe(
  timeline: SequencerTimeline,
  keyframeId: string,
): TimelineAuthorResult {
  let removed = false
  const tracks = timeline.tracks.map((track) => {
    if (track.locked) return track
    const clips = track.clips
      .map((clip): SequencerClip | null => {
        if (clip.id === keyframeId || `${clip.id}-start` === keyframeId) {
          if (track.kind === 'marker') {
            removed = true
            return null
          }
        }
        const curves = (clip.curves ?? [])
          .map((curve) => {
            const keyframes = curve.keyframes.filter((kf) => kf.id !== keyframeId)
            if (keyframes.length !== curve.keyframes.length) removed = true
            return { ...curve, keyframes }
          })
          .filter((curve) => curve.keyframes.length > 0 || curve.property.length > 0)
        return { ...clip, curves }
      })
      .filter((clip): clip is SequencerClip => clip != null)
    return { ...track, clips }
  })
  if (!removed) {
    return { ok: false, reason: 'not_found', message: `Keyframe "${keyframeId}" not found.` }
  }
  return { ok: true, timeline: { ...timeline, tracks } }
}

export function removeAuthoringLane(
  timeline: SequencerTimeline,
  laneInput: string,
): TimelineAuthorResult {
  if (!isAuthorableTimelineLane(laneInput)) {
    return { ok: false, reason: 'unknown_lane', message: `Unknown timeline lane "${laneInput}".` }
  }
  const track = findLaneTrack(timeline, laneInput)
  if (!track) {
    return { ok: false, reason: 'not_found', message: `Lane "${laneInput}" not found.` }
  }
  if (track.locked) {
    return { ok: false, reason: 'locked', message: `Lane "${laneInput}" is locked.` }
  }
  return {
    ok: true,
    timeline: { ...timeline, tracks: timeline.tracks.filter((candidate) => candidate.id !== track.id) },
  }
}

/** Primary curve property for a lane (null for event markers). */
export function authoringLaneProperty(lane: string): string | null {
  if (!isAuthorableTimelineLane(lane)) return null
  return LANE_DEFS[lane].property
}

/**
 * Move an authored keyframe (curve) or event marker clip in time.
 * Fail-closed when missing/locked; clamps into [0, durationMs].
 */
export function moveAuthoringKeyframe(
  timeline: SequencerTimeline,
  keyframeId: string,
  timeSec: number,
): TimelineAuthorResult {
  const timeMs = Math.max(0, Math.min(timeline.durationMs, Math.round(timeSec * 1000)))
  let moved = false
  const tracks = timeline.tracks.map((track) => {
    if (track.locked) return track

    // Event markers are zero-length clips keyed by clip.id.
    if (track.kind === 'marker') {
      const clips = track.clips.map((clip) => {
        if (clip.id !== keyframeId && `${clip.id}-start` !== keyframeId) return clip
        if (clip.metadata?.bindOnly === true) return clip
        moved = true
        return createSequencerClip({
          ...clip,
          startMs: timeMs,
          endMs: timeMs,
          label: `Event @ ${(timeMs / 1000).toFixed(2)}s`,
        })
      })
      return { ...track, clips: [...clips].sort((a, b) => a.startMs - b.startMs) }
    }

    const clips = track.clips.map((clip) => {
      let clipChanged = false
      const curves = (clip.curves ?? []).map((curve) => {
        const idx = curve.keyframes.findIndex((kf) => kf.id === keyframeId)
        if (idx < 0) return curve
        // Collision: another key at same time keeps its slot — upsert by time.
        const nextKeys = curve.keyframes
          .filter((kf) => kf.id !== keyframeId && kf.timeMs !== timeMs)
          .concat([
            {
              ...curve.keyframes[idx],
              timeMs,
            },
          ])
        moved = true
        clipChanged = true
        return normalizeSequencerCurve({ ...curve, keyframes: nextKeys })
      })
      if (!clipChanged) return clip
      return createSequencerClip({ ...clip, curves })
    })
    return { ...track, clips }
  })

  if (!moved) {
    return { ok: false, reason: 'not_found', message: `Keyframe "${keyframeId}" not found.` }
  }
  return { ok: true, timeline: { ...timeline, tracks } }
}

/**
 * Set numeric value on a curve keyframe (channel edit).
 * Event markers have no value channel — fail-closed.
 */
export function setAuthoringKeyframeValue(
  timeline: SequencerTimeline,
  keyframeId: string,
  value: number,
): TimelineAuthorResult {
  if (!Number.isFinite(value)) {
    return { ok: false, reason: 'not_found', message: 'Keyframe value must be a finite number.' }
  }
  let updated = false
  const tracks = timeline.tracks.map((track) => {
    if (track.locked) return track
    if (track.kind === 'marker') return track
    const clips = track.clips.map((clip) => {
      let clipChanged = false
      const curves = (clip.curves ?? []).map((curve) => {
        const idx = curve.keyframes.findIndex((kf) => kf.id === keyframeId)
        if (idx < 0) return curve
        updated = true
        clipChanged = true
        const keyframes = curve.keyframes.map((kf, i) =>
          i === idx ? { ...kf, value } : kf,
        )
        return normalizeSequencerCurve({ ...curve, keyframes })
      })
      if (!clipChanged) return clip
      return createSequencerClip({ ...clip, curves })
    })
    return { ...track, clips }
  })
  if (!updated) {
    return {
      ok: false,
      reason: 'not_found',
      message: `Curve keyframe "${keyframeId}" not found (event markers have no value channel).`,
    }
  }
  return { ok: true, timeline: { ...timeline, tracks } }
}
