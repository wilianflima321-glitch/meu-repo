import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AIChatProposalPreview } from '@/components/agents/chat/review'

vi.mock('@/components/ide/MonacoChatDiffPanel', () => ({
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
      <button type="button" onClick={() => onAcceptAll('patched output')}>
        apply from preview
      </button>
      <button type="button" onClick={onReject}>
        reject from preview
      </button>
    </div>
  ),
}))

const pendingDiff = {
  path: '/src/app/page.tsx',
  oldContent: 'old',
  newContent: 'new',
  lines: [
    { lineNumber: 1, content: 'old', type: 'removed' as const },
    { lineNumber: 2, content: 'new', type: 'added' as const },
  ],
}

describe('AIChatProposalPreview', () => {
  it('renders an inline proposal review surface with apply/reject actions', async () => {
    const onAcceptDiff = vi.fn()
    const onRejectDiff = vi.fn()

    render(
      <AIChatProposalPreview
        pendingDiff={pendingDiff}
        onAcceptDiff={onAcceptDiff}
        onRejectDiff={onRejectDiff}
      />
    )

    expect(screen.getByText('AI proposal preview')).toBeInTheDocument()
    expect(screen.getByText('page.tsx')).toBeInTheDocument()
    expect(screen.getByText('2 changed lines ready before apply')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'apply from preview' }))
    fireEvent.click(await screen.findByRole('button', { name: 'reject from preview' }))

    expect(onAcceptDiff).toHaveBeenCalledWith('patched output')
    expect(onRejectDiff).toHaveBeenCalledTimes(1)
  })
})
