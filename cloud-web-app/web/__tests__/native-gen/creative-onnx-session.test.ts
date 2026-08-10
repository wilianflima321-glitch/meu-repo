/**
 * Top-8 #3 — Creative ORT session fail-closed + ortFixtureLoaded evidence only.
 * nativeOnnxReady / Meshy parity never flip from fixture loader.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  attemptCreativeOnnxSession,
  loadOrtFixtureEvidence,
  clearOrtFixtureEvidence,
  getOrtFixtureLoaded,
  probeCreativeOnnxSessionReadiness,
  CREATIVE_NATIVE_ONNX_READY,
  MESHY_TRIPO_CLAY_PARITY_CLAIM,
  __resetCreativeOnnxSessionForTests,
} from '@/lib/native-gen/creative-onnx-session'
import { probeNativeOnnxFixtureHonesty } from '@/lib/native-gen/onnx-fixture-honesty'
import {
  getNativeOnnxReady,
  __resetNativeOnnxOrtSoakForTests,
} from '@/lib/native-gen/onnx-ort-session'
import { NATIVE_ONNX_READY, resolveNativeOnnxReadyFlag } from '@/lib/native-gen/onnx-job-protocol'

beforeEach(() => {
  __resetCreativeOnnxSessionForTests()
  __resetNativeOnnxOrtSoakForTests()
})

describe('creative-onnx-session (Top-8 #3)', () => {
  it('fail-closes session when model bytes missing', () => {
    const denied = attemptCreativeOnnxSession(
      { projectId: 'p1', prompt: 'hero mesh' },
      { weightsPresentOverride: false },
    )
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.code).toBe('no_model_bytes')
      expect(denied.evidence?.nativeOnnxReady).toBe(false)
      expect(denied.evidence?.ortFixtureLoaded).toBe(false)
    }
    expect(getNativeOnnxReady()).toBe(false)
    expect(resolveNativeOnnxReadyFlag()).toBe(false)
    expect(NATIVE_ONNX_READY).toBe(false)
    expect(CREATIVE_NATIVE_ONNX_READY).toBe(false)
  })

  it('withholds session even when weights+runtime inject — nativeOnnxReady stays false', () => {
    const withheld = attemptCreativeOnnxSession(
      { projectId: 'p1', prompt: 'prop' },
      { weightsPresentOverride: true, runtimePresentOverride: true },
    )
    expect(withheld.ok).toBe(false)
    if (!withheld.ok) {
      expect(withheld.code).toBe('native_onnx_not_ready')
      expect(withheld.evidence?.nativeOnnxReady).toBe(false)
    }
    expect(getNativeOnnxReady()).toBe(false)
  })

  it('refuses claimNativeOnnxReady and theater Identity fixtures', () => {
    const flip = attemptCreativeOnnxSession(
      { projectId: 'p', prompt: 'x' },
      { claimNativeOnnxReady: true },
    )
    expect(flip.ok).toBe(false)
    if (!flip.ok) expect(flip.code).toBe('native_onnx_gate_flip_forbidden')

    const theater = loadOrtFixtureEvidence({
      label: 'identity-text-to-3d',
      bytes: new Uint8Array([1, 2, 3, 4]),
    })
    expect(theater.ok).toBe(false)
    if (!theater.ok) expect(theater.code).toBe('theater_fixture')
    expect(getOrtFixtureLoaded()).toBe(false)

    const empty = loadOrtFixtureEvidence({
      label: 'plumbing',
      bytes: new Uint8Array(),
    })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.code).toBe('empty_fixture_bytes')
  })

  it('fixture loader sets ortFixtureLoaded only — never nativeOnnxReady / Meshy', () => {
    const loaded = loadOrtFixtureEvidence({
      label: 'plumbing-evidence-bytes',
      bytes: new Uint8Array([0x4f, 0x4e, 0x4e, 0x58, 0xaa, 0xbb]),
    })
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.value.ortFixtureLoaded).toBe(true)
      expect(loaded.value.nativeOnnxReady).toBe(false)
      expect(loaded.value.evidence.meshyTripoClayParityClaim).toBe(false)
    }
    expect(getOrtFixtureLoaded()).toBe(true)
    expect(getNativeOnnxReady()).toBe(false)
    expect(MESHY_TRIPO_CLAY_PARITY_CLAIM).toBe(false)

    const probe = probeNativeOnnxFixtureHonesty()
    expect(probe.ortFixtureLoaded).toBe(true)
    expect(probe.nativeOnnxReady).toBe(false)
    expect(probe.meshyTripoClayParityClaim).toBe(false)
    expect(probe.stamp).toBe('HELD')
    expect(probe.notes.join(' ')).toMatch(/ortFixtureLoaded/i)

    clearOrtFixtureEvidence()
    expect(getOrtFixtureLoaded()).toBe(false)
    expect(probeNativeOnnxFixtureHonesty().ortFixtureLoaded).toBe(false)
  })

  it('readiness probe stays PARTIAL with nativeOnnxReady false', () => {
    const probe = probeCreativeOnnxSessionReadiness({ weightsPresentOverride: false })
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.nativeOnnxReady).toBe(false)
    expect(probe.meshyTripoClayParityClaim).toBe(false)
    expect(getNativeOnnxReady()).toBe(false)
  })
})
