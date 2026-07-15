import type { SequencerSelection, SequencerTimeRange } from '@/lib/sequencer/core/types'

export const EMPTY_SEQUENCER_SELECTION: SequencerSelection = { trackIds: [], clipIds: [], keyframeIds: [] }

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

export function selectSequencerClips(selection: SequencerSelection, clipIds: string[], additive = false): SequencerSelection {
  return { ...selection, clipIds: additive ? unique([...selection.clipIds, ...clipIds]) : unique(clipIds) }
}

export function selectSequencerRange(selection: SequencerSelection, range: SequencerTimeRange): SequencerSelection {
  return { ...selection, range: { startMs: Math.min(range.startMs, range.endMs), endMs: Math.max(range.startMs, range.endMs) } }
}
