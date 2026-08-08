/**
 * Adapters: SequencerTimeline (SoT) → Timeline3D / SequenceData presentational props.
 * Keyframes are lifted only from authored curves/clips — never from static transforms.
 */

import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import type { SequenceData, TimelineGroup, TimelineKeyframe, TimelineTrack, TrackType } from '@/components/sequencer/SequencerTimeline.types'
import type { IDETimelineKeyframe, IDETimelineSnapshot } from '../../../packages/ide-ui/backend/types'
import type { ProjectTimelineBinding } from '@/lib/sequencer/project-timeline-store'

export type Timeline3DViewModel = {
  duration: number
  frameRate: number
  trackIds: string[]
  keyframes: IDETimelineKeyframe[]
}

/** Map curve property → Timeline3D lane (coarse lanes used by the canvas UI). */
export function propertyToTimelineLane(property: string): string {
  const p = property.toLowerCase()
  if (p.includes('position')) return 'position'
  if (p.includes('rotation') || p.includes('lookat') || p.includes('roll')) return 'rotation'
  if (p.includes('scale')) return 'scale'
  if (p.includes('visibility') || p.includes('opacity')) return 'visibility'
  if (
    p.includes('material') ||
    p.includes('intensity') ||
    p.includes('color') ||
    p.includes('fov')
  ) {
    return 'material'
  }
  const parts = property.split('.').filter(Boolean)
  return parts.length >= 2 ? parts.slice(-2).join('.') : property || 'unknown'
}

function kindToTrackType(kind: SequencerTimeline['tracks'][number]['kind']): TrackType {
  switch (kind) {
    case 'audio':
      return 'audio'
    case 'fx':
      return 'light'
    case 'scene':
      return 'camera'
    case 'animation':
      return 'transform'
    case 'marker':
      return 'event'
    default:
      return 'transform'
  }
}

export function sequencerTimelineToTimeline3DView(timeline: SequencerTimeline): Timeline3DViewModel {
  const keyframes: IDETimelineKeyframe[] = []
  const trackIds = new Set<string>()

  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      for (const curve of clip.curves ?? []) {
        const lane = propertyToTimelineLane(curve.property)
        trackIds.add(lane)
        for (const kf of curve.keyframes) {
          keyframes.push({
            id: kf.id,
            time: kf.timeMs / 1000,
            track: lane,
            value: { [curve.property]: kf.value },
          })
        }
      }
      // Clip-only markers (no curves) surface as event keyframes — still real authored content.
      if ((!clip.curves || clip.curves.length === 0) && track.kind === 'marker') {
        trackIds.add('event')
        keyframes.push({
          id: `${clip.id}-start`,
          time: clip.startMs / 1000,
          track: 'event',
          value: { label: clip.label },
        })
      }
    }
  }

  return {
    duration: Math.max(0, timeline.durationMs / 1000),
    frameRate: timeline.frameRate,
    trackIds: [...trackIds],
    keyframes,
  }
}

export function sequencerTimelineToSequenceData(timeline: SequencerTimeline): SequenceData {
  const groups: TimelineGroup[] = timeline.tracks.map((track) => {
    const tracks: TimelineTrack[] = []

    for (const clip of track.clips) {
      const curves = clip.curves ?? []
      if (curves.length === 0) {
        tracks.push({
          id: clip.id,
          name: clip.label,
          type: kindToTrackType(track.kind),
          targetId: clip.sourceRef,
          property: track.kind,
          keyframes: [
            {
              id: `${clip.id}-in`,
              time: clip.startMs / 1000,
              value: clip.label,
              easing: 'hold',
            },
          ],
          locked: track.locked,
          muted: track.muted,
        })
        continue
      }

      for (const curve of curves) {
        const keyframes: TimelineKeyframe[] = curve.keyframes.map((kf) => ({
          id: kf.id,
          time: kf.timeMs / 1000,
          value: kf.value,
          easing:
            kf.interpolation === 'step'
              ? 'hold'
              : kf.interpolation === 'ease-in'
                ? 'easeIn'
                : kf.interpolation === 'ease-out'
                  ? 'easeOut'
                  : kf.interpolation === 'ease-in-out'
                    ? 'easeInOut'
                    : 'linear',
        }))
        tracks.push({
          id: `${clip.id}:${curve.id}`,
          name: `${clip.label} · ${curve.property}`,
          type: kindToTrackType(track.kind),
          targetId: clip.sourceRef,
          property: curve.property,
          keyframes,
          locked: track.locked,
          muted: track.muted,
        })
      }
    }

    return {
      id: track.id,
      name: track.label,
      tracks,
      locked: track.locked,
    }
  })

  return {
    id: timeline.id,
    name: timeline.label,
    duration: Math.max(0, timeline.durationMs / 1000),
    frameRate: timeline.frameRate,
    groups,
  }
}

export const EMPTY_SEQUENCE_DATA: SequenceData = {
  id: 'seq-empty',
  name: 'Untitled Sequence',
  duration: 10,
  frameRate: 30,
  groups: [],
}

export function bindingToIDETimelineSnapshot(
  binding: ProjectTimelineBinding | null,
): IDETimelineSnapshot {
  if (!binding) {
    return {
      bound: false,
      duration: 0,
      frameRate: 30,
      trackIds: [],
      keyframes: [],
      sequenceId: null,
      label: null,
      isDemo: false,
    }
  }
  const view = sequencerTimelineToTimeline3DView(binding.timeline)
  return {
    bound: true,
    duration: view.duration,
    frameRate: view.frameRate,
    trackIds: view.trackIds,
    keyframes: view.keyframes,
    sequenceId: binding.timeline.id,
    label: binding.timeline.label,
    isDemo: binding.isDemo,
  }
}
