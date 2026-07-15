/**
 * Onda L / M WASM Shield — Aethel WASM Plugin ABI + sandbox load contract.
 * Aligns AgentShellPolicy (#48): plugins load in sandbox workers only.
 * Store marketplace distribution = HELD.
 *
 * Letter br deepen: real sandboxed instantiate lives in
 * `aethel-wasm-sandbox-injector.ts`; `wasmPluginAbiReady` on the honesty
 * aggregate flips only after negotiate + fixture instantiate prove.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { AgentShellPolicyDecision } from '@/lib/production/agent-shell-policy'
import { evaluateAgentShellPolicy } from '@/lib/production/agent-shell-policy'

const log = createComponentLogger('aethel-wasm-abi')

export const AETHEL_WASM_ABI_VERSION = 1 as const
export const AETHEL_WASM_ABI_MIN_COMPATIBLE = 1 as const

/** Structural wire — ABI negotiate + sandbox load contract ship (bi + br). */
export const AETHEL_WASM_ABI_WIRED = true as const

export type WasmSyscallId =
  | 'spawn_vfx'
  | 'apply_impulse'
  | 'play_sound'
  | 'emit_gameplay_event'
  | 'log_trace'

export interface AethelWasmAbiHeader {
  magic: 'AETHEL_WASM'
  abiVersion: number
  moduleId: string
  casHash: string
  fuelLimit: number
  epochDeadlineMs: number
  allowedSyscalls: WasmSyscallId[]
}

export interface WasmAbiNegotiateResult {
  ok: boolean
  negotiatedVersion: number | null
  /**
   * ABI version compatibility only — NOT the aggregate honesty flip.
   * Aggregate `wasmPluginAbiReady` requires sandbox instantiate (letter br).
   */
  wasmPluginAbiReady: boolean
  reason: string
}

export interface WasmSandboxLoadPolicy {
  /** Must be sandbox — never host PTY / unrestricted Worker with full DOM. */
  executionLane: 'sandbox-worker' | 'denied'
  agentShell: AgentShellPolicyDecision
  allowNetwork: boolean
  allowHostFs: false
  marketplaceDistribution: false
  notes: string[]
}

export interface WasmSandboxLoadRequest {
  header: AethelWasmAbiHeader
  callerKind: 'user' | 'agent'
  sandboxAvailable?: boolean
  hostAbiVersion?: number
}

export interface WasmSandboxLoadContract {
  allowed: boolean
  negotiate: WasmAbiNegotiateResult
  policy: WasmSandboxLoadPolicy
  placeboForbidden: true
}

/**
 * Negotiate guest ABI vs host. Incompatible versions fail closed.
 */
export function negotiateWasmAbi(input: {
  guestAbiVersion: number
  hostAbiVersion?: number
}): WasmAbiNegotiateResult {
  const host = input.hostAbiVersion ?? AETHEL_WASM_ABI_VERSION
  if (input.guestAbiVersion < AETHEL_WASM_ABI_MIN_COMPATIBLE) {
    return {
      ok: false,
      negotiatedVersion: null,
      wasmPluginAbiReady: false,
      reason: `Guest ABI ${input.guestAbiVersion} below min ${AETHEL_WASM_ABI_MIN_COMPATIBLE}`,
    }
  }
  if (input.guestAbiVersion > host) {
    return {
      ok: false,
      negotiatedVersion: null,
      wasmPluginAbiReady: false,
      reason: `Guest ABI ${input.guestAbiVersion} newer than host ${host} — upgrade host or rebuild plugin`,
    }
  }
  return {
    ok: true,
    negotiatedVersion: input.guestAbiVersion,
    wasmPluginAbiReady: true,
    reason: `Negotiated ABI v${input.guestAbiVersion}`,
  }
}

/**
 * Sandbox load contract — AgentShell + ABI negotiate. Marketplace HELD.
 */
export function evaluateWasmSandboxLoad(request: WasmSandboxLoadRequest): WasmSandboxLoadContract {
  const agentShell = evaluateAgentShellPolicy({
    callerKind: request.callerKind,
    requestedTarget: 'sandbox',
    sandboxAvailable: request.sandboxAvailable === true,
  })

  const negotiate = negotiateWasmAbi({
    guestAbiVersion: request.header.abiVersion,
    hostAbiVersion: request.hostAbiVersion,
  })

  // Agents need sandbox-only; users may load plugins in sandbox worker for playtest.
  const laneAllowed =
    request.callerKind === 'agent'
      ? agentShell.status === 'allowed' && agentShell.executionLane === 'sandbox-only'
      : agentShell.allowed

  const policy: WasmSandboxLoadPolicy = {
    executionLane: laneAllowed && negotiate.ok ? 'sandbox-worker' : 'denied',
    agentShell,
    allowNetwork: false,
    allowHostFs: false,
    marketplaceDistribution: false,
    notes: [
      'WASM Shield: wgpu/Rapier stay outside guest',
      'Plugin store marketplace [HELD]',
      'Align AgentShellPolicy — no host PTY for agent plugin install',
      ...(!request.sandboxAvailable && request.callerKind === 'agent'
        ? ['sandboxAvailable=false — agent plugin load HELD/denied']
        : []),
    ],
  }

  const allowed = laneAllowed && negotiate.ok && policy.executionLane === 'sandbox-worker'

  log.info('wasm_sandbox_load', {
    allowed,
    abiOk: negotiate.ok,
    caller: request.callerKind,
    moduleId: request.header.moduleId,
  })

  return {
    allowed,
    negotiate,
    policy,
    placeboForbidden: true,
  }
}

export function createAbiHeader(partial: Omit<AethelWasmAbiHeader, 'magic'>): AethelWasmAbiHeader {
  return {
    magic: 'AETHEL_WASM',
    ...partial,
  }
}
