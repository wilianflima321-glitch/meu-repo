/**
 * L.1 ForgeSandboxExecutor — path confinement + command allowlist guard.
 *
 * Real (not decorative) isolation properties enforced here:
 *  - every exec `cwd` and every path-shaped argument must resolve (symlinks
 *    included) inside the sandbox's project root — no `..`/absolute-path escape
 *  - only an explicit per-session command allowlist may be executed
 *
 * This module has zero dependency on the executor itself so it can be unit
 * tested in isolation and reused by any future sandbox provider.
 */

import fs from 'fs'
import path from 'path'

export interface PathGuardOk {
  ok: true
  resolved: string
}

export interface PathGuardDeny {
  ok: false
  reason: 'outside_project_root' | 'root_not_found'
  message: string
}

export type PathGuardResult = PathGuardOk | PathGuardDeny

/** Resolves symlinks when the path exists; falls back to the lexical path otherwise
 *  (a not-yet-created path can still be validated against traversal lexically). */
function realOrLexical(candidate: string): string {
  try {
    return fs.realpathSync.native(candidate)
  } catch {
    return path.resolve(candidate)
  }
}

/**
 * Confines `requestedPath` (absolute or relative to `projectRootPath`) inside the
 * project root. Defeats `..` traversal and symlink escape by resolving both sides
 * to their real filesystem path before the prefix comparison.
 */
export function confinePathToProjectRoot(
  projectRootPath: string,
  requestedPath: string | undefined,
): PathGuardResult {
  let rootReal: string
  try {
    rootReal = fs.realpathSync.native(projectRootPath)
  } catch {
    return {
      ok: false,
      reason: 'root_not_found',
      message: `Sandbox project root does not exist on disk: ${projectRootPath}`,
    }
  }

  const candidateAbsolute = path.isAbsolute(requestedPath ?? '.')
    ? (requestedPath as string)
    : path.resolve(rootReal, requestedPath ?? '.')
  const candidateReal = realOrLexical(candidateAbsolute)

  const rootWithSep = rootReal.endsWith(path.sep) ? rootReal : rootReal + path.sep
  const isInside = candidateReal === rootReal || candidateReal.startsWith(rootWithSep)

  if (!isInside) {
    return {
      ok: false,
      reason: 'outside_project_root',
      message: `Path escapes sandbox project root: "${requestedPath ?? '.'}" resolved to "${candidateReal}", root is "${rootReal}"`,
    }
  }
  return { ok: true, resolved: candidateReal }
}

const PATH_LIKE_ARG_RE = /^[A-Za-z]:[\\/]|^[\\/]|^~[\\/]|\.\./

/** Heuristically detects args that look like filesystem paths (absolute, home-relative, or traversal). */
export function isPathLikeArg(arg: string): boolean {
  return PATH_LIKE_ARG_RE.test(arg)
}

export interface ArgsGuardResult {
  ok: boolean
  violations: string[]
}

/** Scans command args for path-shaped values and confines each one to the project root. */
export function guardArgsWithinProjectRoot(
  projectRootPath: string,
  args: string[],
): ArgsGuardResult {
  const violations: string[] = []
  for (const arg of args) {
    // Strip a leading `--flag=` prefix so `--prefix=../../etc` is still checked.
    const eq = arg.indexOf('=')
    const value = eq > 0 && arg.startsWith('-') ? arg.slice(eq + 1) : arg
    if (!isPathLikeArg(value)) continue
    const guard = confinePathToProjectRoot(projectRootPath, value)
    if (!guard.ok) violations.push(guard.message)
  }
  return { ok: violations.length === 0, violations }
}

const DEFAULT_COMMAND_ALLOWLIST = ['node', 'npm', 'npx', 'tsc', 'git', 'cargo', 'rustc', 'eslint']

export function normalizeCommandBasename(command: string): string {
  return path
    .basename(command)
    .toLowerCase()
    .replace(/\.(exe|cmd|bat|ps1)$/i, '')
}

export interface CommandGuardResult {
  ok: boolean
  reason?: 'command_not_allowlisted'
  message?: string
  normalized: string
}

export function guardCommandAllowlist(
  command: string,
  allowlist: readonly string[] = DEFAULT_COMMAND_ALLOWLIST,
): CommandGuardResult {
  const normalized = normalizeCommandBasename(command)
  const allowed = allowlist.map((entry) => normalizeCommandBasename(entry))
  if (!allowed.includes(normalized)) {
    return {
      ok: false,
      reason: 'command_not_allowlisted',
      message: `Command "${command}" (normalized "${normalized}") is not in the sandbox allowlist: [${allowed.join(', ')}]`,
      normalized,
    }
  }
  return { ok: true, normalized }
}

export { DEFAULT_COMMAND_ALLOWLIST }
