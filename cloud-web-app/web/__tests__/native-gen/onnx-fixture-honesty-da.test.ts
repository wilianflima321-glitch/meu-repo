/**
 * Letter da — Native ONNX fixture / nativeOnnxReady honesty.
 * Fail-closed without redistributable text-to-3d `.onnx` + ORT + cu soak.
 * Distinct from cu protocol CLOSED. Do not fake green.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  probeNativeOnnxFixtureHonesty,
  shouldPreferNativeOnnxPager,
  nativeOnnxFixtureStamp,
  assertNativeOnnxFailClosedDefault,
  ONNX_FIXTURE_HONESTY_LETTER,
  ONNX_FIXTURE_HONESTY_WIRED,
  ONNX_FIXTURE_PRIOR_LETTER,
  REDISTRIBUTABLE_TEXT_TO_3D_ONNX_UNAVAILABLE,
} from '@/lib/native-gen/onnx-fixture-honesty'
import {
  proveNativeOnnxOrtSoak,
  probeOnnxOrtWeightsOnDisk,
  getNativeOnnxReady,
  __resetNativeOnnxOrtSoakForTests,
  __setNativeOnnxOrtTestHooks,
  type OnnxOrtSessionBackend,
} from '@/lib/native-gen/onnx-ort-session'
import { selectGameReadyCharacterRoute } from '@/lib/native-gen/native-gen-ide-route'
import { resolveNativeOnnxReadyFlag } from '@/lib/native-gen/onnx-job-protocol'
import { probeNativeGenHonesty } from '@/lib/native-gen/native-gen-honesty'

beforeEach(() => {
  __resetNativeOnnxOrtSoakForTests()
})

function fixtureBackend(): OnnxOrtSessionBackend {
  return {
    async load() {
      return { ok: true }
    },
    async infer() {
      return {
        ok: true,
        meshPositions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        meshIndices: new Uint32Array([0, 1, 2]),
      }
    },
    async unload() {},
  }
}

describe('letter da — nativeOnnxReady fail-closed (fixture honesty)', () => {
  it('HELD without redistributable text-to-3d .onnx (no invented green)', () => {
    expect(ONNX_FIXTURE_HONESTY_LETTER).toBe('da')
    expect(ONNX_FIXTURE_PRIOR_LETTER).toBe('cu')
    expect(ONNX_FIXTURE_HONESTY_WIRED).toBe(true)
    expect(REDISTRIBUTABLE_TEXT_TO_3D_ONNX_UNAVAILABLE).toBe(true)

    const weights = probeOnnxOrtWeightsOnDisk()
    // Production tree must not invent commercial text-to-3d bytes.
    expect(weights.present).toBe(false)

    const probe = probeNativeOnnxFixtureHonesty()
    expect(probe.letter).toBe('da')
    expect(probe.priorLetter).toBe('cu')
    expect(probe.nativeOnnxReady).toBe(false)
    expect(probe.textTo3dWeightsOnDisk).toBe(false)
    expect(probe.ortRuntimePresent).toBe(false)
    expect(probe.soakProven).toBe(false)
    expect(probe.redistributableTextTo3dFixtureUnavailable).toBe(true)
    expect(probe.byokClayFallback).toBe(true)
    expect(probe.stamp).toBe('HELD')
    expect(probe.heldReason).toBe('onnx_fixture_license_size_held')
    expect(shouldPreferNativeOnnxPager(probe)).toBe(false)
    expect(nativeOnnxFixtureStamp(probe)).toBe('HELD')
    expect(probe.notes.join(' ')).toMatch(/fail-closed|HELD|license|size/i)

    expect(getNativeOnnxReady()).toBe(false)
    expect(resolveNativeOnnxReadyFlag()).toBe(false)
  })

  it('BYOK clay route remains when fixture honesty HELD', () => {
    const failClosed = assertNativeOnnxFailClosedDefault()
    expect(failClosed.nativeOnnxReady).toBe(false)
    expect(failClosed.routePath).toBe('byok-clay')
    expect(failClosed.stamp).toBe('HELD')

    const route = selectGameReadyCharacterRoute()
    expect(route.path).toBe('byok-clay')
    expect(route.nativeOnnxReady).toBe(false)
    expect(route.honestyBadge).toBe('byok')
  })

  it('ca honesty aggregate keeps nativeOnnxReady false without fixture soak', () => {
    const honesty = probeNativeGenHonesty({
      vramPagerProven: true,
      splatToMeshProven: true,
      vhacdProven: true,
      heatDiffusionProven: true,
      conveyorProven: true,
    })
    expect(honesty.nativeOnnxReady).toBe(false)
    expect(honesty.onnxModelsHeld).toBe(true)
  })

  it('weights present without runtime → HELD (not ready)', () => {
    const probe = probeNativeOnnxFixtureHonesty({
      weightsPresentOverride: true,
      runtimePresentOverride: false,
    })
    expect(probe.nativeOnnxReady).toBe(false)
    expect(probe.stamp).toBe('HELD')
    expect(probe.heldReason).toBe('onnx_fixture_ort_runtime_missing')
    expect(shouldPreferNativeOnnxPager(probe)).toBe(false)
  })

  it('weights+runtime without soak → HELD (not ready)', () => {
    const probe = probeNativeOnnxFixtureHonesty({
      weightsPresentOverride: true,
      runtimePresentOverride: true,
    })
    expect(probe.nativeOnnxReady).toBe(false)
    expect(probe.soakProven).toBe(false)
    expect(probe.heldReason).toBe('onnx_fixture_soak_unproven')
    expect(probe.stamp).toBe('HELD')
  })

  it('force-disable stays HELD even after fixture-inject soak', async () => {
    __setNativeOnnxOrtTestHooks({
      weights: {
        present: true,
        path: 'fixtures/onnx/tiny-text-to-3d.onnx',
        probedPaths: [],
        weightsMissingMeansNotReady: true,
        note: 'da inject',
      },
      runtime: { runtimePresent: true, note: 'da inject runtime' },
      backend: fixtureBackend(),
    })
    const soak = await proveNativeOnnxOrtSoak({
      frames: 2,
      capabilityScore: 70,
      dedicatedVramMb: 4096,
      backend: fixtureBackend(),
    })
    expect(soak.nativeOnnxReady).toBe(true)

    const forced = probeNativeOnnxFixtureHonesty({
      soak,
      forceDisabled: true,
      weightsPresentOverride: true,
      runtimePresentOverride: true,
    })
    expect(forced.nativeOnnxReady).toBe(false)
    expect(forced.heldReason).toBe('onnx_fixture_force_disabled')
    expect(forced.stamp).toBe('HELD')
  })

  it('fixture-inject soak flips da probe only with full evidence', async () => {
    __setNativeOnnxOrtTestHooks({
      weights: {
        present: true,
        path: 'fixtures/onnx/tiny-text-to-3d.onnx',
        probedPaths: [],
        weightsMissingMeansNotReady: true,
        note: 'da fixture inject',
      },
      runtime: { runtimePresent: true, note: 'da fixture runtime' },
      backend: fixtureBackend(),
    })
    const soak = await proveNativeOnnxOrtSoak({
      frames: 2,
      capabilityScore: 70,
      dedicatedVramMb: 4096,
      backend: fixtureBackend(),
    })
    expect(soak.passed).toBe(true)
    expect(getNativeOnnxReady()).toBe(true)

    const probe = probeNativeOnnxFixtureHonesty({
      soak,
      weightsPresentOverride: true,
      runtimePresentOverride: true,
    })
    expect(probe.nativeOnnxReady).toBe(true)
    expect(probe.stamp).toBe('IMPLEMENTED')
    expect(probe.heldReason).toBeUndefined()
    expect(shouldPreferNativeOnnxPager(probe)).toBe(true)
    expect(nativeOnnxFixtureStamp(probe)).toBe('IMPLEMENTED')

    const route = selectGameReadyCharacterRoute({ nativeOnnxReady: true })
    expect(route.path).toBe('native-pager')

    // Reset — production without redistributable fixture must not stay ready
    __resetNativeOnnxOrtSoakForTests()
    const production = probeNativeOnnxFixtureHonesty()
    expect(production.nativeOnnxReady).toBe(false)
    expect(production.stamp).toBe('HELD')
    expect(getNativeOnnxReady()).toBe(false)
  })

  it('cu soak without weights still HELD (weights missing ≠ ready)', async () => {
    const soak = await proveNativeOnnxOrtSoak({ frames: 1, capabilityScore: 70 })
    expect(soak.heldReason).toBe('weights_missing_on_disk')
    expect(soak.nativeOnnxReady).toBe(false)

    const probe = probeNativeOnnxFixtureHonesty({ soak })
    expect(probe.nativeOnnxReady).toBe(false)
    expect(probe.letter).toBe('da')
    expect(probe.stamp).toBe('HELD')
  })
})
