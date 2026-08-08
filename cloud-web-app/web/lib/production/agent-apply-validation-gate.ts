/**
 * CW6 Path B — AST + L.5 validation gate on the governed apply hot path.
 * Fail-closed multi-file overlay; receipts for Ops UI (not chat wallpaper).
 *
 * Honesty: uses TypeScript parser AST (web). Rust `tree_sitter_ast_indexer`
 * exists in-kernel but is NOT web-wired here — do not claim Composer-surpass.
 */

import * as ts from 'typescript'
import { createComponentLogger } from '@/lib/observability/logger'
import { inspectLazyPatch } from '@/lib/production/lazy-inspector'
import { runProjectL5Gate, gateCheckFailed } from '@/lib/production/project-l5-gate'
import type { L5VirtualFile } from '@/lib/production/project-l5-typecheck'
import {
  isRustSourcePath,
  buildRustGateUnavailableDetail,
  runProjectRustGate
} from '@/lib/production/rust-gate-unavailable'
import {
  forgeCommitGateBlocksSuccess,
  runForgeCommitCiGate,
} from '@/lib/production/forge-commit-ci-gate'
import type { PreviewOrchestrationResult } from '@/lib/production/preview-orchestrator'

const log = createComponentLogger('agent-apply-validation-gate')

/** Web apply path does not call native tree-sitter — keep false. */
export const TREE_SITTER_AST_INDEXER_WEB_WIRED = false as const
/** Engine used for syntax gate on the web apply path. */
export const APPLY_AST_ENGINE = 'typescript-parser' as const
/** Marketing / supremacy claim vs Cursor Composer — always false. */
export const COMPOSER_SURPASS_CLAIM = false as const

export type FileValidationGateStatus =
  | 'pass'
  | 'denied_ast'
  | 'denied_lazy'
  | 'denied_l5'
  | 'denied_lint'
  | 'denied_rust_gate_unavailable'
  | 'denied_rust_fail'
  | 'denied_disjoint'
  | 'denied_commit_ci'
  | 'skipped_non_ts'

export type FileValidationStatusEntry = {
  path: string
  status: FileValidationGateStatus
  code?: string
  detail?: string
  taskId?: string
}

export type ApplyValidationGateResult = {
  ok: boolean
  code?:
    | 'AST_SYNTAX_FAIL'
    | 'LAZY_INSPECTOR_REJECT'
    | 'L5_PROJECT_TYPECHECK_FAIL'
    | 'L5_LINT_FAIL'
    | 'RUST_GATE_SANDBOX_UNAVAILABLE'
    | 'RUST_GATE_FAIL'
    | 'MULTI_FILE_VALIDATION_DENIED'
    | 'PATH_DISJOINT_FAIL'
    | 'FORGE_COMMIT_CI_FAIL'
  compilerLog: string
  fileValidation: FileValidationStatusEntry[]
  /** Always false — gate pass ≠ Cursor Composer parity. */
  composerSurpassClaim: false
  treeSitterAstIndexerWebWired: false
  astEngine: typeof APPLY_AST_ENGINE
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '')
}

function isTsLike(filePath: string): boolean {
  return /\.(tsx?|jsx?)$/i.test(filePath)
}

function scriptKindForPath(filePath: string): ts.ScriptKind {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (lower.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (lower.endsWith('.ts')) return ts.ScriptKind.TS
  return ts.ScriptKind.JS
}

/**
 * Deterministic AST/syntax gate via TypeScript parser (not Rust tree-sitter).
 */
export function validateFileAstSyntax(input: {
  filePath: string
  content: string
}): { verdict: 'PASS' | 'FAIL'; compilerLog: string; checks: Array<{ id: string; status: 'pass' | 'fail'; message: string }> } {
  const path = normalizePath(input.filePath)
  if (!isTsLike(path)) {
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [{ id: 'AST_SKIP_NON_TS', status: 'pass', message: 'Non-TS path — AST gate skipped' }],
    }
  }

  const sourceFile = ts.createSourceFile(
    path,
    input.content,
    ts.ScriptTarget.ES2022,
    /*setParentNodes*/ true,
    scriptKindForPath(path),
  )
  const parseDiagnostics =
    (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }).parseDiagnostics ??
    []
  const errors = parseDiagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length === 0) {
    return {
      verdict: 'PASS',
      compilerLog: '',
      checks: [{ id: 'AST_SYNTAX', status: 'pass', message: 'TypeScript parser AST syntax OK' }],
    }
  }

  const lines = errors.slice(0, 20).map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n')
    if (typeof d.start === 'number') {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start)
      return `${path}(${line + 1},${character + 1}): syntax error TS${d.code}: ${msg}`
    }
    return `${path}: syntax error TS${d.code}: ${msg}`
  })

  return {
    verdict: 'FAIL',
    compilerLog: lines.join('\n'),
    checks: [
      {
        id: 'AST_SYNTAX',
        status: 'fail',
        message: `${errors.length} AST/syntax error(s)`,
      },
    ],
  }
}

export function assertDisjointApplyPaths(paths: readonly string[]): {
  ok: boolean
  conflicts: string[]
} {
  const seen = new Map<string, number>()
  const conflicts: string[] = []
  paths.forEach((raw, index) => {
    const path = normalizePath(raw)
    if (!path) return
    const prev = seen.get(path)
    if (prev !== undefined) {
      conflicts.push(`${path} claimed at index ${prev} and ${index}`)
    } else {
      seen.set(path, index)
    }
  })
  return { ok: conflicts.length === 0, conflicts }
}

/**
 * Fail-closed AST → Lazy → batch L.5 overlay for one or many patched files.
 */
export async function runGovernedApplyValidationGate(input: {
  files: Array<{ filePath: string; content: string; taskId?: string }>
  ambientFiles?: L5VirtualFile[]
  sandboxSessionId?: string
  projectRootPath?: string
  /**
   * Optional L.8 preview result. When provided, L.2/L.9 commit/CI gate also
   * requires a reachable preview before apply success is honest.
   */
  preview?: PreviewOrchestrationResult | null
  requirePreview?: boolean
}): Promise<ApplyValidationGateResult> {
  const baseHonesty = {
    composerSurpassClaim: false as const,
    treeSitterAstIndexerWebWired: TREE_SITTER_AST_INDEXER_WEB_WIRED,
    astEngine: APPLY_AST_ENGINE,
  }

  if (input.files.length === 0) {
    return {
      ok: true,
      compilerLog: '',
      fileValidation: [],
      ...baseHonesty,
    }
  }

  const disjoint = assertDisjointApplyPaths(input.files.map((f) => f.filePath))
  if (!disjoint.ok) {
    const fileValidation: FileValidationStatusEntry[] = input.files.map((f) => ({
      path: normalizePath(f.filePath),
      status: 'denied_disjoint' as const,
      code: 'PATH_DISJOINT_FAIL',
      detail: disjoint.conflicts[0],
      taskId: f.taskId,
    }))
    log.warn('apply_gate_disjoint_fail', { conflicts: disjoint.conflicts.length })
    return {
      ok: false,
      code: 'PATH_DISJOINT_FAIL',
      compilerLog: disjoint.conflicts.join('\n'),
      fileValidation,
      ...baseHonesty,
    }
  }

  const fileValidation: FileValidationStatusEntry[] = []
  const compilerChunks: string[] = []
  const rustFiles: Array<{ filePath: string; content: string; taskId?: string }> = []

  for (const file of input.files) {
    const path = normalizePath(file.filePath)
    if (isRustSourcePath(path)) {
      rustFiles.push(file)
      continue
    }
    if (!isTsLike(path)) {
      fileValidation.push({
        path,
        status: 'skipped_non_ts',
        taskId: file.taskId,
      })
      continue
    }

    const lazy = inspectLazyPatch(file.content, 0)
    if (lazy.verdict === 'REJECT') {
      fileValidation.push({
        path,
        status: 'denied_lazy',
        code: 'LAZY_INSPECTOR_REJECT',
        detail: lazy.matchedPatterns.slice(0, 6).join(', '),
        taskId: file.taskId,
      })
      compilerChunks.push(`${path}: LAZY_INSPECTOR_REJECT`)
      continue
    }

    const ast = validateFileAstSyntax({ filePath: path, content: file.content })
    if (ast.verdict === 'FAIL') {
      fileValidation.push({
        path,
        status: 'denied_ast',
        code: 'AST_SYNTAX_FAIL',
        detail: ast.compilerLog.slice(0, 500),
        taskId: file.taskId,
      })
      compilerChunks.push(ast.compilerLog)
      continue
    }

    fileValidation.push({
      path,
      status: 'pass',
      taskId: file.taskId,
    })
  }

  // Handle Rust validation if any .rs files exist
  if (rustFiles.length > 0) {
    if (!input.sandboxSessionId || !input.projectRootPath) {
      for (const file of rustFiles) {
        const path = normalizePath(file.filePath)
        const detail = buildRustGateUnavailableDetail(path)
        fileValidation.push({
          path,
          status: 'denied_rust_gate_unavailable',
          code: detail.code,
          detail: detail.message,
          taskId: file.taskId,
        })
        compilerChunks.push(`${path}: ${detail.code}`)
      }
    } else {
      const rustGateResult = await runProjectRustGate({
        sandboxSessionId: input.sandboxSessionId,
        projectRootPath: input.projectRootPath,
        files: rustFiles.map(f => ({ filePath: normalizePath(f.filePath), content: f.content }))
      })
      
      if (rustGateResult.verdict === 'FAIL') {
        for (const file of rustFiles) {
          const path = normalizePath(file.filePath)
          fileValidation.push({
            path,
            status: 'denied_rust_fail',
            code: 'RUST_GATE_FAIL',
            detail: rustGateResult.compilerLog.slice(0, 500),
            taskId: file.taskId,
          })
        }
        compilerChunks.push(`Rust validation failed:\n${rustGateResult.compilerLog}`)
      } else {
        for (const file of rustFiles) {
          fileValidation.push({
            path: normalizePath(file.filePath),
            status: 'pass',
            taskId: file.taskId,
          })
        }
      }
    }
  }

  const hardDeny = fileValidation.find(
    (entry) =>
      entry.status === 'denied_ast' ||
      entry.status === 'denied_lazy' ||
      entry.status === 'denied_rust_gate_unavailable' ||
      entry.status === 'denied_rust_fail',
  )
  if (hardDeny) {
    const code =
      hardDeny.status === 'denied_lazy'
        ? 'LAZY_INSPECTOR_REJECT'
        : hardDeny.status === 'denied_rust_gate_unavailable'
          ? 'RUST_GATE_SANDBOX_UNAVAILABLE'
          : hardDeny.status === 'denied_rust_fail'
            ? 'RUST_GATE_FAIL'
            : 'AST_SYNTAX_FAIL'
    log.warn('apply_gate_pre_l5_deny', { code, path: hardDeny.path })
    return {
      ok: false,
      code: input.files.length > 1 ? 'MULTI_FILE_VALIDATION_DENIED' : code,
      compilerLog: compilerChunks.join('\n\n').slice(0, 8000),
      fileValidation,
      ...baseHonesty,
    }
  }

  const tsFiles: L5VirtualFile[] = input.files
    .filter((f) => isTsLike(f.filePath))
    .map((f) => ({ fileName: normalizePath(f.filePath), content: f.content }))

  if (tsFiles.length === 0) {
    // Rust-only batch already validated above (sandbox + cargo). No TS L.5 work left.
    return {
      ok: true,
      compilerLog: '',
      fileValidation,
      ...baseHonesty,
    }
  }

  const l5 = await runProjectL5Gate({
    files: tsFiles,
    ambientFiles: input.ambientFiles,
  })

  if (l5.verdict === 'FAIL') {
    const lintFailed = gateCheckFailed(l5, 'L5_LINT')
    const failCode: 'L5_PROJECT_TYPECHECK_FAIL' | 'L5_LINT_FAIL' = lintFailed
      ? 'L5_LINT_FAIL'
      : 'L5_PROJECT_TYPECHECK_FAIL'
    const deniedStatus: 'denied_l5' | 'denied_lint' = lintFailed ? 'denied_lint' : 'denied_l5'

    const failingPaths = new Set<string>()
    for (const line of l5.compilerLog.split('\n')) {
      const match = line.match(/^([^:(]+)/)
      if (match?.[1]) failingPaths.add(normalizePath(match[1]))
    }

    const nextValidation = fileValidation.map((entry) => {
      if (entry.status !== 'pass') return entry
      if (failingPaths.size === 0 || failingPaths.has(entry.path)) {
        return {
          ...entry,
          status: deniedStatus,
          code: failCode,
          detail: l5.compilerLog.slice(0, 400),
        }
      }
      return entry
    })

    log.warn('apply_gate_l5_deny', {
      files: tsFiles.length,
      multi: input.files.length > 1,
      failCode,
    })

    return {
      ok: false,
      code: input.files.length > 1 ? 'MULTI_FILE_VALIDATION_DENIED' : failCode,
      compilerLog: l5.compilerLog.slice(0, 8000),
      fileValidation: nextValidation,
      ...baseHonesty,
    }
  }

  // L.2/L.9 commit/CI — when preview is in scope, block apply success if L.8 failed.
  // L.5 already ran above; this gate re-checks preview honesty only (files re-validated cheaply).
  if (input.requirePreview || input.preview) {
    const commitGate = await runForgeCommitCiGate({
      files: tsFiles,
      ambientFiles: input.ambientFiles,
      requireL5: true,
      preview: input.preview,
      requirePreview: true,
      sandboxAvailable: Boolean(input.sandboxSessionId),
      requireSandbox: Boolean(input.sandboxSessionId) || input.requirePreview === true,
    })
    if (forgeCommitGateBlocksSuccess(commitGate)) {
      log.warn('apply_gate_commit_ci_deny', { blocked: commitGate.blockedReasons })
      return {
        ok: false,
        code: 'FORGE_COMMIT_CI_FAIL',
        compilerLog: (commitGate.compilerLog || commitGate.blockedReasons.join('\n')).slice(0, 8000),
        fileValidation: fileValidation.map((entry) =>
          entry.status === 'pass'
            ? {
                ...entry,
                status: 'denied_commit_ci' as const,
                code: 'FORGE_COMMIT_CI_FAIL',
                detail: commitGate.blockedReasons[0],
              }
            : entry,
        ),
        ...baseHonesty,
      }
    }
  }

  log.info('apply_gate_pass', {
    files: input.files.length,
    tsFiles: tsFiles.length,
    composerSurpassClaim: false,
  })

  return {
    ok: true,
    compilerLog: '',
    fileValidation,
    ...baseHonesty,
  }
}
