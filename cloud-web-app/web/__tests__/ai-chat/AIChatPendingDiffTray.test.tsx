import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AIChatPendingDiffTray } from '@/components/ai-chat/AIChatPendingDiffTray'

const pendingDiff = {
  path: '/src/app/page.tsx',
  oldContent: 'old',
  newContent: 'new',
  lines: [
    { lineNumber: 1, content: 'old', type: 'removed' as const },
    { lineNumber: 2, content: 'new', type: 'added' as const },
    { lineNumber: 3, content: 'keep', type: 'unchanged' as const },
  ],
}

describe('AIChatPendingDiffTray', () => {
  it('surfaces the pending edit with clear review actions', () => {
    const onOpenDiff = vi.fn()
    const onAcceptDiff = vi.fn()
    const onRejectDiff = vi.fn()

    render(
      <AIChatPendingDiffTray
        pendingDiff={pendingDiff}
        onOpenDiff={onOpenDiff}
        onAcceptDiff={onAcceptDiff}
        onRejectDiff={onRejectDiff}
      />
    )

    expect(screen.getByText('Pending edit review')).toBeInTheDocument()
    expect(screen.getByText('page.tsx')).toBeInTheDocument()
    expect(screen.getByText('2 changed lines ready to review')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open diff' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply now' }))

    expect(onOpenDiff).toHaveBeenCalledTimes(1)
    expect(onRejectDiff).toHaveBeenCalledTimes(1)
    expect(onAcceptDiff).toHaveBeenCalledTimes(1)
  })
})
