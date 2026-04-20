/**
 * CollaboratorsBar
 *
 * Compact horizontal strip of avatars for the peers currently connected to a
 * Yjs document. Renders:
 *   - Up to `maxVisible` avatar bubbles (initials fallback when no `avatar`).
 *   - A "+N" overflow bubble when `peers.length > maxVisible`.
 *   - A "connected" dot when at least one remote peer is present.
 *
 * Accessibility:
 *   - Role `list` / `listitem` for the peer strip.
 *   - `aria-label` on each avatar reveals the peer name and status.
 *   - Tooltip on hover echoes the name for sighted users.
 */

'use client'

import React from 'react'
import type { RemotePeer } from '@/hooks/useCollaborationAwareness'

interface CollaboratorsBarProps {
  peers: RemotePeer[]
  maxVisible?: number
  /** Show a "connected" indicator when at least one peer is online. */
  showStatusDot?: boolean
  /** Optional click handler to open a fuller collaboration panel. */
  onExpand?: () => void
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?'
}

export function CollaboratorsBar({
  peers,
  maxVisible = 4,
  showStatusDot = true,
  onExpand,
  className = '',
}: CollaboratorsBarProps) {
  const visible = peers.slice(0, maxVisible)
  const overflow = Math.max(0, peers.length - maxVisible)

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label={`${peers.length} collaborator${peers.length === 1 ? '' : 's'} connected`}
      data-testid="collaborators-bar"
    >
      {showStatusDot && peers.length > 0 && (
        <span
          aria-hidden="true"
          className="inline-block w-2 h-2 rounded-full bg-[var(--aethel-success)] animate-pulse"
          title="Live collaboration active"
        />
      )}
      <ul role="list" className="flex items-center -space-x-2">
        {visible.map((peer) => (
          <li key={peer.clientId} role="listitem">
            <button
              type="button"
              onClick={onExpand}
              aria-label={`Collaborator ${peer.name} connected`}
              title={peer.name}
              className="relative inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-semibold text-white ring-2 ring-[var(--aethel-surface-primary)] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-[var(--aethel-border-focus)]"
              style={{ background: peer.color }}
            >
              {peer.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={peer.avatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span aria-hidden="true">{initials(peer.name)}</span>
              )}
            </button>
          </li>
        ))}
        {overflow > 0 && (
          <li role="listitem">
            <button
              type="button"
              onClick={onExpand}
              aria-label={`${overflow} additional collaborators. Open the full list.`}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--aethel-surface-tertiary)] text-[11px] font-semibold text-[var(--aethel-text-primary)] ring-2 ring-[var(--aethel-surface-primary)] hover:bg-[var(--aethel-surface-quaternary)] focus:outline-none focus-visible:ring-[var(--aethel-border-focus)]"
            >
              +{overflow}
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}

export default CollaboratorsBar
