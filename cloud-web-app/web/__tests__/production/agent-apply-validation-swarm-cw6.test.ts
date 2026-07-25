/**
 * CW6 Path B — AST/L.5 validation gate + multi-file apply swarm deny.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COMPOSER_SURPASS_CLAIM,
  TREE_SITTER_AST_INDEXER_WEB_WIRED,
  runGovernedApplyValidationGate,
  validateFileAstSyntax,
} from '@/lib/production/agent-apply-validation-gate'
import { runMultiFileApplySwarm } from '@/lib/production/multi-file-apply-swarm'
import {
  extractFileValidationFromApplyResult,
  toGovernedApplyReceipt,
} from '@/lib/production/agents-merge-governance'

describe('CW6 agent apply validation gate', () => {
  it('keeps Composer-surpass and tree-sitter web wire fail-closed', () => {
    expect(COMPOSER_SURPASS_CLAIM).toBe(false)
    expect(TREE_SITTER_AST_INDEXER_WEB_WIRED).toBe(false)
  })

  it('denies bad AST/syntax before apply', () => {
    const ast = validateFileAstSyntax({
      filePath: 'src/broken.ts',
      content: 'export const x: string = ;\n',
    })
    expect(ast.verdict).toBe('FAIL')
    expect(ast.compilerLog).toMatch(/syntax error/i)

    const gate = runGovernedApplyValidationGate({
      files: [{ filePath: 'src/broken.ts', content: 'export const x: string = ;\n', taskId: 't1' }],
    })
    expect(gate.ok).toBe(false)
    expect(gate.code).toBe('AST_SYNTAX_FAIL')
    expect(gate.composerSurpassClaim).toBe(false)
    expect(gate.fileValidation.some((e) => e.status === 'denied_ast')).toBe(true)
  })

  it('denies multi-file batch when L.5 overlay fails (type errors)', () => {
    const gate = runGovernedApplyValidationGate({
      files: [
        {
          filePath: 'src/a.ts',
          content: 'export const a: number = 1\n',
          taskId: 't_a',
        },
        {
          filePath: 'src/b.ts',
          content: 'export const b: string = 42\n',
          taskId: 't_b',
        },
      ],
    })
    expect(gate.ok).toBe(false)
    expect(gate.code).toBe('MULTI_FILE_VALIDATION_DENIED')
    expect(gate.fileValidation.some((e) => e.status === 'denied_l5')).toBe(true)
    expect(gate.composerSurpassClaim).toBe(false)
    expect(gate.treeSitterAstIndexerWebWired).toBe(false)
  })

  it('passes clean multi-file overlay', () => {
    // Self-contained files — L.5 overlay does not pull real node_modules resolution.
    const gate = runGovernedApplyValidationGate({
      files: [
        {
          filePath: 'src/a.ts',
          content: 'export const a: number = 1\n',
          taskId: 't_a',
        },
        {
          filePath: 'src/b.ts',
          content: 'export const b: string = "ok"\n',
          taskId: 't_b',
        },
      ],
    })
    expect(gate.ok).toBe(true)
    expect(gate.compilerLog).toBe('')
    expect(gate.fileValidation.every((e) => e.status === 'pass')).toBe(true)
    expect(gate.composerSurpassClaim).toBe(false)
  })
})

describe('CW6 multi-file apply swarm', () => {
  it('denies parallel swarm on bad TSC/AST and never claims Composer surpass', async () => {
    const result = await runMultiFileApplySwarm({
      cells: [
        {
          taskId: 'critical',
          role: 'critical',
          path: 'src/good.ts',
          content: 'export const ok = 1\n',
        },
        {
          taskId: 'peri',
          role: 'peripheral',
          path: 'src/bad.ts',
          content: 'export const broken: string = ;\n',
        },
      ],
      enableAutoHeal: false,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('MULTI_FILE_VALIDATION_DENIED')
    expect(result.parallelCells).toBe(2)
    expect(result.composerSurpassClaim).toBe(false)
    expect(result.marketingAllowed).toBe(false)
    expect(result.fileValidation.some((e) => e.status === 'denied_ast')).toBe(true)
  })

  it('denies multi-file L.5 without writing when heal disabled', async () => {
    const result = await runMultiFileApplySwarm({
      cells: [
        {
          taskId: 'a',
          role: 'critical',
          path: 'src/a.ts',
          content: 'export const a: number = 1\n',
        },
        {
          taskId: 'b',
          role: 'peripheral',
          path: 'src/b.ts',
          content: 'export const b: string = 99\n',
        },
      ],
      enableAutoHeal: false,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('MULTI_FILE_VALIDATION_DENIED')
    expect(result.files).toEqual([])
    expect(result.fileValidation.some((e) => e.status === 'denied_l5')).toBe(true)
  })

  it('passes disjoint parallel cells when types align', async () => {
    const result = await runMultiFileApplySwarm({
      cells: [
        {
          taskId: 'a',
          role: 'critical',
          path: 'src/a.ts',
          content: 'export const a: number = 1\n',
        },
        {
          taskId: 'b',
          role: 'peripheral',
          path: 'src/b.ts',
          content: 'export const b: string = "ok"\n',
        },
      ],
    })
    expect(result.ok).toBe(true)
    expect(result.files).toHaveLength(2)
    expect(result.parallelCells).toBe(2)
    expect(result.composerSurpassClaim).toBe(false)
  })
})

describe('CW6 fileValidation receipts + wire honesty', () => {
  it('extracts per-file validation from deny metadata into apply receipt', () => {
    const receipt = toGovernedApplyReceipt('src/bad.ts', {
      ok: false,
      copy: {
        code: 'MULTI_FILE_VALIDATION_DENIED',
        title: 'Multi-file apply blocked',
        detail: 'AST/L.5 denied',
        needsFullAccess: false,
      },
      banner: 'blocked',
      error: 'MULTI_FILE_VALIDATION_DENIED',
      runId: 'run_swarm_1',
      metadata: {
        fileValidation: [
          { path: 'src/good.ts', status: 'pass', taskId: 'a' },
          {
            path: 'src/bad.ts',
            status: 'denied_ast',
            code: 'AST_SYNTAX_FAIL',
            taskId: 'b',
          },
        ],
        touchedPaths: ['src/good.ts', 'src/bad.ts'],
        composerSurpassClaim: false,
      },
    })
    expect(receipt.outcome).toBe('denied')
    expect(receipt.composerSurpassClaim).toBe(false)
    expect(receipt.fileValidation).toHaveLength(2)
    expect(receipt.fileValidation.find((e) => e.path === 'src/bad.ts')?.status).toBe(
      'denied_ast',
    )
    expect(
      extractFileValidationFromApplyResult({
        ok: false,
        copy: {
          code: 'MULTI_FILE_VALIDATION_DENIED',
          title: 'blocked',
          detail: 'denied',
          needsFullAccess: false,
        },
        banner: 'blocked',
        error: 'MULTI_FILE_VALIDATION_DENIED',
        metadata: { fileValidation: receipt.fileValidation },
      }),
    ).toHaveLength(2)
  })

  it('wires swarm + gate into governed apply executor and Ops strip', () => {
    const root = join(process.cwd())
    const executor = readFileSync(
      join(root, 'lib/server/ai-change-apply/executor.ts'),
      'utf8',
    )
    const strip = readFileSync(
      join(root, 'components/agents/chat/ledger/MergeReceiptGraphStrip.tsx'),
      'utf8',
    )
    const progress = readFileSync(
      join(root, '../../docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md'),
      'utf8',
    )
    expect(executor).toContain('runMultiFileApplySwarm')
    expect(executor).toContain('fileValidation')
    expect(executor).toContain('composerSurpassClaim: false')
    expect(executor).toContain('multi-file-swarm-validated')
    expect(strip).toContain('file-validation-list')
    expect(strip).toContain('composer-honesty')
    expect(strip).not.toMatch(/Composer surpass|surpasses Cursor/i)
    expect(progress).toContain('multi-file-apply-swarm')
    expect(progress).toMatch(/HELD|Not DONE vs Cursor/)
    expect(progress).toContain('J.11')
  })
})
