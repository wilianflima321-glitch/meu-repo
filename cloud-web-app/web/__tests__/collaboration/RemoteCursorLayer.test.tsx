/**
 * Tests for RemoteCursorLayer.
 *
 * Covers:
 *  - Renders one arrow per peer that has a `cursor`.
 *  - Skips peers without a cursor (e.g. selection-only).
 *  - Honours `fadeIdle` by hiding cursors older than `idleMs`.
 *  - Layer is `aria-hidden` (decorative overlay, not keyboard target).
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RemoteCursorLayer } from '../../components/collaboration/RemoteCursorLayer'
import type { RemotePeer } from '../../hooks/useCollaborationAwareness'

function peer(overrides: Partial<RemotePeer> & { clientId: number }): RemotePeer {
  return {
    id: String(overrides.clientId),
    name: `User ${overrides.clientId}`,
    color: '#22ccaa',
    lastActivity: Date.now(),
    ...overrides,
  }
}

describe('RemoteCursorLayer', () => {
  it('renders a cursor for each peer with a cursor position', () => {
    const peers = [
      peer({ clientId: 1, cursor: { x: 10, y: 20 } }),
      peer({ clientId: 2, cursor: { x: 30, y: 40 } }),
      peer({ clientId: 3 }), // no cursor -> skipped
    ]
    render(<RemoteCursorLayer peers={peers} />)
    const layer = screen.getByTestId('remote-cursor-layer')
    // Each rendered cursor has a child SVG arrow.
    expect(layer.querySelectorAll('svg').length).toBe(2)
  })

  it('is aria-hidden so assistive tech ignores the decorative overlay', () => {
    render(<RemoteCursorLayer peers={[]} />)
    const layer = screen.getByTestId('remote-cursor-layer')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
  })

  it('fades out peers that have been idle longer than idleMs', () => {
    const peers = [
      peer({
        clientId: 1,
        cursor: { x: 10, y: 20 },
        lastActivity: Date.now() - 10_000, // 10s idle
      }),
    ]
    render(<RemoteCursorLayer peers={peers} idleMs={5_000} fadeIdle />)
    const wrapper = screen
      .getByTestId('remote-cursor-layer')
      .querySelector('div') as HTMLElement
    expect(wrapper.style.opacity).toBe('0')
  })
})
