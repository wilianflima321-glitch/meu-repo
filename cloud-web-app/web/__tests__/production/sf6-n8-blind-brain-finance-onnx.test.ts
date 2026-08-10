/**
 * SF6 Blind Brain AES vault + N8 finance ONNX fail-closed probe.
 */

import { describe, expect, it } from 'vitest'

import {
  armBlindBrainKillSwitch,
  assertSealedEntrySafeForPlatformMirror,
  claimHsmReady,
  claimProductionCustody,
  createBlindBrainVault,
  probeBlindBrainVaultReadiness,
  sealExchangeSecret,
  unwrapExchangeSecret,
} from '@/lib/server/quant/blind-brain-vault'
import {
  FINANCE_ONNX_READY,
  attemptFinanceOnnxInference,
  probeFinanceOnnxReadiness,
} from '@/lib/server/quant/finance-onnx-session'

describe('SF6 Blind Brain AES vault', () => {
  it('roundtrips AES-256-GCM seal/unwrap and kill-switch; HSM stays false', () => {
    let vault = createBlindBrainVault()
    expect(vault.hsmReady).toBe(false)
    expect(vault.productionCustodyReady).toBe(false)
    expect(vault.investmentGrade).toBe(false)

    const sealed = sealExchangeSecret({
      vault,
      localHandle: 'acct-1',
      plaintextSecret: 'binance-test-secret-xyz',
      passphrase: 'local-passphrase-ok',
    })
    expect(sealed.ok).toBe(true)
    if (!sealed.ok) return
    vault = sealed.value.vault
    expect(sealed.value.entry.keyRef.startsWith('local:blind-brain:')).toBe(true)

    const ok = unwrapExchangeSecret({
      vault,
      keyRef: sealed.value.entry.keyRef,
      passphrase: 'local-passphrase-ok',
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value.plaintext).toBe('binance-test-secret-xyz')

    const bad = unwrapExchangeSecret({
      vault,
      keyRef: sealed.value.entry.keyRef,
      passphrase: 'wrong-passphrase!!',
    })
    expect(bad.ok).toBe(false)

    vault = armBlindBrainKillSwitch(vault)
    const killed = unwrapExchangeSecret({
      vault,
      keyRef: sealed.value.entry.keyRef,
      passphrase: 'local-passphrase-ok',
    })
    expect(killed.ok).toBe(false)
    if (!killed.ok) expect(killed.code).toBe('kill_switch_armed')

    expect(claimHsmReady(vault).ok).toBe(false)
    expect(claimProductionCustody(vault).ok).toBe(false)
    expect(
      assertSealedEntrySafeForPlatformMirror(sealed.value.entry, {
        api_secret: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      }).ok,
    ).toBe(false)

    const probe = probeBlindBrainVaultReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.hsmReady).toBe(false)
    expect(probe.productionCustodyReady).toBe(false)
    expect(probe.investmentGrade).toBe(false)
  })
})

describe('N8 finance ONNX session', () => {
  it('refuses inference without model bytes and records evidence; never flips native gen', () => {
    expect(FINANCE_ONNX_READY).toBe(false)

    const denied = attemptFinanceOnnxInference(
      { projectId: 'p', strategyId: 's', features: [0.1, 0.2] },
      { weightsPresentOverride: false },
    )
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.code).toBe('no_model_bytes')
      expect(denied.evidence?.payload.summary).toMatch(/REFUSED/)
      expect(denied.evidence?.miniIaMaySubmit).toBe(false)
    }

    const withheld = attemptFinanceOnnxInference(
      { projectId: 'p', strategyId: 's', features: [0.1, 0.2] },
      { weightsPresentOverride: true, runtimePresentOverride: true },
    )
    expect(withheld.ok).toBe(false)
    if (!withheld.ok) expect(withheld.code).toBe('finance_onnx_not_ready')

    const gate = attemptFinanceOnnxInference(
      { projectId: 'p', strategyId: 's', features: [1] },
      { claimNativeGenReady: true },
    )
    expect(gate.ok).toBe(false)
    if (!gate.ok) expect(gate.code).toBe('native_gen_gate_forbidden')

    const probe = probeFinanceOnnxReadiness({ weightsPresentOverride: false })
    expect(probe.ready).toBe(true)
    expect(probe.financeOnnxReady).toBe(false)
    expect(probe.doesNotFlipNativeGenGate).toBe(true)
    expect(probe.investmentGrade).toBe(false)
  })
})
