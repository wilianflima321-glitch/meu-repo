/**
 * Letter cu — Native ONNX ORT weights soak.
 * Pager + session state machine; nativeOnnxReady only with evidence.
 * Weights missing ≠ ready; BYOK clay (cb) remains.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  createOnnxOrtSession,
  transitionOnnxOrtSession,
  runOnnxOrtLoadInferWindow,
  proveNativeOnnxOrtSoak,
  probeNativeOnnxOrtHonesty,
  probeOnnxOrtWeightsOnDisk,
  getNativeOnnxReady,
  ONNX_ORT_SESSION_HAPPY_PATH,
  ONNX_ORT_SOAK_LETTER,
  ONNX_ORT_SESSION_WIRED,
  __resetNativeOnnxOrtSoakForTests,
  __setNativeOnnxOrtTestHooks,
  type OnnxOrtSessionBackend,
} from '@/lib/native-gen/onnx-ort-session'
import {
  submitOnnxNativeGenJob,
  probeOnnxNativeSession,
  NATIVE_ONNX_READY,
  resolveNativeOnnxReadyFlag,
} from '@/lib/native-gen/onnx-job-protocol'
import { probeNativeGenHonesty } from '@/lib/native-gen/native-gen-honesty'
import { selectGameReadyCharacterRoute } from '@/lib/native-gen/native-gen-ide-route'
import { NATIVE_ONNX_WEAK_VRAM_MB_CEILING } from '@/lib/native-gen/types'

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

describe('ONNX ORT soak honesty (cu)', () => {
  it('weights missing on disk → nativeOnnxReady false (not ready)', async () => {
    expect(ONNX_ORT_SOAK_LETTER).toBe('cu')
    expect(ONNX_ORT_SESSION_WIRED).toBe(true)
    expect(NATIVE_ONNX_READY).toBe(false)

    const weights = probeOnnxOrtWeightsOnDisk()
    // Production tree has no .onnx fixture — honest HELD
    if (!weights.present) {
      const soak = await proveNativeOnnxOrtSoak({ frames: 2, capabilityScore: 70 })
      expect(soak.passed).toBe(false)
      expect(soak.nativeOnnxReady).toBe(false)
      expect(soak.held).toBe(true)
      expect(soak.heldReason).toBe('weights_missing_on_disk')
      expect(getNativeOnnxReady()).toBe(false)
      expect(resolveNativeOnnxReadyFlag()).toBe(false)

      const honesty = probeNativeOnnxOrtHonesty({ soak })
      expect(honesty.nativeOnnxReady).toBe(false)
      expect(honesty.modelsHeld).toBe(true)
      expect(honesty.byokClayFallback).toBe(true)
      expect(honesty.notes.some((n) => n.includes('weights missing') || n.includes('≠ ready') || n.includes('missing'))).toBe(true)
    }
  })

  it('probeOnnxNativeSession never invents ready without soak', () => {
    const p = probeOnnxNativeSession()
    expect(p.nativeOnnxReady).toBe(false)
    expect(p.ipcScaffoldReady).toBe(true)
    expect(p.ortSessionWired).toBe(true)
    expect(p.letter).toBe('cu')
  })

  it('BYOK clay route remains when nativeOnnxReady HELD (cb)', () => {
    const route = selectGameReadyCharacterRoute()
    expect(route.path).toBe('byok-clay')
    expect(route.nativeOnnxReady).toBe(false)
    expect(route.honestyBadge).toBe('byok')
    expect(route.zeroUiSilentFallback).toBe(true)
  })

  it('ca honesty keeps nativeOnnxReady false without fixture soak', () => {
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
})

describe('ORT session + pager state machine (cu)', () => {
  it('walks happy path when weights+runtime injected', async () => {
    __setNativeOnnxOrtTestHooks({
      weights: {
        present: true,
        path: 'fixtures/onnx/tiny-text-to-3d.onnx',
        probedPaths: ['fixtures/onnx/tiny-text-to-3d.onnx'],
        weightsMissingMeansNotReady: true,
        note: 'test fixture inject',
      },
      runtime: { runtimePresent: true, note: 'test runtime inject' },
      backend: fixtureBackend(),
    })

    let snap = createOnnxOrtSession({ capabilityScore: 70, dedicatedVramMb: 4096 })
    expect(snap.state).toBe('idle')
    expect(snap.weightsPresent).toBe(true)

    for (const step of ONNX_ORT_SESSION_HAPPY_PATH.slice(1)) {
      if (step === 'load_session' || step === 'infer') {
        // load/infer exercised via runOnnxOrtLoadInferWindow below
        const t = transitionOnnxOrtSession(snap, step)
        expect(t.ok).toBe(true)
        snap = t.snapshot
        continue
      }
      const t = transitionOnnxOrtSession(snap, step)
      expect(t.ok).toBe(true)
      snap = t.snapshot
    }
    expect(snap.state).toBe('idle')
    expect(snap.sessionLoaded).toBe(false)
    expect(snap.luxuryViewportPaused).toBe(false)

    const window = await runOnnxOrtLoadInferWindow({
      prompt: 'hero rock',
      capabilityScore: 70,
      dedicatedVramMb: 4096,
      backend: fixtureBackend(),
    })
    expect(window.jobOk).toBe(true)
    expect(window.held).toBe(false)
    expect(window.zeroUi).toBe(false)
    expect(window.snapshot.sessionLoaded).toBe(false)
    expect(window.snapshot.pager.modelResident).toBe(false)
    expect(window.meshPositions?.length).toBeGreaterThanOrEqual(9)
  })

  it('rejects illegal session transitions', () => {
    const snap = createOnnxOrtSession({ capabilityScore: 70 })
    const bad = transitionOnnxOrtSession(snap, 'infer')
    expect(bad.ok).toBe(false)
    expect(bad.receipt.status).toBe('rejected')
  })

  it('GT730 fail-closed Zero-UI — never claims 8GB', async () => {
    __setNativeOnnxOrtTestHooks({
      weights: {
        present: true,
        path: 'fixtures/onnx/tiny-text-to-3d.onnx',
        probedPaths: [],
        weightsMissingMeansNotReady: true,
        note: 'inject',
      },
      runtime: { runtimePresent: true, note: 'inject' },
      backend: fixtureBackend(),
    })
    const window = await runOnnxOrtLoadInferWindow({
      prompt: 'gt730',
      capabilityScore: 12,
      dedicatedVramMb: 8192,
      backend: fixtureBackend(),
    })
    expect(window.zeroUi).toBe(true)
    expect(window.jobOk).toBe(false)
    expect(window.snapshot.pager.claimedVramMb).toBeLessThanOrEqual(
      NATIVE_ONNX_WEAK_VRAM_MB_CEILING,
    )
  })

  it('weights present without runtime → HELD, not ready', async () => {
    __setNativeOnnxOrtTestHooks({
      weights: {
        present: true,
        path: 'fixtures/onnx/tiny-text-to-3d.onnx',
        probedPaths: [],
        weightsMissingMeansNotReady: true,
        note: 'weights only',
      },
      runtime: { runtimePresent: false, note: 'no runtime' },
      backend: null,
    })
    const soak = await proveNativeOnnxOrtSoak({ frames: 1, capabilityScore: 70 })
    expect(soak.passed).toBe(false)
    expect(soak.nativeOnnxReady).toBe(false)
    expect(soak.heldReason).toBe('ort_runtime_missing')
    expect(getNativeOnnxReady()).toBe(false)
  })

  it('fixture inject soak flips nativeOnnxReady only with evidence', async () => {
    __setNativeOnnxOrtTestHooks({
      weights: {
        present: true,
        path: 'fixtures/onnx/tiny-text-to-3d.onnx',
        probedPaths: [],
        weightsMissingMeansNotReady: true,
        note: 'fixture inject',
      },
      runtime: { runtimePresent: true, note: 'fixture runtime' },
      backend: fixtureBackend(),
    })
    const soak = await proveNativeOnnxOrtSoak({
      frames: 2,
      capabilityScore: 70,
      dedicatedVramMb: 4096,
      backend: fixtureBackend(),
    })
    expect(soak.passed).toBe(true)
    expect(soak.nativeOnnxReady).toBe(true)
    expect(getNativeOnnxReady()).toBe(true)
    expect(resolveNativeOnnxReadyFlag()).toBe(true)

    const route = selectGameReadyCharacterRoute()
    expect(route.path).toBe('native-pager')
    expect(route.honestyBadge).toBe('native')

    // Reset — production without fixture must not stay ready
    __resetNativeOnnxOrtSoakForTests()
    expect(getNativeOnnxReady()).toBe(false)
  })

  it('submit never invents mesh when weights missing', () => {
    const r = submitOnnxNativeGenJob({
      kind: 'text-to-3d',
      prompt: 'hero rock',
      projectId: 'p1',
      capabilityScore: 80,
      dedicatedVramMb: 8192,
    })
    expect(r.accepted).toBe(false)
    expect(r.nativeOnnxReady).toBe(false)
    expect(r.held).toBe(true)
    expect(r.meshPositions).toBeUndefined()
  })
})
