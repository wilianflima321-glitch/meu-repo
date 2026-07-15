import { describe, expect, it } from 'vitest'

import {
  buildInlineAIRequestMessage,
  extractAdvancedResponseContent,
  extractAdvancedTraceArtifact,
} from '@aethel/ide-ui/InlineAIChat.helpers'

describe('InlineAIChat helpers', () => {
  it('builds a context-rich inline AI request message', () => {
    const message = buildInlineAIRequestMessage({
      prompt: 'Refatore este fluxo sem quebrar contratos',
      activeFile: {
        path: '/src/app/page.tsx',
        language: 'tsx',
        content: 'export default function Page() { return <main>Hello</main> }',
      },
      projectContext: {
        name: 'Aethel Studio',
        files: ['/src/app/page.tsx', '/src/components/Hero.tsx'],
      },
    })

    expect(message).toContain('INLINE_FILE_CONTEXT')
    expect(message).toContain('path: /src/app/page.tsx')
    expect(message).toContain('INLINE_PROJECT_CONTEXT')
    expect(message).toContain('project: Aethel Studio')
    expect(message).toContain('INLINE_OPERATOR_GOAL')
    expect(message).toContain('Refatore este fluxo sem quebrar contratos')
  })

  it('extracts the assistant content from advanced chat payloads', () => {
    const raw = JSON.stringify({
      choices: [{ message: { content: '```ts\nconst ok = true\n```' } }],
    })

    expect(extractAdvancedResponseContent(raw)).toContain('const ok = true')
    expect(extractAdvancedResponseContent('plain text')).toBe('plain text')
  })

  it('extracts the trace artifact from advanced chat payloads', () => {
    const raw = JSON.stringify({
      content: 'Resposta pronta',
      traceSummary: {
        traceId: 'trace_inline_123',
        summary: 'Resposta gerada no lane inline.',
        evidence: [{ kind: 'context', label: 'historyContextMessages=1' }],
        telemetry: { provider: 'openrouter', model: 'openai/gpt-4.1', tokensUsed: 321 },
      },
    })

    const artifact = extractAdvancedTraceArtifact(raw)

    expect(artifact?.traceId).toBe('trace_inline_123')
    expect(artifact?.summary).toContain('lane inline')
    expect(artifact?.evidence[0]?.label).toBe('historyContextMessages=1')
  })
})
