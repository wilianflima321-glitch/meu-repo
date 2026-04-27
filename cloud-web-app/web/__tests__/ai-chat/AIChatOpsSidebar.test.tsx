import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AIChatOpsSidebar } from '../../components/ai-chat/AIChatOpsSidebar'

describe('AIChatOpsSidebar', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loads persisted memories for the current project', async () => {
    window.localStorage.setItem(
      'aethel.ai.ops.memory.project-42',
      JSON.stringify([
        {
          id: 'memory-1',
          scope: 'workspace',
          key: 'deploy-url',
          value: 'https://preview.example.com',
          timestamp: Date.now(),
        },
      ])
    )

    render(
      <AIChatOpsSidebar
        showAdvancedControls
        opsTab="memory"
        onOpsTabChange={() => undefined}
        onAcceptDiff={() => undefined}
        onRejectDiff={() => undefined}
        projectId="project-42"
        defaultGoal=""
      />
    )

    await waitFor(() => {
      expect(screen.getByText('deploy-url')).toBeInTheDocument()
    })
    expect(screen.getByText('https://preview.example.com')).toBeInTheDocument()
  })

  it(
    'routes approval actions through the pending diff bridge',
    async () => {
      const onAcceptDiff = vi.fn()

      render(
        <AIChatOpsSidebar
          showAdvancedControls
          opsTab="approval"
          onOpsTabChange={() => undefined}
          pendingDiff={{
            path: 'src/app.tsx',
            oldContent: 'const value = 1',
            newContent: 'const value = 2',
          }}
          onAcceptDiff={onAcceptDiff}
          onRejectDiff={() => undefined}
          projectId="project-42"
          defaultGoal=""
        />
      )

      expect(screen.getByText('src/app.tsx')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Aplicar tudo/i }))

      await waitFor(() => {
        expect(onAcceptDiff).toHaveBeenCalledWith('const value = 2')
      })
    },
    30000
  )
})
