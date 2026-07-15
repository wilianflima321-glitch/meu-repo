/**
 * Onda M / Law VI — Publish cook stage for AethelPack (letter bn deepen).
 * Fail-closed without real pack bytes — mirrors Law XVI (no success + empty artifact).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  createEmptyAethelPackManifest,
  validateAethelPackManifest,
  type AethelPackManifest,
  type AethelPackValidationResult,
} from './aethel-pack-manifest'
import {
  proveJsAethelPackCookRoundTrip,
  readAethelPack,
  writeAethelPack,
  type AethelPackMeshInput,
  type AethelPackTextureInput,
  type AethelPackWriteResult,
} from './aethel-pack-writer'
import { probeAethelPackRustCookWorker } from './aethel-pack-rust-probe'
import { probeZstdEncoder } from './aethel-pack-compress'

const log = createComponentLogger('immunity-cook-publish-stage')

export type CookPublishStageStatus = 'passed' | 'blocked' | 'held'

export interface CookPublishStageInput {
  projectId: string
  buildId: string
  /** Caller supplies a validated manifest only when real baker/writer produced blobs. */
  manifest?: AethelPackManifest
  /**
   * @deprecated Prefer cookAssets / packBytes. Native BC7/ASTC toolchain — not required for JS pack ready.
   */
  nativeBakerToolchainReady?: boolean
  /** Pre-built `.aethelpack` bytes — must be non-empty to pass. */
  packBytes?: Uint8Array
  /** Raw assets to cook via JS writer (Zstd prefer / deflate fallback + checksums). */
  cookAssets?: {
    textures?: AethelPackTextureInput[]
    meshes?: AethelPackMeshInput[]
  }
}

export interface CookPublishStageResult {
  stageId: 'aethelpack-cook'
  status: CookPublishStageStatus
  cookPackReady: boolean
  success: false | true
  manifest: AethelPackManifest
  validation: AethelPackValidationResult
  reason: string
  placeboForbidden: true
  packByteLength: number
  packSha256: string
  packBytes: Uint8Array | null
  rustCookStatus: 'held' | 'scaffold-path'
  bc7AstcHeld: true
  virtualTexturingHeld: true
}

function emptyResult(
  input: CookPublishStageInput,
  status: CookPublishStageStatus,
  reason: string,
  validation: AethelPackValidationResult,
  manifest: AethelPackManifest,
): CookPublishStageResult {
  const rust = probeAethelPackRustCookWorker()
  return {
    stageId: 'aethelpack-cook',
    status,
    cookPackReady: false,
    success: false,
    manifest,
    validation,
    reason,
    placeboForbidden: true,
    packByteLength: 0,
    packSha256: '',
    packBytes: null,
    rustCookStatus: rust.status,
    bc7AstcHeld: true,
    virtualTexturingHeld: true,
  }
}

function fromWrite(
  input: CookPublishStageInput,
  written: AethelPackWriteResult,
): CookPublishStageResult {
  const rust = probeAethelPackRustCookWorker()
  const validation = validateAethelPackManifest(written.manifest)
  const packOk =
    written.ok &&
    written.packByteLength > 0 &&
    written.cookPackReady &&
    validation.cookPackReady

  if (!packOk) {
    return emptyResult(
      input,
      'blocked',
      written.errors.join('; ') || validation.errors.join('; ') || 'AethelPack write produced empty/invalid artifact',
      validation,
      { ...written.manifest, bakerArtifactsPresent: false },
    )
  }

  log.info('aethelpack_cook_passed', {
    projectId: input.projectId,
    textures: written.manifest.textures.length,
    meshes: written.manifest.meshes.length,
    packByteLength: written.packByteLength,
  })

  return {
    stageId: 'aethelpack-cook',
    status: 'passed',
    cookPackReady: true,
    success: true,
    manifest: written.manifest,
    validation,
    reason: `AethelPack cook artifacts validated (${written.packByteLength} bytes, sha256=${written.packSha256.slice(0, 12)}…)`,
    placeboForbidden: true,
    packByteLength: written.packByteLength,
    packSha256: written.packSha256,
    packBytes: written.packBytes,
    rustCookStatus: rust.status,
    bc7AstcHeld: true,
    virtualTexturingHeld: true,
  }
}

/**
 * Run AethelPack cook gate.
 * Passes only with non-empty pack bytes + checksum validation (Law XVI).
 * BC7/ASTC/VT remain HELD regardless of JS pack success.
 */
export function runAethelPackCookPublishStage(
  input: CookPublishStageInput,
): CookPublishStageResult {
  const rust = probeAethelPackRustCookWorker()
  const zstd = probeZstdEncoder()
  void zstd

  // Path 1 — explicit pack bytes
  if (input.packBytes !== undefined) {
    if (!input.packBytes.byteLength) {
      const manifest =
        input.manifest ??
        createEmptyAethelPackManifest({ buildId: input.buildId, projectId: input.projectId })
      const validation = validateAethelPackManifest({
        ...manifest,
        bakerArtifactsPresent: false,
      })
      log.info('aethelpack_cook_blocked_empty_bytes', {
        projectId: input.projectId,
        buildId: input.buildId,
      })
      return emptyResult(
        input,
        'blocked',
        'Empty .aethelpack bytes — success:true forbidden (Law XVI)',
        validation,
        { ...manifest, bakerArtifactsPresent: false },
      )
    }
    const read = readAethelPack(input.packBytes)
    if (!read.ok || !read.cookPackReady || !read.manifest) {
      const manifest =
        read.manifest ??
        createEmptyAethelPackManifest({ buildId: input.buildId, projectId: input.projectId })
      const validation = validateAethelPackManifest({
        ...manifest,
        bakerArtifactsPresent: false,
      })
      return emptyResult(
        input,
        'blocked',
        read.errors.join('; ') || 'AethelPack readback failed',
        validation,
        { ...manifest, bakerArtifactsPresent: false },
      )
    }
    const validation = validateAethelPackManifest(read.manifest)
    return {
      stageId: 'aethelpack-cook',
      status: 'passed',
      cookPackReady: true,
      success: true,
      manifest: read.manifest,
      validation,
      reason: `AethelPack pack bytes validated (${input.packBytes.byteLength} bytes)`,
      placeboForbidden: true,
      packByteLength: input.packBytes.byteLength,
      packSha256: read.packSha256,
      packBytes: input.packBytes,
      rustCookStatus: rust.status,
      bc7AstcHeld: true,
      virtualTexturingHeld: true,
    }
  }

  // Path 2 — cook from raw assets via JS writer
  if (input.cookAssets) {
    const written = writeAethelPack({
      buildId: input.buildId,
      projectId: input.projectId,
      textures: input.cookAssets.textures,
      meshes: input.cookAssets.meshes,
    })
    return fromWrite(input, written)
  }

  // Path 3 — legacy: pre-built manifest + nativeBakerToolchainReady (bi probe)
  // Still requires bakerArtifactsPresent + non-empty slots; does not invent pack bytes.
  if (input.manifest && input.nativeBakerToolchainReady === true) {
    const validation = validateAethelPackManifest(input.manifest)
    if (!validation.cookPackReady) {
      return emptyResult(
        input,
        'blocked',
        validation.errors.join('; ') || 'AethelPack validation failed',
        validation,
        input.manifest,
      )
    }
    // Manifest-only pass without pack bytes: cookPackReady stays false (bn honesty).
    log.info('aethelpack_cook_manifest_without_bytes', {
      projectId: input.projectId,
      note: 'manifest ok but pack bytes absent — cookPackReady false',
    })
    return {
      stageId: 'aethelpack-cook',
      status: 'blocked',
      cookPackReady: false,
      success: false,
      manifest: input.manifest,
      validation: {
        ...validation,
        cookPackReady: false,
        errors: [
          ...validation.errors,
          'pack bytes absent — flip cookPackReady only when .aethelpack bytes real (letter bn)',
        ],
        ok: false,
      },
      reason: 'Manifest present but pack bytes absent — Law XVI / bn fail-closed',
      placeboForbidden: true,
      packByteLength: 0,
      packSha256: '',
      packBytes: null,
      rustCookStatus: rust.status,
      bc7AstcHeld: true,
      virtualTexturingHeld: true,
    }
  }

  // Path 4 — nothing to cook
  const empty = createEmptyAethelPackManifest({
    buildId: input.buildId,
    projectId: input.projectId,
  })
  const emptyValidation = validateAethelPackManifest(empty)
  const status: CookPublishStageStatus =
    rust.status === 'held' && input.nativeBakerToolchainReady !== true ? 'held' : 'blocked'
  const result = emptyResult(
    input,
    status,
    rust.status === 'held'
      ? 'No cook assets/pack bytes; Rust BC7/ASTC/Zstd/VT toolchain HELD — JS writer ready when assets supplied'
      : 'No cook assets/pack bytes supplied — empty success forbidden',
    emptyValidation,
    empty,
  )
  log.info('aethelpack_cook_held', {
    projectId: input.projectId,
    buildId: input.buildId,
    rustCookStatus: rust.status,
    errors: emptyValidation.errors.length,
  })
  return result
}

/** Honesty auto-proof helper — real round-trip, not a flag. */
export function proveCookPackReadyFromJsWriter(): {
  cookPackReady: boolean
  packByteLength: number
  packSha256: string
  reason: string
} {
  return proveJsAethelPackCookRoundTrip()
}
