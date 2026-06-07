import type { SequencerClip, SequencerTrack, SequencerTrackKind } from '@/lib/sequencer/core/types'
import { createSequencerClip } from '@/lib/sequencer/core/clip'

export function createSequencerTrack(input: {
  id: string
  kind: SequencerTrackKind
  label: string
  clips?: SequencerClip[]
  muted?: boolean
  locked?: boolean
  heightPx?: number
}): SequencerTrack {
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    muted: input.muted ?? false,
    locked: input.locked ?? false,
    heightPx: input.heightPx ?? 72,
    clips: (input.clips ?? []).map(createSequencerClip).sort((a, b) => a.startMs - b.startMs),
  }
}

export function upsertSequencerClip(track: SequencerTrack, clip: SequencerClip): SequencerTrack {
  if (track.locked) return track
  const nextClip = createSequencerClip({ ...clip, trackId: track.id })
  const clips = [...track.clips.filter((candidate) => candidate.id !== clip.id), nextClip].sort((a, b) => a.startMs - b.startMs)
  return { ...track, clips }
}

export function removeSequencerClip(track: SequencerTrack, clipId: string): SequencerTrack {
  if (track.locked) return track
  return { ...track, clips: track.clips.filter((clip) => clip.id !== clipId) }
}
