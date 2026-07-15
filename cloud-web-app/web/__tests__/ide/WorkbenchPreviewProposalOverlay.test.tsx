import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkbenchPreviewProposalOverlay } from '@aethel/ide-ui/fullscreen/WorkbenchPreviewProposalOverlay'

describe('WorkbenchPreviewProposalOverlay', () => {
  it('renders the proposal summary and review actions', () => {
    const onOpenReview = vi.fn()
    const onTogglePreview = vi.fn()
    const onApply = vi.fn()
    const onReject = vi.fn()

    render(
      <WorkbenchPreviewProposalOverlay
        pendingDiff={{
          path: '/src/game/Character_Controller.cpp',
          oldContent: 'old',
          newContent: 'new',
          lines: [
            { type: 'context', leftNumber: 1, rightNumber: 1, content: 'line 1' },
            { type: 'removed', leftNumber: 2, rightNumber: null, content: '- old' },
            { type: 'added', leftNumber: null, rightNumber: 2, content: '+ new' },
          ],
        }}
        canPreviewArtifact
        isPreviewingProposal={false}
        onOpenReview={onOpenReview}
        onTogglePreview={onTogglePreview}
        onApply={onApply}
        onReject={onReject}
      />
    )

    expect(screen.getByText('AI proposal preview')).toBeInTheDocument()
    expect(screen.getByText('Character_Controller.cpp')).toBeInTheDocument()
    expect(screen.getByText(/2 changed lines/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /View proposal/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /View proposal/i }))
    expect(onTogglePreview).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Open review/i }))
    expect(onOpenReview).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Apply proposal/i }))
    expect(onApply).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }))
    expect(onReject).toHaveBeenCalledTimes(1)
  })
})
