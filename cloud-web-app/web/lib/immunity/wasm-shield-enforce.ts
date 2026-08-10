/**
 * Onda M — WASM Shield enforce deepen (AgentShellPolicy #48 + ABI sandbox).
 *
 * Host PTY / host-injected WASM for agents is fail-closed with durable deny evidence.
 * Marketplace distribution stays HELD; does not invent V8+winit.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  AETHEL_WASM_ABI_VERSION,
  negotiateWasmAbi,
} from '@/lib/plugins/aethel-wasm-abi'
import { proveWasmSandboxInject } from '@/lib/plugins/aethel-wasm-sandbox-injector'
import {
  evaluateAgentShellPolicy,
  type AgentShellCallerKind,
  type AgentShellPolicyDecision,
  type AgentShellTarget,
} from '@/lib/production/agent-shell-policy'

const log = createComponentLogger('wasm-shield-enforce')

export const WASM_MARKETPLACE_READY = false as const
export const V8_WINIT_HOST_READY = false as const

export type WasmShieldDenyCode =
  | 'agent_host_pty_denied'
  | 'sandbox_unavailable'
  | 'abi_negotiate_failed'
  | 'sandbox_instantiate_failed'
  | 'marketplace_held'
  | 'host_wasm_inject_forbidden'

export type WasmShieldDenyEvidence = {
  id: string
  at: string
  code: WasmShieldDenyCode
  callerKind: AgentShellCallerKind
  requestedTarget: AgentShellTarget
  reason: string
  law: 48
  contentHash: string
}

export type WasmShieldEnforceResult =
  | {
      allowed: true
      negotiationOk: true
      instantiated: boolean
      marketplaceReady: false
      v8WinitHostReady: false
      agentShell: AgentShellPolicyDecision
      message: string
    }
  | {
      allowed: false
      code: WasmShieldDenyCode
      marketplaceReady: false
      v8WinitHostReady: false
      agentShell: AgentShellPolicyDecision | null
      evidence: WasmShieldDenyEvidence
      message: string
    }

const denyLog: WasmShieldDenyEvidence[] = []

function evidenceId(parts: string[]): string {
  return `wse:${createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 20)}`
}

function recordDeny(input: {
  code: WasmShieldDenyCode
  callerKind: AgentShellCallerKind
  requestedTarget: AgentShellTarget
  reason: string
  nowIso: string
}): WasmShieldDenyEvidence {
  const contentHash = createHash('sha256')
    .update([input.code, input.callerKind, input.requestedTarget, input.reason, input.nowIso].join('|'))
    .digest('hex')
    .slice(0, 16)
  const row: WasmShieldDenyEvidence = {
    id: evidenceId([input.code, input.callerKind, input.nowIso, contentHash]),
    at: input.nowIso,
    code: input.code,
    callerKind: input.callerKind,
    requestedTarget: input.requestedTarget,
    reason: input.reason,
    law: 48,
    contentHash,
  }
  denyLog.push(row)
  if (denyLog.length > 64) denyLog.shift()
  log.warn('wasm_shield_deny', { code: row.code, id: row.id })
  return row
}

/** Test/reset helper — not a production wipe API. */
export function clearWasmShieldDenyEvidenceForTests(): void {
  denyLog.length = 0
}

export function listWasmShieldDenyEvidence(): readonly WasmShieldDenyEvidence[] {
  return [...denyLog]
}

/**
 * Enforce WASM plugin load path: AgentShell first, then ABI negotiate + sandbox inject.
 * Agents requesting host-like targets are denied with evidence — never host PTY fallback.
 */
export function enforceWasmPluginLoad(input: {
  callerKind: AgentShellCallerKind
  requestedTarget?: AgentShellTarget
  sandboxAvailable?: boolean
  guestAbiVersion?: number
  /** When true, run fixture instantiate (default true for probe). */
  proveInstantiate?: boolean
  nowIso?: string
}): WasmShieldEnforceResult {
  const nowIso = input.nowIso ?? new Date().toISOString()
  const requestedTarget = input.requestedTarget ?? 'sandbox'
  const agentShell = evaluateAgentShellPolicy({
    callerKind: input.callerKind,
    requestedTarget,
    sandboxAvailable: input.sandboxAvailable,
  })

  if (!agentShell.allowed) {
    const code: WasmShieldDenyCode =
      agentShell.status === 'held' ? 'sandbox_unavailable' : 'agent_host_pty_denied'
    const evidence = recordDeny({
      code,
      callerKind: input.callerKind,
      requestedTarget,
      reason: agentShell.reason,
      nowIso,
    })
    return {
      allowed: false,
      code,
      marketplaceReady: false,
      v8WinitHostReady: false,
      agentShell,
      evidence,
      message: agentShell.reason,
    }
  }

  if (input.callerKind === 'agent' && requestedTarget !== 'sandbox') {
    const evidence = recordDeny({
      code: 'host_wasm_inject_forbidden',
      callerKind: 'agent',
      requestedTarget,
      reason: 'Agent WASM inject outside sandbox lane forbidden (WASM Shield).',
      nowIso,
    })
    return {
      allowed: false,
      code: 'host_wasm_inject_forbidden',
      marketplaceReady: false,
      v8WinitHostReady: false,
      agentShell,
      evidence,
      message: evidence.reason,
    }
  }

  const negotiate = negotiateWasmAbi({
    guestAbiVersion: input.guestAbiVersion ?? AETHEL_WASM_ABI_VERSION,
  })
  if (!negotiate.ok) {
    const evidence = recordDeny({
      code: 'abi_negotiate_failed',
      callerKind: input.callerKind,
      requestedTarget: 'sandbox',
      reason: negotiate.reason,
      nowIso,
    })
    return {
      allowed: false,
      code: 'abi_negotiate_failed',
      marketplaceReady: false,
      v8WinitHostReady: false,
      agentShell,
      evidence,
      message: negotiate.reason,
    }
  }

  let instantiated = false
  if (input.proveInstantiate !== false) {
    const inject = proveWasmSandboxInject()
    instantiated = inject.ok && inject.instantiated
    if (!instantiated) {
      const evidence = recordDeny({
        code: 'sandbox_instantiate_failed',
        callerKind: input.callerKind,
        requestedTarget: 'sandbox',
        reason: inject.reason || 'sandbox instantiate failed',
        nowIso,
      })
      return {
        allowed: false,
        code: 'sandbox_instantiate_failed',
        marketplaceReady: false,
        v8WinitHostReady: false,
        agentShell,
        evidence,
        message: evidence.reason,
      }
    }
  }

  log.info('wasm_shield_enforce_ok', {
    callerKind: input.callerKind,
    instantiated,
    marketplaceReady: false,
  })

  return {
    allowed: true,
    negotiationOk: true,
    instantiated,
    marketplaceReady: false,
    v8WinitHostReady: false,
    agentShell,
    message: instantiated
      ? 'WASM Shield: AgentShell sandbox + ABI negotiate + fixture instantiate OK — marketplace HELD.'
      : 'WASM Shield: AgentShell + ABI OK (instantiate skipped).',
  }
}

/** Explicit host-PTY attempt for agents — always evidence-backed deny. */
export function enforceAgentHostPtyDenied(input?: {
  nowIso?: string
  sandboxAvailable?: boolean
}): WasmShieldEnforceResult {
  return enforceWasmPluginLoad({
    callerKind: 'agent',
    requestedTarget: 'host-pty',
    sandboxAvailable: input?.sandboxAvailable === true,
    proveInstantiate: false,
    nowIso: input?.nowIso,
  })
}

export function claimWasmMarketplaceReady(): {
  ok: false
  code: 'marketplace_held'
  message: string
} {
  return {
    ok: false,
    code: 'marketplace_held',
    message: 'WASM_MARKETPLACE_READY=false — enforce path ≠ plugin store distribution',
  }
}

export function probeWasmShieldEnforceReadiness(): {
  id: 'M-wasm-shield'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  marketplaceReady: false
  v8WinitHostReady: false
  path: string
  note: string
  denyEvidenceCount: number
} {
  clearWasmShieldDenyEvidenceForTests()
  const hostDeny = enforceAgentHostPtyDenied({
    nowIso: '2026-08-10T17:00:00.000Z',
    sandboxAvailable: true,
  })
  const sandboxOk = enforceWasmPluginLoad({
    callerKind: 'agent',
    requestedTarget: 'sandbox',
    sandboxAvailable: true,
    proveInstantiate: true,
    nowIso: '2026-08-10T17:00:01.000Z',
  })
  const heldSandbox = enforceWasmPluginLoad({
    callerKind: 'agent',
    requestedTarget: 'sandbox',
    sandboxAvailable: false,
    proveInstantiate: false,
    nowIso: '2026-08-10T17:00:02.000Z',
  })
  const market = claimWasmMarketplaceReady()
  const evidence = listWasmShieldDenyEvidence()

  const ready =
    hostDeny.allowed === false &&
    hostDeny.code === 'agent_host_pty_denied' &&
    Boolean(hostDeny.evidence?.id) &&
    sandboxOk.allowed === true &&
    sandboxOk.instantiated === true &&
    heldSandbox.allowed === false &&
    heldSandbox.code === 'sandbox_unavailable' &&
    market.ok === false &&
    evidence.length >= 2 &&
    WASM_MARKETPLACE_READY === false &&
    V8_WINIT_HOST_READY === false

  return {
    id: 'M-wasm-shield',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    marketplaceReady: false,
    v8WinitHostReady: false,
    path: 'lib/immunity/wasm-shield-enforce.ts',
    note: ready
      ? 'WASM Shield enforce: host PTY deny evidence + sandbox ABI instantiate; marketplace/V8+winit HELD.'
      : 'WASM Shield enforce probe failed.',
    denyEvidenceCount: evidence.length,
  }
}
