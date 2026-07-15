/**
 * Focus 1A / A1 — Auto-Heal on apply preflight when L.5 FAIL.
 * Real LLM repair + L.5 re-validate ≤3. Fail-closed if exhausted.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { runAutoHealLoop } from '@/lib/production/auto-heal-loop'
import {
  createHealRepairFn,
  createL5ValidationFn,
} from '@/lib/ai/apex-moa-provider-adapters'
import type { L5VirtualFile } from '@/lib/production/project-l5-typecheck'

const log = createComponentLogger('auto-heal-apply')

export async function healDocumentBeforeApply(input: {
  filePath: string
  document: string
  repairModelId?: string
  ambientFiles?: L5VirtualFile[]
  maxRounds?: 1 | 2 | 3
}): Promise<
  | { ok: true; document: string; rounds: number }
  | { ok: false; compilerLog: string; rounds: number; reason: string }
> {
  log.info('apply_auto_heal_start', { filePath: input.filePath })
  const result = await runAutoHealLoop({
    initialPatch: input.document,
    validate: createL5ValidationFn({
      filePath: input.filePath,
      ambientFiles: input.ambientFiles,
    }),
    repair: createHealRepairFn({ repairModelId: input.repairModelId }),
    maxRounds: input.maxRounds ?? 3,
    escalateOnExhaust: false,
  })

  if (result.verdict === 'APPLY' && result.finalPatch) {
    return { ok: true, document: result.finalPatch, rounds: result.turns.length }
  }

  const lastFail = [...result.turns].reverse().find((t) => t.validationGate.verdict === 'FAIL')
  return {
    ok: false,
    compilerLog: lastFail?.validationGate.compilerLog ?? '',
    rounds: result.turns.length,
    reason: result.reason ?? 'Auto-Heal exhausted without L.5 PASS',
  }
}
