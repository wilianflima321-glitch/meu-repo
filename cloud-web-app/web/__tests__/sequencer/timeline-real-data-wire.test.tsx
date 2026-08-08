/**
 * Timeline3D / ITimelineService real-data wire — honesty gates.
 * - Demo fixture stays demoMode
 * - Real SequencerTimeline props flip demoMode false with authored keyframes
 * - Empty project ≠ fabricated tracks (no transform→fake-keyframe theater)
 */

import { createElement } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Timeline3D, TIMELINE3D_DEMO_KEYFRAMES } from '../../../packages/ide-ui/Timeline3D'
import { WebIDEBackend } from '@/lib/ide/WebIDEBackend'
import {
  bindDemoProjectTimeline,
  clearProjectTimeline,
  createEmptyProjectTimeline,
  resetProjectTimelineStoreForTests,
  setProjectTimeline,
  timelineHasSequenceContent,
} from '@/lib/sequencer/project-timeline-store'
import {
  bindingToIDETimelineSnapshot,
  EMPTY_SEQUENCE_DATA,
  propertyToTimelineLane,
  sequencerTimelineToSequenceData,
  sequencerTimelineToTimeline3DView,
} from '@/lib/sequencer/timeline-ui-adapter'
import { buildDemoCutsceneTimeline } from '@/lib/sequencer/sequencer-apply-deepen'
import { DEMO_SEQUENCE } from '@/components/sequencer/SequencerTimeline.demo'

describe('timeline-ui-adapter', () => {
  it('lifts keyframes only from authored curves (never invents from transforms)', () => {
    const timeline = buildDemoCutsceneTimeline()
    const view = sequencerTimelineToTimeline3DView(timeline)
    expect(view.keyframes.length).toBeGreaterThan(0)
    expect(view.trackIds.length).toBeGreaterThan(0)
    expect(view.duration).toBe(timeline.durationMs / 1000)
    for (const kf of view.keyframes) {
      expect(kf.track.length).toBeGreaterThan(0)
      expect(kf.time).toBeGreaterThanOrEqual(0)
    }
  })

  it('empty SequencerTimeline produces zero tracks / keyframes', () => {
    const empty = createEmptyProjectTimeline('proj-empty')
    expect(timelineHasSequenceContent(empty)).toBe(false)
    const view = sequencerTimelineToTimeline3DView(empty)
    expect(view.trackIds).toEqual([])
    expect(view.keyframes).toEqual([])
  })

  it('maps SequencerTimeline → SequenceData without DEMO_SEQUENCE theater', () => {
    const timeline = buildDemoCutsceneTimeline()
    const sequence = sequencerTimelineToSequenceData(timeline)
    expect(sequence.id).toBe(timeline.id)
    expect(sequence.id).not.toBe(DEMO_SEQUENCE.id)
    expect(sequence.groups.length).toBe(timeline.tracks.length)
    expect(EMPTY_SEQUENCE_DATA.groups).toEqual([])
  })

  it('propertyToTimelineLane maps camera/light properties to lanes', () => {
    expect(propertyToTimelineLane('camera.position.x')).toBe('position')
    expect(propertyToTimelineLane('camera.lookAt.y')).toBe('rotation')
    expect(propertyToTimelineLane('light.intensity')).toBe('material')
  })
})

describe('project-timeline-store + ITimelineService', () => {
  beforeEach(() => {
    resetProjectTimelineStoreForTests()
  })

  it('empty project snapshot is unbound with zero fabricated tracks', () => {
    const backend = new WebIDEBackend('draft', 'proj-a')
    const snap = backend.timeline.getSnapshot()
    expect(snap.bound).toBe(false)
    expect(snap.isDemo).toBe(false)
    expect(snap.keyframes).toEqual([])
    expect(snap.trackIds).toEqual([])
    expect(snap.duration).toBe(0)
  })

  it('binding a real SequencerTimeline flips live snapshot (demoMode false path)', () => {
    const timeline = buildDemoCutsceneTimeline()
    setProjectTimeline('proj-b', timeline, { isDemo: false })
    const backend = new WebIDEBackend('draft', 'proj-b')
    const snap = backend.timeline.getSnapshot()
    expect(snap.bound).toBe(true)
    expect(snap.isDemo).toBe(false)
    expect(snap.keyframes.length).toBeGreaterThan(0)
    expect(snap.trackIds.length).toBeGreaterThan(0)
    expect(snap.sequenceId).toBe(timeline.id)
  })

  it('explicit demo bind keeps isDemo true', () => {
    bindDemoProjectTimeline('proj-demo')
    const backend = new WebIDEBackend('draft', 'proj-demo')
    const snap = backend.timeline.getSnapshot()
    expect(snap.bound).toBe(true)
    expect(snap.isDemo).toBe(true)
    expect(snap.keyframes.length).toBeGreaterThan(0)
  })

  it('clearing project timeline returns honest empty snapshot', () => {
    setProjectTimeline('proj-c', createEmptyProjectTimeline('proj-c'), { isDemo: false })
    clearProjectTimeline('proj-c')
    const snap = bindingToIDETimelineSnapshot(null)
    expect(snap.bound).toBe(false)
    expect(snap.keyframes).toEqual([])
    expect(snap.trackIds).toEqual([])
  })
})

describe('Timeline3D demoMode honesty', () => {
  it('demoMode=true still seeds fixture keyframes and demo badge', () => {
    const { container } = render(createElement(Timeline3D, { duration: 8, demoMode: true }))
    expect(container.querySelector('[data-timeline-demo="true"]')).toBeTruthy()
    expect(container.textContent).toContain('Demo timeline')
    expect(TIMELINE3D_DEMO_KEYFRAMES).toHaveLength(5)
  })

  it('real sequence props (demoMode=false + keyframes) do not show demo badge', () => {
    const timeline = buildDemoCutsceneTimeline()
    const view = sequencerTimelineToTimeline3DView(timeline)
    const { container } = render(
      createElement(Timeline3D, {
        duration: view.duration,
        demoMode: false,
        keyframes: view.keyframes,
        tracks: view.trackIds,
      }),
    )
    expect(container.querySelector('[data-timeline-demo="true"]')).toBeNull()
    expect(container.querySelector('[data-timeline-empty="true"]')).toBeNull()
    expect(container.textContent).toContain(`${view.keyframes.length} kf`)
  })

  it('empty project props show empty honesty — not fabricated tracks', () => {
    const { container } = render(
      createElement(Timeline3D, {
        duration: 0,
        demoMode: false,
        keyframes: [],
        tracks: [],
      }),
    )
    expect(container.querySelector('[data-timeline-empty="true"]')).toBeTruthy()
    expect(container.querySelector('[data-timeline-demo="true"]')).toBeNull()
    expect(container.textContent).toContain('0 kf')
    expect(container.querySelector('[data-timeline-empty-tracks="true"]')).toBeTruthy()
  })
})
