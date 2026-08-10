/**
 * GAS ability evidence — fail-closed Unreal GAS AAA + 60Hz IPC.
 */

import { describe, expect, it } from 'vitest'

import {
  GAS_60HZ_BINARY_IPC_READY,
  GAS_AAA_MARKETING_ALLOWED,
  UNREAL_GAS_AAA_READY,
  claimGas60HzBinaryIpc,
  claimUnrealGasAaa,
  probeGasAbilityEvidenceReadiness,
  runGasAbilityEvidenceSoak,
} from '@/lib/gas/gas-ability-evidence'
import { evaluateGasIpcHonesty, GAS_IPC_SHIP_STATUS } from '@/lib/gas/gas-ipc-honesty'

describe('GAS ability evidence', () => {
  it('seals GasWorld heal effect + tick without AAA/IPC claims', () => {
    const soak = runGasAbilityEvidenceSoak({ initialHealth: 40, healMagnitude: 30 })
    expect(soak.ok).toBe(true)
    if (!soak.ok) return
    expect(soak.value.healthDelta).toBe(30)
    expect(soak.value.healthAfter).toBe(70)
    expect(soak.value.fingerprint.length).toBeGreaterThanOrEqual(8)
    expect(soak.value.unrealGasAaaReady).toBe(false)
    expect(soak.value.gas60HzBinaryIpcReady).toBe(false)
    expect(soak.value.ipcShipStatus).toBe(GAS_IPC_SHIP_STATUS)
  })

  it('refuses zero-heal and marketing claims', () => {
    expect(runGasAbilityEvidenceSoak({ healMagnitude: 0 }).ok).toBe(false)
    expect(claimUnrealGasAaa().ok).toBe(false)
    expect(claimGas60HzBinaryIpc().ok).toBe(false)
    expect(UNREAL_GAS_AAA_READY).toBe(false)
    expect(GAS_AAA_MARKETING_ALLOWED).toBe(false)
    expect(GAS_60HZ_BINARY_IPC_READY).toBe(false)
  })

  it('probe PARTIAL and IPC honesty stays HELD', () => {
    const probe = probeGasAbilityEvidenceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    const ipc = evaluateGasIpcHonesty()
    expect(ipc.shipStatus).toBe('HELD')
    expect(ipc.canClaim60HzBinaryIpc).toBe(false)
    expect(ipc.unrealGasAaaReady).toBe(false)
    expect(ipc.marketingAllowed).toBe(false)
  })
})
