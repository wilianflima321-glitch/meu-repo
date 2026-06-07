import { describe, expect, it } from 'vitest'

import {
  applySequencerCommand,
  buildSequencerRenderExportPlan,
  createSequencerPlayhead,
  createSequencerTimeline,
  createSequencerTrack,
  createSequencerUndoRedoState,
  evaluateSequencerCurve,
  parseSequencerTimelineEnvelope,
  redoSequencerCommand,
  seekSequencerPlayhead,
  serializeSequencerTimeline,
  undoSequencerCommand,
  upsertSequencerTrack,
  validateSequencerTimeline,
} from '@/lib/sequencer'

const timeline = createSequencerTimeline({
  id: 'timeline-1',
  label: 'Shot review',
  durationMs: 10_000,
  tracks: [
    createSequencerTrack({
      id: 'video-1',
      kind: 'video',
      label: 'Camera A',
      clips: [
        {
          id: 'clip-1',
          trackId: 'video-1',
          label: 'Intro',
          sourceRef: 'asset://shot-a',
          startMs: 0,
          endMs: 4_000,
          speed: 1,
          opacity: 1,
          blendMode: 'replace',
        },
      ],
    }),
  ],
  evidenceRefs: ['storyboard frames'],
})

describe('sequencer kernel', () => {
  it('creates and validates canonical timelines without final-output claims', () => {
    expect(timeline.schema).toBe('aethel.timeline.v1')
    expect(validateSequencerTimeline(timeline)).toEqual([])
  })

  it('detects overlapping clips as review evidence warnings', () => {
    const overlapping = upsertSequencerTrack(
      timeline,
      createSequencerTrack({
        id: 'video-1',
        kind: 'video',
        label: 'Camera A',
        clips: [
          ...timeline.tracks[0].clips,
          {
            id: 'clip-2',
            trackId: 'video-1',
            label: 'Alt take',
            sourceRef: 'asset://shot-b',
            startMs: 2_000,
            endMs: 5_000,
            speed: 1,
            opacity: 0.75,
            blendMode: 'screen',
          },
        ],
      }),
    )

    expect(validateSequencerTimeline(overlapping)).toEqual(
      expect.arrayContaining([expect.objectContaining({ severity: 'warning', message: expect.stringContaining('review evidence') })]),
    )
  })

  it('evaluates normalized numeric curves', () => {
    const value = evaluateSequencerCurve({
      id: 'curve-1',
      property: 'opacity',
      keyframes: [
        { id: 'k1', timeMs: 0, value: 0, interpolation: 'linear' },
        { id: 'k2', timeMs: 1_000, value: 1, interpolation: 'linear' },
      ],
    }, 500)

    expect(value).toBeCloseTo(0.5)
  })

  it('round-trips timeline JSON through a stable envelope', () => {
    const envelope = serializeSequencerTimeline(timeline)
    expect(envelope.schema).toBe('aethel.timeline-json.v1')
    expect(parseSequencerTimelineEnvelope(envelope).id).toBe('timeline-1')
  })

  it('supports playhead seek and undo-redo commands', () => {
    const playhead = seekSequencerPlayhead(timeline, createSequencerPlayhead(timeline), 2_500)
    expect(playhead.timeMs).toBe(2_500)

    const stack = createSequencerUndoRedoState(1)
    const applied = applySequencerCommand(stack, { label: 'increment', apply: (state) => state + 1, revert: (state) => state - 1 })
    expect(applied.state).toBe(2)
    const undone = undoSequencerCommand(applied)
    expect(undone.state).toBe(1)
    expect(redoSequencerCommand(undone).state).toBe(2)
  })

  it('keeps render export held until playback and human-review receipts exist', () => {
    const plan = buildSequencerRenderExportPlan(timeline, 'mp4')
    expect(plan.state).toBe('held')
    expect(plan.requiredEvidence).toEqual(expect.arrayContaining(['playback evidence', 'human review approval']))
  })
})
