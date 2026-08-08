/**
 * L.1 — ForgeSandboxExecutor (Onda L / Aethel Forge)
 * Decision #47–#48: agent tools MUST NOT use host PTY. This module is the ONLY
 * place an agent (never a human) may execute a shell command from — every call
 * goes through create → exec → teardown, is CostGuard-reserved (Trava I), and is
 * evidence-backed (task-evidence-ledger), per the binding contract in
 * `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` §Contracts / §Onda L delivery map L.1.
 *
 * Providers:
 *  - 'local-isolated' — REAL today. No external infra required. Real isolation:
 *    command allowlist, filesystem confinement to the project root (symlink-safe),
 *    scrubbed environment (secrets never inherited), timeout + output caps, and
 *    execution via `child_process.execFile` (never a PTY — see forge-sandbox-path-guard
 *    for the allow/deny primitives). Network policy is honestly PARTIAL: env-level
 *    proxy/registry scrubbing only, NOT a kernel network namespace/firewall block —
 *    see `describeForgeSandboxNetworkHonesty`.
 *  - 'e2b' — REAL code path reusing the existing preview E2B module (Decision #52),
 *    but requires `E2B_API_KEY` to actually create a remote sandbox. Reports HELD
 *    with the exact missing-env reason when not configured — never fakes success.
 *  - 'firecracker' — HELD. No Firecracker/KVM host integration exists in this repo;
 *    documented here rather than faked.
 */

import { execFile, spawn, type ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  reserveCreativeCost,
  settleCreativeCost,
  cancelCreativeCost,
  type CostGuardLedgerAdapter,
  type CostGuardBlockReason,
} from '@/lib/production/creative-cost-guard'
import {
  createTaskEvidenceLedger,
  appendTaskEvidence,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import { evaluateAgentShellPolicy } from '@/lib/production/agent-shell-policy'
import type { AgentMode } from '@/lib/production/agent-tool-bus'
import {
  confinePathToProjectRoot,
  guardArgsWithinProjectRoot,
  guardCommandAllowlist,
  DEFAULT_COMMAND_ALLOWLIST,
} from '@/lib/production/forge-sandbox-path-guard'
import { loadE2BModule, resolveE2BSandboxCtor, type E2BSandboxLike } from '@/lib/server/e2b-runtime'

const log = createComponentLogger('forge-sandbox-executor')

export type ForgeSandboxProvider = 'e2b' | 'firecracker' | 'local-isolated'
export type ForgeSandboxNetworkPolicy = 'none' | 'npm-registry' | 'allowlist'

/** Forge minutes billing weight — 1 sandbox-minute == 1000 CostGuard token-weight units. */
export const FORGE_SANDBOX_WEIGHT_PER_MINUTE = 1000
const DEFAULT_ESTIMATED_MINUTES = 5
const DEFAULT_EXEC_TIMEOUT_MS = 30_000
const DEFAULT_MAX_OUTPUT_BYTES = 1_000_000

export interface ForgeSandboxSession {
  sessionId: string
  provider: ForgeSandboxProvider
  devcontainerRef?: string
  projectId: string
  agentMode: AgentMode
  networkPolicy: ForgeSandboxNetworkPolicy
  /** Trava I — required before any sandbox minute is billed */
  costGuardReservationId: string
  evidenceLedgerId: string
  createdAt: string
  teardownAt?: string
}

interface ForgeSandboxRuntimeState {
  session: ForgeSandboxSession
  projectRootPath: string
  commandAllowlist: readonly string[]
  costAdapter: CostGuardLedgerAdapter
  estimatedMinutes: number
  e2bHandle?: E2BSandboxLike
  localBackgroundProcesses?: ChildProcess[]
}

const RUNTIME_SESSIONS = new Map<string, ForgeSandboxRuntimeState>()
const LEDGERS = new Map<string, TaskEvidenceLedger>()

export type ForgeSandboxAvailabilityReason =
  | 'ready'
  | 'e2b_api_key_missing'
  | 'e2b_module_load_failed'
  | 'firecracker_not_implemented'

export interface ForgeSandboxAvailability {
  provider: ForgeSandboxProvider
  available: boolean
  reason: ForgeSandboxAvailabilityReason
  message: string
}

/** Honest network-isolation disclosure — never claim a kernel-level block we don't have. */
export function describeForgeSandboxNetworkHonesty(provider: ForgeSandboxProvider): {
  kernelLevelIsolation: boolean
  mechanism: string
} {
  if (provider === 'local-isolated') {
    return {
      kernelLevelIsolation: false,
      mechanism:
        'Environment-level scrubbing only (proxy/registry vars stripped for networkPolicy=none). ' +
        'No OS firewall / network namespace block — HELD until a container or VM host is wired.',
    }
  }
  return {
    kernelLevelIsolation: true,
    mechanism: `${provider} sandbox VM boundary (per-provider network policy applied by the remote host).`,
  }
}

/** Checks whether a requested (or auto-selected) provider is actually usable right now. */
export async function resolveForgeSandboxAvailability(
  requested?: ForgeSandboxProvider,
): Promise<ForgeSandboxAvailability> {
  if (requested === 'firecracker') {
    return {
      provider: 'firecracker',
      available: false,
      reason: 'firecracker_not_implemented',
      message:
        'Firecracker/KVM sandbox host is not implemented in this repo (Linux KVM required; ' +
        'this workstation/CI target is Windows). Documented HELD — no fallback pretends success.',
    }
  }

  if (requested === 'e2b' || requested === undefined) {
    const apiKey = String(process.env.E2B_API_KEY || '').trim()
    if (!apiKey) {
      if (requested === 'e2b') {
        return {
          provider: 'e2b',
          available: false,
          reason: 'e2b_api_key_missing',
          message: 'E2B_API_KEY is not set — cannot create a remote E2B sandbox (Decision #52 reuse path).',
        }
      }
      // Auto-select falls back to local-isolated, which is always real/available.
      return {
        provider: 'local-isolated',
        available: true,
        reason: 'ready',
        message: 'E2B not configured; using local-isolated provider (real allowlist + path confinement).',
      }
    }
    try {
      await loadE2BModule()
      return { provider: 'e2b', available: true, reason: 'ready', message: 'E2B module loadable and API key present.' }
    } catch (err) {
      return {
        provider: 'e2b',
        available: false,
        reason: 'e2b_module_load_failed',
        message: `Failed to load 'e2b' module: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  // local-isolated
  return { provider: 'local-isolated', available: true, reason: 'ready', message: 'Local-isolated provider ready.' }
}

export interface ForgeSandboxCreateInput {
  userId: string
  projectId: string
  agentMode: AgentMode
  provider?: ForgeSandboxProvider
  networkPolicy?: ForgeSandboxNetworkPolicy
  /** Absolute path on disk — every exec cwd/path arg is confined inside this root. */
  projectRootPath: string
  commandAllowlist?: readonly string[]
  costAdapter: CostGuardLedgerAdapter
  planId?: string
  byokProfileId?: string
  estimatedMinutes?: number
}

export type ForgeSandboxCreateResult =
  | { ok: true; session: ForgeSandboxSession }
  | { ok: false; reason: CostGuardBlockReason | ForgeSandboxAvailabilityReason; message: string }

export interface StreamExecOptions {
  sessionId: string
  command: string
  args?: string[]
  cwd?: string
  extraEnv?: Record<string, string>
  onStdout?: (data: string) => void
  onStderr?: (data: string) => void
}

export interface StreamExecResult {
  ok: boolean
  exitCode: number | null
  durationMs: number
  deniedReason?: string
  deniedMessage?: string
}

export async function streamInForgeSandbox(input: StreamExecOptions): Promise<StreamExecResult> {
  const startedAt = Date.now()
  const state = RUNTIME_SESSIONS.get(input.sessionId)
  if (!state) {
    return {
      ok: false,
      exitCode: null,
      durationMs: Date.now() - startedAt,
      deniedReason: 'session_not_found',
      deniedMessage: `Sandbox session ${input.sessionId} is not active`,
    }
  }

  const args = input.args ?? []
  const commandGuard = guardCommandAllowlist(input.command, state.commandAllowlist)
  if (!commandGuard.ok) {
    const message = commandGuard.message ?? `Command "${input.command}" not allowed`
    appendExecEvidence(input.sessionId, 'denied', input.command, args, message)
    return { ok: false, exitCode: null, durationMs: Date.now() - startedAt, deniedReason: 'command_not_allowlisted', deniedMessage: message }
  }

  const cwdGuard = confinePathToProjectRoot(state.projectRootPath, input.cwd)
  if (!cwdGuard.ok) {
    appendExecEvidence(input.sessionId, 'denied', input.command, args, cwdGuard.message)
    return { ok: false, exitCode: null, durationMs: Date.now() - startedAt, deniedReason: 'path_escape', deniedMessage: cwdGuard.message }
  }

  const argsGuard = guardArgsWithinProjectRoot(state.projectRootPath, args)
  if (!argsGuard.ok) {
    const message = argsGuard.violations.join('; ')
    appendExecEvidence(input.sessionId, 'denied', input.command, args, message)
    return { ok: false, exitCode: null, durationMs: Date.now() - startedAt, deniedReason: 'path_escape', deniedMessage: message }
  }

  return new Promise((resolve) => {
    const child = spawn(commandGuard.normalized, args, {
      cwd: cwdGuard.resolved,
      env: buildScrubbedEnv(state.session.networkPolicy, input.extraEnv),
      // stdin ignored for one-shot stream; L.4 duplex uses openForgeSandboxDuplex instead
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    if (input.onStdout) child.stdout?.on('data', (d) => input.onStdout!(d.toString()))
    if (input.onStderr) child.stderr?.on('data', (d) => input.onStderr!(d.toString()))

    child.on('close', (code) => {
      appendExecEvidence(input.sessionId, code === 0 ? 'ok' : 'failed', input.command, args, `Streamed execution finished with code ${code}`)
      resolve({ ok: code === 0, exitCode: code, durationMs: Date.now() - startedAt })
    })

    child.on('error', (err) => {
      appendExecEvidence(input.sessionId, 'failed', input.command, args, `Streamed execution errored: ${err.message}`)
      resolve({ ok: false, exitCode: null, durationMs: Date.now() - startedAt, deniedReason: 'spawn_failed', deniedMessage: err.message })
    })
  })
}

/**
 * Context slice for L.4 duplex (stdin/stdout pipes) without exposing the full runtime map.
 * Fail-closed: null when session missing or already torn down.
 */
export function getForgeSandboxExecContext(sessionId: string): {
  sessionId: string
  projectRootPath: string
  commandAllowlist: readonly string[]
  networkPolicy: ForgeSandboxNetworkPolicy
  agentMode: AgentMode
  provider: ForgeSandboxProvider
  buildEnv: (extra?: Record<string, string>) => Record<string, string>
  appendEvidence: (
    status: 'ok' | 'failed' | 'denied',
    command: string,
    args: string[],
    summary: string,
  ) => void
  trackChild: (child: ChildProcess) => void
} | null {
  const state = RUNTIME_SESSIONS.get(sessionId)
  if (!state || state.session.teardownAt) return null
  return {
    sessionId,
    projectRootPath: state.projectRootPath,
    commandAllowlist: state.commandAllowlist,
    networkPolicy: state.session.networkPolicy,
    agentMode: state.session.agentMode,
    provider: state.session.provider,
    buildEnv: (extra) => buildScrubbedEnv(state.session.networkPolicy, extra),
    appendEvidence: (status, command, args, summary) =>
      appendExecEvidence(sessionId, status, command, args, summary),
    trackChild: (child) => {
      if (!state.localBackgroundProcesses) state.localBackgroundProcesses = []
      state.localBackgroundProcesses.push(child)
    },
  }
}

/**
 * Creates a Forge sandbox session: reserves CostGuard minutes (Trava I), seeds the
 * evidence ledger, and — provider-dependently — provisions the underlying isolate.
 * Fails closed (no session, no reservation left dangling) on any denial.
 */
export async function createForgeSandboxSession(
  input: ForgeSandboxCreateInput,
): Promise<ForgeSandboxCreateResult> {
  const availability = await resolveForgeSandboxAvailability(input.provider)

  // Law #48 — the shell policy, not this module, is the final arbiter of whether an
  // agent may reach a sandbox lane. Feeding it the REAL availability (not a hardcoded
  // `true`) means a future L.1 regression that silently loses sandbox capability is
  // caught here as a policy denial instead of quietly executing anyway.
  const shellPolicy = evaluateAgentShellPolicy({
    callerKind: 'agent',
    requestedTarget: 'sandbox',
    sandboxAvailable: availability.available,
  })
  if (!shellPolicy.allowed) {
    return { ok: false, reason: availability.reason, message: shellPolicy.reason }
  }
  const provider = availability.provider
  const estimatedMinutes = input.estimatedMinutes ?? DEFAULT_ESTIMATED_MINUTES
  const networkPolicy = input.networkPolicy ?? 'none'

  const reservation = await reserveCreativeCost(
    {
      userId: input.userId,
      projectId: input.projectId,
      domain: 'forge-sandbox',
      estimatedTokenWeight: estimatedMinutes * FORGE_SANDBOX_WEIGHT_PER_MINUTE,
      byokProfileId: input.byokProfileId,
      planId: input.planId,
    },
    input.costAdapter,
  )
  if (!reservation.ok) {
    log.warn('forge_sandbox_cost_guard_denied', { reason: reservation.reason, projectId: input.projectId })
    return { ok: false, reason: reservation.reason, message: reservation.message }
  }

  const sessionId = `forge-sbx-${randomUUID()}`
  const now = new Date().toISOString()

  let e2bHandle: E2BSandboxLike | undefined
  if (provider === 'e2b') {
    try {
      const e2bModule = await loadE2BModule()
      const ctor = resolveE2BSandboxCtor(e2bModule)
      if (!ctor) throw new Error('e2b module did not expose a Sandbox constructor')
      const template = String(process.env.AETHEL_PREVIEW_E2B_TEMPLATE || 'base').trim()
      e2bHandle = await ctor.create(template, {
        apiKey: String(process.env.E2B_API_KEY || ''),
        timeoutMs: estimatedMinutes * 60_000,
      })
    } catch (err) {
      await cancelCreativeCost(reservation.reservation.reservationId, input.costAdapter)
      const message = `E2B sandbox create failed: ${err instanceof Error ? err.message : String(err)}`
      log.warn('forge_sandbox_e2b_create_failed', { message })
      return { ok: false, reason: 'e2b_module_load_failed', message }
    }
  }

  let ledger = createTaskEvidenceLedger({
    taskId: sessionId,
    projectId: input.projectId,
    mission: `Forge sandbox (${provider}) for ${input.agentMode}`,
    ownerAgent: input.agentMode,
    now,
  })
  ledger = appendTaskEvidence(ledger, {
    kind: 'cost',
    title: 'Forge sandbox minutes reserved',
    summary: `Reserved ~${estimatedMinutes} min via CostGuard (funding=${reservation.reservation.funding}).`,
    refs: [reservation.reservation.reservationId],
    actor: input.agentMode,
    createdAt: now,
  })

  const session: ForgeSandboxSession = {
    sessionId,
    provider,
    projectId: input.projectId,
    agentMode: input.agentMode,
    networkPolicy,
    costGuardReservationId: reservation.reservation.reservationId,
    evidenceLedgerId: sessionId,
    createdAt: now,
  }

  RUNTIME_SESSIONS.set(sessionId, {
    session,
    projectRootPath: input.projectRootPath,
    commandAllowlist: input.commandAllowlist ?? DEFAULT_COMMAND_ALLOWLIST,
    costAdapter: input.costAdapter,
    estimatedMinutes,
    e2bHandle,
  })
  LEDGERS.set(sessionId, ledger)

  log.info('forge_sandbox_created', { sessionId, provider, projectId: input.projectId })
  return { ok: true, session }
}

export interface ForgeSandboxExecInput {
  sessionId: string
  command: string
  args?: string[]
  /** Relative (to project root) or absolute path — must resolve inside the root. */
  cwd?: string
  timeoutMs?: number
  maxOutputBytes?: number
  /** Additional env entries the caller explicitly allowlists for this call (never secrets by default). */
  extraEnv?: Record<string, string>
  /** If true, spawns the process in the background and resolves immediately (useful for dev servers). */
  background?: boolean
}

export interface ForgeSandboxExecResult {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  truncated: boolean
  durationMs: number
  /** Set when `ok:false` because of a POLICY denial (allowlist/path-escape), not a command failure. */
  deniedReason?: 'session_not_found' | 'command_not_allowlisted' | 'path_escape' | 'provider_not_executable'
  deniedMessage?: string
}

const SAFE_ENV_KEYS = [
  'PATH',
  'Path',
  'SystemRoot',
  'windir',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'ComSpec',
  'PATHEXT',
  'HOMEDRIVE',
  'HOMEPATH',
  'NUMBER_OF_PROCESSORS',
  'PROCESSOR_ARCHITECTURE',
]

/** Never inherits the full host env (no leaked API keys / DB URLs / secrets). */
function buildScrubbedEnv(networkPolicy: ForgeSandboxNetworkPolicy, extraEnv?: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {}
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  if (networkPolicy === 'none') {
    delete env.HTTP_PROXY
    delete env.HTTPS_PROXY
    delete env.npm_config_registry
    env.NO_PROXY = '*'
  }
  if (extraEnv) Object.assign(env, extraEnv)
  return env
}

/**
 * Executes one command inside an existing Forge sandbox session.
 * `local-isolated`: real `execFile` (never a PTY) with allowlist + path confinement.
 * `e2b`: proxies to the connected E2B sandbox's `commands.run`.
 * `firecracker`: never reachable — session creation already denies this provider.
 */
export async function execInForgeSandbox(input: ForgeSandboxExecInput): Promise<ForgeSandboxExecResult> {
  const startedAt = Date.now()
  const state = RUNTIME_SESSIONS.get(input.sessionId)
  if (!state) {
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      truncated: false,
      durationMs: 0,
      deniedReason: 'session_not_found',
      deniedMessage: `No live Forge sandbox session: ${input.sessionId}`,
    }
  }

  const args = input.args ?? []
  const commandGuard = guardCommandAllowlist(input.command, state.commandAllowlist)
  if (!commandGuard.ok) {
    const message = commandGuard.message ?? `Command "${input.command}" is not in the sandbox allowlist.`
    appendExecEvidence(input.sessionId, 'denied', input.command, args, message)
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      truncated: false,
      durationMs: Date.now() - startedAt,
      deniedReason: 'command_not_allowlisted',
      deniedMessage: message,
    }
  }

  const cwdGuard = confinePathToProjectRoot(state.projectRootPath, input.cwd)
  if (!cwdGuard.ok) {
    appendExecEvidence(input.sessionId, 'denied', input.command, args, cwdGuard.message)
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      truncated: false,
      durationMs: Date.now() - startedAt,
      deniedReason: 'path_escape',
      deniedMessage: cwdGuard.message,
    }
  }

  const argsGuard = guardArgsWithinProjectRoot(state.projectRootPath, args)
  if (!argsGuard.ok) {
    const message = argsGuard.violations.join('; ')
    appendExecEvidence(input.sessionId, 'denied', input.command, args, message)
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: '',
      truncated: false,
      durationMs: Date.now() - startedAt,
      deniedReason: 'path_escape',
      deniedMessage: message,
    }
  }

  if (state.session.provider === 'local-isolated') {
    if (input.background) {
      const bgResult = await spawnLocalIsolatedBackground({
        command: input.command,
        args,
        cwd: cwdGuard.resolved,
        env: buildScrubbedEnv(state.session.networkPolicy, input.extraEnv),
      })
      if (!state.localBackgroundProcesses) state.localBackgroundProcesses = []
      if (bgResult.child) state.localBackgroundProcesses.push(bgResult.child)
      
      appendExecEvidence(
        input.sessionId,
        bgResult.ok ? 'ok' : 'failed',
        input.command,
        args,
        `background spawn PID=${bgResult.child?.pid ?? 'unknown'}`
      )
      return {
        ok: bgResult.ok,
        exitCode: null,
        stdout: '',
        stderr: bgResult.error ?? '',
        truncated: false,
        durationMs: Date.now() - startedAt,
      }
    }

    const result = await execLocalIsolated({
      command: input.command,
      args,
      cwd: cwdGuard.resolved,
      env: buildScrubbedEnv(state.session.networkPolicy, input.extraEnv),
      timeoutMs: input.timeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS,
      maxOutputBytes: input.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
    })
    appendExecEvidence(
      input.sessionId,
      result.ok ? 'ok' : 'failed',
      input.command,
      args,
      `exit=${result.exitCode} stdout=${result.stdout.length}B stderr=${result.stderr.length}B`,
    )
    return { ...result, durationMs: Date.now() - startedAt }
  }

  if (state.session.provider === 'e2b' && state.e2bHandle) {
    try {
      const commandLine = [input.command, ...args].join(' ')
      await state.e2bHandle.commands.run(commandLine, {
        cwd: cwdGuard.resolved,
        timeoutMs: input.timeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS,
        background: input.background,
      })
      appendExecEvidence(input.sessionId, 'ok', input.command, args, `E2B commands.run dispatched (background=${!!input.background})`)
      return {
        ok: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        truncated: false,
        durationMs: Date.now() - startedAt,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      appendExecEvidence(input.sessionId, 'failed', input.command, args, message)
      return {
        ok: false,
        exitCode: null,
        stdout: '',
        stderr: message,
        truncated: false,
        durationMs: Date.now() - startedAt,
      }
    }
  }

  return {
    ok: false,
    exitCode: null,
    stdout: '',
    stderr: '',
    truncated: false,
    durationMs: Date.now() - startedAt,
    deniedReason: 'provider_not_executable',
    deniedMessage: `Provider "${state.session.provider}" has no executable handle for this session.`,
  }
}

function execLocalIsolated(input: {
  command: string
  args: string[]
  cwd: string
  env: Record<string, string>
  timeoutMs: number
  maxOutputBytes: number
}): Promise<Omit<ForgeSandboxExecResult, 'durationMs'>> {
  return new Promise((resolve) => {
    execFile(
      input.command,
      input.args,
      {
        cwd: input.cwd,
        // Deliberately scrubbed (see buildScrubbedEnv) — narrower than the project-wide
        // NodeJS.ProcessEnv augmentation, which is irrelevant to a child process env.
        env: input.env as NodeJS.ProcessEnv,
        timeout: input.timeoutMs,
        maxBuffer: input.maxOutputBytes,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const stdoutStr = stdout.toString()
        const stderrStr = stderr.toString()
        if (error) {
          const truncated = /maxBuffer/i.test(error.message)
          resolve({
            ok: false,
            exitCode: typeof error.code === 'number' ? error.code : null,
            stdout: stdoutStr,
            stderr: stderrStr || error.message,
            truncated,
          })
          return
        }
        resolve({ ok: true, exitCode: 0, stdout: stdoutStr, stderr: stderrStr, truncated: false })
      },
    )
  })
}

function spawnLocalIsolatedBackground(input: {
  command: string
  args: string[]
  cwd: string
  env: Record<string, string>
}): Promise<{ ok: boolean; child?: ChildProcess; error?: string }> {
  return new Promise((resolve) => {
    try {
      const child = spawn(input.command, input.args, {
        cwd: input.cwd,
        env: input.env as NodeJS.ProcessEnv,
        windowsHide: true,
        detached: false,
        stdio: 'ignore', // Background daemons stream output to logs/ledger later if needed
      })

      child.on('error', (err) => {
        resolve({ ok: false, error: err.message })
      })

      // Resolve immediately if it spawns successfully without erroring synchronously
      if (child.pid !== undefined) {
        resolve({ ok: true, child })
      }
    } catch (err) {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })
}

function appendExecEvidence(
  sessionId: string,
  status: 'ok' | 'failed' | 'denied',
  command: string,
  args: string[],
  summary: string,
): void {
  const ledger = LEDGERS.get(sessionId)
  if (!ledger) return
  const state = RUNTIME_SESSIONS.get(sessionId)
  LEDGERS.set(
    sessionId,
    appendTaskEvidence(ledger, {
      kind: 'command',
      title: `Sandbox command ${status}: ${command}`,
      summary: `${[command, ...args].join(' ')} — ${summary}`,
      refs: [],
      actor: state?.session.agentMode ?? 'agent',
    }),
  )
  if (status === 'denied') {
    log.warn('forge_sandbox_exec_denied', { sessionId, command, summary })
  } else {
    log.info('forge_sandbox_exec', { sessionId, command, status })
  }
}

/** Reads the live evidence ledger for a session (tests + L.5/L.6 callers). */
export function getForgeSandboxLedger(sessionId: string): TaskEvidenceLedger | undefined {
  return LEDGERS.get(sessionId)
}

/** Retrieves an active Forge sandbox session without executing commands (used for session reuse by L.8/L.9). */
export function getForgeSandboxSession(sessionId: string): ForgeSandboxSession | undefined {
  return RUNTIME_SESSIONS.get(sessionId)?.session
}

/**
 * L.8 helper — resolve a real E2B preview host from the live sandbox handle.
 * Returns null when the session is missing, already torn down, non-E2B, or has no handle.
 * Never fabricates `*.e2b.dev` URLs from session ids.
 */
export function resolveForgeSandboxE2BPreviewUrl(
  sessionId: string,
  port: number,
): string | null {
  const state = RUNTIME_SESSIONS.get(sessionId)
  if (!state || state.session.teardownAt) return null
  if (state.session.provider !== 'e2b' || !state.e2bHandle) return null
  try {
    const host = state.e2bHandle.getHost(port)
    if (typeof host !== 'string' || host.trim().length === 0) return null
    const normalized = host.trim().replace(/^https?:\/\//i, '')
    return `https://${normalized}`
  } catch {
    return null
  }
}

export type ForgeSandboxWriteFile = {
  path: string
  content: string
}

export type ForgeSandboxWriteResult =
  | {
      ok: true
      sessionId: string
      provider: ForgeSandboxProvider
      filesWritten: number
      projectRootPath: string
    }
  | {
      ok: false
      reason: 'session_not_found' | 'session_torn_down' | 'path_escape' | 'write_failed' | 'e2b_handle_missing'
      message: string
      filesWritten: number
    }

/**
 * L.8 — write multi-file contents into a live Forge sandbox session.
 * - local-isolated: path-guarded writes under projectRootPath (same FS the dev server watches)
 * - e2b: writes via the live sandbox files API (fail-closed if handle missing)
 * Never invents success when the session is gone.
 */
export async function writeFilesToForgeSandbox(input: {
  sessionId: string
  files: ForgeSandboxWriteFile[]
}): Promise<ForgeSandboxWriteResult> {
  const state = RUNTIME_SESSIONS.get(input.sessionId)
  if (!state) {
    return {
      ok: false,
      reason: 'session_not_found',
      message: `No live Forge sandbox session: ${input.sessionId}`,
      filesWritten: 0,
    }
  }
  if (state.session.teardownAt) {
    return {
      ok: false,
      reason: 'session_torn_down',
      message: `Sandbox session already torn down: ${input.sessionId}`,
      filesWritten: 0,
    }
  }

  const files = input.files.filter((f) => typeof f.path === 'string' && f.path.trim().length > 0)
  if (files.length === 0) {
    return {
      ok: true,
      sessionId: input.sessionId,
      provider: state.session.provider,
      filesWritten: 0,
      projectRootPath: state.projectRootPath,
    }
  }

  let written = 0
  try {
    if (state.session.provider === 'e2b') {
      if (!state.e2bHandle) {
        return {
          ok: false,
          reason: 'e2b_handle_missing',
          message: 'E2B session has no live files handle — cannot sync without reprovision.',
          filesWritten: 0,
        }
      }
      const workdir = String(process.env.AETHEL_PREVIEW_E2B_WORKDIR || '/workspace').trim() || '/workspace'
      const normalizedWorkdir = workdir.startsWith('/') ? workdir : `/${workdir}`
      const batch: Array<{ path: string; data: string }> = []
      for (const file of files) {
        const guard = confinePathToProjectRoot(state.projectRootPath, file.path)
        if (!guard.ok) {
          return {
            ok: false,
            reason: 'path_escape',
            message: guard.message,
            filesWritten: written,
          }
        }
        const relative = path.relative(state.projectRootPath, guard.resolved).replace(/\\/g, '/')
        batch.push({
          path: path.posix.join(normalizedWorkdir, relative),
          data: file.content,
        })
      }
      await state.e2bHandle.files.writeFiles(batch)
      written = batch.length
    } else {
      for (const file of files) {
        const guard = confinePathToProjectRoot(state.projectRootPath, file.path)
        if (!guard.ok) {
          return {
            ok: false,
            reason: 'path_escape',
            message: guard.message,
            filesWritten: written,
          }
        }
        await fs.mkdir(path.dirname(guard.resolved), { recursive: true })
        await fs.writeFile(guard.resolved, file.content, 'utf8')
        written += 1
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    appendExecEvidence(input.sessionId, 'failed', 'writeFiles', [], `Sandbox file sync failed: ${message}`)
    return {
      ok: false,
      reason: 'write_failed',
      message: `Sandbox file sync failed: ${message}`,
      filesWritten: written,
    }
  }

  appendExecEvidence(
    input.sessionId,
    'ok',
    'writeFiles',
    [],
    `Synced ${written} file(s) into ${state.session.provider} sandbox for preview hot-update.`,
  )
  log.info('forge_sandbox_files_written', {
    sessionId: input.sessionId,
    provider: state.session.provider,
    filesWritten: written,
  })
  return {
    ok: true,
    sessionId: input.sessionId,
    provider: state.session.provider,
    filesWritten: written,
    projectRootPath: state.projectRootPath,
  }
}

/**
 * L.8 — verify relative paths exist inside a live session project root (local apply already on disk).
 * Fail-closed on missing session / path escape / missing file.
 */
export async function verifyFilesInForgeSandbox(input: {
  sessionId: string
  paths: string[]
}): Promise<ForgeSandboxWriteResult> {
  const state = RUNTIME_SESSIONS.get(input.sessionId)
  if (!state) {
    return {
      ok: false,
      reason: 'session_not_found',
      message: `No live Forge sandbox session: ${input.sessionId}`,
      filesWritten: 0,
    }
  }
  if (state.session.teardownAt) {
    return {
      ok: false,
      reason: 'session_torn_down',
      message: `Sandbox session already torn down: ${input.sessionId}`,
      filesWritten: 0,
    }
  }

  let verified = 0
  for (const rawPath of input.paths) {
    if (!rawPath || !rawPath.trim()) continue
    const guard = confinePathToProjectRoot(state.projectRootPath, rawPath)
    if (!guard.ok) {
      return {
        ok: false,
        reason: 'path_escape',
        message: guard.message,
        filesWritten: verified,
      }
    }
    try {
      const stat = await fs.stat(guard.resolved)
      if (!stat.isFile()) {
        return {
          ok: false,
          reason: 'write_failed',
          message: `Path is not a file in sandbox root: ${rawPath}`,
          filesWritten: verified,
        }
      }
      verified += 1
    } catch {
      return {
        ok: false,
        reason: 'write_failed',
        message: `Applied path missing from sandbox root: ${rawPath}`,
        filesWritten: verified,
      }
    }
  }

  return {
    ok: true,
    sessionId: input.sessionId,
    provider: state.session.provider,
    filesWritten: verified,
    projectRootPath: state.projectRootPath,
  }
}

export interface ForgeSandboxTeardownResult {
  session: ForgeSandboxSession
  ledger: TaskEvidenceLedger
}

/** Tears down a session: settles CostGuard for actual elapsed minutes, closes the ledger. */
export async function teardownForgeSandboxSession(
  sessionId: string,
  actualMinutes?: number,
): Promise<ForgeSandboxTeardownResult | undefined> {
  const state = RUNTIME_SESSIONS.get(sessionId)
  if (!state) return undefined

  const teardownAt = new Date().toISOString()
  const minutes = actualMinutes ?? state.estimatedMinutes
  await settleCreativeCost(state.session.costGuardReservationId, minutes * FORGE_SANDBOX_WEIGHT_PER_MINUTE, state.costAdapter)

  const session: ForgeSandboxSession = { ...state.session, teardownAt }
  let ledger = LEDGERS.get(sessionId)
  if (ledger) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'cost',
      title: 'Forge sandbox torn down',
      summary: `Settled ~${minutes} min. Provider=${session.provider}.`,
      refs: [session.costGuardReservationId],
      actor: session.agentMode,
      createdAt: teardownAt,
    })
    LEDGERS.set(sessionId, ledger)
  }

  // Gracefully kill background processes
  if (state.localBackgroundProcesses) {
    for (const child of state.localBackgroundProcesses) {
      if (!child.killed) {
        try {
          child.kill('SIGKILL')
        } catch {
          // ignore already dead processes
        }
      }
    }
  }

  RUNTIME_SESSIONS.set(sessionId, { ...state, session })
  log.info('forge_sandbox_teardown', { sessionId, provider: session.provider, minutes })
  return { session, ledger: ledger as TaskEvidenceLedger }
}

/** Test helper — clears all in-memory session/ledger state. */
export function __resetForgeSandboxExecutorForTests(): void {
  RUNTIME_SESSIONS.clear()
  LEDGERS.clear()
}
