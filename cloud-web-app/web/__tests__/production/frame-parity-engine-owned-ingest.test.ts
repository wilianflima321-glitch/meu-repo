/**
 * 3B.2 engine-owned parity acceptance — web ingest of the Rust-produced
 * `EngineFrameHashEvidence` payload (GF-PARITY-3B2-001 engine-owned digest).
 *
 * The desktop studio now owns the parity producer: `renderer_frame_hash_last`
 * (frame_hash_digest.rs) returns a serde camelCase `EngineFrameHashEvidence`
 * whose `contentHash` is a deterministic SHA-256 over REAL measured present
 * metrics. This suite proves that exact payload shape ingests cleanly through
 * `ingestDesktopFrameFingerprintFromEngine` and that every fail-closed path
 * (theater, short, non-hex) still refuses.
 *
 * The `contentHash` used here is the FIPS 180-4 NIST "abc" SHA-256 vector —
 * the SAME constant asserted in frame_hash_digest.rs::tests::sha256_nist_abc_vector —
 * forming a cross-lingual evidence link between the Rust digest producer and
 * the web ingest contract.
 */

import { describe, expect, it } from 'vitest'

import { ingestDesktopFrameFingerprintFromEngine } from '@/lib/production/frame-parity-harness-3b2'

/** PARITY_SCENE_ID mirrored from frame_hash_digest.rs (non-theater). */
const ENGINE_OWNED_SCENE_ID = 'gf-parity-engine-owned-present'
/** FIPS 180-4 NIST SHA-256("abc") — same constant as the Rust test. */
const NIST_ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

/** Payload shape exactly as serde camelCase emits from renderer_frame_hash_last. */
function engineHashEvidence(overrides: Partial<Parameters<typeof ingestDesktopFrameFingerprintFromEngine>[0]> = {}) {
  return {
    contentHash: NIST_ABC_SHA256,
    width: 1920,
    height: 1080,
    sceneId: ENGINE_OWNED_SCENE_ID,
    frameIndex: 239,
    evidenceFingerprint: NIST_ABC_SHA256.slice(0, 16),
    hashDurationMs: 0.42,
    capturedAt: '2026-08-19T00:00:00.123Z',
    // Extended engine-owned fields (ignored by the ingest contract).
    framesPresented: 240,
    failClosed: false,
    reason: '',
    productPresentReady: false,
    webviewExclusivePresentReady: false,
    pp02WebviewCarveoutHeld: true,
    fabricatedFps: false,
    surface: 'desktop_present',
    loopDropped: false,
    persistentLoopProven: false,
    soak60sPassed: false,
    ...overrides,
  }
}

describe('3B.2 engine-owned digest ingest (GF-PARITY-3B2-001)', () => {
  it('ingests the full engine-produced payload cleanly as desktop_present', () => {
    const res = ingestDesktopFrameFingerprintFromEngine(engineHashEvidence())
    expect(res.ok).toBe(true)
    if (!res.ok) return

    const fp = res.fingerprint
    expect(fp.surface).toBe('desktop_present')
    expect(fp.sceneId).toBe(ENGINE_OWNED_SCENE_ID)
    expect(fp.contentHash).toBe(NIST_ABC_SHA256)
    expect(fp.evidenceFingerprint).toBe(NIST_ABC_SHA256.slice(0, 16))
    expect(fp.evidenceFingerprint).toMatch(/^[a-f0-9]{16}$/)
    expect(fp.width).toBe(1920)
    expect(fp.height).toBe(1080)
    expect(fp.byteLength).toBe(1920 * 1080 * 4)
    expect(fp.frameIndex).toBe(239)
    expect(fp.hashDurationMs).toBe(0.42)
    expect(fp.capturedAt).toBe('2026-08-19T00:00:00.123Z')
  })

  it('normalizes an uppercase hex contentHash to lowercase before sealing', () => {
    const upper = NIST_ABC_SHA256.toUpperCase()
    const res = ingestDesktopFrameFingerprintFromEngine(engineHashEvidence({ contentHash: upper }))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.fingerprint.contentHash).toBe(NIST_ABC_SHA256)
    expect(res.fingerprint.evidenceFingerprint).toBe(NIST_ABC_SHA256.slice(0, 16))
  })

  it('defaults sceneId to the harness fixture when absent (still non-theater)', () => {
    const res = ingestDesktopFrameFingerprintFromEngine(
      engineHashEvidence({ sceneId: undefined }),
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.fingerprint.sceneId).toBe('GF-PARITY-3B2-001')
  })

  it('fail-closes theater sceneId/contentHash/evidenceFingerprint from the engine', () => {
    const theaterScene = ingestDesktopFrameFingerprintFromEngine(
      engineHashEvidence({ sceneId: 'mock:engine-owned' }),
    )
    expect(theaterScene.ok).toBe(false)
    if (!theaterScene.ok) expect(theaterScene.code).toBe('theater_payload')

    const theaterHash = ingestDesktopFrameFingerprintFromEngine(
      engineHashEvidence({ contentHash: 'placeholder_hash_xx' }),
    )
    expect(theaterHash.ok).toBe(false)
    if (!theaterHash.ok) expect(theaterHash.code).toBe('theater_payload')

    const theaterFp = ingestDesktopFrameFingerprintFromEngine(
      engineHashEvidence({ evidenceFingerprint: 'pending' }),
    )
    expect(theaterFp.ok).toBe(false)
    if (!theaterFp.ok) expect(theaterFp.code).toBe('theater_payload')
  })

  it('fail-closes short or non-hex engine contentHash', () => {
    const short = ingestDesktopFrameFingerprintFromEngine(
      engineHashEvidence({ contentHash: 'abcd1234' }),
    )
    expect(short.ok).toBe(false)
    if (!short.ok) expect(short.code).toBe('invalid_engine_fingerprint')

    const nonHex = ingestDesktopFrameFingerprintFromEngine(
      engineHashEvidence({ contentHash: 'z'.repeat(64) }),
    )
    expect(nonHex.ok).toBe(false)
    if (!nonHex.ok) expect(nonHex.code).toBe('invalid_engine_fingerprint')
  })

  it('clamps engine width/height/frameIndex to sane bounds without inventing data', () => {
    const res = ingestDesktopFrameFingerprintFromEngine(
      engineHashEvidence({ width: 0, height: -3, frameIndex: Number.NaN }),
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.fingerprint.width).toBe(1)
    expect(res.fingerprint.height).toBe(1)
    expect(res.fingerprint.byteLength).toBe(4)
    expect(res.fingerprint.frameIndex).toBe(0)
  })
})
