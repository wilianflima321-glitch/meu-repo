/**
 * Letter bk — Law I SAB + COOP/COEP production deepen (Zero-MVP honesty).
 */

import { describe, expect, it } from 'vitest'
import {
  COEP_VALUE,
  COOP_COEP_HEADERS_CONFIGURED,
  COOP_VALUE,
  evaluateCoopCoepHeadersHonesty,
  getCoopCoepHeaderPairs,
  pathNeedsCoopCoep,
} from '@/lib/runtime/coop-coep-headers'
import {
  TRANSFORM_HEADER,
  TRANSFORM_HEADER_BYTES,
  TRANSFORM_STRIDE_BYTES,
  describeSharedTransformLayout,
  probeSabTransformHonesty,
  publishTransformEpoch,
  sharedTransformAtomicsProtocol,
  tryCreateSharedTransformBuffer,
  writeTransformSlot,
} from '@/lib/runtime/shared-transform-buffer'
import {
  SAB_PHYSICS_BRIDGE_WIRED,
  createSharedTransformPhysicsBridge,
  probeSharedTransformBridgeHonesty,
} from '@/lib/runtime/shared-transform-physics-bridge'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'

describe('Law I COOP/COEP headers (bk)', () => {
  it('exposes configured header pairs and path gate', () => {
    expect(COOP_COEP_HEADERS_CONFIGURED).toBe(true)
    const pairs = getCoopCoepHeaderPairs()
    expect(pairs.some((h) => h.key === 'Cross-Origin-Opener-Policy' && h.value === COOP_VALUE)).toBe(
      true,
    )
    expect(
      pairs.some((h) => h.key === 'Cross-Origin-Embedder-Policy' && h.value === COEP_VALUE),
    ).toBe(true)

    expect(pathNeedsCoopCoep('/ide')).toBe(true)
    expect(pathNeedsCoopCoep('/studio/level')).toBe(true)
    expect(pathNeedsCoopCoep('/api/runtime/playtest')).toBe(true)
    expect(pathNeedsCoopCoep('/pricing')).toBe(false)

    const honesty = evaluateCoopCoepHeadersHonesty()
    expect(honesty.coopCoepHeadersConfigured).toBe(true)
    expect(honesty.notes.some((n) => /zero-stutter/i.test(n))).toBe(true)
  })
})

describe('Law I SAB layout + Atomics (bk)', () => {
  it('layout math + atomics protocol; ready only when headers+allocation+COI', () => {
    const layout = describeSharedTransformLayout(32)
    expect(layout.totalBytes).toBe(TRANSFORM_HEADER_BYTES + 32 * TRANSFORM_STRIDE_BYTES)
    expect(sharedTransformAtomicsProtocol().protocol).toBe('release-write-epoch-acquire-read')

    const heldNoCoi = probeSabTransformHonesty({
      crossOriginIsolated: false,
      forceSabAvailable: true,
      forceAllocationOk: true,
    })
    expect(heldNoCoi.sabTransformsReady).toBe(false)
    expect(heldNoCoi.coopCoepHeadersConfigured).toBe(true)

    const heldNoHeaders = probeSabTransformHonesty({
      crossOriginIsolated: true,
      forceSabAvailable: true,
      forceAllocationOk: true,
      coopCoepHeadersConfigured: false,
    })
    expect(heldNoHeaders.sabTransformsReady).toBe(false)

    const ready = probeSabTransformHonesty({
      crossOriginIsolated: true,
      forceSabAvailable: true,
      forceAllocationOk: true,
      coopCoepHeadersConfigured: true,
    })
    expect(ready.sabTransformsReady).toBe(true)
    expect(ready.bufferAllocationProven).toBe(true)

    const created = tryCreateSharedTransformBuffer(4)
    if (created) {
      writeTransformSlot(created.f32, 0, {
        px: 1,
        py: 2,
        pz: 3,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 1,
        sx: 1,
        sy: 1,
        sz: 1,
      })
      const epoch = publishTransformEpoch(created.i32, 1)
      expect(epoch).toBeGreaterThan(0)
      expect(Atomics.load(created.i32, TRANSFORM_HEADER.writeEpoch / 4)).toBe(epoch)
    }
  })
})

describe('Law I shared transform physics bridge (bk)', () => {
  it('publishes poses via Atomics or silent fallback-copy', () => {
    expect(SAB_PHYSICS_BRIDGE_WIRED).toBe(true)
    const bridge = createSharedTransformPhysicsBridge(8)
    expect(bridge.mode === 'sab-atomics' || bridge.mode === 'fallback-copy').toBe(true)

    const epoch = bridge.publishPoses([
      {
        px: 10,
        py: 20,
        pz: 30,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 1,
        sx: 1,
        sy: 1,
        sz: 1,
      },
    ])
    expect(epoch).toBeGreaterThan(0)
    const acquired = bridge.acquireEpoch(0)
    expect(acquired).toBe(epoch)
    const pose = bridge.readPose(0)
    expect(pose?.px).toBe(10)
    expect(pose?.py).toBe(20)
    expect(pose?.pz).toBe(30)

    const snap = bridge.snapshot()
    expect(snap.count).toBe(1)
    expect(snap.writeEpoch).toBe(epoch)

    const held = probeSharedTransformBridgeHonesty({
      crossOriginIsolated: false,
      sharedArrayBufferAvailable: true,
    })
    expect(held.sabTransformsReady).toBe(false)
    expect(held.mode).toBe('fallback-copy')

    const ready = probeSharedTransformBridgeHonesty({
      crossOriginIsolated: true,
      sharedArrayBufferAvailable: true,
      forceAllocationOk: true,
    })
    expect(ready.sabTransformsReady).toBe(true)
    expect(ready.sabPhysicsBridgeWired).toBe(true)
    expect(ready.coopCoepHeadersConfigured).toBe(true)
  })
})

describe('AAA production honesty SAB gate (bk)', () => {
  it('defaults fail-closed; flips sabTransformsReady only when proven', () => {
    const report = evaluateAaaProductionHonesty()
    expect(report.capability.marketingAaaProductionAllowed).toBe(false)
    expect(report.capability.coopCoepHeadersConfigured).toBe(true)
    expect(report.capability.sabPhysicsBridgeWired).toBe(true)
    // Server/Node typically not crossOriginIsolated
    expect(report.capability.sabTransformsReady).toBe(false)
    const gap4 = report.gaps.find((g) => g.id === 4)
    expect(gap4?.scaffoldStatus).toBe('CLOSED')
    expect(gap4?.shipStatus).toBe('HELD')

    const cap = probeAaaProductionCapability({
      crossOriginIsolated: true,
      sharedArrayBufferAvailable: true,
    })
    expect(cap.sabTransformsReady).toBe(true)
    expect(cap.coopCoepHeadersConfigured).toBe(true)
    expect(cap.sabPhysicsBridgeWired).toBe(true)
  })
})
