/**
 * Letter bm — Law I physics-worker + SAB deepen (Zero-MVP honesty).
 */

import { describe, expect, it } from 'vitest'
import {
  PHYSICS_WORKER_PATH_WIRED,
  probePhysicsWorkerHonesty,
  probePhysicsWorkerWired,
} from '@/lib/runtime/physics-worker-honesty'
import {
  PHYSICS_WORKER_PROTOCOL_VERSION,
  PhysicsWorkerSimState,
  handlePhysicsWorkerRequest,
  isPhysicsWorkerRequest,
  physicsWorkerTransformStride,
} from '@/lib/runtime/physics-worker-protocol'
import {
  createPhysicsWorkerManager,
  getBridgeUnderlyingBuffer,
} from '@/lib/runtime/physics-worker-manager'
import {
  SAB_PHYSICS_BRIDGE_WIRED,
  createSharedTransformPhysicsBridge,
} from '@/lib/runtime/shared-transform-physics-bridge'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'
import { TRANSFORM_HEADER } from '@/lib/runtime/shared-transform-buffer'

describe('Law I physics-worker protocol (bm)', () => {
  it('exposes protocol version + layout stride matching bk ring', () => {
    expect(PHYSICS_WORKER_PATH_WIRED).toBe(true)
    expect(probePhysicsWorkerWired()).toBe(true)
    expect(PHYSICS_WORKER_PROTOCOL_VERSION).toBe(1)
    expect(SAB_PHYSICS_BRIDGE_WIRED).toBe(true)
    const stride = physicsWorkerTransformStride()
    expect(stride.headerBytes).toBe(32)
    expect(stride.strideBytes).toBe(44)
  })

  it('validates request shape fail-closed', () => {
    expect(isPhysicsWorkerRequest({ type: 'step', id: '1' })).toBe(true)
    expect(isPhysicsWorkerRequest({ type: 'nope', id: '1' })).toBe(false)
    expect(isPhysicsWorkerRequest(null)).toBe(false)
  })

  it('init → bind → register → step writes shared transforms without body clone', () => {
    const bridge = createSharedTransformPhysicsBridge(8)
    const buffer = getBridgeUnderlyingBuffer(bridge)
    expect(buffer).not.toBeNull()

    const state = new PhysicsWorkerSimState()
    expect(
      handlePhysicsWorkerRequest(state, {
        type: 'init',
        id: 'a',
        protocolVersion: PHYSICS_WORKER_PROTOCOL_VERSION,
      }).success,
    ).toBe(true)

    const bind = handlePhysicsWorkerRequest(state, {
      type: 'bindSharedTransforms',
      id: 'b',
      data: {
        sharedBuffer: buffer!,
        mode: bridge.mode,
        capacity: bridge.capacity,
      },
    })
    expect(bind.success).toBe(true)
    expect(bind.data?.bound).toBe(true)

    const reg = handlePhysicsWorkerRequest(state, {
      type: 'registerBodies',
      id: 'c',
      data: {
        bodies: [
          {
            id: 'ball',
            slot: 0,
            px: 0,
            py: 5,
            pz: 0,
            kind: 'dynamic',
          },
        ],
      },
    })
    expect(reg.success).toBe(true)
    expect(reg.data?.registered).toBe(1)

    const stepped = handlePhysicsWorkerRequest(state, {
      type: 'step',
      id: 'd',
      data: { deltaTime: 1 / 60 },
    })
    expect(stepped.success).toBe(true)
    expect(stepped.type).toBe('stepped')
    expect(stepped.data?.sharedTransformsWritten).toBe(true)
    expect(stepped.data?.writeEpoch).toBeGreaterThan(0)
    // No structured-clone body map on response.
    expect((stepped.data as { bodies?: unknown })?.bodies).toBeUndefined()

    const pose = bridge.readPose(0)
    expect(pose).not.toBeNull()
    // Gravity pulls Y down from 5.
    expect(pose!.py).toBeLessThan(5)

    const epoch = bridge.acquireEpoch(0)
    expect(epoch).toBeGreaterThan(0)
    expect(bridge.snapshot().writeEpoch).toBe(epoch)

    state.destroy()
  })

  it('step without bind fails honestly', () => {
    const state = new PhysicsWorkerSimState()
    handlePhysicsWorkerRequest(state, { type: 'init', id: '1' })
    const stepped = handlePhysicsWorkerRequest(state, {
      type: 'step',
      id: '2',
      data: { deltaTime: 0.016 },
    })
    expect(stepped.success).toBe(false)
    expect(stepped.type).toBe('error')
    expect(stepped.error).toMatch(/not bound/i)
  })
})

describe('Law I physics-worker manager (bm)', () => {
  it('activates in-process against bk bridge (Zero-UI fallback)', async () => {
    const bridge = createSharedTransformPhysicsBridge(4)
    const manager = createPhysicsWorkerManager({
      preferWorker: false,
      allowInProcessFallback: true,
    })
    const ok = await manager.activate(bridge)
    expect(ok).toBe(true)
    expect(manager.isActive()).toBe(true)
    expect(manager.getMode()).toBe('in-process-fallback')

    await manager.registerBodies([
      { id: 'a', slot: 0, px: 1, py: 2, pz: 3, kind: 'dynamic' },
    ])
    const result = await manager.step(1 / 60)
    expect(result).not.toBeNull()
    expect(result!.sharedTransformsWritten).toBe(true)
    expect(result!.writeEpoch).toBeGreaterThan(0)

    manager.destroy()
    expect(manager.isActive()).toBe(false)
  })

  it('stays inactive without throw when fallback disabled and no worker', async () => {
    const bridge = createSharedTransformPhysicsBridge(2)
    const manager = createPhysicsWorkerManager({
      preferWorker: false,
      allowInProcessFallback: false,
    })
    const ok = await manager.activate(bridge)
    expect(ok).toBe(false)
    expect(manager.getMode()).toBe('inactive')
    expect(await manager.step(1 / 60)).toBeNull()
    manager.destroy()
  })
})

describe('Law I physics-worker honesty (bm)', () => {
  it('fail-closed without bind/step proof; ready when proven', () => {
    const held = probePhysicsWorkerHonesty({
      workerConstructible: false,
      sharedBufferBindProven: false,
      stepSharedWriteProven: false,
    })
    expect(held.physicsWorkerReady).toBe(false)
    expect(held.zeroStutterMarketingAllowed).toBe(false)
    expect(held.physicsWorkerPathWired).toBe(true)

    const ready = probePhysicsWorkerHonesty({
      workerConstructible: true,
      sharedBufferBindProven: true,
      stepSharedWriteProven: true,
    })
    expect(ready.physicsWorkerReady).toBe(true)
    expect(ready.zeroStutterMarketingAllowed).toBe(false)
  })

  it('aaa-production aggregate auto-proves physicsWorkerReady; marketing stays false', () => {
    const cap = probeAaaProductionCapability()
    expect(cap.physicsWorkerReady).toBe(true)
    expect(cap.marketingAaaProductionAllowed).toBe(false)
    expect(cap.ggpoLive).toBe(false)
    expect(cap.ps5GnmReady).toBe(false)

    const forcedOff = probeAaaProductionCapability({ physicsWorkerProven: false })
    expect(forcedOff.physicsWorkerReady).toBe(false)

    const report = evaluateAaaProductionHonesty()
    const gap4 = report.gaps.find((g) => g.id === 4)
    expect(gap4?.scaffoldStatus).toBe('CLOSED')
    expect(gap4?.notes.some((n) => /physics worker/i.test(n))).toBe(true)
    expect(report.capability.physicsWorkerReady).toBe(true)
  })
})

describe('Law I physics-worker SAB atomics path when available (bm)', () => {
  it('publishes via Atomics when sab-atomics mode', () => {
    const bridge = createSharedTransformPhysicsBridge(4)
    if (bridge.mode !== 'sab-atomics' || !bridge.sharedBuffer) {
      // Node/jsdom often lacks COI — fallback-copy still honest.
      expect(bridge.mode).toBe('fallback-copy')
      return
    }
    const state = new PhysicsWorkerSimState()
    handlePhysicsWorkerRequest(state, { type: 'init', id: 'i' })
    handlePhysicsWorkerRequest(state, {
      type: 'bindSharedTransforms',
      id: 'b',
      data: {
        sharedBuffer: bridge.sharedBuffer,
        mode: 'sab-atomics',
        capacity: bridge.capacity,
      },
    })
    handlePhysicsWorkerRequest(state, {
      type: 'registerBodies',
      id: 'r',
      data: { bodies: [{ id: 'x', slot: 0, px: 0, py: 0, pz: 0 }] },
    })
    const stepped = handlePhysicsWorkerRequest(state, {
      type: 'step',
      id: 's',
      data: { deltaTime: 1 / 60 },
    })
    expect(stepped.success).toBe(true)
    const i32 = new Int32Array(bridge.sharedBuffer)
    expect(Atomics.load(i32, TRANSFORM_HEADER.writeEpoch / 4)).toBe(
      stepped.data?.writeEpoch,
    )
    state.destroy()
  })
})
