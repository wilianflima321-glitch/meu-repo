import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AIChatLedgerStrip } from '@/components/agents/chat/ledger'
import type { ChatDiffFile } from '@/lib/ai/ai-apply-bridge'

const pendingDiff: ChatDiffFile = {
  path: 'src/app/page.tsx',
  oldContent: 'old',
  newContent: 'new',
  lines: [
    { lineNumber: 1, type: 'context', content: 'const a = 1' },
    { lineNumber: 2, type: 'removed', content: 'return old' },
    { lineNumber: 3, type: 'added', content: 'return new' },
  ],
}

describe('AIChatLedgerStrip', () => {
  it('renders evidence, diff, and economics actions with the right callbacks', () => {
    const onOpenDiff = vi.fn()
    const onOpenEconomics = vi.fn()
    const onOpenEvidence = vi.fn()

    render(
      <AIChatLedgerStrip
        agentCount={3}
        consoleMode="execute"
        currentRunEstimate={2.5}
        isAIWorking
        latestEvidence={{
          kind: 'trace',
          traceId: 'trace-1',
          summary: 'Trace ready',
          reasons: ['A'],
          tradeoffs: [],
          evidence: [],
          riskChecks: [{ risk: 'tests', status: 'warn' }],
          toolRuns: [{ toolName: 'search', status: 'ok' }],
        }}
        pendingDiff={pendingDiff}
        onOpenDiff={onOpenDiff}
        onOpenEconomics={onOpenEconomics}
        onOpenEvidence={onOpenEvidence}
      />,
    )

    expect(screen.getByText('Execution rail')).toBeInTheDocument()
    expect(screen.getByText(/Inspect trace/)).toBeInTheDocument()
    expect(screen.getByText(/Review page.tsx/)).toBeInTheDocument()
    expect(screen.getByText(/Budget/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Inspect trace/i }))
    fireEvent.click(screen.getByRole('button', { name: /Review page.tsx/i }))
    fireEvent.click(screen.getByRole('button', { name: /Budget/i }))

    expect(onOpenEvidence).toHaveBeenCalledTimes(1)
    expect(onOpenDiff).toHaveBeenCalledTimes(1)
    expect(onOpenEconomics).toHaveBeenCalledTimes(1)
  })
})
