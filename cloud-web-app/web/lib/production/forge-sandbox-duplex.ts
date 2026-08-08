/**
 * L.4 — Forge sandbox duplex stream (sandbox PTY first-light + pipe fallback).
 *
 * Prefer a real PTY via node-pty for allowlisted children inside an L.1 Forge
 * session (path-confined + scrubbed env). This is NOT the human host-PTY lane
 * (`/api/terminal/create` / Tauri) — agents stay on forge-sandbox only (Law #48).
 *
 * Fail-closed honesty:
 *  - `pty:true` / `ptyApplied:true` only when a live IPty exists
 *  - otherwise stdin/stdout pipes + `ptyApplied:false` (never fake PTY)
 *  - E2B remote PTY API still HELD (no wired SDK surface here)
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { randomUUID } from 'crypto'
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  confinePathToProjectRoot,
  guardArgsWithinProjectRoot,
  guardCommandAllowlist,
  normalizeCommandBasename,
} from '@/lib/production/forge-sandbox-path-guard'
import { getForgeSandboxExecContext } from '@/lib/production/forge-sandbox-executor'

const log = createComponentLogger('forge-sandbox-duplex')
const require = createRequire(import.meta.url)

/** Honest capability claim when no live sandbox PTY is available. */
export const FORGE_SANDBOX_PTY_HELD_REASON =
  'sandbox_pty_unavailable — duplex using stdin/stdout pipes (node-pty spawn failed or disabled; E2B remote PTY API unwired); resize recorded only'

export const FORGE_SANDBOX_PTY_DISABLED_REASON =
  'sandbox_pty_disabled — AETHEL_FORGE_SANDBOX_PTY=0 forces pipe duplex'

type NodePtyModule = typeof import('node-pty')
type IPty = import('node-pty').IPty

export interface ForgeSandboxPtyProbe {
  moduleAvailable: boolean
  envDisabled: boolean
  canAttempt: boolean
  reason: string
}

/** Probe whether this host can attempt sandbox node-pty (no spawn). */
export function probeForgeSandboxPtyAvailability(): ForgeSandboxPtyProbe {
  const envDisabled =
    process.env.AETHEL_FORGE_SANDBOX_PTY === '0' ||
    process.env.AETHEL_FORGE_SANDBOX_PTY === 'false'
  if (envDisabled) {
    return {
      moduleAvailable: false,
      envDisabled: true,
      canAttempt: false,
      reason: FORGE_SANDBOX_PTY_DISABLED_REASON,
    }
  }
  try {
    const mod = require('node-pty') as NodePtyModule
    if (typeof mod?.spawn !== 'function') {
      return {
        moduleAvailable: false,
        envDisabled: false,
        canAttempt: false,
        reason: 'sandbox_pty_unavailable — node-pty module missing spawn()',
      }
    }
    return {
      moduleAvailable: true,
      envDisabled: false,
      canAttempt: true,
      reason: 'node-pty loadable — sandbox PTY attempt enabled for forge duplex',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      moduleAvailable: false,
      envDisabled: false,
      canAttempt: false,
      reason: `sandbox_pty_unavailable — node-pty require failed: ${message}`,
    }
  }
}

export interface ForgeSandboxDuplexResizeResult {
  recorded: true
  ptyApplied: boolean
  held: string | null
  cols: number
  rows: number
}

export interface ForgeSandboxDuplexHandle {
  duplexId: string
  sessionId: string
  command: string
  args: string[]
  cols: number
  rows: number
  /** True only when a live node-pty IPty backs this duplex. */
  pty: boolean
  mode: 'sandbox-pty' | 'sandbox-exec-duplex'
  held: string | null
  exited: boolean
  exitCode: number | null
  writeStdin: (data: string) => boolean
  endStdin: () => boolean
  resize: (cols: number, rows: number) => ForgeSandboxDuplexResizeResult
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
  /** Prefer PTY when available (default true). False forces pipes. */
  preferPty?: boolean
}

export type OpenForgeSandboxDuplexResult =
  | { ok: true; handle: ForgeSandboxDuplexHandle }
  | {
      ok: false
      reason: string
      message: string
    }

function loadNodePty(): NodePtyModule | null {
  try {
    const mod = require('node-pty') as NodePtyModule
    return typeof mod?.spawn === 'function' ? mod : null
  } catch {
    return null
  }
}

/**
 * Resolve allowlisted basename to a real executable for node-pty.
 * ConPTY on Windows does not apply PATHEXT the way child_process does — bare
 * `node` fails with "File not found"; prefer process.execPath / `.exe` / PATH.
 */
export function resolveForgeSandboxPtyExecutable(
  normalizedCommand: string,
  env: Record<string, string>,
): string | null {
  const base = normalizeCommandBasename(normalizedCommand)
  if (base === 'node' || base === 'nodejs') {
    if (process.execPath && fs.existsSync(process.execPath)) return process.execPath
  }

  if (path.isAbsolute(normalizedCommand) && fs.existsSync(normalizedCommand)) {
    return normalizedCommand
  }

  const pathKey = env.PATH ?? env.Path ?? process.env.PATH ?? process.env.Path ?? ''
  const dirs = pathKey.split(path.delimiter).filter(Boolean)
  const pathext =
    process.platform === 'win32'
      ? (env.PATHEXT ?? process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM')
          .split(';')
          .map((e) => e.trim())
          .filter(Boolean)
      : ['']

  const names =
    process.platform === 'win32'
      ? [normalizedCommand, `${base}.exe`, `${base}.cmd`, `${base}.bat`, base]
      : [normalizedCommand, base]

  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name)
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate
        }
      } catch {
        /* continue */
      }
    }
    // Also try PATHEXT combinations for bare base
    if (process.platform === 'win32') {
      for (const ext of pathext) {
        const candidate = path.join(dir, `${base}${ext.toLowerCase()}`)
        try {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate
          }
        } catch {
          /* continue */
        }
        const candidateUpper = path.join(dir, `${base}${ext}`)
        try {
          if (fs.existsSync(candidateUpper) && fs.statSync(candidateUpper).isFile()) {
            return candidateUpper
          }
        } catch {
          /* continue */
        }
      }
    }
  }

  return null
}

function openPipeDuplex(input: {
  ctx: NonNullable<ReturnType<typeof getForgeSandboxExecContext>>
  command: string
  normalizedCommand: string
  args: string[]
  cwd: string
  cols: number
  rows: number
  held: string
}): OpenForgeSandboxDuplexResult {
  const { ctx, command, normalizedCommand, args, cwd, cols, rows, held } = input
  const duplexId = `forge-duplex-${randomUUID()}`

  let child: ChildProcessWithoutNullStreams
  try {
    child = spawn(normalizedCommand, args, {
      cwd,
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
    sessionId: ctx.sessionId,
    command: normalizedCommand,
    args,
    cols,
    rows,
    pty: false,
    mode: 'sandbox-exec-duplex',
    held,
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
      return {
        recorded: true as const,
        ptyApplied: false,
        held: handle.held,
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
      normalizedCommand,
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
    ctx.appendEvidence('failed', normalizedCommand, args, `Duplex error: ${err.message}`)
    handle.onExit?.(null)
    DUPLEX_HANDLES.delete(duplexId)
  })

  DUPLEX_HANDLES.set(duplexId, handle)
  log.info('forge_sandbox_duplex_opened', {
    duplexId,
    sessionId: ctx.sessionId,
    command: normalizedCommand,
    provider: ctx.provider,
    mode: handle.mode,
    pty: false,
  })

  return { ok: true, handle }
}

function openPtyDuplex(input: {
  ctx: NonNullable<ReturnType<typeof getForgeSandboxExecContext>>
  ptyMod: NodePtyModule
  command: string
  normalizedCommand: string
  args: string[]
  cwd: string
  cols: number
  rows: number
}): OpenForgeSandboxDuplexResult | { ok: false; fallbackReason: string } {
  const { ctx, ptyMod, command, normalizedCommand, args, cwd, cols, rows } = input
  const duplexId = `forge-duplex-${randomUUID()}`

  const env = ctx.buildEnv({
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    FORCE_COLOR: '1',
  })
  const executable = resolveForgeSandboxPtyExecutable(normalizedCommand, env)
  if (!executable) {
    return {
      ok: false,
      fallbackReason: `node-pty executable resolve failed for "${normalizedCommand}" (PATH/PATHEXT)`,
    }
  }

  let pty: IPty
  try {
    pty = ptyMod.spawn(executable, args, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('forge_sandbox_pty_spawn_failed', {
      message,
      command: normalizedCommand,
      executable,
    })
    return { ok: false, fallbackReason: `node-pty spawn failed: ${message}` }
  }

  const handle: ForgeSandboxDuplexHandle = {
    duplexId,
    sessionId: ctx.sessionId,
    command: normalizedCommand,
    args,
    cols,
    rows,
    pty: true,
    mode: 'sandbox-pty',
    held: null,
    exited: false,
    exitCode: null,
    onStdout: null,
    onStderr: null,
    onExit: null,
    writeStdin: (data: string) => {
      if (handle.exited) return false
      try {
        pty.write(data)
        return true
      } catch {
        return false
      }
    },
    endStdin: () => {
      // PTY has no half-close; treat as no-op success while alive.
      return !handle.exited
    },
    resize: (nextCols: number, nextRows: number) => {
      handle.cols = Math.max(2, Math.floor(nextCols))
      handle.rows = Math.max(1, Math.floor(nextRows))
      try {
        pty.resize(handle.cols, handle.rows)
        return {
          recorded: true as const,
          ptyApplied: true,
          held: null,
          cols: handle.cols,
          rows: handle.rows,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.warn('forge_sandbox_pty_resize_failed', { duplexId, message })
        return {
          recorded: true as const,
          ptyApplied: false,
          held: `sandbox_pty_resize_failed — ${message}`,
          cols: handle.cols,
          rows: handle.rows,
        }
      }
    },
    kill: () => {
      if (handle.exited) return
      try {
        pty.kill()
      } catch {
        /* already dead */
      }
    },
  }

  ctx.trackKillable(() => handle.kill())

  pty.onData((chunk) => {
    handle.onStdout?.(chunk)
  })
  pty.onExit(({ exitCode }) => {
    handle.exited = true
    handle.exitCode = typeof exitCode === 'number' ? exitCode : null
    ctx.appendEvidence(
      handle.exitCode === 0 ? 'ok' : 'failed',
      normalizedCommand,
      args,
      `Sandbox PTY closed with code ${handle.exitCode}`,
    )
    handle.onExit?.(handle.exitCode)
    DUPLEX_HANDLES.delete(duplexId)
  })

  DUPLEX_HANDLES.set(duplexId, handle)
  log.info('forge_sandbox_duplex_opened', {
    duplexId,
    sessionId: ctx.sessionId,
    command: normalizedCommand,
    provider: ctx.provider,
    mode: handle.mode,
    pty: true,
  })
  ctx.appendEvidence(
    'ok',
    command,
    args,
    `Sandbox PTY duplex opened (node-pty) cols=${cols} rows=${rows}`,
  )

  return { ok: true, handle }
}

/**
 * Spawns an allowlisted process inside the sandbox — prefers real PTY when
 * node-pty is available; otherwise pipe duplex. Never host PTY / never shell.
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
  const preferPty = input.preferPty !== false
  const probe = probeForgeSandboxPtyAvailability()

  if (preferPty && probe.canAttempt) {
    const ptyMod = loadNodePty()
    if (ptyMod) {
      const ptyOpened = openPtyDuplex({
        ctx,
        ptyMod,
        command,
        normalizedCommand: commandGuard.normalized,
        args,
        cwd: cwdGuard.resolved,
        cols,
        rows,
      })
      if (ptyOpened.ok) return ptyOpened
      log.warn('forge_sandbox_pty_fallback_pipes', {
        sessionId: input.sessionId,
        reason: 'fallbackReason' in ptyOpened ? ptyOpened.fallbackReason : 'unknown',
      })
      return openPipeDuplex({
        ctx,
        command,
        normalizedCommand: commandGuard.normalized,
        args,
        cwd: cwdGuard.resolved,
        cols,
        rows,
        held:
          'fallbackReason' in ptyOpened
            ? `sandbox_pty_unavailable — ${ptyOpened.fallbackReason}; using pipes`
            : FORGE_SANDBOX_PTY_HELD_REASON,
      })
    }
  }

  return openPipeDuplex({
    ctx,
    command,
    normalizedCommand: commandGuard.normalized,
    args,
    cwd: cwdGuard.resolved,
    cols,
    rows,
    held: preferPty ? probe.reason || FORGE_SANDBOX_PTY_HELD_REASON : FORGE_SANDBOX_PTY_DISABLED_REASON,
  })
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
): ForgeSandboxDuplexResizeResult | null {
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

/** Test helper — force preferPty=false path without mutating process.env permanently. */
export function __openForgeSandboxDuplexPipesOnlyForTests(
  input: Omit<OpenForgeSandboxDuplexInput, 'preferPty'>,
): OpenForgeSandboxDuplexResult {
  return openForgeSandboxDuplex({ ...input, preferPty: false })
}
