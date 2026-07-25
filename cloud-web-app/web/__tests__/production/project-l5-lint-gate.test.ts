/**
 * L.5 lint gate — Law XI dual TS gate completion (typecheck + lint).
 * Uses the project's REAL `.eslintrc.json` via the ESLint Node API — no CLI subprocess.
 */

import { describe, expect, it } from 'vitest'
import { runProjectL5Lint, validateDocumentWithProjectL5Lint } from '@/lib/production/project-l5-lint'
import { runProjectL5Gate, gateCheckFailed } from '@/lib/production/project-l5-gate'
import {
  isRustSourcePath,
  buildRustGateUnavailableDetail,
  RUST_GATE_SANDBOX_UNAVAILABLE,
} from '@/lib/production/rust-gate-unavailable'

describe('project-l5-lint', () => {
  it('PASSes clean code under lib/**', async () => {
    const result = await runProjectL5Lint({
      files: [
        {
          fileName: 'lib/l5-lint-unit-pass.ts',
          content: 'export function add(a: number, b: number): number {\n  return a + b\n}\n',
        },
      ],
    })
    expect(result.verdict).toBe('PASS')
    expect(result.checks?.some((c) => c.id === 'L5_LINT' && c.status === 'pass')).toBe(true)
  })

  it('FAILs a real no-console ESLint error under lib/** (matches npm run lint rules)', async () => {
    const result = await runProjectL5Lint({
      files: [
        {
          fileName: 'lib/l5-lint-unit-fail.ts',
          content: "export function bad(): void {\n  console.log('nope')\n}\n",
        },
      ],
    })
    expect(result.verdict).toBe('FAIL')
    expect(result.compilerLog).toMatch(/no-console/i)
    expect(result.checks?.some((c) => c.id === 'L5_LINT' && c.status === 'fail')).toBe(true)
  })

  it('skips non-lintable files without crashing', async () => {
    const result = await runProjectL5Lint({ files: [{ fileName: 'assets/texture.png', content: 'binary' }] })
    expect(result.verdict).toBe('PASS')
    expect(result.checks?.[0]?.id).toBe('L5_SKIP_NON_LINTABLE')
  })

  it('validateDocumentWithProjectL5Lint mirrors runProjectL5Lint for a single file', async () => {
    const result = await validateDocumentWithProjectL5Lint({
      filePath: 'lib/l5-lint-unit-single.ts',
      content: "export function bad(): void {\n  console.log('nope')\n}\n",
    })
    expect(result.verdict).toBe('FAIL')
  })
})

describe('project-l5-gate (typecheck + lint combined)', () => {
  it('PASSes when both typecheck and lint are clean', async () => {
    const result = await runProjectL5Gate({
      files: [
        {
          fileName: 'lib/l5-gate-unit-pass.ts',
          content: 'export function add(a: number, b: number): number {\n  return a + b\n}\n',
        },
      ],
    })
    expect(result.verdict).toBe('PASS')
    expect(result.checks?.map((c) => c.id).sort()).toEqual(['L5_LINT', 'L5_PROJECT_TYPECHECK'])
  })

  it('short-circuits on typecheck FAIL without running lint', async () => {
    const result = await runProjectL5Gate({
      files: [{ fileName: 'lib/l5-gate-unit-typefail.ts', content: 'export const x: number = "nope"\n' }],
    })
    expect(result.verdict).toBe('FAIL')
    expect(gateCheckFailed(result, 'L5_PROJECT_TYPECHECK')).toBe(true)
    expect(result.checks?.some((c) => c.id === 'L5_LINT')).toBe(false)
  })

  it('FAILs on lint when typecheck is clean', async () => {
    const result = await runProjectL5Gate({
      files: [
        {
          fileName: 'lib/l5-gate-unit-lintfail.ts',
          content: "export function bad(): void {\n  console.log('nope')\n}\n",
        },
      ],
    })
    expect(result.verdict).toBe('FAIL')
    expect(gateCheckFailed(result, 'L5_LINT')).toBe(true)
    expect(gateCheckFailed(result, 'L5_PROJECT_TYPECHECK')).toBe(false)
  })
})

describe('rust-gate-unavailable (Law XI honesty — no host cargo exec without L.1)', () => {
  it('identifies .rs paths regardless of separator style', () => {
    expect(isRustSourcePath('apps/studio-local/src-tauri/src/lib.rs')).toBe(true)
    expect(isRustSourcePath('apps\\studio-local\\src-tauri\\src\\lib.rs')).toBe(true)
    expect(isRustSourcePath('lib/production/foo.ts')).toBe(false)
  })

  it('builds an actionable, honest blocked detail', () => {
    const detail = buildRustGateUnavailableDetail('src/lib.rs')
    expect(detail.code).toBe(RUST_GATE_SANDBOX_UNAVAILABLE)
    expect(detail.message).toMatch(/cargo check/i)
    expect(detail.message).toMatch(/sandbox/i)
    expect(detail.message).toMatch(/Nothing was written/i)
  })
})
