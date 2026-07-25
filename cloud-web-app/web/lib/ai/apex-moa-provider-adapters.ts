/**
 * Focus 1A / A1 — Live provider adapters for MoA + Auto-Heal.
 * Real `agentLlmChat` + `runProjectL5Gate` (typecheck + lint) — never mock in production paths.
 */

import { agentLlmChat } from '@/lib/ai/agent-llm-bridge'
import { createComponentLogger } from '@/lib/observability/logger'
import type { MoAGeneratorFn } from '@/lib/production/apex-moa-orchestrator'
import type { HealRepairFn, ValidationFn } from '@/lib/production/auto-heal-loop'
import type { CriticalFuseFn } from '@/lib/production/critical-synthesizer'
import { runProjectL5Gate } from '@/lib/production/project-l5-gate'
import type { L5VirtualFile } from '@/lib/production/project-l5-typecheck'

const log = createComponentLogger('apex-moa-provider-adapters')

function extractCodeFence(text: string): string {
  const fenced = text.match(/```(?:tsx?|jsx?|typescript|javascript)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()
  return text.trim()
}

export function createMoAGeneratorFn(options?: {
  maxTokens?: number
  temperature?: number
}): MoAGeneratorFn {
  return async ({ modelId, systemPrompt, userPrompt }) => {
    log.info('moa_generator_call', { modelId })
    const response = await agentLlmChat({
      kind: 'code',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `${userPrompt}\n\n` +
            'Return a complete implementation as a single code fence. No TODO / stub / placeholder.',
        },
      ],
      options: {
        model: modelId,
        maxTokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.2,
        budget: 'balanced',
      },
    })
    const raw = typeof response?.content === 'string' ? response.content : String(response?.content ?? '')
    return { patchText: extractCodeFence(raw), rationale: `generator:${modelId}` }
  }
}

export function createHealRepairFn(options?: {
  repairModelId?: string
  maxTokens?: number
}): HealRepairFn {
  const repairModelId = options?.repairModelId ?? 'anthropic/claude-sonnet-4'
  return async ({ round, previousPatch, compilerLog, systemPrompt }) => {
    log.info('heal_repair_call', { round, repairModelId })
    const response = await agentLlmChat({
      kind: 'code',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `Heal round ${round}/3. Fix ALL TypeScript/ESLint errors below. Return complete repaired file in one code fence.\n\n` +
            `## compilerLog\n${compilerLog.slice(0, 6000)}\n\n` +
            `## previousPatch\n\`\`\`\n${previousPatch.slice(0, 12000)}\n\`\`\``,
        },
      ],
      options: {
        model: repairModelId,
        maxTokens: options?.maxTokens ?? 4096,
        temperature: 0.1,
        budget: 'max-quality',
      },
    })
    const raw = typeof response?.content === 'string' ? response.content : String(response?.content ?? '')
    return { patchText: extractCodeFence(raw) }
  }
}

export function createL5ValidationFn(input: {
  filePath: string
  ambientFiles?: L5VirtualFile[]
}): ValidationFn {
  return async (patch: string) =>
    runProjectL5Gate({
      files: [{ fileName: input.filePath, content: patch }],
      ambientFiles: input.ambientFiles,
    })
}

export function createCriticalFuseFn(options?: {
  fuseModelId?: string
}): CriticalFuseFn {
  const fuseModelId = options?.fuseModelId ?? 'anthropic/claude-sonnet-4'
  return async ({ proposals, domainPrompt }) => {
    const bodies = proposals
      .map((p, i) => `### Proposal ${i + 1} (${p.modelId})\n\`\`\`\n${p.patchText.slice(0, 8000)}\n\`\`\``)
      .join('\n\n')
    const response = await agentLlmChat({
      kind: 'code',
      messages: [
        {
          role: 'system',
          content:
            'You are the Critical synthesizer. Merge the best of multiple generator proposals into one complete, non-lazy implementation.',
        },
        {
          role: 'user',
          content: `Mission:\n${domainPrompt}\n\n${bodies}\n\nReturn one fused code fence only.`,
        },
      ],
      options: {
        model: fuseModelId,
        maxTokens: 4096,
        temperature: 0.15,
        budget: 'max-quality',
      },
    })
    const raw = typeof response?.content === 'string' ? response.content : String(response?.content ?? '')
    return {
      patchText: extractCodeFence(raw),
      note: `LLM fuse via ${fuseModelId}`,
    }
  }
}

/** Estimate raw tokens reserved before MoA fan-out (Maestro + width×cells + heal). */
export function estimateMoASpendTokens(input: {
  width: 1 | 2 | 3
  peripheralCount: number
  maxHealRounds?: number
}): number {
  const cells = 1 + Math.max(0, input.peripheralCount)
  const heal = input.maxHealRounds ?? 3
  // ~4k per generator call + heal rounds on critical path
  return Math.max(8_000, cells * input.width * 4_000 + heal * 3_000)
}
