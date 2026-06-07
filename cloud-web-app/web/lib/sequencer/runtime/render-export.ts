import type { SequencerTimeline } from '@/lib/sequencer/core/types'

export type SequencerRenderExportPlan = {
  state: 'held' | 'needs-review'
  timelineId: string
  targetFormat: 'mp4' | 'wav' | 'glb' | 'png-sequence'
  requiredEvidence: string[]
  nextAction: string
}

export function buildSequencerRenderExportPlan(timeline: SequencerTimeline, targetFormat: SequencerRenderExportPlan['targetFormat']): SequencerRenderExportPlan {
  return {
    state: timeline.evidenceRefs.includes('playback evidence') ? 'needs-review' : 'held',
    timelineId: timeline.id,
    targetFormat,
    requiredEvidence: ['playback evidence', 'render lane receipt', 'cost/cap receipt', 'human review approval'],
    nextAction: 'Route export through the governed export pipeline; do not mark output final until receipts and human review exist.',
  }
}
