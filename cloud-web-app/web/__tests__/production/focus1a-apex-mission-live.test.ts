import { beforeEach, describe, expect, it, vi } from 'vitest'

const llmMocks = vi.hoisted(() => ({
  agentLlmChat: vi.fn(),
}))

vi.mock('@/lib/ai/agent-llm-bridge', () => ({
  agentLlmChat: llmMocks.agentLlmChat,
}))

import { synthesizeCriticalProposals, fuseCriticalProposals } from '@/lib/production/critical-synthesizer'
import { runApexCodeMission } from '@/lib/production/apex-mission-orchestrator'
import { estimateMoASpendTokens } from '@/lib/ai/apex-moa-provider-adapters'
import { healDocumentBeforeApply } from '@/lib/production/auto-heal-apply'

describe('A1 critical synthesizer', () => {
  it('prefers Lazy PASS over denser lazy stub', () => {
    const result = synthesizeCriticalProposals([
      { modelId: 'a', patchText: 'export function x() {\n  // TODO: implement\n}\n' },
      { modelId: 'b', patchText: 'export function x() {\n  return 42\n}\n' },
    ])
    expect(result.patchText).toContain('return 42')
    expect(result.note).toContain('b')
  })

  it('falls back to deterministic when LLM fuse returns lazy', async () => {
    const fused = await fuseCriticalProposals({
      domainPrompt: 'impl',
      proposals: [
        { modelId: 'a', patchText: 'export const a = 1\n' },
        { modelId: 'b', patchText: 'export const b = 2\n' },
      ],
      fuseFn: async () => ({
        patchText: 'export function x() {\n  // TODO: later\n}\n',
        note: 'bad fuse',
      }),
    })
    expect(fused.fusedBy).toBe('deterministic')
    expect(fused.patchText).toMatch(/export const/)
  })
})

describe('A1 live mission with provider adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    llmMocks.agentLlmChat.mockImplementation(async ({ options }: { options?: { model?: string } }) => ({
      content: `\`\`\`ts\nexport function mission() {\n  return '${options?.model ?? 'x'}'\n}\n\`\`\``,
      model: options?.model ?? 'test',
      provider: 'openrouter',
      tokensUsed: 100,
      latencyMs: 1,
    }))
  })

  it('estimates MoA spend above single-call baseline', () => {
    expect(estimateMoASpendTokens({ width: 2, peripheralCount: 1, maxHealRounds: 3 })).toBeGreaterThan(8_000)
  })

  it('runs live mission to APPLY with mocked providers + L.5 PASS patches', async () => {
    const result = await runApexCodeMission({
      userId: 'u1',
      planId: 'pro',
      maestroModelId: 'anthropic/claude-sonnet-4',
      userPrompt: 'implement mission helper',
      targetFilePath: 'src/mission.ts',
      riskScore: 55,
      enableLlmFuse: false,
    })
    expect(result.liveProvider).toBe(true)
    expect(result.verdict).toBe('APPLY')
    expect(result.supremePatch).toContain('export function mission')
    expect(result.cells[0]?.heal?.verdict).toBe('APPLY')
  })

  it('Free plan keeps generator width 1 (no surprise fan-out)', async () => {
    const result = await runApexCodeMission({
      userId: 'u1',
      planId: 'free',
      maestroModelId: 'anthropic/claude-sonnet-4',
      userPrompt: 'small fix',
      targetFilePath: 'src/a.ts',
      riskScore: 90,
      enableLlmFuse: false,
    })
    expect(result.cells[0]?.moa.generatorWidth).toBe(1)
  })
})

describe('A1 apply Auto-Heal helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let calls = 0
    llmMocks.agentLlmChat.mockImplementation(async () => {
      calls += 1
      return {
        content:
          calls === 1
            ? '```ts\nexport const x: number = "bad"\n```'
            : '```ts\nexport const x: number = 1\n```',
        model: 'anthropic/claude-sonnet-4',
        provider: 'openrouter',
        tokensUsed: 50,
        latencyMs: 1,
      }
    })
  })

  it('heals a type error document to L.5 PASS', async () => {
    const healed = await healDocumentBeforeApply({
      filePath: 'src/x.ts',
      document: 'export const x: number = "bad"\n',
      maxRounds: 3,
    })
    expect(healed.ok).toBe(true)
    if (healed.ok) {
      expect(healed.document).toContain('= 1')
    }
  })
})
