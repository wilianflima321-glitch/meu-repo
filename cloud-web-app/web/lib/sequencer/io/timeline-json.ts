import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import { createSequencerTimeline, validateSequencerTimeline } from '@/lib/sequencer/core/timeline'

export type SequencerJsonEnvelope = {
  schema: 'aethel.timeline-json.v1'
  exportedAt: string
  timeline: SequencerTimeline
}

export function serializeSequencerTimeline(timeline: SequencerTimeline): SequencerJsonEnvelope {
  const issues = validateSequencerTimeline(timeline).filter((issue) => issue.severity === 'error')
  if (issues.length > 0) throw new Error(`Cannot serialize invalid timeline: ${issues.map((issue) => issue.path).join(', ')}`)
  return { schema: 'aethel.timeline-json.v1', exportedAt: new Date(0).toISOString(), timeline }
}

export function parseSequencerTimelineEnvelope(envelope: SequencerJsonEnvelope): SequencerTimeline {
  if (envelope.schema !== 'aethel.timeline-json.v1') throw new Error('Unsupported timeline JSON envelope.')
  const timeline = createSequencerTimeline(envelope.timeline)
  const issues = validateSequencerTimeline(timeline).filter((issue) => issue.severity === 'error')
  if (issues.length > 0) throw new Error(`Invalid timeline JSON: ${issues.map((issue) => issue.path).join(', ')}`)
  return timeline
}
