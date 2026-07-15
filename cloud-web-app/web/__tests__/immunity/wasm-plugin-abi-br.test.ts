/**
 * Letter br — WASM Plugin ABI + sandbox injector deepen (Zero-MVP honesty).
 * wasmPluginAbiReady flips when negotiate + sandboxed instantiate proven;
 * marketplace / store injection UI stays HELD; AgentShell sandbox-only.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  AETHEL_WASM_ABI_VERSION,
  AETHEL_WASM_ABI_WIRED,
  createAbiHeader,
  evaluateWasmSandboxLoad,
  negotiateWasmAbi,
} from '@/lib/plugins/aethel-wasm-abi'
import {
  probeWasmPluginAbiHonesty,
  probeWasmSandboxInjectorWired,
  proveWasmPluginAbiReady,
} from '@/lib/plugins/aethel-wasm-abi-honesty'
import {
  MINIMAL_AETHEL_PLUGIN_WASM,
  WASM_SANDBOX_INJECTOR_WIRED,
  buildSandboxImportObject,
  injectSandboxedWasmPlugin,
  injectSandboxedWasmPluginSync,
  proveWasmSandboxInject,
} from '@/lib/plugins/aethel-wasm-sandbox-injector'
import {
  evaluateAaaProductionHonesty,
  probeAaaProductionCapability,
} from '@/lib/immunity/aaa-production-capability'
import { evaluateAgentShellPolicy } from '@/lib/production/agent-shell-policy'

function fixtureHeader(overrides?: Partial<Parameters<typeof createAbiHeader>[0]>) {
  return createAbiHeader({
    abiVersion: AETHEL_WASM_ABI_VERSION,
    moduleId: 'test-mod',
    casHash: 'cas-br',
    fuelLimit: 1_000_000,
    epochDeadlineMs: 50,
    allowedSyscalls: ['log_trace'],
    ...overrides,
  })
}

describe('WASM ABI negotiate (br)', () => {
  it('wires ABI + injector flags', () => {
    expect(AETHEL_WASM_ABI_WIRED).toBe(true)
    expect(WASM_SANDBOX_INJECTOR_WIRED).toBe(true)
    expect(probeWasmSandboxInjectorWired()).toBe(true)
  })

  it('negotiates compatible ABI and denies incompatible', () => {
    const ok = negotiateWasmAbi({ guestAbiVersion: AETHEL_WASM_ABI_VERSION })
    expect(ok.ok).toBe(true)
    expect(ok.wasmPluginAbiReady).toBe(true)

    const bad = negotiateWasmAbi({ guestAbiVersion: 99, hostAbiVersion: 1 })
    expect(bad.ok).toBe(false)
    expect(bad.wasmPluginAbiReady).toBe(false)
  })
})

describe('AgentShell sandbox-only (br)', () => {
  it('denies agent host PTY; allows sandbox when available', () => {
    const host = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'host-pty',
      sandboxAvailable: true,
    })
    expect(host.allowed).toBe(false)
    expect(host.executionLane).toBe('denied')

    const sandbox = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'sandbox',
      sandboxAvailable: true,
    })
    expect(sandbox.allowed).toBe(true)
    expect(sandbox.executionLane).toBe('sandbox-only')
  })

  it('evaluateWasmSandboxLoad denies agent without sandbox', () => {
    const denied = evaluateWasmSandboxLoad({
      header: fixtureHeader(),
      callerKind: 'agent',
      sandboxAvailable: false,
    })
    expect(denied.allowed).toBe(false)
    expect(denied.policy.marketplaceDistribution).toBe(false)
    expect(denied.policy.allowHostFs).toBe(false)
  })
})

describe('Sandbox injector (br)', () => {
  it('instantiates minimal WASM fixture and calls aethel_plugin_init', () => {
    const proved = proveWasmSandboxInject()
    expect(proved.ok).toBe(true)
    expect(proved.instantiated).toBe(true)
    expect(proved.exports).toContain('aethel_plugin_init')
    expect(proved.initReturn).toBe(1)
    expect(proved.executionLane).toBe('sandbox-worker')
    expect(proved.marketplaceDistribution).toBe(false)
    expect(proved.hostPtyForbidden).toBe(true)
    expect(proved.allowHostFs).toBe(false)
    expect(proved.allowNetwork).toBe(false)
  })

  it('validates fixture bytes with WebAssembly.validate', () => {
    expect(WebAssembly.validate(MINIMAL_AETHEL_PLUGIN_WASM)).toBe(true)
  })

  it('buildSandboxImportObject only stubs declared syscalls', () => {
    const imports = buildSandboxImportObject(['log_trace', 'play_sound'])
    expect(imports.aethel).toBeDefined()
    expect(typeof (imports.aethel as Record<string, unknown>).log_trace).toBe('function')
    expect(typeof (imports.aethel as Record<string, unknown>).play_sound).toBe('function')
    expect((imports.aethel as Record<string, unknown>).spawn_vfx).toBeUndefined()
    expect(imports.wasi_snapshot_preview1).toBeUndefined()
    expect(imports.env).toBeUndefined()
  })

  it('fail-closed on empty bytes and ABI mismatch', () => {
    const empty = injectSandboxedWasmPluginSync({
      header: fixtureHeader(),
      wasmBytes: new Uint8Array(0),
      callerKind: 'agent',
      sandboxAvailable: true,
    })
    expect(empty.ok).toBe(false)
    expect(empty.instantiated).toBe(false)

    const badAbi = injectSandboxedWasmPluginSync({
      header: fixtureHeader({ abiVersion: 99 }),
      wasmBytes: MINIMAL_AETHEL_PLUGIN_WASM,
      callerKind: 'agent',
      sandboxAvailable: true,
      hostAbiVersion: 1,
    })
    expect(badAbi.ok).toBe(false)
    expect(badAbi.contract.negotiate.ok).toBe(false)
  })

  it('async path accepts mocked WebAssembly.instantiate', async () => {
    const mockInstance = {
      exports: {
        aethel_plugin_init: () => 42,
      },
    } as unknown as WebAssembly.Instance

    const instantiate = vi.fn(async () => ({
      module: {} as WebAssembly.Module,
      instance: mockInstance,
    }))

    const result = await injectSandboxedWasmPlugin({
      header: fixtureHeader(),
      wasmBytes: MINIMAL_AETHEL_PLUGIN_WASM,
      callerKind: 'user',
      sandboxAvailable: true,
      instantiate,
    })

    expect(instantiate).toHaveBeenCalledOnce()
    expect(result.ok).toBe(true)
    expect(result.initReturn).toBe(42)
    expect(result.marketplaceDistribution).toBe(false)
  })
})

describe('WASM ABI honesty (br)', () => {
  it('wasmPluginAbiReady true after fixture prove; marketplace always false', () => {
    const proved = proveWasmPluginAbiReady()
    expect(proved.ok).toBe(true)

    const honesty = probeWasmPluginAbiHonesty()
    expect(honesty.wasmPluginAbiReady).toBe(true)
    expect(honesty.negotiateOk).toBe(true)
    expect(honesty.sandboxInstantiateProven).toBe(true)
    expect(honesty.marketplaceDistribution).toBe(false)
    expect(honesty.hostPtyForbidden).toBe(true)

    const forcedOff = probeWasmPluginAbiHonesty({
      negotiateOk: false,
      forceProve: false,
    })
    expect(forcedOff.wasmPluginAbiReady).toBe(false)
    expect(forcedOff.marketplaceDistribution).toBe(false)

    const noInstantiate = probeWasmPluginAbiHonesty({
      negotiateOk: true,
      sandboxInstantiateProven: false,
      forceProve: false,
    })
    expect(noInstantiate.wasmPluginAbiReady).toBe(false)
  })

  it('aaa-production aggregate auto-proves wasmPluginAbiReady; marketplace HELD', () => {
    const report = evaluateAaaProductionHonesty()
    expect(report.capability.wasmPluginAbiReady).toBe(true)
    expect(report.capability.marketingAaaProductionAllowed).toBe(false)

    const gap7 = report.gaps.find((g) => g.id === 7)!
    expect(gap7.scaffoldStatus).toBe('CLOSED')
    expect(gap7.shipStatus).toBe('CLOSED')
    expect(gap7.notes.some((n) => /marketplace/i.test(n))).toBe(true)

    const forced = probeAaaProductionCapability({ wasmAbiNegotiateOk: false })
    expect(forced.wasmPluginAbiReady).toBe(false)

    const forcedOn = probeAaaProductionCapability({ wasmAbiNegotiateOk: true })
    expect(forcedOn.wasmPluginAbiReady).toBe(true)
  })
})
