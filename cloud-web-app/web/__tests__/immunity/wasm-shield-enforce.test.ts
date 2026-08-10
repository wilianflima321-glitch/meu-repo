/**
 * Onda M — WASM Shield enforce + AgentShellPolicy deny evidence.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  WASM_MARKETPLACE_READY,
  V8_WINIT_HOST_READY,
  clearWasmShieldDenyEvidenceForTests,
  claimWasmMarketplaceReady,
  enforceAgentHostPtyDenied,
  enforceWasmPluginLoad,
  listWasmShieldDenyEvidence,
  probeWasmShieldEnforceReadiness,
} from '@/lib/immunity/wasm-shield-enforce'

describe('WASM Shield enforce', () => {
  beforeEach(() => {
    clearWasmShieldDenyEvidenceForTests()
  })

  it('denies agent host PTY with durable evidence', () => {
    const denied = enforceAgentHostPtyDenied({
      nowIso: '2026-08-10T17:10:00.000Z',
      sandboxAvailable: true,
    })
    expect(denied.allowed).toBe(false)
    if (denied.allowed) return
    expect(denied.code).toBe('agent_host_pty_denied')
    expect(denied.evidence.id.startsWith('wse:')).toBe(true)
    expect(denied.evidence.law).toBe(48)
    expect(listWasmShieldDenyEvidence().length).toBeGreaterThanOrEqual(1)
  })

  it('allows agent sandbox path with ABI instantiate; marketplace stays false', () => {
    const ok = enforceWasmPluginLoad({
      callerKind: 'agent',
      requestedTarget: 'sandbox',
      sandboxAvailable: true,
      proveInstantiate: true,
      nowIso: '2026-08-10T17:10:01.000Z',
    })
    expect(ok.allowed).toBe(true)
    if (!ok.allowed) return
    expect(ok.instantiated).toBe(true)
    expect(ok.marketplaceReady).toBe(false)
    expect(ok.v8WinitHostReady).toBe(false)
    expect(claimWasmMarketplaceReady().ok).toBe(false)
    expect(WASM_MARKETPLACE_READY).toBe(false)
    expect(V8_WINIT_HOST_READY).toBe(false)
  })

  it('fail-closes when sandbox unavailable (no host fallback)', () => {
    const held = enforceWasmPluginLoad({
      callerKind: 'agent',
      requestedTarget: 'sandbox',
      sandboxAvailable: false,
      proveInstantiate: false,
      nowIso: '2026-08-10T17:10:02.000Z',
    })
    expect(held.allowed).toBe(false)
    if (held.allowed) return
    expect(held.code).toBe('sandbox_unavailable')
  })

  it('probe reports PARTIAL enforce readiness', () => {
    const probe = probeWasmShieldEnforceReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.marketplaceReady).toBe(false)
    expect(probe.denyEvidenceCount).toBeGreaterThanOrEqual(2)
  })
})
