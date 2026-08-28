import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AIChatOpsSidebar } from '@/components/agents/chat/ops'

// MonacoChatDiffPanel is loaded via next/dynamic and cannot run under jsdom —
// the same mock contract used by AIChatProposalPreview.test.tsx.
vi.mock('@aethel/ide-ui/MonacoChatDiffPanel', () => ({
  MonacoChatDiffPanel: ({
    filePath,
    onAcceptAll,
    onReject,
  }: {
    filePath: string
    onAcceptAll: (value: string) => void
    onReject: () => void
  }) => (
    <div>
      <span>{filePath}</span>
      <button type="button" onClick={() => onAcceptAll('const value = 2')}>
        Apply all
      </button>
      <button type="button" onClick={onReject}>
        Reject
      </button>
    </div>
  ),
}))

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
          opsTab="diff"
          onOpsTabChange={() => undefined}
          pendingDiffs={[
            {
              path: 'src/app.tsx',
              oldContent: 'const value = 1',
              newContent: 'const value = 2',
            },
          ]}
          onAcceptDiff={onAcceptDiff}
          onRejectDiff={() => undefined}
          projectId="project-42"
          defaultGoal=""
        />
      )

      // The `diff` tab surfaces each pending diff with its file path and routes
      // accept through `onAcceptDiff(targetPath, finalModified)`.
      expect(screen.getByText('File: src/app.tsx')).toBeInTheDocument()
      const applyAllButton = await screen.findByRole('button', { name: /Apply all/i })
      fireEvent.click(applyAllButton)

      await waitFor(() => {
        expect(onAcceptDiff).toHaveBeenCalledWith('src/app.tsx', 'const value = 2')
      })
    },
    30000
  )

  it('shows the latest evidence capsule in the ops lane', () => {
    render(
      <AIChatOpsSidebar
        showAdvancedControls
        opsTab="evidence"
        onOpsTabChange={() => undefined}
        onAcceptDiff={() => undefined}
        onRejectDiff={() => undefined}
        projectId="project-42"
        defaultGoal=""
        latestEvidence={{
          kind: 'trace',
          traceId: 'trace_1234abcd',
          summary: 'Generated response with receipts and tool runs.',
          decision: 'Run multi-role execution.',
          reasons: [],
          tradeoffs: [],
          evidence: [{ kind: 'context', label: 'historyContextMessages=4' }],
          riskChecks: [],
          toolRuns: [{ toolName: 'searchWeb', status: 'ok', durationMs: 210 }],
          telemetry: { provider: 'openrouter', model: 'openai/gpt-4.1', tokensUsed: 480 },
        }}
      />
    )

    expect(screen.getByText(/Receipts workflow/i)).toBeInTheDocument()
    expect(screen.getByText(/Generated response with receipts/i)).toBeInTheDocument()
    expect(screen.getByText(/historyContextMessages=4/i)).toBeInTheDocument()
  })
})
