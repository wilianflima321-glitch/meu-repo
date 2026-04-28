import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AIChatEvidenceCard } from '@/components/ai-chat/AIChatEvidenceCard'

describe('AIChatEvidenceCard', () => {
  it('renders research artifacts with sources and credibility', () => {
    render(
      <AIChatEvidenceCard
        artifact={{
          kind: 'research',
          query: 'Benchmark de preview review',
          summary: 'Comparativo honesto entre Vercel, v0 e Replit.',
          generatedAt: '2026-04-28T16:45:00.000Z',
          averageCredibility: 0.84,
          sources: [
            {
              title: 'Vercel sharing preview deployments',
              url: 'https://vercel.com/docs/deployments/sharing-deployments',
              snippet: 'Preview URLs can be shared for review.',
            },
          ],
        }}
      />
    )

    expect(screen.getByText('Benchmark de preview review')).toBeInTheDocument()
    expect(screen.getByText(/credibilidade media 84%/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Vercel sharing preview deployments/i })).toHaveAttribute(
      'href',
      'https://vercel.com/docs/deployments/sharing-deployments'
    )
  })

  it('renders execution traces with telemetry and evidence counts', () => {
    render(
      <AIChatEvidenceCard
        artifact={{
          kind: 'trace',
          traceId: 'trace_abcdef123456',
          summary: 'Resposta gerada com trace detalhada.',
          decision: 'Executar resposta consolidada.',
          reasons: ['Planejamento separado'],
          tradeoffs: [],
          evidence: [{ kind: 'context', label: 'historyContextMessages=6' }],
          riskChecks: [{ risk: 'build parity', status: 'warn', mitigation: 'rodar probe' }],
          toolRuns: [{ toolName: 'searchWeb', status: 'ok', durationMs: 320 }],
          telemetry: { provider: 'openrouter', model: 'openai/gpt-4.1', tokensUsed: 920, latencyMs: 1400 },
        }}
      />
    )

    expect(screen.getByText('Resposta gerada com trace detalhada.')).toBeInTheDocument()
    expect(screen.getByText(/1 evidencias/i)).toBeInTheDocument()
    expect(screen.getByText(/openrouter/i)).toBeInTheDocument()
    expect(screen.getByText(/searchWeb/i)).toBeInTheDocument()
    expect(screen.getByText(/build parity/i)).toBeInTheDocument()
  })
})
