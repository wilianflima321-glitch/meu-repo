/**
 * Letter bn — Law VI AethelPack native cook deepen (Zero-MVP honesty).
 * Pack round-trip + publish cook gate; BC7/ASTC/VT HELD.
 */

import { describe, expect, it } from 'vitest'
import {
  writeAethelPack,
  readAethelPack,
  proveJsAethelPackCookRoundTrip,
} from '@/lib/immunity/aethel-pack-writer'
import { probeAethelPackRustCookWorker } from '@/lib/immunity/aethel-pack-rust-probe'
import {
  runAethelPackCookPublishStage,
  proveCookPackReadyFromJsWriter,
} from '@/lib/immunity/cook-publish-stage'
import { evaluatePublishAssetCookStage } from '@/lib/production/publish-pipeline-orchestrator'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'

describe('Law VI AethelPack writer round-trip (bn)', () => {
  it('packs multiple assets with checksums and round-trips', () => {
    const tex = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80])
    const mesh = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    const written = writeAethelPack({
      buildId: 'bn-build',
      projectId: 'bn-project',
      compression: 'deflate',
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
    expect(written.packByteLength).toBeGreaterThan(0)
    expect(written.cookPackReady).toBe(true)
    expect(written.compression).toBe('deflate')
    expect(written.manifest.textures[0].casHash).toMatch(/^[a-f0-9]{64}$/)
    expect(written.manifest.meshes[0].casHash).toMatch(/^[a-f0-9]{64}$/)

    const read = readAethelPack(written.packBytes)
    expect(read.ok).toBe(true)
    expect(read.cookPackReady).toBe(true)
    expect(read.assets).toHaveLength(2)
    expect(Array.from(read.assets.find((a) => a.kind === 'texture')!.bytes)).toEqual(
      Array.from(tex),
    )
    expect(Array.from(read.assets.find((a) => a.kind === 'mesh')!.bytes)).toEqual(Array.from(mesh))
    expect(read.packSha256).toBe(written.packSha256)
  })

  it('rejects empty asset bytes and empty pack read', () => {
    const bad = writeAethelPack({
      buildId: 'b',
      projectId: 'p',
      textures: [
        {
          assetId: 'empty',
          codec: 'rgba8-fallback',
          width: 1,
          height: 1,
          bytes: new Uint8Array(0),
        },
      ],
    })
    expect(bad.ok).toBe(false)
    expect(bad.cookPackReady).toBe(false)
    expect(bad.packByteLength).toBe(0)

    const emptyRead = readAethelPack(new Uint8Array(0))
    expect(emptyRead.ok).toBe(false)
    expect(emptyRead.cookPackReady).toBe(false)
  })

  it('Rust cook worker HELD without toolchain; deflate path remains honest', () => {
    const rust = probeAethelPackRustCookWorker({
      rustcAvailable: false,
      cargoAvailable: false,
      cargoTomlPresent: true,
    })
    expect(rust.status).toBe('held')
    expect(rust.bc7EncoderReady).toBe(false)
    expect(rust.astcEncoderReady).toBe(false)
    expect(rust.virtualTexturingCookReady).toBe(false)

    // Forced deflate still works even when Zstd may be ready elsewhere (letter bo).
    const tex = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2])
    const written = writeAethelPack({
      buildId: 'bn-deflate',
      projectId: 'bn-deflate',
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
    expect(written.compression).toBe('deflate')
    expect(written.cookPackReady).toBe(true)
  })
})

describe('Publish cook stage Law XVI honesty (bn)', () => {
  it('never success with empty pack bytes', () => {
    const blocked = runAethelPackCookPublishStage({
      projectId: 'p',
      buildId: 'b',
      packBytes: new Uint8Array(0),
    })
    expect(blocked.success).toBe(false)
    expect(blocked.cookPackReady).toBe(false)
    expect(blocked.bc7AstcHeld).toBe(true)

    const gate = evaluatePublishAssetCookStage({
      projectId: 'p',
      buildId: 'b',
      packBytes: new Uint8Array(0),
    })
    expect(gate.success).toBe(false)
    expect(gate.allowed).toBe(false)
    expect(gate.packByteLength).toBe(0)
  })

  it('passes publish gate with cooked assets', () => {
    const gate = evaluatePublishAssetCookStage({
      projectId: 'p',
      buildId: 'b',
      cookAssets: {
        textures: [
          {
            assetId: 't',
            codec: 'rgba8-fallback',
            width: 1,
            height: 1,
            bytes: new Uint8Array([1, 2, 3, 4]),
          },
        ],
        meshes: [
          {
            assetId: 'm',
            codec: 'raw-gltf',
            bytes: new Uint8Array([5, 6, 7, 8]),
          },
        ],
      },
    })
    expect(gate.allowed).toBe(true)
    expect(gate.cookPackReady).toBe(true)
    expect(gate.packByteLength).toBeGreaterThan(0)
    expect(gate.bc7AstcHeld).toBe(true)
    expect(gate.shipStatus).toBe('PARTIAL')
  })
})

describe('AAA honesty cookPackReady flip (bn)', () => {
  it('auto-proves JS pack path; GPU encode stays false', () => {
    const proof = proveCookPackReadyFromJsWriter()
    expect(proof.cookPackReady).toBe(true)
    expect(proof.packByteLength).toBeGreaterThan(0)

    const round = proveJsAethelPackCookRoundTrip()
    expect(round.cookPackReady).toBe(true)

    const report = evaluateAaaProductionHonesty()
    expect(report.capability.cookPackReady).toBe(true)
    expect(report.capability.nativeGpuEncodeReady).toBe(false)
    expect(report.capability.marketingAaaProductionAllowed).toBe(false)
    const gap1 = report.gaps.find((g) => g.id === 1)!
    expect(gap1.shipStatus).toBe('CLOSED')
    expect(gap1.notes.some((n) => /BC7\/ASTC/i.test(n))).toBe(true)

    const forcedOff = probeAaaProductionCapability({ cookPackProven: false })
    expect(forcedOff.cookPackReady).toBe(false)
  })
})
