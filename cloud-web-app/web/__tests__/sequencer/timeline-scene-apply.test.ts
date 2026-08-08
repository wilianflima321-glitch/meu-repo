/**
 * Timeline3D scrub → scene sample + ISceneService apply mapping.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  ISceneService,
  IDESceneColorUpdateResult,
  IDESceneNode,
} from '../../../packages/ide-ui/backend/types'
import {
  addAuthoringKeyframe,
  createAuthoringTimelineShell,
} from '@/lib/sequencer/timeline-authoring'
import {
  playheadCrossedCue,
  resolveTrackTargetNodeId,
  sampleTimelineSceneAtTime,
  scaleCssColorByIntensity,
} from '@/lib/sequencer/timeline-scene-apply'
import { applyTimelineScrubToScene } from '@/lib/sequencer/timeline-scene-viewport-wire'
import {
  __resetTimelineEventCueBusForTests,
  listRecentTimelineEventCues,
  subscribeTimelineEventCues,
  type TimelineEventCue,
} from '@/lib/sequencer/timeline-event-cue-bus'
import { buildDemoCutsceneTimeline } from '@/lib/sequencer/sequencer-apply-deepen'
import {
  isValidSceneColorLiteral,
  viewportObjectSupportsLiveColor,
} from '@/lib/ide/scene-color-support'

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
    setColor: (id, color): IDESceneColorUpdateResult => {
      const node = state.nodes.find((n) => n.id === id)
      if (!node) return { ok: false, reason: 'missing_node' }
      if (node.locked) return { ok: false, reason: 'locked' }
      if (!viewportObjectSupportsLiveColor(node)) {
        return { ok: false, reason: 'no_color_support' }
      }
      if (!isValidSceneColorLiteral(color)) {
        return { ok: false, reason: 'invalid_color' }
      }
      state.nodes = state.nodes.map((n) =>
        n.id === id ? { ...n, color: color.trim() } : n,
      )
      return { ok: true }
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
    color: '#3366cc',
    ...overrides,
  }
}

describe('scene-color-support', () => {
  it('allows primitive mesh/light/camera color paint', () => {
    expect(viewportObjectSupportsLiveColor({ type: 'mesh' })).toBe(true)
    expect(viewportObjectSupportsLiveColor({ type: 'light' })).toBe(true)
    expect(viewportObjectSupportsLiveColor({ type: 'camera' })).toBe(true)
  })

  it('fail-closed for imported meshUrl and PBR textureMaps', () => {
    expect(
      viewportObjectSupportsLiveColor({
        type: 'mesh',
        meshUrl: 'https://cdn.example/model.glb',
        asset: { format: 'glb', viewerStatus: 'ready' },
      }),
    ).toBe(false)
    expect(
      viewportObjectSupportsLiveColor({
        type: 'mesh',
        textureMaps: { albedo: 'data:image/png;base64,xx' },
      }),
    ).toBe(false)
  })
})

describe('timeline-scene-apply sampling', () => {
  it('fail-closed skips tracks without documented target node id', () => {
    let tl = createAuthoringTimelineShell('proj-scrub')
    const lane = addAuthoringKeyframe(tl, { lane: 'position', timeSec: 0, value: 0 })
    expect(lane.ok).toBe(true)
    if (!lane.ok) return
    tl = lane.timeline
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

  it('samples material intensity into color patches and event crossings as cues', () => {
    let tl = createAuthoringTimelineShell('proj-material')
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

    const snap = sampleTimelineSceneAtTime(
      tl,
      500,
      0,
      { 'mesh-a': { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: '#ff0000' } },
    )
    const mat = snap.patches.find((p) => p.lane === 'material')
    expect(mat?.nodeId).toBe('mesh-a')
    expect(mat?.intensity).toBeCloseTo(0.6, 5)
    expect(mat?.color).toBe(scaleCssColorByIntensity('#ff0000', mat!.intensity!))
    expect(snap.eventCues.some((c) => c.clipId === 'evt-cue' && c.nodeId === 'mesh-a')).toBe(true)
    expect(snap.eventCues.every((c) => c.cueName.length > 0)).toBe(true)
  })

  it('edge-triggers event cues once per cross, not while parked on keyframe', () => {
    expect(playheadCrossedCue(0, 500, 500)).toBe(true)
    expect(playheadCrossedCue(500, 500, 500)).toBe(false)
    expect(playheadCrossedCue(600, 400, 500)).toBe(true)
    expect(playheadCrossedCue(400, 450, 500)).toBe(false)

    let tl = createAuthoringTimelineShell('proj-edge')
    const r = addAuthoringKeyframe(tl, {
      lane: 'event',
      timeSec: 1,
      keyframeId: 'evt-edge',
      targetNodeId: 'mesh-b',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    const cross = sampleTimelineSceneAtTime(tl, 1000, 0)
    expect(cross.eventCues).toHaveLength(1)
    expect(cross.eventCues[0]?.clipId).toBe('evt-edge')

    const parked = sampleTimelineSceneAtTime(tl, 1000, 1000)
    expect(parked.eventCues).toHaveLength(0)
  })

  it('scaleCssColorByIntensity darkens baseline at intensity 0.5', () => {
    expect(scaleCssColorByIntensity('#3366cc', 0.5)).toBe('#1a3366')
    expect(scaleCssColorByIntensity('#ffffff', 0)).toBe('#000000')
    expect(scaleCssColorByIntensity('#abcdef', 1)).toBe('#abcdef')
  })
})

describe('timeline-scene-viewport-wire apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetTimelineEventCueBusForTests()
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

  it('applies material intensity via setColor to live scene nodes', () => {
    let tl = createAuthoringTimelineShell('proj-color')
    const nodeId = 'cube-color'
    let r = addAuthoringKeyframe(tl, {
      lane: 'material',
      timeSec: 0,
      value: 1,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline
    r = addAuthoringKeyframe(tl, {
      lane: 'material',
      timeSec: 1,
      value: 0.25,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    const scene = makeScene([seedNode(nodeId, { color: '#80ff00' })])
    const result = applyTimelineScrubToScene({
      timeline: tl,
      timeSec: 1,
      scene,
      isDemo: false,
    })
    expect(result.applied).toBe(true)
    expect(result.colorsApplied).toBe(1)
    expect(result.heldMaterial).toBe(0)
    expect(result.colorRejected).toBe(0)
    const live = scene.getNodes().find((n) => n.id === nodeId)
    expect(live?.color).toBe(scaleCssColorByIntensity('#80ff00', 0.25))
  })

  it('fail-closed material when node has no live color channel', () => {
    let tl = createAuthoringTimelineShell('proj-nocolor')
    const nodeId = 'imported-mesh'
    const r = addAuthoringKeyframe(tl, {
      lane: 'material',
      timeSec: 0,
      value: 0.5,
      targetNodeId: nodeId,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return

    const scene = makeScene([seedNode(nodeId, { type: 'group', color: undefined })])
    // Override setColor path: group has no color support via probe on node type.
    const before = scene.getNodes()[0]!.color
    const result = applyTimelineScrubToScene({
      timeline: r.timeline,
      timeSec: 0,
      scene,
      isDemo: false,
    })
    expect(result.colorsApplied).toBe(0)
    expect(result.colorRejected).toBe(1)
    expect(result.noColorSupportNodes).toContain(nodeId)
    expect(scene.getNodes()[0]!.color).toBe(before)
  })

  it('demoMode must not mutate the real scene or emit production cues', () => {
    const demo = buildDemoCutsceneTimeline()
    const scene = makeScene([seedNode('should-stay', { position: [3, 3, 3], color: '#112233' })])
    const beforePos = scene.getNodes()[0]!.position.slice() as [number, number, number]
    const beforeColor = scene.getNodes()[0]!.color
    const received: TimelineEventCue[] = []
    const unsub = subscribeTimelineEventCues((c) => received.push(c))
    const result = applyTimelineScrubToScene({
      timeline: demo,
      timeSec: 1.5,
      prevTimeSec: 0,
      scene,
      isDemo: true,
    })
    unsub()
    expect(result.demoBlocked).toBe(true)
    expect(result.applied).toBe(false)
    expect(result.colorsApplied).toBe(0)
    expect(result.eventsEmitted).toBe(0)
    expect(received).toHaveLength(0)
    expect(listRecentTimelineEventCues()).toHaveLength(0)
    expect(scene.getNodes()[0]!.position).toEqual(beforePos)
    expect(scene.getNodes()[0]!.color).toBe(beforeColor)
  })

  it('emits typed event cues on live scrub crossing (edge once)', () => {
    let tl = createAuthoringTimelineShell('proj-cues')
    const r = addAuthoringKeyframe(tl, {
      lane: 'event',
      timeSec: 0.75,
      keyframeId: 'cue-live',
      targetNodeId: 'hero',
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    tl = r.timeline

    const received: TimelineEventCue[] = []
    const unsub = subscribeTimelineEventCues((c) => received.push(c))
    const scene = makeScene([seedNode('hero')])

    const first = applyTimelineScrubToScene({
      timeline: tl,
      timeSec: 0.75,
      prevTimeSec: 0,
      scene,
      isDemo: false,
    })
    expect(first.eventsEmitted).toBe(1)
    expect(first.heldEvent).toBe(0)
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      trackId: 'lane-event',
      clipId: 'cue-live',
      nodeId: 'hero',
      timeMs: 750,
    })
    expect(received[0]!.cueName.length).toBeGreaterThan(0)

    const parked = applyTimelineScrubToScene({
      timeline: tl,
      timeSec: 0.75,
      prevTimeSec: 0.75,
      scene,
      isDemo: false,
    })
    expect(parked.eventsEmitted).toBe(0)
    expect(received).toHaveLength(1)
    unsub()
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
