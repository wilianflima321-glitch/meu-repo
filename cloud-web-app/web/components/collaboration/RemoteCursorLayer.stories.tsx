/**
 * Storybook stories for RemoteCursorLayer.
 *
 * The layer is positioned absolutely, so each story wraps it in a 480×320
 * bordered container to simulate a viewport. Peers are placed at fixed
 * coordinates for visual stability.
 */

import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { RemoteCursorLayer } from './RemoteCursorLayer'
import type { RemotePeer } from '../../hooks/useCollaborationAwareness'

const meta: Meta<typeof RemoteCursorLayer> = {
  title: 'Collaboration/RemoteCursorLayer',
  component: RemoteCursorLayer,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: 480,
          height: 320,
          background: 'var(--aethel-surface-secondary)',
          border: '1px solid var(--aethel-border-primary)',
          borderRadius: 8,
        }}
      >
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof RemoteCursorLayer>

function peer(clientId: number, name: string, color: string, x: number, y: number): RemotePeer {
  return {
    clientId,
    id: String(clientId),
    name,
    color,
    cursor: { x, y },
    lastActivity: Date.now(),
  }
}

export const ThreeLiveCursors: Story = {
  args: {
    peers: [
      peer(1, 'Ada Lovelace', 'var(--aethel-error)', 60, 80),
      peer(2, 'Grace Hopper', 'var(--aethel-neon-cyan)', 220, 160),
      peer(3, 'Alan Turing', 'var(--aethel-primary)', 350, 230),
    ],
  },
}

export const WithIdleCursorFaded: Story = {
  args: {
    fadeIdle: true,
    idleMs: 1000,
    peers: [
      peer(1, 'Ada Lovelace', 'var(--aethel-error)', 60, 80),
      {
        clientId: 2,
        id: '2',
        name: 'Grace Hopper',
        color: 'var(--aethel-neon-cyan)',
        cursor: { x: 220, y: 160 },
        lastActivity: Date.now() - 10_000, // idle
      },
    ],
  },
}

export const NoPeers: Story = {
  args: {
    peers: [],
  },
}
