/**
 * Letter bo — Law VI AethelPack Zstd WASM compression (Zero-MVP honesty).
 * Prefer real Zstd encode/decode; pako deflate remains honest fallback.
 * BC7/ASTC/VT/Rust cook remain HELD.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  writeAethelPack,
  readAethelPack,
  proveJsAethelPackCookRoundTrip,
} from '@/lib/immunity/aethel-pack-writer'
import {
  ensureZstdEncoder,
  probeZstdEncoder,
  compressAethelPackPayload,
  decompressAethelPackPayload,
  resolveJsCookCompression,
} from '@/lib/immunity/aethel-pack-compress'
import { probeAethelPackRustCookWorker } from '@/lib/immunity/aethel-pack-rust-probe'
import { evaluateAaaProductionHonesty } from '@/lib/immunity/aaa-production-capability'

describe('Law VI AethelPack Zstd WASM (bo)', () => {
  beforeAll(async () => {
    const probe = await ensureZstdEncoder()
    expect(probe.zstdEncoderReady).toBe(true)
  })

  it('probes Zstd ready after encode/decode prove', () => {
    const probe = probeZstdEncoder()
    expect(probe.zstdEncoderReady).toBe(true)
    expect(probe.engine).toBe('@bokuweb/zstd-wasm')
    expect(resolveJsCookCompression()).toBe('zstd')
  })

  it('round-trips compress/decompress via Zstd', () => {
    // Compressible payload — random bytes may expand under Zstd framing.
    const raw = new TextEncoder().encode(('aethel-zstd-bo-' + 'ABCD'.repeat(64)).repeat(4))
    const { compressed, compression } = compressAethelPackPayload(raw, 'zstd')
    expect(compression).toBe('zstd')
    expect(compressed.byteLength).toBeGreaterThan(0)
    expect(compressed.byteLength).toBeLessThan(raw.byteLength)
    const back = decompressAethelPackPayload(compressed, 'zstd')
    expect(Array.from(back)).toEqual(Array.from(raw))
  })

  it('packs with Zstd when ready and round-trips assets', () => {
    const tex = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120])
    const mesh = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    const written = writeAethelPack({
      buildId: 'bo-build',
      projectId: 'bo-project',
      textures: [
        {
          assetId: 'albedo',
          codec: 'rgba8-fallback',
          width: 2,
          height: 2,
          bytes: tex,
        },
      ],
      meshes: [
        {
          assetId: 'hero',
          codec: 'raw-gltf',
          bytes: mesh,
        },
      ],
    })
    expect(written.ok).toBe(true)
    expect(written.cookPackReady).toBe(true)
    expect(written.compression).toBe('zstd')
    expect(written.manifest.compression).toBe('zstd')

    const read = readAethelPack(written.packBytes)
    expect(read.ok).toBe(true)
    expect(read.cookPackReady).toBe(true)
    expect(Array.from(read.assets.find((a) => a.kind === 'texture')!.bytes)).toEqual(
      Array.from(tex),
    )
    expect(Array.from(read.assets.find((a) => a.kind === 'mesh')!.bytes)).toEqual(
      Array.from(mesh),
    )
  })

  it('still supports honest deflate override', () => {
    const tex = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const written = writeAethelPack({
      buildId: 'bo-deflate',
      projectId: 'bo-deflate',
      compression: 'deflate',
      textures: [
        {
          assetId: 't',
          codec: 'rgba8-fallback',
          width: 2,
          height: 1,
          bytes: tex,
        },
      ],
    })
    expect(written.ok).toBe(true)
    expect(written.compression).toBe('deflate')
    const read = readAethelPack(written.packBytes)
    expect(read.ok).toBe(true)
    expect(Array.from(read.assets[0].bytes)).toEqual(Array.from(tex))
  })

  it('AAA honesty flips zstdEncoderReady; BC7/ASTC/VT/Rust stay HELD', () => {
    const round = proveJsAethelPackCookRoundTrip()
    expect(round.cookPackReady).toBe(true)
    expect(round.reason).toMatch(/zstd/i)

    const report = evaluateAaaProductionHonesty()
    expect(report.capability.cookPackReady).toBe(true)
    expect(report.capability.zstdEncoderReady).toBe(true)
    expect(report.capability.nativeGpuEncodeReady).toBe(false)
    expect(report.capability.marketingAaaProductionAllowed).toBe(false)
    const gap1 = report.gaps.find((g) => g.id === 1)!
    expect(gap1.shipStatus).toBe('CLOSED')
    expect(gap1.notes.some((n) => /Zstd WASM encoder CLOSED/i.test(n))).toBe(true)
    expect(gap1.notes.some((n) => /BC7\/ASTC/i.test(n))).toBe(true)
    expect(gap1.notes.some((n) => /Virtual texturing cook HELD/i.test(n))).toBe(true)

    const rust = probeAethelPackRustCookWorker({
      rustcAvailable: false,
      cargoAvailable: false,
      cargoTomlPresent: true,
    })
    expect(rust.status).toBe('held')
    expect(rust.bc7EncoderReady).toBe(false)
    expect(rust.astcEncoderReady).toBe(false)
    expect(rust.virtualTexturingCookReady).toBe(false)
  })
})
