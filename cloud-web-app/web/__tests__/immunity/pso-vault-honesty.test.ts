/**
 * Onda M — PSO vault fingerprint honesty (GPU cache HELD).
 */

import { describe, expect, it } from 'vitest'

import { writeAethelPack } from '@/lib/immunity/aethel-pack-writer'
import {
  GPU_PSO_CACHE_READY,
  ZERO_STUTTER_FROM_PSO_VAULT,
  claimGpuPsoCacheReady,
  claimZeroStutterFromPsoVault,
  createPsoVault,
  exportPsoVaultToPackSlots,
  probePsoVaultReadiness,
  sealPsoFingerprint,
} from '@/lib/immunity/pso-vault'

describe('PSO vault honesty', () => {
  it('seals fingerprints and exports pack slots without claiming GPU cache', () => {
    let vault = createPsoVault({ projectId: 'p1' })
    const sealed = sealPsoFingerprint(vault, {
      shaderHash: 'sha256:abc',
      materialPermutationId: 'mat:pbr',
      tierHint: 'cap:50',
      vertexLayoutHash: 'vl:1',
    })
    expect(sealed.ok).toBe(true)
    if (!sealed.ok) return
    vault = sealed.value.vault
    expect(vault.gpuPsoCacheReady).toBe(false)
    expect(vault.zeroStutterMarketingAllowed).toBe(false)

    const slots = exportPsoVaultToPackSlots(vault)
    expect(slots).toHaveLength(1)
    expect(slots[0]!.fingerprintId).toBe(sealed.value.entry.fingerprintId)

    expect(claimGpuPsoCacheReady(vault).ok).toBe(false)
    expect(claimZeroStutterFromPsoVault(vault).ok).toBe(false)
    expect(GPU_PSO_CACHE_READY).toBe(false)
    expect(ZERO_STUTTER_FROM_PSO_VAULT).toBe(false)
  })

  it('wires non-empty PSO slots into AethelPack manifest', () => {
    let vault = createPsoVault({ projectId: 'pack-pso' })
    const sealed = sealPsoFingerprint(vault, {
      shaderHash: 'sha256:pack',
      materialPermutationId: 'mat:pack',
      tierHint: 'cap:30',
    })
    expect(sealed.ok).toBe(true)
    if (!sealed.ok) return
    vault = sealed.value.vault

    const pack = writeAethelPack({
      buildId: 'b1',
      projectId: 'pack-pso',
      textures: [
        {
          assetId: 'tex1',
          codec: 'rgba8-fallback',
          width: 2,
          height: 2,
          bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
        },
      ],
      psoVault: exportPsoVaultToPackSlots(vault),
    })
    expect(pack.ok).toBe(true)
    expect(pack.manifest.psoVault).toHaveLength(1)
    expect(pack.warnings.some((w) => w.includes('GPU_PSO_CACHE_READY=false'))).toBe(true)
  })

  it('probe stays PARTIAL with gpu/zero-stutter false', () => {
    const probe = probePsoVaultReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.gpuPsoCacheReady).toBe(false)
    expect(probe.zeroStutterMarketingAllowed).toBe(false)
  })
})
