/**
 * Onda M / Law VI — AethelPack cook manifest contracts.
 * Letter bo: JS pack writer produces real `.aethelpack` bytes (Zstd WASM preferred + SHA-256;
 * pako deflate fallback). BC7/ASTC / VT page stream = HELD — do not fake.
 */

export const AETHEL_PACK_MAGIC = 'AETH' as const
export const AETHEL_PACK_VERSION = 1 as const

export type AethelTextureCodec = 'bc7' | 'astc' | 'ktx2-basis' | 'rgba8-fallback'
export type AethelMeshCodec = 'meshopt' | 'draco' | 'raw-gltf'
/** 'zstd' = proven WASM encoder (bo); 'deflate' = pako honest fallback. */
export type AethelCompression = 'zstd' | 'deflate' | 'none' | 'gdeflate'

export interface AethelPackTextureSlot {
  assetId: string
  codec: AethelTextureCodec
  width: number
  height: number
  mipCount: number
  casHash: string
  byteOffset: number
  byteLength: number
  /** Virtual texture page grid — present only when VT cook ran. */
  vtPageSize?: 128 | 256 | 512
  vtPageCount?: number
}

export interface AethelPackMeshSlot {
  assetId: string
  codec: AethelMeshCodec
  lodCount: number
  casHash: string
  byteOffset: number
  byteLength: number
}

export interface AethelPackPsoSlot {
  fingerprintId: string
  materialPermutationId: string
  tierHint: string
}

export interface AethelPackWasmSlot {
  moduleId: string
  casHash: string
  abiVersion: number
}

/**
 * Cooked package manifest — publish artifact contract.
 * Empty artifact list → fail-closed (never success:true with zero blobs).
 */
export interface AethelPackManifest {
  magic: typeof AETHEL_PACK_MAGIC
  version: typeof AETHEL_PACK_VERSION
  buildId: string
  projectId: string
  compression: AethelCompression
  textures: AethelPackTextureSlot[]
  meshes: AethelPackMeshSlot[]
  psoVault: AethelPackPsoSlot[]
  wasmModules: AethelPackWasmSlot[]
  /** True only when a native baker produced on-disk blobs matching casHashes. */
  bakerArtifactsPresent: boolean
  /** VT streaming baked — HELD until M.2 + Law VI VT cook. */
  virtualTexturingReady: boolean
}

export interface AethelPackValidationResult {
  ok: boolean
  cookPackReady: boolean
  errors: string[]
  warnings: string[]
}

export function createEmptyAethelPackManifest(input: {
  buildId: string
  projectId: string
}): AethelPackManifest {
  return {
    magic: AETHEL_PACK_MAGIC,
    version: AETHEL_PACK_VERSION,
    buildId: input.buildId,
    projectId: input.projectId,
    compression: 'deflate',
    textures: [],
    meshes: [],
    psoVault: [],
    wasmModules: [],
    bakerArtifactsPresent: false,
    virtualTexturingReady: false,
  }
}

/**
 * Validate pack honesty. Empty packs or missing baker artifacts never flip cookPackReady.
 * bakerArtifactsPresent = real pack/slot bytes exist (JS writer or native) — not BC7 claim.
 */
export function validateAethelPackManifest(manifest: AethelPackManifest): AethelPackValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (manifest.magic !== AETHEL_PACK_MAGIC) {
    errors.push(`Invalid magic: expected ${AETHEL_PACK_MAGIC}`)
  }
  if (manifest.version !== AETHEL_PACK_VERSION) {
    errors.push(`Unsupported pack version ${manifest.version}`)
  }
  if (!manifest.buildId?.trim()) {
    errors.push('buildId required')
  }
  if (!manifest.projectId?.trim()) {
    errors.push('projectId required')
  }

  const assetCount = manifest.textures.length + manifest.meshes.length
  if (assetCount === 0) {
    errors.push('AethelPack has zero texture/mesh slots — empty cook artifact forbidden (Law XVI honesty)')
  }
  if (!manifest.bakerArtifactsPresent) {
    errors.push('bakerArtifactsPresent=false — no real pack/slot bytes; empty cook success forbidden')
  }
  if (manifest.compression === 'gdeflate') {
    warnings.push('compression=gdeflate reserved — not proven on JS cook path')
  }

  for (const tex of manifest.textures) {
    if (!tex.casHash?.trim()) errors.push(`texture ${tex.assetId}: missing casHash`)
    if (tex.byteLength <= 0) errors.push(`texture ${tex.assetId}: byteLength must be > 0`)
    if (tex.codec === 'bc7' || tex.codec === 'astc') {
      warnings.push(
        `texture ${tex.assetId}: ${tex.codec} slot reserved — native encode worker HELD (no fake GPU formats)`,
      )
    }
  }

  for (const mesh of manifest.meshes) {
    if (!mesh.casHash?.trim()) errors.push(`mesh ${mesh.assetId}: missing casHash`)
    if (mesh.byteLength <= 0) errors.push(`mesh ${mesh.assetId}: byteLength must be > 0`)
  }

  if (manifest.virtualTexturingReady && !manifest.textures.some((t) => t.vtPageCount && t.vtPageCount > 0)) {
    errors.push('virtualTexturingReady=true but no VT page slots — fail-closed')
  }

  const cookPackReady =
    errors.length === 0 &&
    manifest.bakerArtifactsPresent &&
    assetCount > 0

  return {
    ok: errors.length === 0,
    cookPackReady,
    errors,
    warnings,
  }
}
