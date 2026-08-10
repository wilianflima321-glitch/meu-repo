/**
 * Onda M.2 — Zero-Copy IO / AssetStream substrate (honest PARTIAL).
 *
 * In-process page views over SharedArrayBuffer/ArrayBuffer — not DirectStorage.
 * `directStorageReady` / web DirectStorage marketing always false.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('zero-copy-asset-stream')

/** Desktop DirectStorage / GPU decompress — always false until Founder M.2 soak. */
export const DIRECT_STORAGE_READY = false as const
export const DIRECT_STORAGE_MARKETING_ALLOWED = false as const
/** Web builds must never claim DirectStorage (Immunity Spec §2 / Law #55). */
export const WEB_DIRECT_STORAGE_FORBIDDEN = true as const

export type AssetStreamRejectCode =
  | 'invalid_input'
  | 'range_oob'
  | 'empty_payload'
  | 'hash_mismatch'
  | 'direct_storage_held'
  | 'web_direct_storage_forbidden'

export type AssetStreamResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: AssetStreamRejectCode; message: string }

export type AssetStreamPageRequest = {
  assetId: string
  byteOffset: number
  byteLength: number
  priority: number
}

export type AssetStreamPageView = {
  assetId: string
  byteOffset: number
  byteLength: number
  /** Zero-copy view into backing store (SAB or ArrayBuffer). */
  view: Uint8Array
  contentHash: string
  zeroCopy: true
  directStorage: false
}

export type ZeroCopyAssetStream = {
  version: 1
  backingKind: 'shared-array-buffer' | 'array-buffer'
  capacityBytes: number
  usedBytes: number
  directStorageReady: false
  directStorageMarketingAllowed: false
  webDirectStorageForbidden: true
}

function digestBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16)
}

/**
 * Create an in-process zero-copy stream buffer (SAB when available, else ArrayBuffer).
 * Does not open NVMe / DirectStorage handles.
 */
export function createZeroCopyAssetStream(input?: {
  capacityBytes?: number
}): ZeroCopyAssetStream & { buffer: ArrayBuffer | SharedArrayBuffer } {
  const capacityBytes = Math.max(256, Math.min(input?.capacityBytes ?? 64 * 1024, 4 * 1024 * 1024))
  let buffer: ArrayBuffer | SharedArrayBuffer
  let backingKind: ZeroCopyAssetStream['backingKind'] = 'array-buffer'
  try {
    if (typeof SharedArrayBuffer !== 'undefined') {
      buffer = new SharedArrayBuffer(capacityBytes)
      backingKind = 'shared-array-buffer'
    } else {
      buffer = new ArrayBuffer(capacityBytes)
    }
  } catch {
    buffer = new ArrayBuffer(capacityBytes)
    backingKind = 'array-buffer'
  }

  return {
    version: 1,
    backingKind,
    capacityBytes,
    usedBytes: 0,
    directStorageReady: false,
    directStorageMarketingAllowed: false,
    webDirectStorageForbidden: true,
    buffer,
  }
}

/**
 * Fulfill a range request by copying source bytes into the stream buffer and
 * returning a Uint8Array view (zero-copy relative to the stream backing store).
 */
export function fulfillAssetStreamRange(
  stream: ZeroCopyAssetStream & { buffer: ArrayBuffer | SharedArrayBuffer },
  request: AssetStreamPageRequest,
  sourceBytes: Uint8Array,
): AssetStreamResult<{ stream: ZeroCopyAssetStream & { buffer: ArrayBuffer | SharedArrayBuffer }; page: AssetStreamPageView }> {
  if (!request.assetId?.trim()) {
    return { ok: false, code: 'invalid_input', message: 'assetId required' }
  }
  if (!Number.isFinite(request.byteOffset) || request.byteOffset < 0) {
    return { ok: false, code: 'invalid_input', message: 'byteOffset must be >= 0' }
  }
  if (!Number.isFinite(request.byteLength) || request.byteLength <= 0) {
    return { ok: false, code: 'invalid_input', message: 'byteLength must be > 0' }
  }
  if (sourceBytes.byteLength === 0) {
    return { ok: false, code: 'empty_payload', message: 'source bytes empty — refuse empty stream page' }
  }
  if (request.byteOffset + request.byteLength > sourceBytes.byteLength) {
    return { ok: false, code: 'range_oob', message: 'range exceeds source payload' }
  }

  const writeAt = stream.usedBytes
  if (writeAt + request.byteLength > stream.capacityBytes) {
    return {
      ok: false,
      code: 'range_oob',
      message: 'stream capacity exceeded — enlarge buffer or evict (DirectStorage not available)',
    }
  }

  const backing = new Uint8Array(stream.buffer)
  const slice = sourceBytes.subarray(request.byteOffset, request.byteOffset + request.byteLength)
  backing.set(slice, writeAt)
  const view = backing.subarray(writeAt, writeAt + request.byteLength)
  const contentHash = digestBytes(view)

  const nextStream = {
    ...stream,
    usedBytes: writeAt + request.byteLength,
    directStorageReady: false as const,
    directStorageMarketingAllowed: false as const,
    webDirectStorageForbidden: true as const,
  }

  const page: AssetStreamPageView = {
    assetId: request.assetId.trim(),
    byteOffset: request.byteOffset,
    byteLength: request.byteLength,
    view,
    contentHash,
    zeroCopy: true,
    directStorage: false,
  }

  log.info('asset_stream_range_fulfilled', {
    assetId: page.assetId,
    byteLength: page.byteLength,
    backingKind: stream.backingKind,
    directStorage: false,
  })

  return { ok: true, value: { stream: nextStream, page } }
}

export function claimDirectStorageReady(): AssetStreamResult<never> {
  return {
    ok: false,
    code: 'direct_storage_held',
    message: 'DIRECT_STORAGE_READY=false — in-process AssetStream ≠ Windows DirectStorage / GPU decompress',
  }
}

export function claimWebDirectStorageMarketing(): AssetStreamResult<never> {
  return {
    ok: false,
    code: 'web_direct_storage_forbidden',
    message: 'WEB_DIRECT_STORAGE_FORBIDDEN — web path uses VT/Range Fetch only (Immunity Spec M.2)',
  }
}

export function probeZeroCopyAssetStreamReadiness(): {
  id: 'M2-asset-stream'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  directStorageReady: false
  directStorageMarketingAllowed: false
  path: string
  note: string
} {
  let stream = createZeroCopyAssetStream({ capacityBytes: 4096 })
  const payload = new Uint8Array(512)
  for (let i = 0; i < payload.length; i++) payload[i] = i & 0xff

  const page = fulfillAssetStreamRange(
    stream,
    { assetId: 'probe-asset', byteOffset: 16, byteLength: 128, priority: 1 },
    payload,
  )
  if (!page.ok) {
    return {
      id: 'M2-asset-stream',
      status: 'NOT_IMPLEMENTED',
      ready: false,
      directStorageReady: false,
      directStorageMarketingAllowed: false,
      path: 'lib/immunity/zero-copy-asset-stream.ts',
      note: 'Zero-copy AssetStream probe failed.',
    }
  }
  stream = page.value.stream

  const empty = fulfillAssetStreamRange(
    stream,
    { assetId: 'empty', byteOffset: 0, byteLength: 1, priority: 1 },
    new Uint8Array(0),
  )
  const ds = claimDirectStorageReady()
  const web = claimWebDirectStorageMarketing()

  const ready =
    page.value.page.zeroCopy === true &&
    page.value.page.directStorage === false &&
    page.value.page.view.byteLength === 128 &&
    page.value.page.contentHash.length >= 8 &&
    !empty.ok &&
    !ds.ok &&
    !web.ok &&
    DIRECT_STORAGE_READY === false &&
    DIRECT_STORAGE_MARKETING_ALLOWED === false &&
    WEB_DIRECT_STORAGE_FORBIDDEN === true

  return {
    id: 'M2-asset-stream',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    directStorageReady: false,
    directStorageMarketingAllowed: false,
    path: 'lib/immunity/zero-copy-asset-stream.ts',
    note: ready
      ? `Zero-copy AssetStream (${stream.backingKind}) page views PARTIAL; DirectStorage / web DS marketing HELD.`
      : 'Zero-copy AssetStream probe failed.',
  }
}
