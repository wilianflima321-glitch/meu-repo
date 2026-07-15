/**
 * Letter bo — AethelPack compression helpers.
 * Prefer real Zstd via `@bokuweb/zstd-wasm` when encode/decode prove ready;
 * otherwise honest pako deflate fallback. Never claim 'zstd' without a proven encoder.
 */

import pako from 'pako'
import { compress as zstdCompress, decompress as zstdDecompress, init as zstdInit } from '@bokuweb/zstd-wasm'

export type AethelPackJsCompression = 'zstd' | 'deflate' | 'none'

export interface ZstdEncoderProbe {
  zstdEncoderReady: boolean
  engine: '@bokuweb/zstd-wasm' | null
  reason: string
}

type ZstdState = 'untried' | 'ready' | 'failed'

let zstdState: ZstdState = 'untried'
let zstdFailReason =
  'Zstd WASM not initialized — call ensureZstdEncoder() before preferring zstd'
let zstdEnsurePromise: Promise<ZstdEncoderProbe> | null = null

const ZSTD_LEVEL = 3
const ZSTD_PROBE_PAYLOAD = new TextEncoder().encode(
  'aethel-pack-zstd-probe-v1:' + 'x'.repeat(64),
)

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Sync probe — ready only after ensureZstdEncoder proved encode↔decode.
 */
export function probeZstdEncoder(): ZstdEncoderProbe {
  if (zstdState === 'ready') {
    return {
      zstdEncoderReady: true,
      engine: '@bokuweb/zstd-wasm',
      reason: 'Zstd WASM encode/decode round-trip proven (@bokuweb/zstd-wasm)',
    }
  }
  return {
    zstdEncoderReady: false,
    engine: null,
    reason:
      zstdState === 'failed'
        ? zstdFailReason
        : 'Zstd WASM not yet proven — using pako deflate until ensureZstdEncoder() succeeds',
  }
}

/**
 * Init WASM + prove compress→decompress. Idempotent. Flip ready only on real round-trip.
 */
export async function ensureZstdEncoder(): Promise<ZstdEncoderProbe> {
  if (zstdState === 'ready') return probeZstdEncoder()
  if (zstdState === 'failed') return probeZstdEncoder()
  if (zstdEnsurePromise) return zstdEnsurePromise

  zstdEnsurePromise = (async (): Promise<ZstdEncoderProbe> => {
    try {
      await zstdInit()
      const compressed = zstdCompress(ZSTD_PROBE_PAYLOAD, ZSTD_LEVEL)
      if (!(compressed instanceof Uint8Array) || compressed.byteLength === 0) {
        throw new Error('zstd compress returned empty bytes')
      }
      const roundTrip = zstdDecompress(compressed)
      if (!bytesEqual(new Uint8Array(roundTrip), ZSTD_PROBE_PAYLOAD)) {
        throw new Error('zstd decompress round-trip mismatch')
      }
      zstdState = 'ready'
      zstdFailReason = ''
      return probeZstdEncoder()
    } catch (err) {
      zstdState = 'failed'
      zstdFailReason =
        err instanceof Error
          ? `Zstd WASM init/prove failed: ${err.message} — falling back to pako deflate`
          : 'Zstd WASM init/prove failed — falling back to pako deflate'
      return probeZstdEncoder()
    } finally {
      zstdEnsurePromise = null
    }
  })()

  return zstdEnsurePromise
}

/** Test/reset helper — do not use in production paths. */
export function __resetZstdEncoderProbeForTests(): void {
  zstdState = 'untried'
  zstdFailReason =
    'Zstd WASM not initialized — call ensureZstdEncoder() before preferring zstd'
  zstdEnsurePromise = null
}

/**
 * Compress pack payload bytes.
 * Prefer Zstd when mode is zstd and encoder ready; otherwise honest deflate/none.
 * Never emits zstd-labeled empty or fake frames.
 */
export function compressAethelPackPayload(
  bytes: Uint8Array,
  mode: AethelPackJsCompression = 'deflate',
): { compressed: Uint8Array; compression: AethelPackJsCompression } {
  if (mode === 'none' || bytes.byteLength === 0) {
    return { compressed: bytes, compression: 'none' }
  }

  if (mode === 'zstd') {
    const probe = probeZstdEncoder()
    if (probe.zstdEncoderReady) {
      const compressed = zstdCompress(bytes, ZSTD_LEVEL)
      return { compressed: new Uint8Array(compressed), compression: 'zstd' }
    }
    // Honest fallback — do not claim zstd without a proven encoder.
    const compressed = pako.deflate(bytes, { level: 6 })
    return { compressed: new Uint8Array(compressed), compression: 'deflate' }
  }

  const compressed = pako.deflate(bytes, { level: 6 })
  return { compressed: new Uint8Array(compressed), compression: 'deflate' }
}

export function decompressAethelPackPayload(
  bytes: Uint8Array,
  compression: AethelPackJsCompression,
): Uint8Array {
  if (compression === 'none') return bytes
  if (compression === 'zstd') {
    const probe = probeZstdEncoder()
    if (!probe.zstdEncoderReady) {
      throw new Error(
        'Cannot decompress zstd payload — Zstd WASM not ready (call ensureZstdEncoder first)',
      )
    }
    return new Uint8Array(zstdDecompress(bytes))
  }
  return new Uint8Array(pako.inflate(bytes))
}

/** Prefer Zstd when proven; else pako deflate. */
export function resolveJsCookCompression(): AethelPackJsCompression {
  return probeZstdEncoder().zstdEncoderReady ? 'zstd' : 'deflate'
}
