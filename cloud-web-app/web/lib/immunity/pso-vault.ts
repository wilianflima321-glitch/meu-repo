/**
 * Onda M — PSO Vault / pipeline-cache honesty (fail-closed).
 *
 * Seals shader/material permutation fingerprints for cook manifests.
 * Never claims GPU PSO cache / zero-stutter marketing (Founder M.1 HELD).
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import type { AethelPackPsoSlot } from '@/lib/immunity/aethel-pack-manifest'

const log = createComponentLogger('pso-vault')

/** GPU-resident PSO cache / DirectStorage — always false until Founder M.1 soak. */
export const GPU_PSO_CACHE_READY = false as const
export const ZERO_STUTTER_FROM_PSO_VAULT = false as const

export type PsoVaultRejectCode =
  | 'invalid_input'
  | 'empty_vault_claim_forbidden'
  | 'gpu_pso_cache_held'
  | 'zero_stutter_marketing_held'

export type PsoResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: PsoVaultRejectCode; message: string }

export interface PsoFingerprintInput {
  /** Stable shader module / program hash (hex or opaque id). */
  shaderHash: string
  materialPermutationId: string
  tierHint: string
  vertexLayoutHash?: string
  renderPassId?: string
}

export interface PsoVaultEntry {
  fingerprintId: string
  materialPermutationId: string
  tierHint: string
  shaderHash: string
  vertexLayoutHash: string
  renderPassId: string
  sealedAt: string
  /** Content hash of sealed fields — not a GPU binary. */
  contentHash: string
}

export interface PsoVault {
  version: 1
  projectId: string
  entries: readonly PsoVaultEntry[]
  gpuPsoCacheReady: false
  zeroStutterMarketingAllowed: false
}

function digest(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex')
}

export function createPsoVault(input: { projectId: string }): PsoVault {
  return {
    version: 1,
    projectId: input.projectId.trim() || 'unknown',
    entries: [],
    gpuPsoCacheReady: false,
    zeroStutterMarketingAllowed: false,
  }
}

/**
 * Seal a pipeline-state fingerprint into the vault (JS cook path).
 * Does not compile or cache a real GPU PSO binary.
 */
export function sealPsoFingerprint(
  vault: PsoVault,
  input: PsoFingerprintInput,
  nowIso = new Date().toISOString(),
): PsoResult<{ vault: PsoVault; entry: PsoVaultEntry }> {
  const shaderHash = input.shaderHash?.trim() ?? ''
  const materialPermutationId = input.materialPermutationId?.trim() ?? ''
  const tierHint = input.tierHint?.trim() ?? ''
  if (!shaderHash || !materialPermutationId || !tierHint) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'shaderHash, materialPermutationId, and tierHint required',
    }
  }

  const vertexLayoutHash = (input.vertexLayoutHash?.trim() || 'layout:default').slice(0, 128)
  const renderPassId = (input.renderPassId?.trim() || 'pass:default').slice(0, 128)
  const contentHash = digest([
    shaderHash,
    materialPermutationId,
    tierHint,
    vertexLayoutHash,
    renderPassId,
  ])
  const fingerprintId = `pso:${contentHash.slice(0, 24)}`

  const entry: PsoVaultEntry = {
    fingerprintId,
    materialPermutationId,
    tierHint,
    shaderHash,
    vertexLayoutHash,
    renderPassId,
    sealedAt: nowIso,
    contentHash,
  }

  const next: PsoVault = {
    ...vault,
    entries: [...vault.entries.filter((e) => e.fingerprintId !== fingerprintId), entry],
    gpuPsoCacheReady: false,
    zeroStutterMarketingAllowed: false,
  }

  log.info('pso_fingerprint_sealed', {
    fingerprintId,
    count: next.entries.length,
    gpuPsoCacheReady: false,
  })

  return { ok: true, value: { vault: next, entry } }
}

export function exportPsoVaultToPackSlots(vault: PsoVault): AethelPackPsoSlot[] {
  return vault.entries.map((e) => ({
    fingerprintId: e.fingerprintId,
    materialPermutationId: e.materialPermutationId,
    tierHint: e.tierHint,
  }))
}

/** Refuse marketing claims that empty vault or GPU cache is ready. */
export function claimGpuPsoCacheReady(vault: PsoVault): PsoResult<never> {
  void vault
  return {
    ok: false,
    code: 'gpu_pso_cache_held',
    message: 'GPU_PSO_CACHE_READY=false — fingerprint vault ≠ GPU PSO / DirectStorage cache',
  }
}

export function claimZeroStutterFromPsoVault(vault: PsoVault): PsoResult<never> {
  if (vault.entries.length === 0) {
    return {
      ok: false,
      code: 'empty_vault_claim_forbidden',
      message: 'Empty PSO vault cannot claim zero-stutter (Law XVI + M.1)',
    }
  }
  return {
    ok: false,
    code: 'zero_stutter_marketing_held',
    message: 'zeroStutterMarketingAllowed=false until Founder M.1 soak — vault fingerprints only',
  }
}

export function assertPsoVaultNotEmptyForCook(vault: PsoVault): PsoResult<{ slotCount: number }> {
  if (vault.entries.length === 0) {
    return {
      ok: false,
      code: 'empty_vault_claim_forbidden',
      message: 'Optional cook enrich refused — empty PSO vault (no fake slots)',
    }
  }
  return { ok: true, value: { slotCount: vault.entries.length } }
}

export function probePsoVaultReadiness(): {
  id: 'M-pso-vault'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  gpuPsoCacheReady: false
  zeroStutterMarketingAllowed: false
  path: string
  note: string
} {
  let vault = createPsoVault({ projectId: 'probe-pso' })
  const sealed = sealPsoFingerprint(vault, {
    shaderHash: 'sha256:probe-shader-aabb',
    materialPermutationId: 'mat:perm:lit-pbr-v1',
    tierHint: 'cap:40-60',
    vertexLayoutHash: 'vl:p3n3uv2',
    renderPassId: 'pass:forward-opaque',
  })
  if (!sealed.ok) {
    return {
      id: 'M-pso-vault',
      status: 'NOT_IMPLEMENTED',
      ready: false,
      gpuPsoCacheReady: false,
      zeroStutterMarketingAllowed: false,
      path: 'lib/immunity/pso-vault.ts',
      note: 'PSO vault seal failed.',
    }
  }
  vault = sealed.value.vault
  const slots = exportPsoVaultToPackSlots(vault)
  const gpu = claimGpuPsoCacheReady(vault)
  const stutter = claimZeroStutterFromPsoVault(vault)
  const emptyClaim = claimZeroStutterFromPsoVault(createPsoVault({ projectId: 'empty' }))

  const ready =
    slots.length === 1 &&
    slots[0]!.fingerprintId === sealed.value.entry.fingerprintId &&
    !gpu.ok &&
    !stutter.ok &&
    !emptyClaim.ok &&
    GPU_PSO_CACHE_READY === false &&
    ZERO_STUTTER_FROM_PSO_VAULT === false

  return {
    id: 'M-pso-vault',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    gpuPsoCacheReady: false,
    zeroStutterMarketingAllowed: false,
    path: 'lib/immunity/pso-vault.ts',
    note: ready
      ? 'PSO fingerprint vault seals + pack slots; GPU PSO cache / zero-stutter marketing HELD (M.1).'
      : 'PSO vault probe failed.',
  }
}
