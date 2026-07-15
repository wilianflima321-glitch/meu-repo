/**
 * Block 9 / Law #48 — AgentShellPolicy.
 * Agents NEVER spawn host OS PTY (or cloud-container node-pty as a fake local shell).
 * Fail-closed: no host fallback when sandbox is HELD.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('agent-shell-policy')

export type AgentShellCallerKind = 'user' | 'agent'
export type AgentShellTarget =
  | 'host-pty'
  | 'cloud-container-pty'
  | 'sandbox'
  | 'desktop-native-pty'
  | 'unknown'

export type AgentShellPolicyStatus = 'allowed' | 'blocked' | 'held'

export interface AgentShellPolicyInput {
  callerKind: AgentShellCallerKind
  requestedTarget: AgentShellTarget
  /** L.1 ForgeSandboxExecutor (or equivalent) is actually available. */
  sandboxAvailable?: boolean
  /** Explicit override for tests / CI — never true in product defaults. */
  allowAgentHostPtyForTests?: boolean
}

export interface AgentShellPolicyDecision {
  allowed: boolean
  status: AgentShellPolicyStatus
  callerKind: AgentShellCallerKind
  requestedTarget: AgentShellTarget
  executionLane: 'user-terminal' | 'sandbox-only' | 'denied'
  reason: string
  claim: string
  law: 48
  placeboForbidden: true
}

const HOST_LIKE: ReadonlySet<AgentShellTarget> = new Set([
  'host-pty',
  'cloud-container-pty',
  'desktop-native-pty',
  'unknown',
])

/**
 * Gate every agent tool that wants a shell. Users keep their terminal;
 * agents must use sandbox or fail closed.
 */
export function evaluateAgentShellPolicy(
  input: AgentShellPolicyInput,
): AgentShellPolicyDecision {
  const sandboxAvailable = input.sandboxAvailable === true

  if (input.callerKind === 'user') {
    const decision: AgentShellPolicyDecision = {
      allowed: true,
      status: 'allowed',
      callerKind: 'user',
      requestedTarget: input.requestedTarget,
      executionLane: 'user-terminal',
      reason: 'User-initiated terminal is outside AgentShellPolicy host ban.',
      claim: 'User terminal allowed — path honesty via desktop-honesty-capability',
      law: 48,
      placeboForbidden: true,
    }
    log.info('agent_shell_policy', { status: decision.status, caller: 'user' })
    return decision
  }

  // Agent path — Law #48
  if (input.allowAgentHostPtyForTests === true && HOST_LIKE.has(input.requestedTarget)) {
    return {
      allowed: true,
      status: 'allowed',
      callerKind: 'agent',
      requestedTarget: input.requestedTarget,
      executionLane: 'user-terminal',
      reason: 'Test-only override — never ship with allowAgentHostPtyForTests.',
      claim: 'TEST OVERRIDE — agent host PTY',
      law: 48,
      placeboForbidden: true,
    }
  }

  if (input.requestedTarget === 'sandbox') {
    if (sandboxAvailable) {
      const decision: AgentShellPolicyDecision = {
        allowed: true,
        status: 'allowed',
        callerKind: 'agent',
        requestedTarget: 'sandbox',
        executionLane: 'sandbox-only',
        reason: 'Agent shell routed to Forge/sandbox executor (not host PTY).',
        claim: 'Agent shell = sandbox only',
        law: 48,
        placeboForbidden: true,
      }
      log.info('agent_shell_policy', { status: decision.status, lane: 'sandbox' })
      return decision
    }
    const held: AgentShellPolicyDecision = {
      allowed: false,
      status: 'held',
      callerKind: 'agent',
      requestedTarget: 'sandbox',
      executionLane: 'denied',
      reason:
        'Agent sandbox (L.1) is not available — fail-closed; will not fall back to host PTY.',
      claim: 'Agent shell [HELD] — sandbox unavailable; host PTY forbidden',
      law: 48,
      placeboForbidden: true,
    }
    log.warn('agent_shell_policy_held', { reason: held.reason })
    return held
  }

  // Any host-like target for agents is blocked.
  const blocked: AgentShellPolicyDecision = {
    allowed: false,
    status: 'blocked',
    callerKind: 'agent',
    requestedTarget: input.requestedTarget,
    executionLane: 'denied',
    reason:
      'Law #48 AgentShellPolicy: agents must never spawn host OS PTY or treat cloud-container node-pty as a local shell.',
    claim: 'Agent host PTY blocked',
    law: 48,
    placeboForbidden: true,
  }
  log.warn('agent_shell_policy_blocked', {
    target: input.requestedTarget,
    reason: blocked.reason,
  })
  return blocked
}

/** Convenience for tool handlers — throws nothing; returns deny payload. */
export function assertAgentMayNotHostPty(input: {
  callerKind?: AgentShellCallerKind | string | null
  requestedTarget?: AgentShellTarget
  sandboxAvailable?: boolean
}): AgentShellPolicyDecision {
  const callerKind: AgentShellCallerKind =
    input.callerKind === 'agent' ? 'agent' : 'user'
  return evaluateAgentShellPolicy({
    callerKind,
    requestedTarget: input.requestedTarget ?? 'host-pty',
    sandboxAvailable: input.sandboxAvailable,
  })
}

/** Headers / body markers that mark an agent-originated shell request. */
export function detectAgentShellCaller(headers: {
  get(name: string): string | null
}): AgentShellCallerKind {
  const caller = headers.get('x-aethel-caller')?.trim().toLowerCase()
  if (caller === 'agent') return 'agent'
  if (headers.get('x-aethel-agent-tool') === '1') return 'agent'
  if (headers.get('x-aethel-agent-id')?.trim()) return 'agent'
  return 'user'
}
