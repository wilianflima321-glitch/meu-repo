/**
 * Forge L / Immunity WASM Shield — ABI + sandbox honesty probe (letter br).
 * `wasmPluginAbiReady` flips only when ABI negotiate + sandboxed instantiate are proven.
 * Plugin marketplace / store injection UI stays HELD — never from ABI alone.
 */

import {
  AETHEL_WASM_ABI_VERSION,
  negotiateWasmAbi,
} from './aethel-wasm-abi'
import {
  WASM_SANDBOX_INJECTOR_WIRED,
  proveWasmSandboxInject,
  type WasmSandboxInjectResult,
} from './aethel-wasm-sandbox-injector'

export interface WasmPluginAbiHonesty {
  injectorWired: typeof WASM_SANDBOX_INJECTOR_WIRED
  negotiateOk: boolean
  sandboxInstantiateProven: boolean
  /**
   * True when injector wired + ABI negotiate OK + sandboxed instantiate proven.
   * Does NOT imply plugin marketplace / store UI.
   */
  wasmPluginAbiReady: boolean
  /** Always false — Founder-gated store; ABI+sandbox alone is insufficient. */
  marketplaceDistribution: false
  hostPtyForbidden: true
  notes: string[]
}

/**
 * Run fixture inject proof (letter br auto-proof).
 */
export function proveWasmPluginAbiReady(): WasmSandboxInjectResult {
  return proveWasmSandboxInject()
}

export function probeWasmSandboxInjectorWired(): boolean {
  return WASM_SANDBOX_INJECTOR_WIRED === true
}

/**
 * Honesty: wasmPluginAbiReady when path wired, negotiate OK, and sandbox instantiate proven.
 * Marketplace always fail-closed.
 */
export function probeWasmPluginAbiHonesty(input?: {
  negotiateOk?: boolean
  sandboxInstantiateProven?: boolean
  /** When false, skip live fixture prove (default: auto-prove when wired). */
  forceProve?: boolean
}): WasmPluginAbiHonesty {
  const notes: string[] = [
    'WASM Plugin ABI negotiate + sandboxed WebAssembly.Module/Instance (br)',
    'AgentShellPolicy #48 — sandbox-only; no host PTY',
    'Plugin marketplace / store injection UI [HELD]',
  ]

  if (!WASM_SANDBOX_INJECTOR_WIRED) {
    notes.push('WASM sandbox injector not wired')
  }

  let negotiateOk = input?.negotiateOk === true
  if (input?.negotiateOk === false) {
    negotiateOk = false
    notes.push('negotiateOk forced false — wasmPluginAbiReady HELD')
  } else if (input?.negotiateOk === true) {
    negotiateOk = true
  } else {
    const n = negotiateWasmAbi({ guestAbiVersion: AETHEL_WASM_ABI_VERSION })
    negotiateOk = n.ok === true
    notes.push(n.reason)
  }

  let sandboxInstantiateProven = input?.sandboxInstantiateProven === true
  if (input?.sandboxInstantiateProven === false) {
    sandboxInstantiateProven = false
    notes.push('sandboxInstantiateProven forced false — wasmPluginAbiReady HELD')
  } else if (input?.sandboxInstantiateProven === true) {
    sandboxInstantiateProven = true
  } else if (input?.forceProve === false) {
    sandboxInstantiateProven = false
    notes.push('Live instantiate skipped — not proven in this probe')
  } else if (WASM_SANDBOX_INJECTOR_WIRED) {
    const inject = proveWasmSandboxInject()
    sandboxInstantiateProven = inject.ok && inject.instantiated
    notes.push(
      inject.ok
        ? `Fixture inject OK — exports=[${inject.exports.join(',')}] init=${inject.initReturn}`
        : `Fixture inject failed — ${inject.reason}`,
    )
  } else {
    notes.push('Instantiate not proven')
  }

  const wasmPluginAbiReady =
    WASM_SANDBOX_INJECTOR_WIRED && negotiateOk && sandboxInstantiateProven

  if (!wasmPluginAbiReady) {
    notes.push('wasmPluginAbiReady HELD — need negotiate + sandboxed instantiate')
  } else {
    notes.push('wasmPluginAbiReady=true — negotiate + sandbox instantiate proven')
  }

  return {
    injectorWired: WASM_SANDBOX_INJECTOR_WIRED,
    negotiateOk,
    sandboxInstantiateProven,
    wasmPluginAbiReady,
    marketplaceDistribution: false,
    hostPtyForbidden: true,
    notes,
  }
}
