/**
 * Auto-Heal loop — Decision #60
 * After LazyInspector PASS, L.5/compiler FAIL → reinject log → repair ≤3.
 * Heal ≠ lazy retry. Nucleus may escalate to Maestro; peripheral stays on same cell.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { injectAntiLazySystemPrompt } from '@/lib/ai/fusion-anti-lazy-system'
import { inspectLazyPatch } from '@/lib/production/lazy-inspector'

const log = createComponentLogger('auto-heal-loop')

export interface ProjectValidationGateResult {
  verdict: 'PASS' | 'FAIL'
  compilerLog: string
  checks?: Array<{ id: string; status: 'pass' | 'fail'; message: string }>
}

export interface AutoHealTurn {
  round: number
  validationGate: ProjectValidationGateResult
  compilerLogRef: string
  repairPatch?: string
  lazyVerdict?: 'PASS' | 'REJECT'
}

export interface AutoHealResult {
  verdict: 'APPLY' | 'ESCALATE' | 'BLOCK'
  turns: AutoHealTurn[]
  finalPatch?: string
  reason?: string
}

export type HealRepairFn = (input: {
  round: number
  previousPatch: string
  compilerLog: string
  systemPrompt: string
}) => Promise<{ patchText: string }>

export type ValidationFn = (patch: string) => Promise<ProjectValidationGateResult>

/**
 * Run heal loop on a candidate patch. Max rounds default 3.
 */
export async function runAutoHealLoop(input: {
  initialPatch: string
  validate: ValidationFn
  repair: HealRepairFn
  maxRounds?: 1 | 2 | 3
  systemPrompt?: string
  escalateOnExhaust?: boolean
}): Promise<AutoHealResult> {
  const maxRounds = input.maxRounds ?? 3
  const systemPrompt = injectAntiLazySystemPrompt(input.systemPrompt)
  const turns: AutoHealTurn[] = []
  let patch = input.initialPatch

  for (let round = 1; round <= maxRounds; round++) {
    const gate = await input.validate(patch)
    turns.push({
      round,
      validationGate: gate,
      compilerLogRef: `heal-round-${round}`,
    })

    if (gate.verdict === 'PASS') {
      log.info('auto_heal_pass', { round })
      return { verdict: 'APPLY', turns, finalPatch: patch }
    }

    if (round === maxRounds) break

    const repaired = await input.repair({
      round,
      previousPatch: patch,
      compilerLog: gate.compilerLog,
      systemPrompt,
    })

    const lazy = inspectLazyPatch(repaired.patchText)
    turns[turns.length - 1].repairPatch = repaired.patchText
    turns[turns.length - 1].lazyVerdict = lazy.verdict

    if (lazy.verdict === 'REJECT') {
      log.warn('auto_heal_lazy_reject', { round, patterns: lazy.matchedPatterns })
      // Do not count as successful heal progress — try next round with same compiler log context
      continue
    }

    patch = repaired.patchText
  }

  const escalate = input.escalateOnExhaust !== false
  log.warn('auto_heal_exhausted', { rounds: maxRounds, escalate })
  return {
    verdict: escalate ? 'ESCALATE' : 'BLOCK',
    turns,
    finalPatch: patch,
    reason: `L.5 still FAIL after ${maxRounds} heal rounds`,
  }
}

/** Thin validator for unit tests — typecheck-ish stub via Lazy PASS + no syntax markers */
export async function stubValidatePatchForTests(patch: string): Promise<ProjectValidationGateResult> {
  if (!patch.trim()) {
    return { verdict: 'FAIL', compilerLog: 'empty patch' }
  }
  if (/SYNTAX_ERROR_MARKER/.test(patch)) {
    return { verdict: 'FAIL', compilerLog: 'error TS1005: SYNTAX_ERROR_MARKER' }
  }
  return { verdict: 'PASS', compilerLog: '' }
}
