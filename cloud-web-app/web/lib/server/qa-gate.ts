import path from 'node:path'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type QaGateCheck = {
  id: string
  scriptPath: string
}

export type QaGateResult = {
  ok: boolean
  durationMs: number
  checks: Array<{
    id: string
    ok: boolean
    stdout: string
    stderr: string
  }>
  error?: string
}

const DEFAULT_CHECKS: QaGateCheck[] = [
  { id: 'button-types', scriptPath: 'tools/check-button-types.mjs' },
  { id: 'hardcoded-colors', scriptPath: 'tools/check-hardcoded-colors.mjs' },
]

function resolveRepoRoot(): string | null {
  const explicit = process.env.AETHEL_REPO_ROOT
  if (explicit) return path.resolve(explicit)

  const candidates = [
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..'),
  ]

  for (const candidate of candidates) {
    const marker = path.join(candidate, 'tools', 'check-button-types.mjs')
    if (fsSync.existsSync(marker)) {
      return candidate
    }
  }

  return null
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

export async function runQaGate(options?: {
  checks?: QaGateCheck[]
  timeoutMs?: number
}): Promise<QaGateResult> {
  const start = Date.now()
  const repoRoot = resolveRepoRoot()
  if (!repoRoot) {
    return {
      ok: false,
      durationMs: Date.now() - start,
      checks: [],
      error: 'REPO_ROOT_NOT_FOUND',
    }
  }

  const checks = options?.checks?.length ? options.checks : DEFAULT_CHECKS
  const results: QaGateResult['checks'] = []
  const timeoutMs = Math.max(10_000, options?.timeoutMs ?? 120_000)

  for (const check of checks) {
    const scriptFullPath = path.resolve(repoRoot, check.scriptPath)
    if (!(await pathExists(scriptFullPath))) {
      results.push({
        id: check.id,
        ok: false,
        stdout: '',
        stderr: `Script not found: ${scriptFullPath}`,
      })
      continue
    }

    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, [scriptFullPath], {
        cwd: repoRoot,
        timeout: timeoutMs,
        windowsHide: true,
      })
      results.push({
        id: check.id,
        ok: true,
        stdout: stdout?.toString() ?? '',
        stderr: stderr?.toString() ?? '',
      })
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string }
      results.push({
        id: check.id,
        ok: false,
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? err.message ?? 'QA check failed',
      })
    }
  }

  const ok = results.length > 0 && results.every((entry) => entry.ok)
  return {
    ok,
    durationMs: Date.now() - start,
    checks: results,
    error: ok ? undefined : 'QA_GATE_BLOCKED',
  }
}
