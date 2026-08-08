/**
 * Timeline3D event-cue bus — subscribe / clear / emit fail-closed.
 * Cues are editor/runtime hooks only (not GAS/gameplay).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  __resetTimelineEventCueBusForTests,
  clearTimelineEventCueSubscribers,
  emitTimelineEventCues,
  listRecentTimelineEventCues,
  subscribeTimelineEventCues,
  type TimelineEventCue,
} from '@/lib/sequencer/timeline-event-cue-bus'

const sampleCue = (overrides?: Partial<TimelineEventCue>): TimelineEventCue => ({
  trackId: 'lane-event',
  clipId: 'c1',
  cueName: 'door_open',
  timeMs: 1000,
  timeSec: 1,
  ...overrides,
})

describe('timeline-event-cue-bus', () => {
  beforeEach(() => {
    __resetTimelineEventCueBusForTests()
  })

  it('delivers typed cues to subscribers and keeps recent buffer', () => {
    const got: TimelineEventCue[] = []
    const unsub = subscribeTimelineEventCues((c) => got.push(c))
    const n = emitTimelineEventCues([
      sampleCue(),
      sampleCue({ cueName: 'stinger', value: 2, nodeId: 'mesh-1' }),
    ])
    expect(n).toBe(2)
    expect(got).toHaveLength(2)
    expect(got[1]).toMatchObject({ cueName: 'stinger', value: 2, nodeId: 'mesh-1' })
    expect(listRecentTimelineEventCues()).toHaveLength(2)
    unsub()
  })

  it('clearTimelineEventCueSubscribers stops delivery', () => {
    const got: TimelineEventCue[] = []
    subscribeTimelineEventCues((c) => got.push(c))
    clearTimelineEventCueSubscribers()
    emitTimelineEventCues([sampleCue()])
    expect(got).toHaveLength(0)
    // Recent buffer still records emits (history), subscribers do not.
    expect(listRecentTimelineEventCues()).toHaveLength(1)
  })

  it('fail-closed: empty cueName / missing trackId are not invented', () => {
    const got: TimelineEventCue[] = []
    const unsub = subscribeTimelineEventCues((c) => got.push(c))
    const n = emitTimelineEventCues([
      sampleCue({ cueName: '   ' }),
      sampleCue({ trackId: '', cueName: 'ok' }),
      sampleCue({ cueName: 'valid' }),
    ])
    unsub()
    expect(n).toBe(1)
    expect(got).toHaveLength(1)
    expect(got[0]?.cueName).toBe('valid')
  })
})
