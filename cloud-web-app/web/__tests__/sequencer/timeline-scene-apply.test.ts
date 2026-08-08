/**
 * Timeline3D scrub → scene sample + ISceneService apply mapping.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ISceneService, IDESceneNode } from '../../../packages/ide-ui/backend/types'
import {
  addAuthoringKeyframe,
  addAuthoringLane,
  createAuthoringTimelineShell,
} from '@/lib/sequencer/timeline-authoring'
import {
  resolveTrackTargetNodeId,
  sampleTimelineSceneAtTime,
} from '@/lib/sequencer/timeline-scene-apply'
import { applyTimelineScrubToScene } from '@/lib/sequencer/timeline-scene-viewport-wire'
import { buildDemoCutsceneTimeline } from '@/lib/sequencer/sequencer-apply-deepen'

function makeScene(nodes: IDESceneNode[]): ISceneService & { nodes: IDESceneNode[] } {
  const state = { nodes: nodes.map((n) => ({ ...n })) }
  return {
    get nodes() {
      return state.nodes
    },
    getNodes: () => state.nodes,
    getSelectedIds: () => state.nodes.filter((n) => n.selected).map((n) => n.id),
    select: (ids: string[]) => {
      state.nodes = state.nodes.map((n) => ({ ...n, selected: ids.includes(n.id) }))
    },
    setVisible: (id, visible) => {
      state.nodes = state.nodes.map((n) => (n.id === id ? { ...n, visible } : n))
    },
    setLocked: (id, locked) => {
      state.nodes = state.nodes.map((n) => (n.id === id ? { ...n, locked } : n))
    },
    updateTransform: (id, patch) => {
      state.nodes = state.nodes.map((n) =>
        n.id === id && !n.locked ? { ...n, ...patch } : n,
      )
    },
    subscribe: () => () => undefined,
  }
}

function seedNode(id: string, overrides?: Partial<IDESceneNode>): IDESceneNode {
  return {
    id,
    name: id,
    type: 'mesh',
    visible: true,
    locked: false,
    selected: false,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    ...overrides,
  }
}

describe('timeline-scene-apply sampling', () => {
  it('fail-closed skips tracks without documented target node id', () => {
    let tl = createAuthoringTimelineShell('proj-scrub')
    const lane = addAuthoringLane(tl, 'position')
    expect(lane.ok).toBe(true)
    if (!lane.ok) return
    tl = lane.timeline
    const kf = addAuthoringKeyframe(tl, { lane: 'position', timeSec: 0, value: 0 })
    expect(kf.ok).toBe(true)
    if (!kf.ok) return
    tl = kf.timeline
    const kf2 = addAuthoringKeyframe(tl, { lane: 'position', timeSec: 2, value: 10 })
    expect(kf2.ok).toBe(true)
    if (!kf2.ok) return

    const snap = sampleTimelineSceneAtTime(kf2.timeline, 1000)
    expect(snap.patches).toEqual([])
    expect(snap.skipped.some((s) => s.reason === 'missing_node_id')).toBe(true)
  })

  it('samples position/rotation/scale/visibility into node patches when bound', () => {
    let tl = createAuthoringTimelineShell('proj-scrub')
    const nodeId = 'mesh-hero'

    let r = addAuthoringKeyframe(tl, {
      lane: 'position',
      timeSec: 0,
      value: 0,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, { lane: 'position', timeSec: 2, value: 10, targetNodeId: nodeId })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    r = addAuthoringKeyframe(tl, { lane: 'rotation', timeSec: 0, value: 0, targetNodeId: nodeId })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, { lane: 'rotation', timeSec: 2, value: 90, targetNodeId: nodeId })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    r = addAuthoringKeyframe(tl, { lane: 'scale', timeSec: 0, value: 1, targetNodeId: nodeId })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, { lane: 'scale', timeSec: 2, value: 2, targetNodeId: nodeId })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    r = addAuthoringKeyframe(tl, {
      lane: 'visibility',
      timeSec: 0,
      value: 1,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, {
      lane: 'visibility',
      timeSec: 2,
      value: 0,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    const track = tl.tracks.find((t) => t.id === 'lane-position')
    expect(track).toBeTruthy()
    expect(resolveTrackTargetNodeId(track!)).toBe(nodeId)

    const mid = sampleTimelineSceneAtTime(tl, 1000)
    const pos = mid.patches.find((p) => p.lane === 'position')
    const rot = mid.patches.find((p) => p.lane === 'rotation')
    const scl = mid.patches.find((p) => p.lane === 'scale')
    const vis = mid.patches.find((p) => p.lane === 'visibility')

    expect(pos?.nodeId).toBe(nodeId)
    expect(pos?.position?.[0]).toBeCloseTo(5, 5)
    expect(rot?.rotation?.[1]).toBeCloseTo(45, 5)
    expect(scl?.scale?.[0]).toBeCloseTo(1.5, 5)
    expect(vis?.visible).toBe(true)

    const end = sampleTimelineSceneAtTime(tl, 2000)
    expect(end.patches.find((p) => p.lane === 'visibility')?.visible).toBe(false)
  })

  it('marks material and event as HELD (no scene patches)', () => {
    let tl = createAuthoringTimelineShell('proj-held')
    let r = addAuthoringKeyframe(tl, {
      lane: 'material',
      timeSec: 0,
      value: 0.2,
      targetNodeId: 'mesh-a',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, {
      lane: 'material',
      timeSec: 1,
      value: 1,
      targetNodeId: 'mesh-a',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, {
      lane: 'event',
      timeSec: 0.5,
      keyframeId: 'evt-cue',
      targetNodeId: 'mesh-a',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    const snap = sampleTimelineSceneAtTime(tl, 500, 0)
    expect(snap.patches).toEqual([])
    expect(snap.held.some((h) => h.lane === 'material' && h.reason === 'material_held')).toBe(true)
    expect(snap.held.some((h) => h.lane === 'event' && h.eventName)).toBe(true)
  })
})

describe('timeline-scene-viewport-wire apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies transform + visibility to live scene nodes', () => {
    let tl = createAuthoringTimelineShell('proj-apply')
    const nodeId = 'cube-1'
    let r = addAuthoringKeyframe(tl, {
      lane: 'position',
      timeSec: 0,
      value: 0,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, {
      lane: 'position',
      timeSec: 1,
      value: 8,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, {
      lane: 'visibility',
      timeSec: 0,
      value: 1,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, {
      lane: 'visibility',
      timeSec: 1,
      value: 0,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    const scene = makeScene([seedNode(nodeId)])
    const result = applyTimelineScrubToScene({
      timeline: tl,
      timeSec: 1,
      scene,
      isDemo: false,
    })
    expect(result.demoBlocked).toBe(false)
    expect(result.applied).toBe(true)
    expect(result.transformsApplied).toBeGreaterThanOrEqual(1)
    expect(result.visibilityApplied).toBeGreaterThanOrEqual(1)
    const live = scene.getNodes().find((n) => n.id === nodeId)
    expect(live?.position[0]).toBeCloseTo(8, 5)
    expect(live?.visible).toBe(false)
  })

  it('demoMode must not mutate the real scene', () => {
    const demo = buildDemoCutsceneTimeline()
    const scene = makeScene([seedNode('should-stay', { position: [3, 3, 3] })])
    const before = scene.getNodes()[0]!.position.slice() as [number, number, number]
    const result = applyTimelineScrubToScene({
      timeline: demo,
      timeSec: 1.5,
      scene,
      isDemo: true,
    })
    expect(result.demoBlocked).toBe(true)
    expect(result.applied).toBe(false)
    expect(scene.getNodes()[0]!.position).toEqual(before)
  })

  it('fail-closed when bound node id is absent from the scene', () => {
    let tl = createAuthoringTimelineShell('proj-missing')
    const r = addAuthoringKeyframe(tl, {
      lane: 'position',
      timeSec: 0,
      value: 5,
      targetNodeId: 'ghost-node',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const scene = makeScene([seedNode('other-node')])
    const result = applyTimelineScrubToScene({
      timeline: r.timeline,
      timeSec: 0,
      scene,
      isDemo: false,
    })
    expect(result.applied).toBe(false)
    expect(result.missingSceneNodes).toContain('ghost-node')
    expect(scene.getNodes()[0]!.position).toEqual([0, 0, 0])
  })
})
