import type { SequencerClip, SequencerTrack } from '@/lib/sequencer/core/types'

export function createSequencerClip(input: Omit<SequencerClip, 'speed' | 'opacity' | 'blendMode'> & Partial<Pick<SequencerClip, 'speed' | 'opacity' | 'blendMode'>>): SequencerClip {
  return {
    ...input,
    startMs: Math.max(0, Math.round(input.startMs)),
    endMs: Math.max(Math.round(input.startMs) + 1, Math.round(input.endMs)),
    speed: input.speed ?? 1,
    opacity: input.opacity ?? 1,
    blendMode: input.blendMode ?? 'replace',
  }
}

export function clipDurationMs(clip: SequencerClip): number {
  return Math.max(0, clip.endMs - clip.startMs)
}

export function clipOverlaps(a: SequencerClip, b: SequencerClip): boolean {
  if (a.trackId !== b.trackId) return false
  return a.startMs < b.endMs && b.startMs < a.endMs
}

export function clipsForTrack(track: SequencerTrack, timeMs: number): SequencerClip[] {
  if (track.muted) return []
  return track.clips.filter((clip) => clip.startMs <= timeMs && clip.endMs >= timeMs)
}
