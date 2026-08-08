/**
 * L.4 — Forge sandbox duplex stream (stdin/stdout pipes over allowlisted exec).
 *
 * This is NOT a host PTY and NOT a sandbox PTY. True interactive PTY-in-sandbox
 * (node-pty / E2B PTY / docker TTY + SIGWINCH) remains HELD until those APIs are
 * provisioned. Maximum honest duplex today = pipe stdin + stream stdout/stderr
 * for an allowlisted child inside an L.1 Forge session.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { randomUUID } from 'crypto'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  confinePathToProjectRoot,
  guardArgsWithinProjectRoot,
  guardCommandAllowlist,
} from '@/lib/production/forge-sandbox-path-guard'
import { getForgeSandboxExecContext } from '@/lib/production/forge-sandbox-executor'

const log = createComponentLogger('forge-sandbox-duplex')

/** Honest capability claim for UI / protocol ready events. */
export const FORGE_SANDBOX_PTY_HELD_REASON =
  'sandbox_pty_unavailable — local-isolated uses stdin/stdout pipes (no node-pty/E2B PTY/docker TTY); resize is recorded only'

export interface ForgeSandboxDuplexHandle {
  duplexId: string
  sessionId: string
  command: string
  args: string[]
  cols: number
  rows: number
  pty: false
  held: typeof FORGE_SANDBOX_PTY_HELD_REASON
  exited: boolean
  exitCode: number | null
  writeStdin: (data: string) => boolean
  endStdin: () => boolean
  resize: (cols: number, rows: number) => {
    recorded: true
    ptyApplied: false
    held: typeof FORGE_SANDBOX_PTY_HELD_REASON
    cols: number
    rows: number
  }
  kill: () => void
  onStdout: ((chunk: string) => void) | null
  onStderr: ((chunk: string) => void) | null
  onExit: ((code: number | null) => void) | null
}

const DUPLEX_HANDLES = new Map<string, ForgeSandboxDuplexHandle>()

export interface OpenForgeSandboxDuplexInput {
  sessionId: string
  /** Default: interactive node REPL (allowlisted). Never a shell. */
  command?: string
  args?: string[]
  cwd?: string
  cols?: number
  rows?: number
}

export type OpenForgeSandboxDuplexResult =
  | { ok: true; handle: ForgeSandboxDuplexHandle }
  | {
      ok: false
      reason: string
      message: string
    }

/**
 * Spawns an allowlisted process with stdin/stdout/stderr pipes inside the sandbox.
 * Fail-closed on missing session, allowlist deny, or path escape — never host PTY.
 */
export function openForgeSandboxDuplex(
  input: OpenForgeSandboxDuplexInput,
): OpenForgeSandboxDuplexResult {
  const ctx = getForgeSandboxExecContext(input.sessionId)
  if (!ctx) {
    return {
      ok: false,
      reason: 'session_not_found',
      message: `Sandbox session ${input.sessionId} is not active`,
    }
  }

  const command = input.command ?? 'node'
  const args = input.args ?? ['-i']
  const commandGuard = guardCommandAllowlist(command, ctx.commandAllowlist)
  if (!commandGuard.ok) {
    const message = commandGuard.message ?? `Command "${command}" not allowed`
    ctx.appendEvidence('denied', command, args, message)
    return { ok: false, reason: 'command_not_allowlisted', message }
  }

  const cwdGuard = confinePathToProjectRoot(ctx.projectRootPath, input.cwd)
  if (!cwdGuard.ok) {
    ctx.appendEvidence('denied', command, args, cwdGuard.message)
    return { ok: false, reason: 'path_escape', message: cwdGuard.message }
  }

  const argsGuard = guardArgsWithinProjectRoot(ctx.projectRootPath, args)
  if (!argsGuard.ok) {
    const message = argsGuard.violations.join('; ')
    ctx.appendEvidence('denied', command, args, message)
    return { ok: false, reason: 'path_escape', message }
  }

  const cols = Math.max(2, Math.floor(input.cols ?? 80))
  const rows = Math.max(1, Math.floor(input.rows ?? 24))
  const duplexId = `forge-duplex-${randomUUID()}`

  let child: ChildProcessWithoutNullStreams
  try {
    child = spawn(commandGuard.normalized, args, {
      cwd: cwdGuard.resolved,
      env: ctx.buildEnv({
        TERM: 'dumb',
        COLUMNS: String(cols),
        LINES: String(rows),
        FORCE_COLOR: '0',
      }),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.appendEvidence('failed', command, args, `Duplex spawn failed: ${message}`)
    return { ok: false, reason: 'spawn_failed', message }
  }

  ctx.trackChild(child)

  const handle: ForgeSandboxDuplexHandle = {
    duplexId,
    sessionId: input.sessionId,
    command: commandGuard.normalized,
    args,
    cols,
    rows,
    pty: false,
    held: FORGE_SANDBOX_PTY_HELD_REASON,
    exited: false,
    exitCode: null,
    onStdout: null,
    onStderr: null,
    onExit: null,
    writeStdin: (data: string) => {
      if (handle.exited || !child.stdin || child.stdin.destroyed) return false
      try {
        child.stdin.write(data)
        return true
      } catch {
        return false
      }
    },
    endStdin: () => {
      if (handle.exited || !child.stdin || child.stdin.destroyed) return false
      try {
        child.stdin.end()
        return true
      } catch {
        return false
      }
    },
    resize: (nextCols: number, nextRows: number) => {
      handle.cols = Math.max(2, Math.floor(nextCols))
      handle.rows = Math.max(1, Math.floor(nextRows))
      // No PTY — cannot deliver SIGWINCH / TIOCSWINSZ. Record only (honest HELD).
      return {
        recorded: true as const,
        ptyApplied: false as const,
        held: FORGE_SANDBOX_PTY_HELD_REASON,
        cols: handle.cols,
        rows: handle.rows,
      }
    },
    kill: () => {
      if (handle.exited) return
      try {
        child.kill('SIGTERM')
      } catch {
        /* already dead */
      }
    },
  }

  child.stdout.on('data', (chunk: Buffer | string) => {
    handle.onStdout?.(chunk.toString())
  })
  child.stderr.on('data', (chunk: Buffer | string) => {
    handle.onStderr?.(chunk.toString())
  })
  child.on('close', (code) => {
    handle.exited = true
    handle.exitCode = code
    ctx.appendEvidence(
      code === 0 ? 'ok' : 'failed',
      commandGuard.normalized,
      args,
      `Duplex stream closed with code ${code}`,
    )
    handle.onExit?.(code)
    DUPLEX_HANDLES.delete(duplexId)
  })
  child.on('error', (err) => {
    log.warn('forge_sandbox_duplex_child_error', { duplexId, message: err.message })
    handle.exited = true
    handle.exitCode = null
    ctx.appendEvidence('failed', commandGuard.normalized, args, `Duplex error: ${err.message}`)
    handle.onExit?.(null)
    DUPLEX_HANDLES.delete(duplexId)
  })

  DUPLEX_HANDLES.set(duplexId, handle)
  log.info('forge_sandbox_duplex_opened', {
    duplexId,
    sessionId: input.sessionId,
    command: commandGuard.normalized,
    provider: ctx.provider,
  })

  return { ok: true, handle }
}

export function getForgeSandboxDuplex(duplexId: string): ForgeSandboxDuplexHandle | undefined {
  return DUPLEX_HANDLES.get(duplexId)
}

export function writeForgeSandboxDuplexStdin(duplexId: string, data: string): boolean {
  const handle = DUPLEX_HANDLES.get(duplexId)
  if (!handle) return false
  return handle.writeStdin(data)
}

export function resizeForgeSandboxDuplex(
  duplexId: string,
  cols: number,
  rows: number,
): ReturnType<ForgeSandboxDuplexHandle['resize']> | null {
  const handle = DUPLEX_HANDLES.get(duplexId)
  if (!handle) return null
  return handle.resize(cols, rows)
}

export function closeForgeSandboxDuplex(duplexId: string): boolean {
  const handle = DUPLEX_HANDLES.get(duplexId)
  if (!handle) return false
  handle.kill()
  return true
}

/** Test helper — clears duplex handle registry (children should already be killed via session teardown). */
export function __resetForgeSandboxDuplexForTests(): void {
  for (const handle of DUPLEX_HANDLES.values()) {
    handle.kill()
  }
  DUPLEX_HANDLES.clear()
}
