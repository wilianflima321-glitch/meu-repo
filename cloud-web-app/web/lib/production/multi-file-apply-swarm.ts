/**
 * CW6 Path B — parallel multi-file edit swarm inside existing Maestro / MoA / job-runner.
 * Concurrent per-file AST+Lazy prep, then batch L.5 overlay; Auto-Heal ≤3 when wired.
 * NOT J.11 ACP / NOT J.12 OrchestratorProd.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { inspectLazyPatch } from '@/lib/production/lazy-inspector'
import {
  COMPOSER_SURPASS_CLAIM,
  runGovernedApplyValidationGate,
  validateFileAstSyntax,
  type ApplyValidationGateResult,
  type FileValidationStatusEntry,
} from '@/lib/production/agent-apply-validation-gate'
import { buildMaestroDelegationPlan, assertDisjointAllowedPaths } from '@/lib/production/maestro-delegation'
import type { L5VirtualFile } from '@/lib/production/project-l5-typecheck'

const log = createComponentLogger('multi-file-apply-swarm')

export type SwarmPatchCell = {
  taskId: string
  path: string
  content: string
  /** Optional role for Maestro plan honesty (nucleus vs peripheral). */
  role?: 'critical' | 'peripheral'
}

export type SwarmHealFn = (input: {
  path: string
  content: string
  compilerLog: string
  round: number
}) => Promise<{ content: string }>

export type MultiFileApplySwarmResult = {
  ok: boolean
  code?: ApplyValidationGateResult['code']
  /** Healed/validated contents ready for governed write (only when ok). */
  files: Array<{ taskId: string; path: string; content: string }>
  fileValidation: FileValidationStatusEntry[]
  compilerLog: string
  healRoundsUsed: number
  parallelCells: number
  /** Always false — swarm ≠ Cursor Composer surpass. */
  composerSurpassClaim: false
  marketingAllowed: false
}

async function prepCellAstLazy(cell: SwarmPatchCell): Promise<FileValidationStatusEntry> {
  const lazy = inspectLazyPatch(cell.content, 0)
  if (lazy.verdict === 'REJECT') {
    return {
      path: cell.path.replace(/\\/g, '/'),
      status: 'denied_lazy',
      code: 'LAZY_INSPECTOR_REJECT',
      detail: lazy.matchedPatterns.slice(0, 6).join(', '),
      taskId: cell.taskId,
    }
  }
  const ast = validateFileAstSyntax({ filePath: cell.path, content: cell.content })
  if (ast.verdict === 'FAIL') {
    return {
      path: cell.path.replace(/\\/g, '/'),
      status: 'denied_ast',
      code: 'AST_SYNTAX_FAIL',
      detail: ast.compilerLog.slice(0, 500),
      taskId: cell.taskId,
    }
  }
  return {
    path: cell.path.replace(/\\/g, '/'),
    status: 'pass',
    taskId: cell.taskId,
  }
}

/**
 * Run parallel multi-file validation swarm (Maestro-disjoint paths).
 * Auto-Heal reinjects compiler log ≤3 when `heal` is provided and enabled.
 */
export async function runMultiFileApplySwarm(input: {
  cells: SwarmPatchCell[]
  ambientFiles?: L5VirtualFile[]
  enableAutoHeal?: boolean
  maxHealRounds?: 1 | 2 | 3
  heal?: SwarmHealFn
}): Promise<MultiFileApplySwarmResult> {
  const cells = input.cells
  const maxHealRounds = input.maxHealRounds ?? 3

  if (cells.length === 0) {
    return {
      ok: true,
      files: [],
      fileValidation: [],
      compilerLog: '',
      healRoundsUsed: 0,
      parallelCells: 0,
      composerSurpassClaim: COMPOSER_SURPASS_CLAIM,
      marketingAllowed: false,
    }
  }

  // Maestro-style disjoint path plan (nucleus + peripherals) — no J.11/J.12.
  const critical = cells.find((c) => c.role === 'critical') ?? cells[0]!
  const peripherals = cells.filter((c) => c.taskId !== critical.taskId).slice(0, 4)
  const plan = buildMaestroDelegationPlan({
    missionId: `swarm_${Date.now().toString(36)}`,
    maestroModelId: 'governed-apply-swarm',
    projectMemoryDigestId: 'apply-swarm',
    lawsPackId: 'laws-apply-gate',
    contextPackId: 'apply-swarm-context',
    critical: {
      taskId: critical.taskId,
      domain: 'code',
      intent: `Apply ${critical.path}`,
      allowedPaths: [critical.path],
      successCriteria: ['ast_pass', 'l5_pass'],
      riskScore: cells.length > 1 ? 40 : 20,
    },
    peripherals: peripherals.map((p) => ({
      taskId: p.taskId,
      domain: 'code' as const,
      intent: `Apply ${p.path}`,
      allowedPaths: [p.path],
      successCriteria: ['ast_pass', 'l5_pass'],
      riskScore: 35,
    })),
  })

  const disjoint = assertDisjointAllowedPaths(plan)
  if (!disjoint.ok) {
    log.warn('swarm_path_conflict', { conflicts: disjoint.conflicts })
    return {
      ok: false,
      code: 'PATH_DISJOINT_FAIL',
      files: [],
      fileValidation: cells.map((c) => ({
        path: c.path.replace(/\\/g, '/'),
        status: 'denied_disjoint' as const,
        code: 'PATH_DISJOINT_FAIL',
        detail: disjoint.conflicts[0],
        taskId: c.taskId,
      })),
      compilerLog: disjoint.conflicts.join('\n'),
      healRoundsUsed: 0,
      parallelCells: cells.length,
      composerSurpassClaim: false,
      marketingAllowed: false,
    }
  }

  let working = cells.map((c) => ({ ...c }))
  let healRoundsUsed = 0

  // Parallel per-file AST + Lazy (Composer-like concurrent patch prep).
  const parallelPrep = await Promise.all(working.map((cell) => prepCellAstLazy(cell)))
  const prepDeny = parallelPrep.find(
    (entry) => entry.status === 'denied_ast' || entry.status === 'denied_lazy',
  )
  if (prepDeny) {
    log.warn('swarm_parallel_prep_deny', { code: prepDeny.code, path: prepDeny.path })
    return {
      ok: false,
      code: cells.length > 1 ? 'MULTI_FILE_VALIDATION_DENIED' : prepDeny.code === 'LAZY_INSPECTOR_REJECT'
        ? 'LAZY_INSPECTOR_REJECT'
        : 'AST_SYNTAX_FAIL',
      files: [],
      fileValidation: parallelPrep,
      compilerLog: parallelPrep
        .filter((e) => e.detail)
        .map((e) => `${e.path}: ${e.detail}`)
        .join('\n')
        .slice(0, 8000),
      healRoundsUsed: 0,
      parallelCells: cells.length,
      composerSurpassClaim: false,
      marketingAllowed: false,
    }
  }

  for (let round = 0; round <= maxHealRounds; round++) {
    const gate = runGovernedApplyValidationGate({
      files: working.map((c) => ({
        filePath: c.path,
        content: c.content,
        taskId: c.taskId,
      })),
      ambientFiles: input.ambientFiles,
    })

    if (gate.ok) {
      log.info('swarm_gate_pass', {
        files: working.length,
        parallelCells: cells.length,
        healRoundsUsed,
        composerSurpassClaim: false,
      })
      return {
        ok: true,
        files: working.map((c) => ({
          taskId: c.taskId,
          path: c.path.replace(/\\/g, '/'),
          content: c.content,
        })),
        fileValidation: gate.fileValidation,
        compilerLog: '',
        healRoundsUsed,
        parallelCells: cells.length,
        composerSurpassClaim: false,
        marketingAllowed: false,
      }
    }

    const canHeal =
      input.enableAutoHeal === true &&
      typeof input.heal === 'function' &&
      round < maxHealRounds &&
      (gate.code === 'L5_PROJECT_TYPECHECK_FAIL' || gate.code === 'MULTI_FILE_VALIDATION_DENIED')

    if (!canHeal) {
      log.warn('swarm_gate_deny', { code: gate.code, healRoundsUsed })
      return {
        ok: false,
        code: gate.code,
        files: [],
        fileValidation: gate.fileValidation,
        compilerLog: gate.compilerLog,
        healRoundsUsed,
        parallelCells: cells.length,
        composerSurpassClaim: false,
        marketingAllowed: false,
      }
    }

    const deniedPaths = new Set(
      gate.fileValidation
        .filter((e) => e.status === 'denied_l5' || e.status === 'denied_ast')
        .map((e) => e.path),
    )

    const healTargets = working.filter((c) => deniedPaths.has(c.path.replace(/\\/g, '/')))
    if (healTargets.length === 0) {
      return {
        ok: false,
        code: gate.code,
        files: [],
        fileValidation: gate.fileValidation,
        compilerLog: gate.compilerLog,
        healRoundsUsed,
        parallelCells: cells.length,
        composerSurpassClaim: false,
        marketingAllowed: false,
      }
    }

    healRoundsUsed += 1
    const healed = await Promise.all(
      healTargets.map(async (cell) => {
        const next = await input.heal!({
          path: cell.path,
          content: cell.content,
          compilerLog: gate.compilerLog,
          round: healRoundsUsed,
        })
        return { taskId: cell.taskId, path: cell.path, content: next.content }
      }),
    )

    const byTask = new Map(healed.map((h) => [h.taskId, h.content]))
    working = working.map((c) =>
      byTask.has(c.taskId) ? { ...c, content: byTask.get(c.taskId)! } : c,
    )
  }

  return {
    ok: false,
    code: 'MULTI_FILE_VALIDATION_DENIED',
    files: [],
    fileValidation: working.map((c) => ({
      path: c.path.replace(/\\/g, '/'),
      status: 'denied_l5' as const,
      code: 'L5_AUTO_HEAL_EXHAUSTED',
      taskId: c.taskId,
    })),
    compilerLog: 'Auto-Heal exhausted for multi-file swarm (≤3 rounds).',
    healRoundsUsed,
    parallelCells: cells.length,
    composerSurpassClaim: false,
    marketingAllowed: false,
  }
}
