/**
 * L.4 — ForgeTerminalBridge (Onda L / Aethel Forge)
 *
 * Streams agent (and optional human-inspected) shell I/O through ForgeSandboxExecutor.
 * AgentShellPolicy (#48): agents NEVER use host PTY / cloud-container PTY / Tauri PTY.
 * Fail-closed when sandbox is unavailable — no host fallback theater.
 *
 * Lane split (binding):
 *  - `human-host-pty` — `/api/terminal/create` + Tauri `terminal_*` for human local shells only
 *  - `forge-sandbox` — this module + `/api/terminal/forge` for agents (and honest sandbox panes)
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  detectAgentShellCaller,
  evaluateAgentShellPolicy,
  type AgentShellCallerKind,
  type AgentShellPolicyDecision,
} from '@/lib/production/agent-shell-policy'
import {
  createForgeSandboxSession,
  getForgeSandboxLedger,
  getForgeSandboxSession,
  resolveForgeSandboxAvailability,
  streamInForgeSandbox,
  teardownForgeSandboxSession,
  type ForgeSandboxSession,
} from '@/lib/production/forge-sandbox-executor'
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import type { AgentMode } from '@/lib/production/agent-tool-bus'

const log = createComponentLogger('forge-terminal-bridge')

/** Product honesty — which terminal path is in use. */
export type TerminalExecutionLane = 'human-host-pty' | 'forge-sandbox'

export interface TerminalLaneSplitDoc {
  humanHostPty: {
    lane: 'human-host-pty'
    entrypoints: string[]
    agentAllowed: false
    claim: string
  }
  forgeSandbox: {
    lane: 'forge-sandbox'
    entrypoints: string[]
    agentAllowed: true
    claim: string
  }
  law: 48
}

/** Documents the human PTY vs agent sandbox split for UI badges and audits. */
export function describeTerminalLaneSplit(): TerminalLaneSplitDoc {
  return {
    humanHostPty: {
      lane: 'human-host-pty',
      entrypoints: [
        'app/api/terminal/create',
        'components/terminal/terminalWebSocket.ts (Tauri PTY)',
        'apps/studio-local desktop_commands PTY (human only)',
      ],
      agentAllowed: false,
      claim: 'Human local/cloud container shell — never an agent tool target',
    },
    forgeSandbox: {
      lane: 'forge-sandbox',
      entrypoints: [
        'lib/server/forge-terminal-bridge.ts',
        'app/api/terminal/forge',
        'lib/production/forge-sandbox-executor.ts (streamInForgeSandbox)',
      ],
      agentAllowed: true,
      claim: 'Agent shell = Forge sandbox stream only (no host PTY)',
    },
    law: 48,
  }
}

export interface OpenForgeTerminalInput {
  userId: string
  projectId: string
  projectRootPath: string
  callerKind: AgentShellCallerKind
  costAdapter: CostGuardLedgerAdapter
  agentMode?: AgentMode
  planId?: string
  byokProfileId?: string
  /** Reuse an existing L.1 session (e.g. after L.8/L.9 provision). */
  existingSandboxSessionId?: string
  estimatedMinutes?: number
}

export type OpenForgeTerminalResult =
  | {
      ok: true
      lane: 'forge-sandbox'
      session: ForgeSandboxSession
      policy: AgentShellPolicyDecision
    }
  | {
      ok: false
      lane: 'forge-sandbox'
      reason: string
      message: string
      policy: AgentShellPolicyDecision
    }

/**
 * Opens (or reuses) a Forge sandbox session for terminal streaming.
 * Agents are denied when sandbox is unavailable — never falls back to host PTY.
 */
export async function openForgeTerminalSession(
  input: OpenForgeTerminalInput,
): Promise<OpenForgeTerminalResult> {
  const availability = await resolveForgeSandboxAvailability()
  const policy = evaluateAgentShellPolicy({
    callerKind: input.callerKind,
    requestedTarget: 'sandbox',
    sandboxAvailable: availability.available,
  })

  if (input.callerKind === 'agent' && !policy.allowed) {
    log.warn('forge_terminal_agent_denied', {
      reason: policy.reason,
      availability: availability.reason,
    })
    return {
      ok: false,
      lane: 'forge-sandbox',
      reason: policy.status === 'held' ? availability.reason : 'agent_shell_blocked',
      message: policy.reason,
      policy,
    }
  }

  if (!availability.available) {
    // Users requesting forge pane also fail closed (no fake sandbox).
    return {
      ok: false,
      lane: 'forge-sandbox',
      reason: availability.reason,
      message: availability.message,
      policy,
    }
  }

  if (input.existingSandboxSessionId) {
    const existing = getForgeSandboxSession(input.existingSandboxSessionId)
    if (existing && !existing.teardownAt) {
      return { ok: true, lane: 'forge-sandbox', session: existing, policy }
    }
    return {
      ok: false,
      lane: 'forge-sandbox',
      reason: 'session_not_found',
      message: `Forge sandbox session ${input.existingSandboxSessionId} is not active`,
      policy,
    }
  }

  const created = await createForgeSandboxSession({
    userId: input.userId,
    projectId: input.projectId,
    projectRootPath: input.projectRootPath,
    agentMode: input.agentMode ?? 'Builder',
    costAdapter: input.costAdapter,
    planId: input.planId,
    byokProfileId: input.byokProfileId,
    estimatedMinutes: input.estimatedMinutes ?? 5,
    provider: availability.provider,
  })

  if (!created.ok) {
    return {
      ok: false,
      lane: 'forge-sandbox',
      reason: created.reason,
      message: created.message,
      policy,
    }
  }

  log.info('forge_terminal_opened', {
    sessionId: created.session.sessionId,
    callerKind: input.callerKind,
    provider: created.session.provider,
  })

  return { ok: true, lane: 'forge-sandbox', session: created.session, policy }
}

export interface StreamForgeTerminalCommandInput {
  sessionId: string
  command: string
  args?: string[]
  cwd?: string
  callerKind: AgentShellCallerKind
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
}

export interface StreamForgeTerminalCommandResult {
  ok: boolean
  lane: 'forge-sandbox'
  exitCode: number | null
  durationMs: number
  deniedReason?: string
  deniedMessage?: string
  evidenceEventCount?: number
}

/**
 * Streams one allowlisted command inside an open Forge sandbox session.
 * Re-checks AgentShellPolicy for agents so a mid-session sandbox loss cannot
 * silently continue — fail-closed, never host PTY.
 */
export async function streamForgeTerminalCommand(
  input: StreamForgeTerminalCommandInput,
): Promise<StreamForgeTerminalCommandResult> {
  if (input.callerKind === 'agent') {
    const availability = await resolveForgeSandboxAvailability()
    const session = getForgeSandboxSession(input.sessionId)
    const sandboxLive = Boolean(session && !session.teardownAt && availability.available)
    const policy = evaluateAgentShellPolicy({
      callerKind: 'agent',
      requestedTarget: 'sandbox',
      sandboxAvailable: sandboxLive,
    })
    if (!policy.allowed) {
      return {
        ok: false,
        lane: 'forge-sandbox',
        exitCode: null,
        durationMs: 0,
        deniedReason: policy.status,
        deniedMessage: policy.reason,
      }
    }
  }

  const result = await streamInForgeSandbox({
    sessionId: input.sessionId,
    command: input.command,
    args: input.args,
    cwd: input.cwd,
    onStdout: input.onStdout,
    onStderr: input.onStderr,
  })

  const ledger = getForgeSandboxLedger(input.sessionId)
  return {
    ok: result.ok,
    lane: 'forge-sandbox',
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    deniedReason: result.deniedReason,
    deniedMessage: result.deniedMessage,
    evidenceEventCount: ledger?.events.length,
  }
}

export async function closeForgeTerminalSession(sessionId: string): Promise<boolean> {
  const torn = await teardownForgeSandboxSession(sessionId)
  return Boolean(torn)
}

/** Re-export for API routes that need header-based caller detection. */
export { detectAgentShellCaller }
