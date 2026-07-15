/**
 * Onda L / M WASM Shield — sandboxed WASM plugin injector (letter br).
 * Instantiates third-party `.wasm` only after ABI negotiate + AgentShell sandbox lane.
 * No host PTY, no host FS, no network. Marketplace distribution stays HELD.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  AETHEL_WASM_ABI_VERSION,
  createAbiHeader,
  evaluateWasmSandboxLoad,
  type AethelWasmAbiHeader,
  type WasmSandboxLoadContract,
  type WasmSyscallId,
} from './aethel-wasm-abi'

const log = createComponentLogger('aethel-wasm-sandbox-injector')

/** Structural wire flag — injector + fixture ship (letter br). */
export const WASM_SANDBOX_INJECTOR_WIRED = true as const

/**
 * Minimal valid WASM module exporting `aethel_plugin_init() -> i32` (= 1).
 * Used for honesty prove + Vitest without external fixtures.
 *
 * (module (func (export "aethel_plugin_init") (result i32) i32.const 1))
 */
export const MINIMAL_AETHEL_PLUGIN_WASM: Uint8Array = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // magic + version
  0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f, // type: () -> i32
  0x03, 0x02, 0x01, 0x00, // function section
  0x07, 0x16, 0x01, 0x12, // export section: size 22, 1 export, name len 18
  0x61, 0x65, 0x74, 0x68, 0x65, 0x6c, 0x5f, 0x70, 0x6c, 0x75, 0x67, 0x69, 0x6e, 0x5f, 0x69,
  0x6e, 0x69, 0x74, // "aethel_plugin_init"
  0x00, 0x00, // export kind func + index 0
  0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x01, 0x0b, // code: i32.const 1; end
])

export type WasmCompileFn = (bytes: BufferSource) => WebAssembly.Module
export type WasmInstanceFn = (
  module: WebAssembly.Module,
  importObject?: WebAssembly.Imports,
) => WebAssembly.Instance

/** Async instantiate seam for Vitest mocks of WebAssembly.instantiate. */
export type WasmInstantiateFn = (
  bytes: BufferSource,
  importObject?: WebAssembly.Imports,
) => Promise<WebAssembly.WebAssemblyInstantiatedSource>

export interface WasmSandboxInjectRequest {
  header: AethelWasmAbiHeader
  wasmBytes: Uint8Array
  callerKind: 'user' | 'agent'
  sandboxAvailable?: boolean
  hostAbiVersion?: number
  /** Test seam — sync Module compile. */
  compile?: WasmCompileFn
  /** Test seam — sync Instance. */
  instantiateSync?: WasmInstanceFn
  /** Test seam — async WebAssembly.instantiate (preferred for mock coverage). */
  instantiate?: WasmInstantiateFn
}

export interface WasmSandboxInjectResult {
  ok: boolean
  contract: WasmSandboxLoadContract
  instantiated: boolean
  exports: string[]
  initReturn: number | null
  executionLane: 'sandbox-worker' | 'denied'
  marketplaceDistribution: false
  allowHostFs: false
  allowNetwork: false
  hostPtyForbidden: true
  reason: string
  notes: string[]
}

/**
 * Build a fail-closed import object — only declared syscalls, stubbed.
 * Never exposes WASI / FS / fetch / PTY.
 */
export function buildSandboxImportObject(
  allowedSyscalls: readonly WasmSyscallId[],
): WebAssembly.Imports {
  const aethel: Record<string, (...args: number[]) => number | void> = {}

  for (const id of allowedSyscalls) {
    aethel[id] = (..._args: number[]) => 0
  }

  return {
    aethel,
    // Explicitly omit wasi_snapshot_preview1 / env / fs — guest must not require them.
  }
}

function listExports(instance: WebAssembly.Instance): string[] {
  return Object.keys(instance.exports)
}

function readInitReturn(instance: WebAssembly.Instance): number | null {
  const init = instance.exports.aethel_plugin_init
  if (typeof init !== 'function') return null
  const raw = (init as () => number)()
  return typeof raw === 'number' ? raw : null
}

function deniedResult(
  contract: WasmSandboxLoadContract,
  reason: string,
  notes: string[],
): WasmSandboxInjectResult {
  return {
    ok: false,
    contract,
    instantiated: false,
    exports: [],
    initReturn: null,
    executionLane: 'denied',
    marketplaceDistribution: false,
    allowHostFs: false,
    allowNetwork: false,
    hostPtyForbidden: true,
    reason,
    notes,
  }
}

function okResult(
  contract: WasmSandboxLoadContract,
  instance: WebAssembly.Instance,
  notes: string[],
): WasmSandboxInjectResult {
  const exports = listExports(instance)
  const initReturn = readInitReturn(instance)
  return {
    ok: true,
    contract,
    instantiated: true,
    exports,
    initReturn,
    executionLane: 'sandbox-worker',
    marketplaceDistribution: false,
    allowHostFs: false,
    allowNetwork: false,
    hostPtyForbidden: true,
    reason: `Sandboxed instantiate OK — ABI v${contract.negotiate.negotiatedVersion}`,
    notes,
  }
}

/**
 * Negotiate + AgentShell sandbox contract, then sync-compile/instantiate WASM
 * with a restricted import object (sandbox lane). Marketplace HELD.
 */
export function injectSandboxedWasmPluginSync(
  request: WasmSandboxInjectRequest,
): WasmSandboxInjectResult {
  const contract = evaluateWasmSandboxLoad({
    header: request.header,
    callerKind: request.callerKind,
    sandboxAvailable: request.sandboxAvailable,
    hostAbiVersion: request.hostAbiVersion,
  })

  const baseNotes = [
    ...contract.policy.notes,
    'Sandbox injector: WebAssembly.Module/Instance with restricted imports (br)',
    'hostPtyForbidden — AgentShellPolicy #48',
    'Plugin marketplace / store injection UI [HELD]',
  ]

  if (!contract.allowed) {
    return deniedResult(
      contract,
      contract.negotiate.ok
        ? `Sandbox load denied — ${contract.policy.agentShell.reason}`
        : contract.negotiate.reason,
      baseNotes,
    )
  }

  if (!(request.wasmBytes instanceof Uint8Array) || request.wasmBytes.byteLength === 0) {
    return deniedResult(contract, 'Empty or missing WASM bytes — fail-closed', [
      ...baseNotes,
      'wasmBytes empty',
    ])
  }

  const compile: WasmCompileFn =
    request.compile ?? ((bytes) => new WebAssembly.Module(bytes))
  const instantiateSync: WasmInstanceFn =
    request.instantiateSync ?? ((mod, imports) => new WebAssembly.Instance(mod, imports))

  try {
    const imports = buildSandboxImportObject(request.header.allowedSyscalls)
    const module = compile(request.wasmBytes)
    const instance = instantiateSync(module, imports)
    log.info('wasm_sandbox_inject_ok', {
      moduleId: request.header.moduleId,
      sync: true,
    })
    return okResult(contract, instance, baseNotes)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('wasm_sandbox_inject_failed', { error: message, sync: true })
    return deniedResult(contract, `Instantiate failed — ${message}`, [
      ...baseNotes,
      'WebAssembly.Module/Instance threw',
    ])
  }
}

/**
 * Async inject path — uses WebAssembly.instantiate (mockable in Vitest).
 */
export async function injectSandboxedWasmPlugin(
  request: WasmSandboxInjectRequest,
): Promise<WasmSandboxInjectResult> {
  if (!request.instantiate) {
    return injectSandboxedWasmPluginSync(request)
  }

  const contract = evaluateWasmSandboxLoad({
    header: request.header,
    callerKind: request.callerKind,
    sandboxAvailable: request.sandboxAvailable,
    hostAbiVersion: request.hostAbiVersion,
  })

  const baseNotes = [
    ...contract.policy.notes,
    'Sandbox injector: WebAssembly.instantiate with restricted imports (br)',
    'hostPtyForbidden — AgentShellPolicy #48',
    'Plugin marketplace / store injection UI [HELD]',
  ]

  if (!contract.allowed) {
    return deniedResult(
      contract,
      contract.negotiate.ok
        ? `Sandbox load denied — ${contract.policy.agentShell.reason}`
        : contract.negotiate.reason,
      baseNotes,
    )
  }

  if (!(request.wasmBytes instanceof Uint8Array) || request.wasmBytes.byteLength === 0) {
    return deniedResult(contract, 'Empty or missing WASM bytes — fail-closed', [
      ...baseNotes,
      'wasmBytes empty',
    ])
  }

  try {
    const imports = buildSandboxImportObject(request.header.allowedSyscalls)
    const { instance } = await request.instantiate(request.wasmBytes, imports)
    log.info('wasm_sandbox_inject_ok', {
      moduleId: request.header.moduleId,
      async: true,
    })
    return okResult(contract, instance, baseNotes)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('wasm_sandbox_inject_failed', { error: message, async: true })
    return deniedResult(contract, `Instantiate failed — ${message}`, [
      ...baseNotes,
      'WebAssembly.instantiate threw',
    ])
  }
}

/**
 * Prove negotiate + sandboxed instantiate against the minimal fixture (letter br auto-proof).
 */
export function proveWasmSandboxInject(): WasmSandboxInjectResult {
  const header = createAbiHeader({
    abiVersion: AETHEL_WASM_ABI_VERSION,
    moduleId: 'aethel-minimal-fixture',
    casHash: 'fixture-br',
    fuelLimit: 1_000_000,
    epochDeadlineMs: 100,
    allowedSyscalls: ['log_trace'],
  })
  return injectSandboxedWasmPluginSync({
    header,
    wasmBytes: MINIMAL_AETHEL_PLUGIN_WASM,
    callerKind: 'agent',
    sandboxAvailable: true,
  })
}
