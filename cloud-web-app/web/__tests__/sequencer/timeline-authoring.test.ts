/**
 * Timeline3D authoring → ITimelineService / project-timeline-store / persist.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebIDEBackend } from '@/lib/ide/WebIDEBackend'
import {
  bindDemoProjectTimeline,
  getProjectTimeline,
  resetProjectTimelineStoreForTests,
  timelineHasSequenceContent,
} from '@/lib/sequencer/project-timeline-store'
import {
  AUTHORABLE_TIMELINE_LANES,
  addAuthoringKeyframe,
  addAuthoringLane,
  createAuthoringTimelineShell,
  listAvailableAuthoringLanes,
  listPresentAuthoringLanes,
  removeAuthoringKeyframe,
  removeAuthoringLane,
} from '@/lib/sequencer/timeline-authoring'
import { sequencerTimelineToTimeline3DView } from '@/lib/sequencer/timeline-ui-adapter'
import { DEFAULT_PROJECT_TIMELINE_PATH } from '@/lib/sequencer/timeline-project-persist'

describe('timeline-authoring pure mutations', () => {
  it('empty shell has zero lanes until user adds one', () => {
    const shell = createAuthoringTimelineShell('proj-author')
    expect(listPresentAuthoringLanes(shell)).toEqual([])
    expect(listAvailableAuthoringLanes(shell)).toEqual([...AUTHORABLE_TIMELINE_LANES])
    const view = sequencerTimelineToTimeline3DView(shell)
    expect(view.trackIds).toEqual([])
    expect(view.keyframes).toEqual([])
  })

  it('addAuthoringLane creates a visible empty lane (not fabricated keyframes)', () => {
    const shell = createAuthoringTimelineShell('proj-author')
    const added = addAuthoringLane(shell, 'position')
    expect(added.ok).toBe(true)
    if (!added.ok) return
    expect(listPresentAuthoringLanes(added.timeline)).toEqual(['position'])
    const view = sequencerTimelineToTimeline3DView(added.timeline)
    expect(view.trackIds).toEqual(['position'])
    expect(view.keyframes).toEqual([])
    expect(timelineHasSequenceContent(added.timeline)).toBe(true)
  })

  it('addAuthoringKeyframe upserts on lane curve and surfaces in Timeline3D view', () => {
    let tl = createAuthoringTimelineShell('proj-author')
    const lane = addAuthoringLane(tl, 'rotation')
    expect(lane.ok).toBe(true)
    if (!lane.ok) return
    tl = lane.timeline
    const kf = addAuthoringKeyframe(tl, { lane: 'rotation', timeSec: 1.5, value: 90, keyframeId: 'kf-rot-1' })
    expect(kf.ok).toBe(true)
    if (!kf.ok) return
    const view = sequencerTimelineToTimeline3DView(kf.timeline)
    expect(view.keyframes).toHaveLength(1)
    expect(view.keyframes[0]?.id).toBe('kf-rot-1')
    expect(view.keyframes[0]?.track).toBe('rotation')
    expect(view.keyframes[0]?.time).toBe(1.5)
  })

  it('addAuthoringKeyframe auto-creates missing lane', () => {
    const shell = createAuthoringTimelineShell('proj-author')
    const kf = addAuthoringKeyframe(shell, { lane: 'scale', timeSec: 0, value: 2 })
    expect(kf.ok).toBe(true)
    if (!kf.ok) return
    expect(listPresentAuthoringLanes(kf.timeline)).toContain('scale')
    expect(sequencerTimelineToTimeline3DView(kf.timeline).keyframes).toHaveLength(1)
  })

  it('event lane authors marker clips (not curve theater)', () => {
    const shell = createAuthoringTimelineShell('proj-author')
    const kf = addAuthoringKeyframe(shell, { lane: 'event', timeSec: 2, keyframeId: 'evt-1' })
    expect(kf.ok).toBe(true)
    if (!kf.ok) return
    const view = sequencerTimelineToTimeline3DView(kf.timeline)
    expect(view.trackIds).toContain('event')
    expect(view.keyframes.some((k) => k.id === 'evt-1' && k.track === 'event')).toBe(true)
  })

  it('removeAuthoringKeyframe and removeAuthoringLane round-trip', () => {
    let tl = createAuthoringTimelineShell('proj-author')
    const kf = addAuthoringKeyframe(tl, { lane: 'material', timeSec: 0.5, keyframeId: 'kf-m' })
    expect(kf.ok).toBe(true)
    if (!kf.ok) return
    tl = kf.timeline
    const removedKf = removeAuthoringKeyframe(tl, 'kf-m')
    expect(removedKf.ok).toBe(true)
    if (!removedKf.ok) return
    expect(sequencerTimelineToTimeline3DView(removedKf.timeline).keyframes).toEqual([])
    const removedLane = removeAuthoringLane(removedKf.timeline, 'material')
    expect(removedLane.ok).toBe(true)
    if (!removedLane.ok) return
    expect(listPresentAuthoringLanes(removedLane.timeline)).toEqual([])
  })
})

describe('ITimelineService authoring + persist', () => {
  beforeEach(() => {
    resetProjectTimelineStoreForTests()
  })

  it('unbound project stays empty until addTrack', async () => {
    const backend = new WebIDEBackend('draft', 'proj-live-author')
    expect(backend.timeline.getSnapshot().trackIds).toEqual([])
    expect(backend.timeline.listAvailableTracks?.()).toEqual([...AUTHORABLE_TIMELINE_LANES])

    const result = await backend.timeline.addTrack!('position')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.snapshot.bound).toBe(true)
    expect(result.snapshot.isDemo).toBe(false)
    expect(result.snapshot.trackIds).toEqual(['position'])
    expect(result.snapshot.keyframes).toEqual([])
    expect(getProjectTimeline('proj-live-author')?.tracks[0]?.id).toBe('lane-position')
  })

  it('addKeyframe writes store and persists *.timeline.json', async () => {
    const writes: Array<{ path: string; content: string }> = []
    const backend = new WebIDEBackend('draft', 'proj-persist-author')
    const files = backend.files
    vi.spyOn(files, 'writeFile').mockImplementation(async (path, content) => {
      writes.push({ path, content })
    })

    const track = await backend.timeline.addTrack!('visibility')
    expect(track.ok).toBe(true)
    const kf = await backend.timeline.addKeyframe!({ track: 'visibility', time: 2.25, value: 0.4 })
    expect(kf.ok).toBe(true)
    if (!kf.ok) return
    expect(kf.snapshot.keyframes).toHaveLength(1)
    expect(kf.snapshot.keyframes[0]?.track).toBe('visibility')
    expect(kf.persist?.ok).toBe(true)
    expect(writes.some((w) => w.path === DEFAULT_PROJECT_TIMELINE_PATH)).toBe(true)
    expect(writes.at(-1)?.content).toContain('visibility.opacity')
  })

  it('demo bind blocks authoring mutations', async () => {
    bindDemoProjectTimeline('proj-demo-author')
    const backend = new WebIDEBackend('draft', 'proj-demo-author')
    const result = await backend.timeline.addTrack!('position')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('demo_blocked')
    expect(backend.timeline.listAvailableTracks?.()).toEqual([])
  })

  it('removeKeyframe updates snapshot', async () => {
    const backend = new WebIDEBackend('draft', 'proj-rm-kf')
    await backend.timeline.addKeyframe!({ track: 'position', time: 1 })
    const snap = backend.timeline.getSnapshot()
    expect(snap.keyframes).toHaveLength(1)
    const id = snap.keyframes[0]!.id
    const removed = await backend.timeline.removeKeyframe!(id)
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.snapshot.keyframes).toEqual([])
  })
})
