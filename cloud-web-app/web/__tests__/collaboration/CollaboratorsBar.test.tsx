/**
 * Tests for CollaboratorsBar.
 *
 * Covers:
 *  - Renders correct number of avatars up to `maxVisible`.
 *  - Overflow "+N" bubble appears when the peer count exceeds `maxVisible`.
 *  - aria-label contains the peer count (screen-reader affordance).
 *  - Clicking the overflow bubble fires `onExpand`.
 *  - Status dot hides when no peers are present (no "connected" illusion).
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollaboratorsBar } from '../../components/collaboration/CollaboratorsBar'
import type { RemotePeer } from '../../hooks/useCollaborationAwareness'

function makePeer(partial: Partial<RemotePeer> & { clientId: number; name: string }): RemotePeer {
  return {
    id: String(partial.clientId),
    color: '#ff00aa',
    lastActivity: Date.now(),
    ...partial,
  }
}

describe('CollaboratorsBar', () => {
  it('renders up to maxVisible avatars', () => {
    const peers = [1, 2, 3, 4, 5].map((i) => makePeer({ clientId: i, name: `User ${i}` }))
    render(<CollaboratorsBar peers={peers} maxVisible={3} />)
    const avatars = screen.getAllByRole('button').filter((b) =>
      (b.getAttribute('aria-label') ?? '').startsWith('Collaborator'),
    )
    expect(avatars).toHaveLength(3)
  })

  it('shows overflow bubble when peers exceed maxVisible', () => {
    const peers = [1, 2, 3, 4, 5, 6, 7].map((i) =>
      makePeer({ clientId: i, name: `User ${i}` }),
    )
    render(<CollaboratorsBar peers={peers} maxVisible={3} />)
    expect(screen.getByText('+4')).toBeTruthy()
  })

  it('fires onExpand when overflow bubble is clicked', () => {
    const onExpand = vi.fn()
    const peers = [1, 2, 3, 4].map((i) =>
      makePeer({ clientId: i, name: `User ${i}` }),
    )
    render(<CollaboratorsBar peers={peers} maxVisible={2} onExpand={onExpand} />)
    fireEvent.click(screen.getByText('+2'))
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('reveals the peer count via aria-label on the group', () => {
    const peers = [1, 2].map((i) => makePeer({ clientId: i, name: `User ${i}` }))
    render(<CollaboratorsBar peers={peers} />)
    const group = screen.getByRole('group')
    expect(group.getAttribute('aria-label')).toBe('2 collaborators connected')
  })

  it('does not render the status dot when there are zero peers', () => {
    render(<CollaboratorsBar peers={[]} />)
    const group = screen.getByRole('group')
    // No live-dot when nobody is connected
    expect(group.querySelector('[title="Live collaboration active"]')).toBeNull()
  })
})
