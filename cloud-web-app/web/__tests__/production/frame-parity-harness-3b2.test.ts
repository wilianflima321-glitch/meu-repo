/**
 * Block 3B.2 — frame parity harness Vitest (G.% ladder gate #4).
 * Harness EXISTS; band 15→30 and G.3% stay HELD/locked.
 */

import { describe, expect, it } from 'vitest'

import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'
import {
  FRAME_PARITY_HARNESS_EXISTS,
  FRAME_PARITY_HARNESS_FIXTURE_ID,
  FRAME_PARITY_HARNESS_LETTER,
  G3_BAND_15_TO_30_PASSED,
  compareWebVsDesktopParity,
  evaluateFrameParityHarnessReadiness,
  fingerprintFrameBuffer,
  proveFrameParityHarnessSoak,
  rasterizeDeterministicParityScene,
} from '@/lib/production/frame-parity-harness-3b2'

describe('Block 3B.2 frame parity harness', () => {
  it('rasterizeDeterministicParityScene is seed-stable (no Math.random)', () => {
    const a = rasterizeDeterministicParityScene({ seed: 0x3b2_001, width: 32, height: 32 })
    const b = rasterizeDeterministicParityScene({ seed: 0x3b2_001, width: 32, height: 32 })
    expect(a.pixels).toEqual(b.pixels)
    expect(a.pixels.some((v) => v !== 0)).toBe(true)
  })

  it('fingerprintFrameBuffer fail-closes empty / theater / all-zero', () => {
    const empty = fingerprintFrameBuffer({
      surface: 'web_preview',
      width: 8,
      height: 8,
      pixels: new Uint8Array(0),
      sceneId: FRAME_PARITY_HARNESS_FIXTURE_ID,
    })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.code).toBe('empty_frame_bytes')

    const theater = fingerprintFrameBuffer({
      surface: 'web_preview',
      width: 8,
      height: 8,
      pixels: new Uint8Array(8 * 8 * 4).fill(12),
      sceneId: 'mock',
    })
    expect(theater.ok).toBe(false)
    if (!theater.ok) expect(theater.code).toBe('theater_payload')

    const zero = fingerprintFrameBuffer({
      surface: 'web_preview',
      width: 8,
      height: 8,
      pixels: new Uint8Array(8 * 8 * 4),
      sceneId: FRAME_PARITY_HARNESS_FIXTURE_ID,
    })
    expect(zero.ok).toBe(false)
    if (!zero.ok) expect(zero.code).toBe('all_zero_pixels')
  })

  it('same scene → same hash; different seed → different hash', () => {
    const s1 = rasterizeDeterministicParityScene({ seed: 1, width: 48, height: 48 })
    const s2 = rasterizeDeterministicParityScene({ seed: 1, width: 48, height: 48 })
    const s3 = rasterizeDeterministicParityScene({ seed: 99, width: 48, height: 48 })

    const f1 = fingerprintFrameBuffer({
      surface: 'web_preview',
      width: s1.width,
      height: s1.height,
      pixels: s1.pixels,
      sceneId: FRAME_PARITY_HARNESS_FIXTURE_ID,
    })
    const f2 = fingerprintFrameBuffer({
      surface: 'web_preview',
      width: s2.width,
      height: s2.height,
      pixels: s2.pixels,
      sceneId: FRAME_PARITY_HARNESS_FIXTURE_ID,
    })
    const f3 = fingerprintFrameBuffer({
      surface: 'web_preview',
      width: s3.width,
      height: s3.height,
      pixels: s3.pixels,
      sceneId: FRAME_PARITY_HARNESS_FIXTURE_ID,
    })
    expect(f1.ok && f2.ok && f3.ok).toBe(true)
    if (!f1.ok || !f2.ok || !f3.ok) return
    expect(f1.fingerprint.contentHash).toBe(f2.fingerprint.contentHash)
    expect(f1.fingerprint.contentHash).not.toBe(f3.fingerprint.contentHash)
    expect(f1.fingerprint.hashDurationMs).toBeGreaterThanOrEqual(0)
  })

  it('fail-open measured when desktop absent; refuses WebGPU product present claim', () => {
    const scene = rasterizeDeterministicParityScene()
    const web = fingerprintFrameBuffer({
      surface: 'web_preview',
      width: scene.width,
      height: scene.height,
      pixels: scene.pixels,
      sceneId: scene.sceneId,
    })
    expect(web.ok).toBe(true)
    if (!web.ok) return

    const open = compareWebVsDesktopParity({
      web: web.fingerprint,
      desktop: null,
      mode: 'fail_open_measured',
    })
    expect(open.ok).toBe(true)
    if (!open.ok) return
    expect(open.failOpenMeasured).toBe(true)
    expect(open.match).toBeNull()
    expect(open.frameGraphLive).toBe(false)
    expect(open.g3CodeDepthPercent).toBe(15)
    expect(open.g3Band15To30Passed).toBe(false)

    const forbidden = compareWebVsDesktopParity({
      web: web.fingerprint,
      claimsWebGpuProductPresent: true,
    })
    expect(forbidden.ok).toBe(false)
    if (!forbidden.ok) expect(forbidden.code).toBe('webgpu_present_claim_forbidden')
  })

  it('strict twin compare matches; readiness PARTIAL without band uplift', () => {
    const soak = proveFrameParityHarnessSoak({ includeDesktopTwin: true, mode: 'strict' })
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.match).toBe(true)
    expect(soak.letter).toBe(FRAME_PARITY_HARNESS_LETTER)
    expect(soak.fixtureId).toBe(FRAME_PARITY_HARNESS_FIXTURE_ID)
    expect(soak.frameGraphLive).toBe(false)
    expect(soak.naniteMarketingAllowed).toBe(false)
    expect(soak.lumenMarketingAllowed).toBe(false)
    expect(soak.webgpuProductPresentReady).toBe(false)
    expect(soak.g3CodeDepthPercent).toBe(G3_CODE_DEPTH_PERCENT_LOCKED)

    const ready = evaluateFrameParityHarnessReadiness()
    expect(FRAME_PARITY_HARNESS_EXISTS).toBe(true)
    expect(ready.harnessExists).toBe(true)
    expect(ready.ready).toBe(true)
    expect(ready.status).toBe('PARTIAL')
    expect(ready.g3Band15To30Passed).toBe(false)
    expect(G3_BAND_15_TO_30_PASSED).toBe(false)
    expect(ready.band15To30HeldReason).toMatch(/PP-01\/03/)
    expect(ready.evidenceFingerprint).toMatch(/^[a-f0-9]{16}$/)
  })
})
