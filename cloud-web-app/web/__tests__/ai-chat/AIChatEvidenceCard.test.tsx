import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AgentEvidenceCard } from '@/components/agents/AgentEvidenceCard'

describe('AgentEvidenceCard', () => {
  it('renders research artifacts with sources and credibility', () => {
    render(
      <AgentEvidenceCard
        artifact={{
          kind: 'research',
          query: 'Preview review benchmark',
          summary: 'Honest comparison between Vercel, v0, and Replit.',
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

    expect(screen.getByText('Preview review benchmark')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === 'average credibility 84%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Vercel sharing preview deployments/i })).toHaveAttribute(
      'href',
      'https://vercel.com/docs/deployments/sharing-deployments'
    )
  })

  it('renders execution traces with telemetry and evidence counts', () => {
    render(
      <AgentEvidenceCard
        artifact={{
          kind: 'trace',
          traceId: 'trace_abcdef123456',
          summary: 'Response generated with detailed trace.',
          decision: 'Run the consolidated response.',
          reasons: ['Planning is separated'],
          tradeoffs: [],
          evidence: [{ kind: 'context', label: 'historyContextMessages=6' }],
          riskChecks: [{ risk: 'build parity', status: 'warn', mitigation: 'run probe' }],
          toolRuns: [{ toolName: 'searchWeb', status: 'ok', durationMs: 320 }],
          telemetry: { provider: 'openrouter', model: 'openai/gpt-4.1', tokensUsed: 920, latencyMs: 1400 },
        }}
      />
    )

    expect(screen.getByText('Response generated with detailed trace.')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element?.textContent === '1 evidence items')).toBeInTheDocument()
    expect(screen.getByText(/openrouter/i)).toBeInTheDocument()
    expect(screen.getByText(/searchWeb/i)).toBeInTheDocument()
    expect(screen.getByText(/build parity/i)).toBeInTheDocument()
  })
})
