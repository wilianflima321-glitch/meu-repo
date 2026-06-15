import { describe, expect, it } from 'vitest'

import { createAgentToolContextProvider } from '@/lib/server/agent-context/create-agent-tool-context-provider'

describe('createAgentToolContextProvider', () => {
  it('injects governed execution context for tool calls', async () => {
    const provider = createAgentToolContextProvider({
      userId: 'user-1',
      projectId: 'project-1',
      agent: 'autonomous-agent',
    })

    const context = await provider({
      type: 'tool',
      tool: 'edit_file',
      input: { path: 'src/a.ts' },
      reason: 'test',
    })

    expect(context).toEqual({
      __aethelContext: {
        userId: 'user-1',
        projectId: 'project-1',
        agent: 'autonomous-agent',
      },
    })
  })
})
