/**
 * Timeline event cues → in-process GasWorld GameplayCue bind.
 * Desktop GAS IPC stays HELD — never claimed.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GAS_IPC_SHIP_STATUS } from '@/lib/gas/gas-ipc-honesty'
import { GameplayCueDispatcher, type GameplayCueEvent } from '@/lib/gas/cue'
import type { Entity } from '@/lib/ecs-dots-contracts'
import { emitTimelineEventCues, __resetTimelineEventCueBusForTests } from '@/lib/sequencer/timeline-event-cue-bus'
import {
  __resetTimelineGasCueBridgeForTests,
  describeTimelineGasCueBridgeHonesty,
  disableTimelineGasCueBridge,
  enableTimelineGasCueBridge,
  isTimelineGasCueBridgeArmed,
  isTimelineGasCueBridgeEnabled,
  listRecentTimelineGasCueDispatches,
  resolveTimelineGameplayCueTag,
  setTimelineGasCueBridgeArmed,
} from '@/lib/sequencer/timeline-gas-cue-bridge'
import { addAuthoringKeyframe, createAuthoringTimelineShell } from '@/lib/sequencer/timeline-authoring'
import { sampleTimelineSceneAtTime } from '@/lib/sequencer/timeline-scene-apply'
import { applyTimelineScrubToScene } from '@/lib/sequencer/timeline-scene-viewport-wire'
import type { ISceneService, IDESceneNode } from '../../../packages/ide-ui/backend/types'

function makeScene(nodes: IDESceneNode[]): ISceneService {
  const state = { nodes: nodes.map((n) => ({ ...n })) }
  return {
    getNodes: () => state.nodes,
    select: () => undefined,
    getSelectedIds: () => [],
    updateTransform: () => ({ ok: true }),
    setVisible: () => ({ ok: true }),
    setLocked: () => ({ ok: true }),
    setColor: () => ({ ok: true as const, applied: true as const }),
  } as unknown as ISceneService
}

/** Minimal GasWorld stand-in — avoids ecs-dots Worker in vitest node. */
function makeGasStub() {
  const cues = new GameplayCueDispatcher()
  const entities = new Map<string, Entity>()
  let next: Entity = 1
  return {
    getWorld: () => ({ cues }) as ReturnType<typeof import('@/lib/gas/visual-script-bridge').getDefaultGasWorld>,
    getEntity: (id: string) => {
      const existing = entities.get(id)
      if (existing !== undefined) return existing
      const e = next++
      entities.set(id, e)
      return e
    },
    cues,
  }
}

describe('timeline-gas-cue-bridge', () => {
  beforeEach(() => {
    __resetTimelineGasCueBridgeForTests()
    __resetTimelineEventCueBusForTests()
  })

  it('resolves GAS tags and skips auto Event @ placeholder labels', () => {
    expect(resolveTimelineGameplayCueTag('Cue.Fire.Burn')).toBe('Cue.Fire.Burn')
    expect(resolveTimelineGameplayCueTag('Fire.Burn')).toBe('Cue.Timeline.Fire.Burn')
    expect(resolveTimelineGameplayCueTag('Event @ 1.50s')).toBeNull()
    expect(resolveTimelineGameplayCueTag('   ')).toBeNull()
  })

  it('dispatches in-process GameplayCue when armed; silent when disarmed', () => {
    const stub = makeGasStub()
    const got: GameplayCueEvent[] = []
    stub.cues.subscribeAll((e) => got.push(e))
    enableTimelineGasCueBridge({
      armed: true,
      getWorld: stub.getWorld,
      getEntity: stub.getEntity,
    })
    const honesty = describeTimelineGasCueBridgeHonesty()
    expect(honesty.ipcStatus).toBe(GAS_IPC_SHIP_STATUS)
    expect(honesty.shipStatus).toBe('PARTIAL')

    emitTimelineEventCues([
      {
        trackId: 'lane-event',
        clipId: 'c1',
        cueName: 'Cue.Impact.Hit',
        nodeId: 'mesh-hero',
        timeMs: 1000,
        timeSec: 1,
      },
    ])
    expect(got).toHaveLength(1)
    expect(got[0]?.cueTag).toBe('Cue.Impact.Hit')
    expect(listRecentTimelineGasCueDispatches()[0]?.ipcStatus).toBe('HELD')

    setTimelineGasCueBridgeArmed(false)
    emitTimelineEventCues([
      {
        trackId: 'lane-event',
        cueName: 'Cue.Impact.Hit',
        timeMs: 2000,
        timeSec: 2,
      },
    ])
    expect(got).toHaveLength(1)
    expect(isTimelineGasCueBridgeArmed()).toBe(false)
  })

  it('does not invent cues from placeholder Event @ labels', () => {
    const stub = makeGasStub()
    const got: GameplayCueEvent[] = []
    stub.cues.subscribeAll((e) => got.push(e))
    enableTimelineGasCueBridge({
      armed: true,
      getWorld: stub.getWorld,
      getEntity: stub.getEntity,
    })

    emitTimelineEventCues([
      {
        trackId: 'lane-event',
        cueName: 'Event @ 0.50s',
        timeMs: 500,
        timeSec: 0.5,
      },
    ])
    expect(got).toHaveLength(0)
    expect(listRecentTimelineGasCueDispatches()).toHaveLength(0)
  })

  it('authoring eventName → scrub emit → GasWorld dispatch (live path)', () => {
    const stub = makeGasStub()
    const got: GameplayCueEvent[] = []
    stub.cues.subscribeAll((e) => got.push(e))
    enableTimelineGasCueBridge({
      armed: true,
      getWorld: stub.getWorld,
      getEntity: stub.getEntity,
    })

    let tl = createAuthoringTimelineShell('gas-bridge-test', 5)
    const added = addAuthoringKeyframe(tl, {
      lane: 'event',
      timeSec: 1,
      targetNodeId: 'actor-1',
      eventName: 'Cue.Fire.Burn',
    })
    expect(added.ok).toBe(true)
    if (!added.ok) return
    tl = added.timeline

    // sampleTimelineSceneAtTime takes ms; edge-trigger needs prev→next crossing.
    const snap = sampleTimelineSceneAtTime(tl, 1000, 500)
    expect(snap.eventCues.some((c) => c.cueName === 'Cue.Fire.Burn')).toBe(true)

    const scene = makeScene([
      {
        id: 'actor-1',
        name: 'Actor',
        type: 'mesh',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        locked: false,
      },
    ])

    applyTimelineScrubToScene({
      timeline: tl,
      timeSec: 1.0,
      prevTimeSec: 0.5,
      scene,
      isDemo: false,
    })

    expect(got.some((e) => e.cueTag === 'Cue.Fire.Burn')).toBe(true)
    expect(isTimelineGasCueBridgeEnabled()).toBe(true)
    disableTimelineGasCueBridge()
    expect(isTimelineGasCueBridgeEnabled()).toBe(false)
  })
})
