/**
 * AI-v1-c / J.9 — VisualEvidence capture helpers.
 * Browser: OffscreenCanvas / canvas PNG frames.
 * WebM via MediaRecorder when available; else honest HELD + patch-hash fallback.
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
}

function hashContent(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
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
  }
}

/**
 * Browser-only: capture an HTMLCanvasElement / OffscreenCanvas to PNG data URL.
 * Returns HELD when canvas APIs are unavailable (SSR / Node).
 */
export async function captureCanvasPngFrames(input: {
  canvas: { width: number; height: number; convertToBlob?: (opts: { type: string }) => Promise<Blob>; toDataURL?: (type: string) => string }
  maxFrames?: number
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
        dataUrl = await blobToDataUrl(blob)
      } else {
        return {
          status: 'HELD',
          kind: 'png_frames',
          refs: [],
          message: 'Canvas capture API unavailable on this runtime.',
          contentHash: hashContent('unavailable'),
        }
      }
      frames.push({
        index: i,
        mimeType: 'image/png',
        dataUrl,
        byteLength: Math.ceil((dataUrl.length * 3) / 4),
      })
    }

    const contentHash = hashContent(frames.map((f) => f.dataUrl.slice(0, 64)).join('|'))
    return {
      status: 'IMPLEMENTED',
      kind: 'png_frames',
      refs: frames.map((f) => `frame:${f.index}:${f.byteLength}`),
      frames,
      message: `Captured ${frames.length} PNG previz frame(s) for the evidence ledger.`,
      contentHash,
    }
  } catch (error) {
    return {
      status: 'HELD',
      kind: 'png_frames',
      refs: [],
      message: error instanceof Error ? error.message : 'Canvas capture failed',
      contentHash: hashContent('error'),
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
