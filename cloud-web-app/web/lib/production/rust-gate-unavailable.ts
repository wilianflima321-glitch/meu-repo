import * as fsSync from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'
import { execInForgeSandbox } from '@/lib/production/forge-sandbox-executor'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ProjectValidationGateResult } from '@/lib/production/auto-heal-loop'

const log = createComponentLogger('rust-validation-gate')

/** Cargo check/clippy/test can exceed the default 30s sandbox exec budget. */
const RUST_GATE_STEP_TIMEOUT_MS = 180_000

export function isRustSourcePath(filePath: string): boolean {
  return /\.rs$/i.test(filePath.replace(/\\/g, '/'))
}

export const RUST_GATE_SANDBOX_UNAVAILABLE = 'RUST_GATE_SANDBOX_UNAVAILABLE' as const

export interface RustGateUnavailableDetail {
  code: typeof RUST_GATE_SANDBOX_UNAVAILABLE
  message: string
}

export function buildRustGateUnavailableDetail(filePath: string): RustGateUnavailableDetail {
  return {
    code: RUST_GATE_SANDBOX_UNAVAILABLE,
    message:
      `AI apply for "${filePath}" was blocked: Law XI requires cargo check + cargo clippy + ` +
      'cargo test on every Rust change, and that dual-stack gate only runs inside an isolated ' +
      'sandbox (Onda L / L.1 ForgeSandboxExecutor). Provide sandboxSessionId + projectRootPath ' +
      '(apply executor provisions local-isolated when .rs files are present) or retry after ' +
      'sandbox CostGuard/session creation succeeds.',
  }
}

export interface RustGateInput {
  sandboxSessionId: string
  projectRootPath: string
  files: Array<{ filePath: string; content: string }>
}

/**
 * Resolve cargo cwd relative to the sandbox project root so path confinement
 * stays lexical-stable across Windows drive/realpath quirks.
 */
export function resolveCargoCwdRelativeToRoot(
  projectRootPath: string,
  rustFileAbsoluteOrRelative: string,
): string {
  const rootAbs = path.resolve(projectRootPath)
  let currentDir = path.isAbsolute(rustFileAbsoluteOrRelative)
    ? path.dirname(rustFileAbsoluteOrRelative)
    : path.dirname(path.resolve(rootAbs, rustFileAbsoluteOrRelative))

  while (currentDir !== path.parse(currentDir).root) {
    const candidate = path.join(currentDir, 'Cargo.toml')
    try {
      if (fsSync.statSync(candidate).isFile()) {
        const rel = path.relative(rootAbs, currentDir)
        if (!rel || rel === '') return '.'
        if (rel.startsWith('..') || path.isAbsolute(rel)) return '.'
        return rel.split(path.sep).join('/')
      }
    } catch {
      // keep walking up
    }
    currentDir = path.dirname(currentDir)
  }
  return '.'
}

/**
 * Runs the dual-stack Rust gate (`cargo check`, `clippy`, `test`) via L.1 sandbox.
 * Because `cargo` expects physical files inside the project module tree, this function
 * safely backs up the original `.rs` files on the host, writes the AI-patched versions,
 * executes the sandbox commands, and then restores the original files before returning.
 */
export async function runProjectRustGate(
  input: RustGateInput,
): Promise<ProjectValidationGateResult> {
  const backups = new Map<string, string | null>()

  try {
    for (const file of input.files) {
      const absPath = path.resolve(input.projectRootPath, file.filePath)
      try {
        const original = await fs.readFile(absPath, 'utf8')
        backups.set(absPath, original)
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code
        if (code === 'ENOENT') {
          backups.set(absPath, null)
        } else {
          throw err
        }
      }

      await fs.mkdir(path.dirname(absPath), { recursive: true })
      await fs.writeFile(absPath, file.content, 'utf8')
    }

    let targetCwd = '.'
    if (input.files.length > 0) {
      const firstAbs = path.resolve(input.projectRootPath, input.files[0].filePath)
      targetCwd = resolveCargoCwdRelativeToRoot(input.projectRootPath, firstAbs)
    }

    const commands = [
      { id: 'cargo-check', cmd: 'cargo', args: ['check'] },
      { id: 'cargo-clippy', cmd: 'cargo', args: ['clippy', '--', '-D', 'warnings'] },
      { id: 'cargo-test', cmd: 'cargo', args: ['test'] },
    ]

    const checks: ProjectValidationGateResult['checks'] = []
    let compilerLog = ''
    let passedAll = true

    for (const step of commands) {
      const res = await execInForgeSandbox({
        sessionId: input.sandboxSessionId,
        command: step.cmd,
        args: step.args,
        cwd: targetCwd,
        timeoutMs: RUST_GATE_STEP_TIMEOUT_MS,
      })

      if (!res.ok || res.exitCode !== 0) {
        passedAll = false
        checks.push({
          id: step.id,
          status: 'fail',
          message: res.deniedMessage || res.stderr || res.stdout || 'Failed with no output',
        })
        compilerLog += `\n--- ${step.id} FAILED ---\n${res.deniedMessage || res.stderr || res.stdout}\n`
        break
      }

      checks.push({
        id: step.id,
        status: 'pass',
        message: 'OK',
      })
    }

    if (passedAll) {
      return { verdict: 'PASS', compilerLog: '', checks }
    }
    return { verdict: 'FAIL', compilerLog, checks }
  } finally {
    for (const [absPath, originalContent] of backups.entries()) {
      try {
        if (originalContent === null) {
          await fs.unlink(absPath)
        } else {
          await fs.writeFile(absPath, originalContent, 'utf8')
        }
      } catch (err) {
        log.error('rust_gate_restore_failed', { file: absPath, err: String(err) })
      }
    }
  }
}
