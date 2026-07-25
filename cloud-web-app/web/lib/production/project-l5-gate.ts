/**
 * L.5 — combined ProjectValidationGate: TypeScript typecheck + ESLint lint.
 * Single source of truth used by the governed apply gate, the live preflight
 * apply route, and the Auto-Heal validation function so all three stay in sync.
 *
 * Rust (`.rs`) dual-stack validation (`cargo check` + `cargo clippy` + `cargo test`,
 * Law XI) is deliberately NOT run here: it requires isolated exec (Onda L / L.1
 * ForgeSandboxExecutor), which does not exist yet. Spawning `cargo` on the host from
 * a live agent-apply request would violate AgentShellPolicy (#48 — agents never
 * execute arbitrary host processes outside a sandbox). See
 * `rust-gate-unavailable.ts` for the fail-closed guard that keeps `.rs` AI-apply
 * honest (blocked, not silently unvalidated) until L.1 ships.
 */

import { runProjectL5Typecheck, type L5VirtualFile } from './project-l5-typecheck'
import { runProjectL5Lint } from './project-l5-lint'
import type { ProjectValidationGateResult } from './auto-heal-loop'

export interface ProjectL5GateInput {
  files: L5VirtualFile[]
  ambientFiles?: L5VirtualFile[]
  maxDiagnostics?: number
}

/** True when `checks` contains a failed entry with the given id. */
export function gateCheckFailed(
  result: ProjectValidationGateResult,
  checkId: string,
): boolean {
  return (result.checks ?? []).some((c) => c.id === checkId && c.status === 'fail')
}

/**
 * Runs typecheck first (cheap, in-memory TS program) — on FAIL, returns immediately
 * without spending time on lint (matches CI convention: `npm run typecheck && npm run lint`).
 * On typecheck PASS, runs lint and merges both check lists into one result.
 */
export async function runProjectL5Gate(
  input: ProjectL5GateInput,
): Promise<ProjectValidationGateResult> {
  const typecheck = runProjectL5Typecheck({
    files: input.files,
    ambientFiles: input.ambientFiles,
    maxDiagnostics: input.maxDiagnostics,
  })

  if (typecheck.verdict === 'FAIL') {
    return typecheck
  }

  const lint = await runProjectL5Lint({
    files: input.files,
    maxDiagnostics: input.maxDiagnostics,
  })

  const checks = [...(typecheck.checks ?? []), ...(lint.checks ?? [])]

  if (lint.verdict === 'FAIL') {
    return {
      verdict: 'FAIL',
      compilerLog: lint.compilerLog,
      checks,
    }
  }

  return {
    verdict: 'PASS',
    compilerLog: '',
    checks,
  }
}

/** Convenience: run the combined gate against a single patched document. */
export async function validateDocumentWithProjectL5Gate(input: {
  filePath: string
  content: string
  ambientFiles?: L5VirtualFile[]
}): Promise<ProjectValidationGateResult> {
  return runProjectL5Gate({
    files: [{ fileName: input.filePath, content: input.content }],
    ambientFiles: input.ambientFiles,
  })
}
