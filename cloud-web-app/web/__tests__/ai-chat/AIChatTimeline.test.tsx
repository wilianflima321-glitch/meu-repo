import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AIChatTimeline } from '@/components/agents/chat/activity'

describe('AIChatTimeline', () => {
  it('starts compact, expands on demand, and advertises the remaining history', () => {
    const onOpenHistory = vi.fn()

    render(
      <AIChatTimeline
        activeThreadTitle="Wave 13"
        hasHistory
        onOpenHistory={onOpenHistory}
        items={[
          { id: '1', tone: 'assistant', title: 'Plan', summary: 'Plan created', meta: 'now' },
          { id: '2', tone: 'live', title: 'Execution', summary: 'Execution in progress', meta: '1m' },
          { id: '3', tone: 'system', title: 'Gate', summary: 'Gate is green', meta: '2m' },
          { id: '4', tone: 'user', title: 'Request', summary: 'Additional request', meta: '3m' },
        ]}
      />,
    )

    expect(screen.getByText('Plan')).toBeInTheDocument()
    expect(screen.queryByText('Execution')).not.toBeInTheDocument()
    expect(screen.queryByText('Gate')).not.toBeInTheDocument()
    expect(screen.queryByText('Request')).not.toBeInTheDocument()
    expect(screen.getByText('+3 additional events in full history')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /View details/i }))
    expect(screen.getByText('Execution')).toBeInTheDocument()
    expect(screen.getByText('Gate')).toBeInTheDocument()
    expect(screen.queryByText('Request')).not.toBeInTheDocument()
    expect(screen.getByText('+1 additional events in full history')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Open history/i }))
    expect(onOpenHistory).toHaveBeenCalledTimes(1)
  })
})
