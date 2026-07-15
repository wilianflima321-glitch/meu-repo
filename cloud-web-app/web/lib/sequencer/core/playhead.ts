import type { SequencerPlayhead, SequencerTimeline } from '@/lib/sequencer/core/types'
import { clampTime } from '@/lib/sequencer/core/types'

export function createSequencerPlayhead(timeline: SequencerTimeline): SequencerPlayhead {
  return { timeMs: timeline.range.startMs, isPlaying: false, playbackRate: 1, loop: timeline.loop }
}

export function seekSequencerPlayhead(timeline: SequencerTimeline, playhead: SequencerPlayhead, timeMs: number): SequencerPlayhead {
  return { ...playhead, timeMs: clampTime(timeMs, timeline.durationMs) }
}

export function stepSequencerPlayhead(timeline: SequencerTimeline, playhead: SequencerPlayhead, deltaMs: number): SequencerPlayhead {
  const next = playhead.timeMs + deltaMs * playhead.playbackRate
  if (playhead.loop && next > timeline.range.endMs) return { ...playhead, timeMs: timeline.range.startMs }
  return seekSequencerPlayhead(timeline, playhead, next)
}
