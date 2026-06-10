/**
 * Tests for agents/chat/activity/LiveConversationPanel.
 *
 * Covers:
 *  - Status text switches between "AI working" and "Waiting".
 *  - Interrupt button only visible while working, and fires onInterrupt.
 *  - Submitting the composer fires onSendMessage with the trimmed text and clears input.
 *  - Empty / whitespace-only submissions do not fire onSendMessage.
 */

import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LiveConversationPanel } from '../../components/agents/chat/activity'

describe('LiveConversationPanel', () => {
  it('shows "AI working" when isWorking=true', () => {
    render(<LiveConversationPanel isWorking onInterrupt={() => {}} onSendMessage={() => {}} />)
    expect(screen.getByText('AI working')).toBeInTheDocument()
  })

  it('shows "Waiting" when isWorking=false and hides interrupt', () => {
    render(<LiveConversationPanel isWorking={false} onInterrupt={() => {}} onSendMessage={() => {}} />)
    expect(screen.getByText('Waiting')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /interrupt ai work/i })).toBeNull()
  })

  it('fires onInterrupt when the interrupt button is clicked', () => {
    const onInterrupt = vi.fn()
    render(<LiveConversationPanel isWorking onInterrupt={onInterrupt} onSendMessage={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /interrupt ai work/i }))
    expect(onInterrupt).toHaveBeenCalledTimes(1)
  })

  it('fires onSendMessage with trimmed value when the form is submitted', () => {
    const onSendMessage = vi.fn()
    render(<LiveConversationPanel isWorking={false} onInterrupt={() => {}} onSendMessage={onSendMessage} />)
    const textarea = screen.getByLabelText(/live conversation message/i) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '  hello world  ' } })
    fireEvent.click(screen.getByRole('button', { name: /send live message/i }))
    expect(onSendMessage).toHaveBeenCalledWith('hello world')
    expect(textarea.value).toBe('')
  })

  it('does not fire onSendMessage when the input is empty/whitespace', () => {
    const onSendMessage = vi.fn()
    render(<LiveConversationPanel isWorking={false} onInterrupt={() => {}} onSendMessage={onSendMessage} />)
    const textarea = screen.getByLabelText(/live conversation message/i)
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /send live message/i }))
    expect(onSendMessage).not.toHaveBeenCalled()
  })
})
