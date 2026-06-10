import { describe, expect, it } from 'vitest'
import { buildResearchArtifactFromPayload, buildTraceArtifactFromSummary } from '@/components/agents/evidence'

describe('ai-chat-evidence helpers', () => {
  it('builds a trace artifact from persisted trace summary data', () => {
    const artifact = buildTraceArtifactFromSummary({
      traceId: 'trace_1234567890',
      summary: 'Resposta consolidada com dois agentes.',
      decisionRecord: {
        decision: 'Executar arquiteto e engenheiro em paralelo.',
        reasons: ['Planejamento separado', 'Execucao mais segura'],
      },
      evidence: [
        { kind: 'context', label: 'historyContextMessages=8' },
        { kind: 'tool', label: 'searchWeb', detail: 'benchmark atual' },
      ],
      riskChecks: [{ risk: 'regressao de build', status: 'warn', mitigation: 'rodar qa gate' }],
      toolRuns: [{ toolName: 'searchWeb', status: 'ok', durationMs: 420 }],
      telemetry: { provider: 'openrouter', model: 'openai/gpt-4.1', tokensUsed: 812, latencyMs: 1500 },
    })

    expect(artifact).not.toBeNull()
    expect(artifact?.traceId).toBe('trace_1234567890')
    expect(artifact?.decision).toContain('arquiteto')
    expect(artifact?.evidence).toHaveLength(2)
    expect(artifact?.toolRuns[0]?.toolName).toBe('searchWeb')
    expect(artifact?.telemetry?.tokensUsed).toBe(812)
  })

  it('builds a research artifact with averaged credibility', () => {
    const artifact = buildResearchArtifactFromPayload({
      query: 'Melhores praticas para preview deploy review',
      summary: 'Vercel e v0 tratam preview como surface de decisao.',
      generatedAt: '2026-04-28T15:30:00.000Z',
      sources: [
        {
          title: 'Vercel preview deployments',
          url: 'https://vercel.com/docs/deployments/sharing-deployments',
          snippet: 'Share preview URLs with reviewers.',
          credibility: 0.9,
        },
        {
          title: 'v0 deployments',
          url: 'https://v0.dev/docs/deployments',
          snippet: 'Review and publish generated projects.',
          credibility: 0.8,
        },
      ],
    })

    expect(artifact).not.toBeNull()
    expect(artifact?.kind).toBe('research')
    expect(artifact?.sources).toHaveLength(2)
    expect(artifact?.averageCredibility).toBeCloseTo(0.85)
  })
})
