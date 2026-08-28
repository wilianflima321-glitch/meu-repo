/**
 * Block 3B.2 — Screenshot / frame parity harness (G.% Evidence Ladder 15→30 gate #4).
 *
 * Deterministic scene/frame fingerprint + web-preview vs desktop-present hash compare.
 * Fail-closed on empty/mock/theater payloads.
 * Fail-open measured when desktop present hash is absent (ladder allows measured HELD).
 *
 * Does NOT:
 * - bump G.3% / g3CodeDepthPercent (stays locked at 15 until Critic cites full band)
 * - flip frameGraphLive
 * - claim Nanite / Lumen / WebGPU product present
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import { G3_CODE_DEPTH_PERCENT_LOCKED } from '@aethel/engine/render/scalable-render-graph'

const log = createComponentLogger('frame-parity-harness-3b2')

export const FRAME_PARITY_HARNESS_LETTER = '3b2' as const
export const FRAME_PARITY_HARNESS_EXISTS = true as const
export const FRAME_PARITY_HARNESS_FIXTURE_ID = 'GF-PARITY-3B2-001' as const

/** Dual-live GPU frame graph — harness existence ≠ live dual path. */
export const FRAME_GRAPH_LIVE_FROM_PARITY = false as const
/** Band uplift forbidden until ALL 15→30 gates pass (PP-01/03, 60s soak, Critic). */
export const G3_BAND_15_TO_30_PASSED = false as const
export const NANITE_MARKETING_FROM_PARITY = false as const
export const LUMEN_MARKETING_FROM_PARITY = false as const
export const WEBGPU_PRODUCT_PRESENT_FROM_PARITY = false as const

const THEATER_RE =
  /^(mock|fake|todo|tbd|placeholder|pending|n\/a|none|null|undefined|invent|example|empty)([:_-].*)?$/i

export type FrameParitySurface = 'web_preview' | 'desktop_present'

export type FrameParityRejectCode =
  | 'empty_frame_bytes'
  | 'theater_payload'
  | 'invalid_dimensions'
  | 'missing_web_preview'
  | 'missing_desktop_present'
  | 'webgpu_present_claim_forbidden'
  | 'strict_hash_mismatch'
  | 'all_zero_pixels'
  | 'invalid_engine_fingerprint'

/** Optional engine/desktop frame hash ingest (honesty API query params). */
export type EngineDesktopFrameFingerprintInput = {
  /** SHA-256 hex of frame content (64 hex chars preferred; ≥16 accepted). */
  contentHash: string
  width?: number
  height?: number
  sceneId?: string
  frameIndex?: number
  evidenceFingerprint?: string
  hashDurationMs?: number
  /** Instant / engine capture timestamp ISO — optional. */
  capturedAt?: string
}

export type FrameParityCompareMode = 'strict' | 'fail_open_measured'

export type FrameFingerprint = {
  surface: FrameParitySurface
  width: number
  height: number
  byteLength: number
  /** SHA-256 hex (full) of raw RGBA + metadata. */
  contentHash: string
  /** Truncated fingerprint for evidence ledgers. */
  evidenceFingerprint: string
  sceneId: string
  frameIndex: number
  capturedAt: string
  /** Instant / performance.now duration of hash work (ms). */
  hashDurationMs: number
}

export type FrameFingerprintResult =
  | { ok: true; fingerprint: FrameFingerprint }
  | {
      ok: false
      code: FrameParityRejectCode
      message: string
      success: false
    }

export type FrameParityCompareResult =
  | {
      ok: true
      mode: FrameParityCompareMode
      harnessExists: true
      letter: typeof FRAME_PARITY_HARNESS_LETTER
      fixtureId: typeof FRAME_PARITY_HARNESS_FIXTURE_ID
      webHash: string
      desktopHash: string | null
      match: boolean | null
      /** true when desktop absent and mode=fail_open_measured */
      failOpenMeasured: boolean
      evidenceFingerprint: string
      frameGraphLive: false
      g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
      g3Band15To30Passed: false
      naniteMarketingAllowed: false
      lumenMarketingAllowed: false
      webgpuProductPresentReady: false
      claim: string
      success: true
    }
  | {
      ok: false
      code: FrameParityRejectCode
      message: string
      success: false
      harnessExists: true
      frameGraphLive: false
      g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
      g3Band15To30Passed: false
      naniteMarketingAllowed: false
      lumenMarketingAllowed: false
      webgpuProductPresentReady: false
    }

export type FrameParityHarnessReadiness = {
  harnessExists: true
  letter: typeof FRAME_PARITY_HARNESS_LETTER
  fixtureId: typeof FRAME_PARITY_HARNESS_FIXTURE_ID
  status: 'PARTIAL' | 'HELD'
  ready: boolean
  evidenceFingerprint: string | null
  frameGraphLive: false
  g3CodeDepthPercent: typeof G3_CODE_DEPTH_PERCENT_LOCKED
  g3Band15To30Passed: false
  /** Full 15→30 band still HELD — PP-01/03 + 60s soak + Critic required. */
  band15To30HeldReason: string
  naniteMarketingAllowed: false
  lumenMarketingAllowed: false
  webgpuProductPresentReady: false
  reason: string
}

function nowMs(clock?: () => number): number {
  if (clock) return clock()
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

function sha256Hex(parts: Array<string | Uint8Array | Buffer>): string {
  const h = createHash('sha256')
  for (const p of parts) {
    if (typeof p === 'string') h.update(p)
    else h.update(p)
  }
  return h.digest('hex')
}

function isTheaterSceneId(sceneId: string): boolean {
  const t = sceneId.trim()
  if (!t) return true
  return THEATER_RE.test(t)
}

function isAllZeroPixels(pixels: Uint8Array | Buffer): boolean {
  const view = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels)
  for (let i = 0; i < view.length; i++) {
    if (view[i] !== 0) return false
  }
  return view.length > 0
}

/**
 * Deterministic soft-raster fixture scene (CPU) — not a product present path.
 * Same seed → same RGBA; used for Vitest + harness existence proof.
 */
export function rasterizeDeterministicParityScene(input?: {
  width?: number
  height?: number
  seed?: number
  /** Scene label — theater strings refused by fingerprint. */
  sceneId?: string
}): {
  width: number
  height: number
  pixels: Uint8Array
  sceneId: string
  seed: number
} {
  const width = Math.max(8, Math.min(256, Math.floor(input?.width ?? 64)))
  const height = Math.max(8, Math.min(256, Math.floor(input?.height ?? 64)))
  const seed = Number.isFinite(input?.seed) ? Math.floor(input!.seed!) : 0x3b2_001
  const sceneId = input?.sceneId?.trim() || FRAME_PARITY_HARNESS_FIXTURE_ID
  const pixels = new Uint8Array(width * height * 4)

  // LCG for deterministic noise — not Math.random.
  let state = (seed >>> 0) || 1
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }

  // Background + soft box + diagonal light gradient (stable geometry).
  const cx = width * 0.5
  const cy = height * 0.55
  const half = Math.min(width, height) * 0.22
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const dx = x - cx
      const dy = y - cy
      const inBox = Math.abs(dx) <= half && Math.abs(dy) <= half
      const grad = (x + y) / (width + height)
      const n = (next() & 0xff) / 255
      if (inBox) {
        pixels[i] = Math.min(255, Math.floor(40 + 180 * grad + 20 * n))
        pixels[i + 1] = Math.min(255, Math.floor(60 + 140 * (1 - grad)))
        pixels[i + 2] = Math.min(255, Math.floor(90 + 80 * grad))
        pixels[i + 3] = 255
      } else {
        pixels[i] = Math.floor(18 + 30 * grad)
        pixels[i + 1] = Math.floor(20 + 24 * grad)
        pixels[i + 2] = Math.floor(28 + 40 * (1 - grad))
        pixels[i + 3] = 255
      }
    }
  }

  return { width, height, pixels, sceneId, seed }
}

/**
 * Hash a frame buffer — fail-closed on empty / theater / invalid dims / all-zero.
 */
export function fingerprintFrameBuffer(input: {
  surface: FrameParitySurface
  width: number
  height: number
  pixels: Uint8Array | Buffer
  sceneId?: string
  frameIndex?: number
  now?: () => number
}): FrameFingerprintResult {
  const t0 = nowMs(input.now)
  const width = Math.floor(input.width)
  const height = Math.floor(input.height)
  const sceneId = input.sceneId?.trim() || 'unnamed-scene'
  const frameIndex = Number.isFinite(input.frameIndex) ? Math.floor(input.frameIndex!) : 0

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      ok: false,
      code: 'invalid_dimensions',
      message: '3B.2 parity refused — invalid frame dimensions',
      success: false,
    }
  }

  if (isTheaterSceneId(sceneId)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: '3B.2 parity refused — theater/placeholder sceneId',
      success: false,
    }
  }

  const expected = width * height * 4
  const byteLength = input.pixels.byteLength
  if (byteLength <= 0 || byteLength < expected) {
    return {
      ok: false,
      code: 'empty_frame_bytes',
      message: '3B.2 parity refused — empty or undersized frame bytes (Law XVI no empty success)',
      success: false,
    }
  }

  const slice = input.pixels.subarray(0, expected)

  if (isAllZeroPixels(slice)) {
    return {
      ok: false,
      code: 'all_zero_pixels',
      message: '3B.2 parity refused — all-zero pixels (mock clear / no present)',
      success: false,
    }
  }

  const meta = [
    FRAME_PARITY_HARNESS_LETTER,
    // Surface is metadata on the fingerprint object — not part of contentHash,
    // so the same RGBA can be compared web_preview vs desktop_present.
    String(width),
    String(height),
    sceneId,
    String(frameIndex),
  ].join('|')
  const contentHash = sha256Hex([meta, slice])
  const t1 = nowMs(input.now)

  const fingerprint: FrameFingerprint = {
    surface: input.surface,
    width,
    height,
    byteLength: expected,
    contentHash,
    evidenceFingerprint: contentHash.slice(0, 16),
    sceneId,
    frameIndex,
    capturedAt: new Date().toISOString(),
    hashDurationMs: Math.max(0, t1 - t0),
  }

  log.info('frame_parity_fingerprint', {
    surface: fingerprint.surface,
    sceneId: fingerprint.sceneId,
    evidenceFingerprint: fingerprint.evidenceFingerprint,
    bytes: fingerprint.byteLength,
  })

  return { ok: true, fingerprint }
}

/**
 * Ingest engine/desktop frame fingerprint by content hash (no pixel theater).
 * Fail-closed on empty / theater / invalid hash. Used by honesty API when
 * desktop/engine provides a fingerprint; absent → fail-open measured upstream.
 */
export function ingestDesktopFrameFingerprintFromEngine(
  input: EngineDesktopFrameFingerprintInput,
): FrameFingerprintResult {
  const contentHash = input.contentHash?.trim() ?? ''
  const sceneId = input.sceneId?.trim() || FRAME_PARITY_HARNESS_FIXTURE_ID

  if (!contentHash || contentHash.length < 16) {
    return {
      ok: false,
      code: 'invalid_engine_fingerprint',
      message: '3B.2 ingest refused — desktop/engine contentHash missing or too short',
      success: false,
    }
  }

  if (isTheaterSceneId(sceneId) || isTheaterSceneId(contentHash)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: '3B.2 ingest refused — theater/placeholder desktop/engine fingerprint',
      success: false,
    }
  }

  if (!/^[a-fA-F0-9]+$/.test(contentHash)) {
    return {
      ok: false,
      code: 'invalid_engine_fingerprint',
      message: '3B.2 ingest refused — desktop/engine contentHash must be hex',
      success: false,
    }
  }

  const width = Math.max(1, Math.floor(input.width ?? 1))
  const height = Math.max(1, Math.floor(input.height ?? 1))
  const frameIndex = Number.isFinite(input.frameIndex) ? Math.floor(input.frameIndex!) : 0
  const normalizedHash = contentHash.toLowerCase()
  const evidenceFingerprint =
    input.evidenceFingerprint?.trim().slice(0, 16) || normalizedHash.slice(0, 16)

  if (isTheaterSceneId(evidenceFingerprint)) {
    return {
      ok: false,
      code: 'theater_payload',
      message: '3B.2 ingest refused — theater evidenceFingerprint',
      success: false,
    }
  }

  const fingerprint: FrameFingerprint = {
    surface: 'desktop_present',
    width,
    height,
    byteLength: width * height * 4,
    contentHash: normalizedHash,
    evidenceFingerprint,
    sceneId,
    frameIndex,
    capturedAt: input.capturedAt?.trim() || new Date().toISOString(),
    hashDurationMs: Math.max(0, Number(input.hashDurationMs) || 0),
  }

  log.info('frame_parity_engine_ingest', {
    surface: fingerprint.surface,
    sceneId: fingerprint.sceneId,
    evidenceFingerprint: fingerprint.evidenceFingerprint,
    width: fingerprint.width,
    height: fingerprint.height,
  })

  return { ok: true, fingerprint }
}

/**
 * Compare web preview vs desktop present hashes.
 * fail_open_measured: desktop missing → ok with match=null (ladder gate #4 allows measured HELD).
 * strict: both required; mismatch → fail-closed.
 */
export function compareWebVsDesktopParity(input: {
  web: FrameFingerprint
  desktop?: FrameFingerprint | null
  mode?: FrameParityCompareMode
  /** Forbidden — never invent WebGPU as product present via this harness. */
  claimsWebGpuProductPresent?: boolean
}): FrameParityCompareResult {
  const held = {
    harnessExists: true as const,
    frameGraphLive: FRAME_GRAPH_LIVE_FROM_PARITY,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band15To30Passed: G3_BAND_15_TO_30_PASSED,
    naniteMarketingAllowed: NANITE_MARKETING_FROM_PARITY,
    lumenMarketingAllowed: LUMEN_MARKETING_FROM_PARITY,
    webgpuProductPresentReady: WEBGPU_PRODUCT_PRESENT_FROM_PARITY,
  }

  if (input.claimsWebGpuProductPresent === true) {
    return {
      ok: false,
      code: 'webgpu_present_claim_forbidden',
      message:
        '3B.2 parity refused — WebGPU product present claim forbidden (CW3 R3F/WebGL2 canonical; adapter ≠ present)',
      success: false,
      ...held,
    }
  }

  if (!input.web || input.web.surface !== 'web_preview' || !input.web.contentHash) {
    return {
      ok: false,
      code: 'missing_web_preview',
      message: '3B.2 parity refused — web_preview fingerprint required',
      success: false,
      ...held,
    }
  }

  const mode: FrameParityCompareMode = input.mode ?? 'fail_open_measured'
  const desktop = input.desktop ?? null

  if (!desktop || !desktop.contentHash) {
    if (mode === 'strict') {
      return {
        ok: false,
        code: 'missing_desktop_present',
        message:
          '3B.2 parity strict mode refused — desktop_present fingerprint required (product present still HELD)',
        success: false,
        ...held,
      }
    }

    const evidenceFingerprint = sha256Hex([
      'parity-fail-open',
      input.web.contentHash,
      'desktop-absent',
    ]).slice(0, 16)

    return {
      ok: true,
      mode,
      letter: FRAME_PARITY_HARNESS_LETTER,
      fixtureId: FRAME_PARITY_HARNESS_FIXTURE_ID,
      webHash: input.web.contentHash,
      desktopHash: null,
      match: null,
      failOpenMeasured: true,
      evidenceFingerprint,
      claim:
        '3B.2 parity harness EXISTS — web preview hashed; desktop present absent (fail-open measured); frameGraphLive HELD; G.3% locked 15; band 15→30 HELD (PP-01/03)',
      success: true,
      ...held,
    }
  }

  if (desktop.surface !== 'desktop_present') {
    return {
      ok: false,
      code: 'theater_payload',
      message: '3B.2 parity refused — desktop fingerprint surface must be desktop_present',
      success: false,
      ...held,
    }
  }

  const match = input.web.contentHash === desktop.contentHash
  if (mode === 'strict' && !match) {
    return {
      ok: false,
      code: 'strict_hash_mismatch',
      message: '3B.2 parity strict mode — web vs desktop contentHash mismatch',
      success: false,
      ...held,
    }
  }

  const evidenceFingerprint = sha256Hex([
    'parity-compare',
    mode,
    input.web.contentHash,
    desktop.contentHash,
    String(match),
  ]).slice(0, 16)

  return {
    ok: true,
    mode,
    letter: FRAME_PARITY_HARNESS_LETTER,
    fixtureId: FRAME_PARITY_HARNESS_FIXTURE_ID,
    webHash: input.web.contentHash,
    desktopHash: desktop.contentHash,
    match,
    failOpenMeasured: false,
    evidenceFingerprint,
    claim: match
      ? '3B.2 parity harness EXISTS — web/desktop hashes match; frameGraphLive still HELD; G.3% locked 15; Nanite/Lumen/WebGPU-present false; band 15→30 HELD until PP-01/03+soak'
      : '3B.2 parity harness EXISTS — web/desktop hashes diverge (measured); frameGraphLive HELD; G.3% locked 15; band 15→30 HELD',
    success: true,
    ...held,
  }
}

/**
 * End-to-end soak: rasterize fixture → fingerprint web (+ optional desktop twin
 * or engine-ingested fingerprint) → compare.
 */
export function proveFrameParityHarnessSoak(input?: {
  includeDesktopTwin?: boolean
  /** Prefer engine/desktop hash when provided (honesty API ingest). */
  engineDesktop?: EngineDesktopFrameFingerprintInput | null
  mode?: FrameParityCompareMode
  seed?: number
  now?: () => number
}): FrameParityCompareResult {
  const scene = rasterizeDeterministicParityScene({
    width: 64,
    height: 64,
    seed: input?.seed ?? 0x3b2_001,
    sceneId: FRAME_PARITY_HARNESS_FIXTURE_ID,
  })

  const webFp = fingerprintFrameBuffer({
    surface: 'web_preview',
    width: scene.width,
    height: scene.height,
    pixels: scene.pixels,
    sceneId: scene.sceneId,
    frameIndex: 0,
    now: input?.now,
  })
  if (!webFp.ok) {
    return {
      ok: false,
      code: webFp.code,
      message: webFp.message,
      success: false,
      harnessExists: true,
      frameGraphLive: false,
      g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
      g3Band15To30Passed: false,
      naniteMarketingAllowed: false,
      lumenMarketingAllowed: false,
      webgpuProductPresentReady: false,
    }
  }

  let desktopFp: FrameFingerprint | null = null

  if (input?.engineDesktop?.contentHash) {
    const ingested = ingestDesktopFrameFingerprintFromEngine(input.engineDesktop)
    if (!ingested.ok) {
      return {
        ok: false,
        code: ingested.code,
        message: ingested.message,
        success: false,
        harnessExists: true,
        frameGraphLive: false,
        g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
        g3Band15To30Passed: false,
        naniteMarketingAllowed: false,
        lumenMarketingAllowed: false,
        webgpuProductPresentReady: false,
      }
    }
    desktopFp = ingested.fingerprint
  } else if (input?.includeDesktopTwin) {
    // Same deterministic buffer tagged as desktop_present — proves compare path.
    // Real product present still HELD (engine PP-01/03).
    const desk = fingerprintFrameBuffer({
      surface: 'desktop_present',
      width: scene.width,
      height: scene.height,
      pixels: scene.pixels,
      sceneId: scene.sceneId,
      frameIndex: 0,
      now: input?.now,
    })
    if (!desk.ok) {
      return {
        ok: false,
        code: desk.code,
        message: desk.message,
        success: false,
        harnessExists: true,
        frameGraphLive: false,
        g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
        g3Band15To30Passed: false,
        naniteMarketingAllowed: false,
        lumenMarketingAllowed: false,
        webgpuProductPresentReady: false,
      }
    }
    desktopFp = desk.fingerprint
  }

  return compareWebVsDesktopParity({
    web: webFp.fingerprint,
    desktop: desktopFp,
    mode:
      input?.mode ??
      (desktopFp ? (input?.engineDesktop ? 'fail_open_measured' : 'strict') : 'fail_open_measured'),
    claimsWebGpuProductPresent: false,
  })
}

export type FrameParityReadinessOptions = {
  /** Optional desktop/engine fingerprint from honesty query params. */
  engineDesktop?: EngineDesktopFrameFingerprintInput | null
}

export function evaluateFrameParityHarnessReadiness(
  options: FrameParityReadinessOptions = {},
): FrameParityHarnessReadiness {
  const engineDesktop = options.engineDesktop ?? null
  const hasEngine = Boolean(engineDesktop?.contentHash?.trim())

  // Self-check always runs with twin (harness existence). Engine ingest is additive.
  const soak = proveFrameParityHarnessSoak({ includeDesktopTwin: true, mode: 'strict' })
  const failOpen = proveFrameParityHarnessSoak({ includeDesktopTwin: false })
  const withEngine = hasEngine
    ? proveFrameParityHarnessSoak({
        engineDesktop,
        mode: 'fail_open_measured',
      })
    : null

  if (!soak.ok || !failOpen.ok) {
    return {
      harnessExists: true,
      letter: FRAME_PARITY_HARNESS_LETTER,
      fixtureId: FRAME_PARITY_HARNESS_FIXTURE_ID,
      status: 'HELD',
      ready: false,
      evidenceFingerprint: null,
      frameGraphLive: false,
      g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
      g3Band15To30Passed: false,
      band15To30HeldReason:
        '15→30 band HELD — PP-01/03 product present + 60s frame-graph soak + Critic still open; harness soak failed',
      naniteMarketingAllowed: false,
      lumenMarketingAllowed: false,
      webgpuProductPresentReady: false,
      reason: !failOpen.ok ? failOpen.message : !soak.ok ? soak.message : 'parity soak failed (both paths)',
    }
  }

  if (withEngine && !withEngine.ok) {
    return {
      harnessExists: true,
      letter: FRAME_PARITY_HARNESS_LETTER,
      fixtureId: FRAME_PARITY_HARNESS_FIXTURE_ID,
      status: 'HELD',
      ready: false,
      evidenceFingerprint: soak.evidenceFingerprint,
      frameGraphLive: false,
      g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
      g3Band15To30Passed: false,
      band15To30HeldReason:
        '15→30 band HELD — engine desktop fingerprint ingest refused (theater/invalid); PP-01/03 + 60s soak still open',
      naniteMarketingAllowed: false,
      lumenMarketingAllowed: false,
      webgpuProductPresentReady: false,
      reason: withEngine.message,
    }
  }

  const evidenceFingerprint =
    withEngine && withEngine.ok ? withEngine.evidenceFingerprint : soak.evidenceFingerprint
  const ingestNote = withEngine && withEngine.ok
    ? withEngine.failOpenMeasured
      ? 'engine desktop fingerprint ingested (measured compare)'
      : `engine desktop fingerprint ingested (match=${String(withEngine.match)})`
    : 'desktop/engine fingerprint absent (fail-open measured)'

  return {
    harnessExists: true,
    letter: FRAME_PARITY_HARNESS_LETTER,
    fixtureId: FRAME_PARITY_HARNESS_FIXTURE_ID,
    status: 'PARTIAL',
    ready: true,
    evidenceFingerprint,
    frameGraphLive: false,
    g3CodeDepthPercent: G3_CODE_DEPTH_PERCENT_LOCKED,
    g3Band15To30Passed: false,
    band15To30HeldReason:
      '15→30 band HELD — harness EXISTS (gate #4) but PP-01/03 persistent present + 60s Instant bag soak + Critic/Index sync still open; g3CodeDepthPercent stays 15',
    naniteMarketingAllowed: false,
    lumenMarketingAllowed: false,
    webgpuProductPresentReady: false,
    reason: `${soak.claim}; ${ingestNote}`,
  }
}
