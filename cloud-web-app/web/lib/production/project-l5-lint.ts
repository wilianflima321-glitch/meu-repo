/**
 * L.5 — Project-level ESLint gate (Law XI dual TS gate: typecheck + lint).
 *
 * `project-l5-typecheck.ts` only proved semantic/type correctness. The J-readiness
 * / L.5 acceptance checklist requires BOTH `typecheck` AND `lint` before an AI patch
 * may apply (see `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` `ProjectValidationGateResult.checks`
 * union: 'typecheck' | 'lint' | 'test' | 'cargo-check' | 'cargo-clippy' | 'cargo-test').
 * Until this module, the live agent-apply pipeline never ran a lint check at all —
 * an AI-authored patch could violate the same `.eslintrc.json` rules (`no-console`,
 * `next/core-web-vitals`) that block every human PR via `npm run lint`.
 *
 * Uses the ESLint Node API (`lintText`) in-process against the project's REAL
 * `.eslintrc.json` — same rules `npm run lint` enforces. No `eslint` CLI subprocess,
 * so this stays sandbox-safe under AgentShellPolicy (#48) exactly like the existing
 * in-process TypeScript compiler API gate.
 */

import { ESLint } from 'eslint'
import { createComponentLogger } from '@/lib/observability/logger'
import type { ProjectValidationGateResult } from './auto-heal-loop'
import type { L5VirtualFile } from './project-l5-typecheck'

const log = createComponentLogger('project-l5-lint')

export interface ProjectL5LintInput {
  files: L5VirtualFile[]
  /** Max diagnostics surfaced in compilerLog */
  maxDiagnostics?: number
}

function isLintable(fileName: string): boolean {
  return /\.(tsx?|jsx?)$/i.test(fileName)
}

function normalizeFileName(fileName: string): string {
  return fileName.replace(/\\/g, '/').replace(/^\/+/, '')
}

let cachedEslint: ESLint | null = null

/** Lazily constructed — resolves the project's real `.eslintrc.json` from `cwd`. */
function getProjectEslint(): ESLint {
  if (!cachedEslint) {
    cachedEslint = new ESLint({
      cwd: process.cwd(),
      useEslintrc: true,
      errorOnUnmatchedPattern: false,
    })
  }
  return cachedEslint
}

/** Test-only seam — forces a fresh ESLint instance on next call. */
export function resetProjectL5LintCacheForTests(): void {
  cachedEslint = null
}

/**
 * Run the project's real ESLint config over virtual overlays.
 * Fail-closed on rule severity 'error' (2) only — warnings are surfaced in the log
 * but never block apply, matching `next lint`'s default (no `--max-warnings 0`).
 */
export async function runProjectL5Lint(
  input: ProjectL5LintInput,
): Promise<ProjectValidationGateResult> {
  const maxDiagnostics = input.maxDiagnostics ?? 40
  const files = input.files.filter((f) => isLintable(f.fileName) && f.content != null)

  if (files.length === 0) {
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [
        {
          id: 'L5_SKIP_NON_LINTABLE',
          status: 'pass',
          message: 'No lintable files in overlay — L.5 lint skipped',
        },
      ],
    }
  }

  const eslint = getProjectEslint()
  const lines: string[] = []
  let errorCount = 0
  let warningCount = 0

  for (const file of files) {
    const fileName = normalizeFileName(file.fileName)
    let results: ESLint.LintResult[]
    try {
      results = await eslint.lintText(file.content, { filePath: fileName })
    } catch (err) {
      // Config resolution failure must fail-closed (never silently treated as pass).
      const message = err instanceof Error ? err.message : 'unknown ESLint config error'
      log.warn('l5_lint_config_error', { fileName, message })
      errorCount += 1
      lines.push(`${fileName}: ESLint config error: ${message}`)
      continue
    }

    for (const result of results) {
      for (const msg of result.messages) {
        if (msg.severity !== 2) {
          warningCount += 1
          continue
        }
        errorCount += 1
        if (lines.length < maxDiagnostics) {
          lines.push(
            `${fileName}(${msg.line ?? 0},${msg.column ?? 0}): error ${msg.ruleId ?? 'eslint'}: ${msg.message}`,
          )
        }
      }
    }
  }

  if (errorCount === 0) {
    log.info('l5_lint_pass', { files: files.length, warnings: warningCount })
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [{ id: 'L5_LINT', status: 'pass', message: 'Project L.5 lint passed' }],
    }
  }

  const compilerLog = lines.join('\n')
  log.warn('l5_lint_fail', { errors: errorCount, sample: lines[0] })

  return {
    verdict: 'FAIL',
    compilerLog,
    checks: [
      {
        id: 'L5_LINT',
        status: 'fail',
        message: `${errorCount} ESLint error(s) — Auto-Heal may reinject compilerLog`,
      },
    ],
  }
}

/** Convenience: lint a single patched document. */
export async function validateDocumentWithProjectL5Lint(input: {
  filePath: string
  content: string
}): Promise<ProjectValidationGateResult> {
  if (!isLintable(input.filePath)) {
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [{ id: 'L5_SKIP_NON_LINTABLE', status: 'pass', message: 'Non-lintable path — L.5 lint skipped' }],
    }
  }
  return runProjectL5Lint({ files: [{ fileName: input.filePath, content: input.content }] })
}
