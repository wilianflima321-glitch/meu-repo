/**
 * Onda M.2 — Zero-Copy AssetStream (DirectStorage marketing HELD).
 */

import { describe, expect, it } from 'vitest'

import {
  DIRECT_STORAGE_MARKETING_ALLOWED,
  DIRECT_STORAGE_READY,
  WEB_DIRECT_STORAGE_FORBIDDEN,
  claimDirectStorageReady,
  claimWebDirectStorageMarketing,
  createZeroCopyAssetStream,
  fulfillAssetStreamRange,
  probeZeroCopyAssetStreamReadiness,
} from '@/lib/immunity/zero-copy-asset-stream'

describe('Zero-Copy AssetStream', () => {
  it('fulfills range pages as zero-copy views without DirectStorage', () => {
    let stream = createZeroCopyAssetStream({ capacityBytes: 2048 })
    expect(stream.directStorageReady).toBe(false)
    expect(stream.webDirectStorageForbidden).toBe(true)

    const src = new Uint8Array(256)
    for (let i = 0; i < src.length; i++) src[i] = (i * 3) & 0xff

    const fulfilled = fulfillAssetStreamRange(
      stream,
      { assetId: 'mesh.bin', byteOffset: 32, byteLength: 64, priority: 2 },
      src,
    )
    expect(fulfilled.ok).toBe(true)
    if (!fulfilled.ok) return
    stream = fulfilled.value.stream
    expect(fulfilled.value.page.zeroCopy).toBe(true)
    expect(fulfilled.value.page.directStorage).toBe(false)
    expect(fulfilled.value.page.view.byteLength).toBe(64)
    expect(fulfilled.value.page.view[0]).toBe(src[32])
    expect(stream.usedBytes).toBe(64)
  })

  it('rejects empty payloads and DirectStorage marketing claims', () => {
    const stream = createZeroCopyAssetStream({ capacityBytes: 512 })
    const empty = fulfillAssetStreamRange(
      stream,
      { assetId: 'x', byteOffset: 0, byteLength: 1, priority: 1 },
      new Uint8Array(0),
    )
    expect(empty.ok).toBe(false)
    expect(claimDirectStorageReady().ok).toBe(false)
    expect(claimWebDirectStorageMarketing().ok).toBe(false)
    expect(DIRECT_STORAGE_READY).toBe(false)
    expect(DIRECT_STORAGE_MARKETING_ALLOWED).toBe(false)
    expect(WEB_DIRECT_STORAGE_FORBIDDEN).toBe(true)
  })

  it('probe stays PARTIAL with DirectStorage false', () => {
    const probe = probeZeroCopyAssetStreamReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.directStorageReady).toBe(false)
    expect(probe.directStorageMarketingAllowed).toBe(false)
  })
})
