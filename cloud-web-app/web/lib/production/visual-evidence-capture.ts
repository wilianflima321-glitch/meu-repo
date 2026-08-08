/**
 * AI-v1-c / J.9 — VisualEvidence capture helpers.
 * Browser: OffscreenCanvas / canvas PNG frames.
 * WebM via MediaRecorder when available; else honest HELD + PNG/patch-hash fallback.
 * Law XVI: never report IMPLEMENTED with an empty blob/refs.
 */

import { createHash } from 'crypto'

export type VisualEvidenceCapability = 'IMPLEMENTED' | 'HELD'

export interface VisualEvidenceFrame {
  index: number
  mimeType: 'image/png'
  /** data URL or opaque ref */
  dataUrl: string
  byteLength: number
}

export interface VisualEvidenceCaptureResult {
  status: VisualEvidenceCapability
  kind: 'png_frames' | 'webm' | 'patch_hash'
  refs: string[]
  frames?: VisualEvidenceFrame[]
  message: string
  contentHash: string
  /** True when PNG (or patch-hash) was used because WebM was unavailable/empty. */
  webmHeld?: boolean
  mimeType?: string
  byteLength?: number
  /** data URL for WebM or primary PNG when captured (browser only). */
  dataUrl?: string
}

function hashContent(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

function emptyImplementedGuard(
  kind: VisualEvidenceCaptureResult['kind'],
  message: string,
  webmHeld?: boolean,
): VisualEvidenceCaptureResult {
  return {
    status: 'HELD',
    kind,
    refs: [],
    message,
    contentHash: hashContent(`empty-${kind}`),
    webmHeld,
  }
}

/**
 * Server-safe evidence when no viewport canvas exists — patch content hash.
 * Honest: not a WebM; UI must show HELD for cinematic capture.
 */
export function capturePatchHashEvidence(input: {
  before?: string
  after: string
  label?: string
}): VisualEvidenceCaptureResult {
  const payload = JSON.stringify({
    before: input.before ?? '',
    after: input.after,
    label: input.label ?? 'patch',
  })
  const contentHash = hashContent(payload)
  return {
    status: 'HELD',
    kind: 'patch_hash',
    refs: [`sha256:${contentHash}`],
    message:
      'Viewport WebM capture HELD on this surface — ledger stores before/after patch hashes. Cinematic engine capture is #63.',
    contentHash,
    webmHeld: true,
  }
}

/**
 * Browser-only: capture an HTMLCanvasElement / OffscreenCanvas to PNG data URL.
 * Returns HELD when canvas APIs are unavailable (SSR / Node) or blob is empty.
 */
export async function captureCanvasPngFrames(input: {
  canvas: {
    width: number
    height: number
    convertToBlob?: (opts: { type: string }) => Promise<Blob>
    toDataURL?: (type: string) => string
  }
  maxFrames?: number
  /** When true, mark that WebM path was skipped/failed (honest MIME cascade). */
  webmHeld?: boolean
}): Promise<VisualEvidenceCaptureResult> {
  const maxFrames = Math.min(8, Math.max(1, input.maxFrames ?? 1))
  const frames: VisualEvidenceFrame[] = []

  try {
    for (let i = 0; i < maxFrames; i++) {
      let dataUrl: string
      if (typeof input.canvas.toDataURL === 'function') {
        dataUrl = input.canvas.toDataURL('image/png')
      } else if (typeof input.canvas.convertToBlob === 'function') {
        const blob = await input.canvas.convertToBlob({ type: 'image/png' })
        if (!blob || blob.size <= 0) {
          return emptyImplementedGuard(
            'png_frames',
            'Canvas PNG blob was empty — refusing IMPLEMENTED with empty artifact (Law XVI).',
            input.webmHeld ?? true,
          )
        }
        dataUrl = await blobToDataUrl(blob)
      } else {
        return {
          status: 'HELD',
          kind: 'png_frames',
          refs: [],
          message: 'Canvas capture API unavailable on this runtime.',
          contentHash: hashContent('unavailable'),
          webmHeld: input.webmHeld ?? true,
        }
      }

      if (!dataUrl || dataUrl.length < 32 || dataUrl === 'data:,') {
        return emptyImplementedGuard(
          'png_frames',
          'Canvas PNG data URL empty — refusing IMPLEMENTED with empty artifact (Law XVI).',
          input.webmHeld ?? true,
        )
      }

      frames.push({
        index: i,
        mimeType: 'image/png',
        dataUrl,
        byteLength: Math.ceil((dataUrl.length * 3) / 4),
      })
    }

    const contentHash = hashContent(frames.map((f) => f.dataUrl.slice(0, 64)).join('|'))
    const primary = frames[0]
    return {
      status: 'IMPLEMENTED',
      kind: 'png_frames',
      refs: frames.map((f) => `frame:${f.index}:${f.byteLength}`),
      frames,
      message:
        input.webmHeld === true
          ? `Captured ${frames.length} PNG previz frame(s); WebM HELD on this runtime.`
          : `Captured ${frames.length} PNG previz frame(s) for the evidence ledger.`,
      contentHash,
      webmHeld: input.webmHeld,
      mimeType: 'image/png',
      byteLength: primary?.byteLength,
      dataUrl: primary?.dataUrl,
    }
  } catch (error) {
    return {
      status: 'HELD',
      kind: 'png_frames',
      refs: [],
      message: error instanceof Error ? error.message : 'Canvas capture failed',
      contentHash: hashContent('error'),
      webmHeld: input.webmHeld ?? true,
    }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read canvas blob'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

export function resolveWebmCaptureCapability(): {
  status: VisualEvidenceCapability
  message: string
} {
  const hasMediaRecorder =
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { MediaRecorder?: unknown }).MediaRecorder !== 'undefined'
  if (!hasMediaRecorder) {
    return {
      status: 'HELD',
      message:
        'MediaRecorder WebM capture is HELD in this runtime. PNG frames or patch hashes still attach to the ledger.',
    }
  }
  return {
    status: 'IMPLEMENTED',
    message: 'MediaRecorder available for previz WebM capture.',
  }
}

/**
 * J.9 cascade: prefer an already-captured WebM/PNG result; else honest patch-hash HELD.
 * Server/Node paths never invent WebM — they attach patch hashes with status HELD.
 * Never promotes empty-ref captures to IMPLEMENTED.
 */
export function resolveVisualEvidenceCascade(input: {
  afterPatch?: string
  label?: string
  /** Browser capture result when viewport MediaRecorder/canvas ran successfully. */
  browserCapture?: VisualEvidenceCaptureResult | null
}): VisualEvidenceCaptureResult {
  if (
    input.browserCapture?.status === 'IMPLEMENTED' &&
    input.browserCapture.refs.length > 0 &&
    (input.browserCapture.byteLength == null || input.browserCapture.byteLength > 0)
  ) {
    return input.browserCapture
  }
  if (input.afterPatch) {
    return capturePatchHashEvidence({ after: input.afterPatch, label: input.label })
  }
  return {
    status: 'HELD',
    kind: 'patch_hash',
    refs: [],
    message:
      'VisualEvidence HELD — no patch candidate and no browser WebM/PNG capture on this surface.',
    contentHash: hashContent('empty'),
    webmHeld: true,
  }
}

export async function captureWebmEvidence(input: {
  canvas: HTMLCanvasElement
  durationMs?: number
  fps?: number
}): Promise<VisualEvidenceCaptureResult> {
  const capability = resolveWebmCaptureCapability()
  if (capability.status === 'HELD') {
    return {
      status: 'HELD',
      kind: 'webm',
      refs: [],
      message: capability.message,
      contentHash: hashContent('held-webm'),
      webmHeld: true,
    }
  }

  const durationMs = input.durationMs ?? 2000
  const fps = input.fps ?? 30

  return new Promise((resolve) => {
    try {
      const stream = input.canvas.captureStream(fps)
      const mimeType = pickWebmMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
        if (!blob || blob.size <= 0) {
          resolve(
            emptyImplementedGuard(
              'webm',
              'MediaRecorder produced empty WebM blob — refusing IMPLEMENTED (Law XVI). PNG fallback may still apply.',
              true,
            ),
          )
          return
        }
        const dataUrl = await blobToDataUrl(blob)
        const contentHash = hashContent(dataUrl.slice(0, 1024))
        resolve({
          status: 'IMPLEMENTED',
          kind: 'webm',
          refs: [`webm:${blob.size}bytes`],
          message: `Captured ${durationMs}ms WebM video evidence.`,
          contentHash,
          webmHeld: false,
          mimeType: blob.type || 'video/webm',
          byteLength: blob.size,
          dataUrl,
        })
      }

      recorder.start()
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop()
        }
      }, durationMs)
    } catch (error) {
      resolve({
        status: 'HELD',
        kind: 'webm',
        refs: [],
        message: error instanceof Error ? error.message : 'MediaRecorder capture failed',
        contentHash: hashContent('error'),
        webmHeld: true,
      })
    }
  })
}

function pickWebmMimeType(): string | undefined {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  const MR = (globalThis as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } })
    .MediaRecorder
  if (!MR?.isTypeSupported) return 'video/webm'
  for (const c of candidates) {
    if (MR.isTypeSupported(c)) return c
  }
  return undefined
}

export type ViewportCanvasLike = HTMLCanvasElement & {
  captureStream?: (frameRate?: number) => MediaStream
}

/**
 * Resolve the studio viewport canvas for J.9 auto-capture.
 * Prefer explicit canvas, then inject resolver (tests), then DOM selectors.
 */
export function resolveViewportCanvas(input?: {
  canvas?: ViewportCanvasLike | null
  canvasSelector?: string
  resolveCanvas?: () => ViewportCanvasLike | null
}): ViewportCanvasLike | null {
  if (input?.canvas) return input.canvas
  if (input?.resolveCanvas) return input.resolveCanvas()
  if (typeof document === 'undefined') return null
  const selectors = [
    input?.canvasSelector,
    'canvas[data-aethel-viewport="true"]',
    'canvas[data-engine-viewport]',
    '[data-aethel-viewport] canvas',
    'canvas',
  ].filter((s): s is string => Boolean(s))
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el instanceof HTMLCanvasElement) return el
  }
  return null
}

/**
 * J.9 auto capture: WebM when MediaRecorder + canvas.captureStream allow;
 * else honest PNG with webmHeld; else HELD. Never IMPLEMENTED + empty blob.
 */
export async function captureViewportVisualEvidenceAuto(input?: {
  canvas?: ViewportCanvasLike | null
  canvasSelector?: string
  resolveCanvas?: () => ViewportCanvasLike | null
  durationMs?: number
  fps?: number
  preferWebm?: boolean
  label?: string
}): Promise<VisualEvidenceCaptureResult> {
  const canvas = resolveViewportCanvas(input)
  if (!canvas) {
    return {
      status: 'HELD',
      kind: 'patch_hash',
      refs: [],
      message:
        'Viewport canvas not found — VisualEvidence auto-capture HELD (no fake WebM). Patch-hash cascade may still apply.',
      contentHash: hashContent(`no-canvas:${input?.label ?? ''}`),
      webmHeld: true,
    }
  }

  const preferWebm = input?.preferWebm !== false
  if (preferWebm && typeof canvas.captureStream === 'function') {
    const webm = await captureWebmEvidence({
      canvas,
      durationMs: input?.durationMs,
      fps: input?.fps,
    })
    if (webm.status === 'IMPLEMENTED' && webm.refs.length > 0 && (webm.byteLength ?? 0) > 0) {
      return webm
    }
    // Honest PNG fallback with WebM HELD flag
    const png = await captureCanvasPngFrames({ canvas, maxFrames: 1, webmHeld: true })
    if (png.status === 'IMPLEMENTED' && png.refs.length > 0) {
      return {
        ...png,
        message: `${png.message} (WebM unavailable or empty — PNG attached with honest MIME).`,
        webmHeld: true,
      }
    }
    return {
      status: 'HELD',
      kind: 'webm',
      refs: [],
      message: webm.message || 'WebM and PNG viewport capture both failed — VisualEvidence HELD.',
      contentHash: webm.contentHash,
      webmHeld: true,
    }
  }

  const pngOnly = await captureCanvasPngFrames({ canvas, maxFrames: 1, webmHeld: true })
  return pngOnly
}
