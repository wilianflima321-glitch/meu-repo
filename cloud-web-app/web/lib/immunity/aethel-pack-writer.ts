/**
 * Letter bo — AethelPack binary writer/reader (Law VI Distributed Cook).
 * Multi-asset pack with SHA-256 casHashes. Prefers Zstd WASM when proven (bo);
 * honest pako deflate fallback. BC7/ASTC native encode remains HELD.
 */

import { createHash } from 'node:crypto'
import {
  AETHEL_PACK_MAGIC,
  AETHEL_PACK_VERSION,
  type AethelCompression,
  type AethelMeshCodec,
  type AethelPackManifest,
  type AethelTextureCodec,
  validateAethelPackManifest,
} from './aethel-pack-manifest'
import {
  compressAethelPackPayload,
  decompressAethelPackPayload,
  resolveJsCookCompression,
  type AethelPackJsCompression,
} from './aethel-pack-compress'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export interface AethelPackTextureInput {
  assetId: string
  /** JS cook path: only rgba8-fallback or ktx2-basis — never invent BC7/ASTC bytes. */
  codec: Extract<AethelTextureCodec, 'rgba8-fallback' | 'ktx2-basis'>
  width: number
  height: number
  mipCount?: number
  bytes: Uint8Array
}

export interface AethelPackMeshInput {
  assetId: string
  codec: AethelMeshCodec
  lodCount?: number
  bytes: Uint8Array
}

export interface AethelPackWriteInput {
  buildId: string
  projectId: string
  textures?: AethelPackTextureInput[]
  meshes?: AethelPackMeshInput[]
  /** Override compression; default prefers Zstd when ensureZstdEncoder proven, else deflate. */
  compression?: AethelPackJsCompression
}

export interface AethelPackWriteResult {
  ok: boolean
  packBytes: Uint8Array
  packByteLength: number
  packSha256: string
  manifest: AethelPackManifest
  cookPackReady: boolean
  errors: string[]
  warnings: string[]
  compression: AethelCompression
  /** True when non-empty pack bytes + checksums validated. */
  bakerArtifactsPresent: boolean
}

export interface AethelPackReadResult {
  ok: boolean
  manifest: AethelPackManifest | null
  packSha256: string
  assets: Array<{ assetId: string; kind: 'texture' | 'mesh'; bytes: Uint8Array; casHash: string }>
  errors: string[]
  cookPackReady: boolean
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function toManifestCompression(js: AethelPackJsCompression): AethelCompression {
  // Honest enum: only claim 'zstd' when compress actually used Zstd (letter bo).
  if (js === 'none') return 'none'
  if (js === 'zstd') return 'zstd'
  return 'deflate'
}

/**
 * Pack multiple assets into a non-empty `.aethelpack` binary.
 * Layout: magic(4) + version u32 + flags u32 + manifestLen u32 + manifest JSON + payload.
 * Payload is per-asset compressed (zstd preferred / deflate fallback); casHash is SHA-256 of logical bytes.
 */
export function writeAethelPack(input: AethelPackWriteInput): AethelPackWriteResult {
  const errors: string[] = []
  const warnings: string[] = []
  const textures = input.textures ?? []
  const meshes = input.meshes ?? []

  if (!input.buildId?.trim()) errors.push('buildId required')
  if (!input.projectId?.trim()) errors.push('projectId required')
  if (textures.length + meshes.length === 0) {
    errors.push('AethelPack write requires at least one texture or mesh asset')
  }

  for (const tex of textures) {
    if (!tex.bytes?.byteLength) errors.push(`texture ${tex.assetId}: empty bytes forbidden`)
    if (tex.codec !== 'rgba8-fallback' && tex.codec !== 'ktx2-basis') {
      errors.push(`texture ${tex.assetId}: JS cook forbids inventing ${String(tex.codec)} GPU encode`)
    }
  }
  for (const mesh of meshes) {
    if (!mesh.bytes?.byteLength) errors.push(`mesh ${mesh.assetId}: empty bytes forbidden`)
  }

  if (errors.length > 0) {
    const emptyManifest: AethelPackManifest = {
      magic: AETHEL_PACK_MAGIC,
      version: AETHEL_PACK_VERSION,
      buildId: input.buildId || '',
      projectId: input.projectId || '',
      compression: 'none',
      textures: [],
      meshes: [],
      psoVault: [],
      wasmModules: [],
      bakerArtifactsPresent: false,
      virtualTexturingReady: false,
    }
    return {
      ok: false,
      packBytes: new Uint8Array(0),
      packByteLength: 0,
      packSha256: '',
      manifest: emptyManifest,
      cookPackReady: false,
      errors,
      warnings,
      compression: 'none',
      bakerArtifactsPresent: false,
    }
  }

  const jsCompression = input.compression ?? resolveJsCookCompression()
  const payloadParts: Uint8Array[] = []
  let offset = 0
  const textureSlots: AethelPackManifest['textures'] = []
  const meshSlots: AethelPackManifest['meshes'] = []

  let usedCompression: AethelPackJsCompression = 'none'

  for (const tex of textures) {
    const casHash = sha256Hex(tex.bytes)
    const { compressed, compression } = compressAethelPackPayload(tex.bytes, jsCompression)
    usedCompression = compression
    textureSlots.push({
      assetId: tex.assetId,
      codec: tex.codec,
      width: tex.width,
      height: tex.height,
      mipCount: tex.mipCount ?? 1,
      casHash,
      byteOffset: offset,
      byteLength: compressed.byteLength,
    })
    payloadParts.push(compressed)
    offset += compressed.byteLength
  }

  for (const mesh of meshes) {
    const casHash = sha256Hex(mesh.bytes)
    const { compressed, compression } = compressAethelPackPayload(mesh.bytes, jsCompression)
    usedCompression = compression
    meshSlots.push({
      assetId: mesh.assetId,
      codec: mesh.codec,
      lodCount: mesh.lodCount ?? 1,
      casHash,
      byteOffset: offset,
      byteLength: compressed.byteLength,
    })
    payloadParts.push(compressed)
    offset += compressed.byteLength
  }

  const rawPayload = concatUint8(payloadParts)
  // Payload already per-asset compressed; store as-is (no second wrap).
  // Manifest compression reflects what was actually written (honest fallback may demote zstd→deflate).
  const manifestCompression = toManifestCompression(usedCompression)

  const manifest: AethelPackManifest = {
    magic: AETHEL_PACK_MAGIC,
    version: AETHEL_PACK_VERSION,
    buildId: input.buildId,
    projectId: input.projectId,
    compression: manifestCompression,
    textures: textureSlots,
    meshes: meshSlots,
    psoVault: [],
    wasmModules: [],
    bakerArtifactsPresent: true,
    virtualTexturingReady: false,
  }

  const validation = validateAethelPackManifest(manifest)
  if (!validation.ok) {
    errors.push(...validation.errors)
  }
  warnings.push(...validation.warnings)
  warnings.push(
    'BC7/ASTC native encode HELD — pack uses rgba8-fallback/ktx2-basis slots only on JS cook path',
  )
  warnings.push('Virtual texturing cook HELD — virtualTexturingReady=false')

  if (errors.length > 0) {
    return {
      ok: false,
      packBytes: new Uint8Array(0),
      packByteLength: 0,
      packSha256: '',
      manifest: { ...manifest, bakerArtifactsPresent: false },
      cookPackReady: false,
      errors,
      warnings,
      compression: manifestCompression,
      bakerArtifactsPresent: false,
    }
  }

  const manifestJson = textEncoder.encode(JSON.stringify(manifest))
  const header = new ArrayBuffer(16)
  const view = new DataView(header)
  // magic written separately as ASCII
  view.setUint32(0, AETHEL_PACK_VERSION, true)
  view.setUint32(4, 0 /* flags */, true)
  view.setUint32(8, manifestJson.byteLength, true)
  view.setUint32(12, rawPayload.byteLength, true)

  const magicBytes = textEncoder.encode(AETHEL_PACK_MAGIC)
  const packBytes = concatUint8([magicBytes, new Uint8Array(header), manifestJson, rawPayload])
  const packSha256 = sha256Hex(packBytes)
  const cookPackReady =
    packBytes.byteLength > 0 &&
    validation.cookPackReady &&
    manifest.bakerArtifactsPresent

  return {
    ok: true,
    packBytes,
    packByteLength: packBytes.byteLength,
    packSha256,
    manifest,
    cookPackReady,
    errors: [],
    warnings,
    compression: manifestCompression,
    bakerArtifactsPresent: true,
  }
}

/**
 * Read + verify an `.aethelpack`. Fail-closed on empty bytes, bad magic, or casHash mismatch.
 */
export function readAethelPack(packBytes: Uint8Array): AethelPackReadResult {
  const errors: string[] = []
  if (!packBytes?.byteLength) {
    return {
      ok: false,
      manifest: null,
      packSha256: '',
      assets: [],
      errors: ['empty .aethelpack bytes — Law XVI honesty forbid success'],
      cookPackReady: false,
    }
  }

  const packSha256 = sha256Hex(packBytes)
  if (packBytes.byteLength < 20) {
    return {
      ok: false,
      manifest: null,
      packSha256,
      assets: [],
      errors: ['pack too short for AETH header'],
      cookPackReady: false,
    }
  }

  const magic = textDecoder.decode(packBytes.subarray(0, 4))
  if (magic !== AETHEL_PACK_MAGIC) {
    return {
      ok: false,
      manifest: null,
      packSha256,
      assets: [],
      errors: [`invalid magic ${magic}`],
      cookPackReady: false,
    }
  }

  const view = new DataView(packBytes.buffer, packBytes.byteOffset + 4, 16)
  const version = view.getUint32(0, true)
  // flags at offset 4 unused
  const manifestLen = view.getUint32(8, true)
  const payloadLen = view.getUint32(12, true)
  const manifestStart = 4 + 16
  const manifestEnd = manifestStart + manifestLen
  const payloadStart = manifestEnd
  const payloadEnd = payloadStart + payloadLen

  if (version !== AETHEL_PACK_VERSION) {
    errors.push(`unsupported pack version ${version}`)
  }
  if (manifestEnd > packBytes.byteLength || payloadEnd > packBytes.byteLength) {
    errors.push('pack truncated — manifest/payload overrun')
  }
  if (errors.length > 0) {
    return { ok: false, manifest: null, packSha256, assets: [], errors, cookPackReady: false }
  }

  let manifest: AethelPackManifest
  try {
    manifest = JSON.parse(textDecoder.decode(packBytes.subarray(manifestStart, manifestEnd)))
  } catch {
    return {
      ok: false,
      manifest: null,
      packSha256,
      assets: [],
      errors: ['manifest JSON parse failed'],
      cookPackReady: false,
    }
  }

  const validation = validateAethelPackManifest(manifest)
  if (!validation.ok) errors.push(...validation.errors)

  const payload = packBytes.subarray(payloadStart, payloadEnd)
  const jsCompression: AethelPackJsCompression =
    manifest.compression === 'zstd'
      ? 'zstd'
      : manifest.compression === 'deflate'
        ? 'deflate'
        : 'none'
  const assets: AethelPackReadResult['assets'] = []

  for (const tex of manifest.textures) {
    const slice = payload.subarray(tex.byteOffset, tex.byteOffset + tex.byteLength)
    if (slice.byteLength !== tex.byteLength) {
      errors.push(`texture ${tex.assetId}: truncated payload`)
      continue
    }
    let logical: Uint8Array
    try {
      logical = decompressAethelPackPayload(slice, jsCompression)
    } catch {
      errors.push(`texture ${tex.assetId}: decompress failed`)
      continue
    }
    const casHash = sha256Hex(logical)
    if (casHash !== tex.casHash) {
      errors.push(`texture ${tex.assetId}: casHash mismatch`)
    }
    assets.push({ assetId: tex.assetId, kind: 'texture', bytes: logical, casHash })
  }

  for (const mesh of manifest.meshes) {
    const slice = payload.subarray(mesh.byteOffset, mesh.byteOffset + mesh.byteLength)
    if (slice.byteLength !== mesh.byteLength) {
      errors.push(`mesh ${mesh.assetId}: truncated payload`)
      continue
    }
    let logical: Uint8Array
    try {
      logical = decompressAethelPackPayload(slice, jsCompression)
    } catch {
      errors.push(`mesh ${mesh.assetId}: decompress failed`)
      continue
    }
    const casHash = sha256Hex(logical)
    if (casHash !== mesh.casHash) {
      errors.push(`mesh ${mesh.assetId}: casHash mismatch`)
    }
    assets.push({ assetId: mesh.assetId, kind: 'mesh', bytes: logical, casHash })
  }

  const cookPackReady =
    errors.length === 0 &&
    validation.cookPackReady &&
    packBytes.byteLength > 0 &&
    assets.length > 0

  return {
    ok: errors.length === 0,
    manifest,
    packSha256,
    assets,
    errors,
    cookPackReady,
  }
}

/** In-process proof for honesty aggregate — real multi-asset pack round-trip. */
export function proveJsAethelPackCookRoundTrip(): {
  cookPackReady: boolean
  packByteLength: number
  packSha256: string
  reason: string
} {
  const tex = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
  const mesh = new Uint8Array([9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  const written = writeAethelPack({
    buildId: 'probe-bn',
    projectId: 'probe-bn',
    textures: [
      {
        assetId: 'probe-albedo',
        codec: 'rgba8-fallback',
        width: 2,
        height: 1,
        bytes: tex,
      },
    ],
    meshes: [
      {
        assetId: 'probe-mesh',
        codec: 'raw-gltf',
        bytes: mesh,
      },
    ],
  })
  if (!written.ok || written.packByteLength === 0) {
    return {
      cookPackReady: false,
      packByteLength: 0,
      packSha256: '',
      reason: written.errors.join('; ') || 'write failed',
    }
  }
  const read = readAethelPack(written.packBytes)
  if (!read.ok || !read.cookPackReady) {
    return {
      cookPackReady: false,
      packByteLength: written.packByteLength,
      packSha256: written.packSha256,
      reason: read.errors.join('; ') || 'readback failed',
    }
  }
  if (read.assets.length !== 2) {
    return {
      cookPackReady: false,
      packByteLength: written.packByteLength,
      packSha256: written.packSha256,
      reason: 'asset count mismatch on readback',
    }
  }
  return {
    cookPackReady: true,
    packByteLength: written.packByteLength,
    packSha256: written.packSha256,
    reason: `JS AethelPack multi-asset round-trip proven (${written.compression}; BC7/ASTC/VT HELD)`,
  }
}

function concatUint8(parts: Uint8Array[]): Uint8Array {
  let total = 0
  for (const p of parts) total += p.byteLength
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.byteLength
  }
  return out
}
