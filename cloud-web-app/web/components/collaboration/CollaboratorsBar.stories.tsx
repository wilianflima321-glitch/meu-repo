/**
 * Storybook stories for CollaboratorsBar.
 *
 * Each story covers one real-world scenario:
 *   - Single collaborator (solo session with a remote viewer).
 *   - Exactly at the `maxVisible` threshold (no overflow bubble).
 *   - Over capacity (overflow bubble appears with `+N`).
 *   - Empty state (no peers; status dot must be suppressed).
 *   - With explicit `avatar` URLs to test image fallback order.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { CollaboratorsBar } from './CollaboratorsBar'
import type { RemotePeer } from '../../hooks/useCollaborationAwareness'

const meta: Meta<typeof CollaboratorsBar> = {
  title: 'Collaboration/CollaboratorsBar',
  component: CollaboratorsBar,
  tags: ['autodocs'],
  args: {
    maxVisible: 4,
    showStatusDot: true,
  },
}

export default meta
type Story = StoryObj<typeof CollaboratorsBar>

function peer(clientId: number, name: string, color: string, avatar?: string): RemotePeer {
  return {
    clientId,
    id: String(clientId),
    name,
    color,
    avatar,
    lastActivity: Date.now(),
  }
}

export const SingleCollaborator: Story = {
  args: {
    peers: [peer(1, 'Ada Lovelace', '#ff6b6b')],
  },
}

export const AtCapacity: Story = {
  args: {
    peers: [
      peer(1, 'Ada Lovelace', '#ff6b6b'),
      peer(2, 'Grace Hopper', '#5eead4'),
      peer(3, 'Alan Turing', '#60a5fa'),
      peer(4, 'Linus Torvalds', '#fcd34d'),
    ],
  },
}

export const WithOverflow: Story = {
  args: {
    peers: [
      peer(1, 'Ada Lovelace', '#ff6b6b'),
      peer(2, 'Grace Hopper', '#5eead4'),
      peer(3, 'Alan Turing', '#60a5fa'),
      peer(4, 'Linus Torvalds', '#fcd34d'),
      peer(5, 'Margaret Hamilton', '#c4b5fd'),
      peer(6, 'Donald Knuth', '#86efac'),
      peer(7, 'Barbara Liskov', '#f472b6'),
    ],
  },
}

export const Empty: Story = {
  args: {
    peers: [],
  },
}

export const WithAvatars: Story = {
  args: {
    peers: [
      peer(1, 'Ada Lovelace', '#ff6b6b', 'https://i.pravatar.cc/40?u=ada'),
      peer(2, 'Grace Hopper', '#5eead4', 'https://i.pravatar.cc/40?u=grace'),
    ],
  },
}
