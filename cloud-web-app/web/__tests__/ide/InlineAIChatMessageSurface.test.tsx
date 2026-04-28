import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InlineAIMessageList } from '@/components/ide/InlineAIChatMessageSurface'

describe('InlineAIChatMessageSurface', () => {
  it('renders assistant trace evidence inline with the response', () => {
    render(
      <InlineAIMessageList
        isLoading={false}
        label="loading"
        messages={[
          {
            id: 'assistant-1',
            role: 'assistant',
            content: 'Aqui esta a resposta com provenance.',
            timestamp: new Date('2026-04-28T18:10:00.000Z'),
            traceArtifact: {
              kind: 'trace',
              traceId: 'trace_inline_123',
              summary: 'Resposta gerada com trace detalhada.',
              decision: 'Responder com contexto do arquivo atual.',
              reasons: [],
              tradeoffs: [],
              evidence: [{ kind: 'context', label: 'historyContextMessages=1' }],
              riskChecks: [],
              toolRuns: [],
              telemetry: { provider: 'openrouter', model: 'openai/gpt-4.1', tokensUsed: 321 },
            },
          },
        ]}
        messagesEndRef={{ current: null }}
      />
    )

    expect(screen.getByText('Aqui esta a resposta com provenance.')).toBeInTheDocument()
    expect(screen.getByText('Execution trace')).toBeInTheDocument()
    expect(screen.getByText(/Resposta gerada com trace detalhada/i)).toBeInTheDocument()
    expect(screen.getByText(/historyContextMessages=1/i)).toBeInTheDocument()
  })
})
