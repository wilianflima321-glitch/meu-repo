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
    peers: [peer(1, 'Ada Lovelace', 'tomato')],
  },
}

export const AtCapacity: Story = {
  args: {
    peers: [
      peer(1, 'Ada Lovelace', 'tomato'),
      peer(2, 'Grace Hopper', 'turquoise'),
      peer(3, 'Alan Turing', 'cornflowerblue'),
      peer(4, 'Linus Torvalds', 'gold'),
    ],
  },
}

export const WithOverflow: Story = {
  args: {
    peers: [
      peer(1, 'Ada Lovelace', 'tomato'),
      peer(2, 'Grace Hopper', 'turquoise'),
      peer(3, 'Alan Turing', 'cornflowerblue'),
      peer(4, 'Linus Torvalds', 'gold'),
      peer(5, 'Margaret Hamilton', 'mediumpurple'),
      peer(6, 'Donald Knuth', 'mediumseagreen'),
      peer(7, 'Barbara Liskov', 'hotpink'),
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
      peer(1, 'Ada Lovelace', 'tomato', 'https://i.pravatar.cc/40?u=ada'),
      peer(2, 'Grace Hopper', 'turquoise', 'https://i.pravatar.cc/40?u=grace'),
    ],
  },
}
