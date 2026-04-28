import { describe, expect, it } from 'vitest'

import { buildInlineAIRequestMessage, extractAdvancedResponseContent } from '@/components/ide/InlineAIChat.helpers'

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
})
