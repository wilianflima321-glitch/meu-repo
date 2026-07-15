import type { SequencerTimeline, SequencerTrack, SequencerValidationIssue } from '@/lib/sequencer/core/types'
import { clipOverlaps } from '@/lib/sequencer/core/clip'
import { createSequencerTrack } from '@/lib/sequencer/core/track'

export function createSequencerTimeline(input: {
  id: string
  label: string
  durationMs: number
  frameRate?: SequencerTimeline['frameRate']
  tracks?: SequencerTrack[]
  evidenceRefs?: string[]
}): SequencerTimeline {
  const durationMs = Math.max(1, Math.round(input.durationMs))
  return {
    schema: 'aethel.timeline.v1',
    id: input.id,
    label: input.label,
    durationMs,
    frameRate: input.frameRate ?? 30,
    range: { startMs: 0, endMs: durationMs },
    loop: false,
    tracks: (input.tracks ?? []).map(createSequencerTrack),
    markers: [],
    evidenceRefs: input.evidenceRefs ?? [],
  }
}

export function upsertSequencerTrack(timeline: SequencerTimeline, track: SequencerTrack): SequencerTimeline {
  const nextTrack = createSequencerTrack(track)
  return { ...timeline, tracks: [...timeline.tracks.filter((candidate) => candidate.id !== track.id), nextTrack] }
}

export function validateSequencerTimeline(timeline: SequencerTimeline): SequencerValidationIssue[] {
  const issues: SequencerValidationIssue[] = []
  if (timeline.schema !== 'aethel.timeline.v1') issues.push({ severity: 'error', path: 'schema', message: 'Unsupported timeline schema.' })
  if (timeline.durationMs <= 0) issues.push({ severity: 'error', path: 'durationMs', message: 'Timeline duration must be positive.' })
  if (timeline.range.startMs < 0 || timeline.range.endMs > timeline.durationMs || timeline.range.startMs >= timeline.range.endMs) {
    issues.push({ severity: 'error', path: 'range', message: 'Timeline range must fit inside duration.' })
  }

  for (const track of timeline.tracks) {
    const seenClipIds = new Set<string>()
    for (const clip of track.clips) {
      if (seenClipIds.has(clip.id)) issues.push({ severity: 'error', path: `tracks.${track.id}.clips.${clip.id}`, message: 'Duplicate clip id.' })
      seenClipIds.add(clip.id)
      if (clip.trackId !== track.id) issues.push({ severity: 'error', path: `clips.${clip.id}.trackId`, message: 'Clip track id must match parent track.' })
      if (clip.startMs < 0 || clip.endMs > timeline.durationMs || clip.startMs >= clip.endMs) {
        issues.push({ severity: 'error', path: `clips.${clip.id}.range`, message: 'Clip range must fit inside timeline.' })
      }
    }
    for (let left = 0; left < track.clips.length; left += 1) {
      for (let right = left + 1; right < track.clips.length; right += 1) {
        if (clipOverlaps(track.clips[left], track.clips[right])) {
          issues.push({ severity: 'warning', path: `tracks.${track.id}.clips`, message: 'Overlapping clips require blend or review evidence.' })
        }
      }
    }
  }
  return issues
}
