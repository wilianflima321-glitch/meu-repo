'use client';

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
  const activeCursors = peers.filter((peer) => peer.cursor).length
  const overflowNames = overflow > 0 ? peers.slice(maxVisible).map((peer) => peer.name).join(', ') : ''
  const summaryLabel =
    peers.length === 1 ? '1 collaborator connected' : `${peers.length} collaborators connected`
  const activityLabel =
    activeCursors > 0
      ? `${activeCursors} live cursor${activeCursors === 1 ? '' : 's'}`
      : 'Presence synced'

  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${className}`}
      role="group"
      aria-label={`${summaryLabel}${overflowNames ? `. Hidden collaborators: ${overflowNames}` : ''}`}
      data-testid="collaborators-bar"
    >
      {showStatusDot && peers.length > 0 && (
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-[var(--aethel-success)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--aethel-success)_16%,transparent)] animate-pulse"
          title="Live collaboration active"
        />
      )}
      {peers.length > 0 && (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Ao vivo
            </span>
            <span className="truncate pt-1 text-[11px] font-semibold text-[var(--aethel-text-secondary)]">
              {summaryLabel}
            </span>
          </div>
          <span className="hidden rounded-full border border-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] sm:inline-flex">
            {activityLabel}
          </span>
        </div>
      )}
      <ul role="list" className="flex items-center -space-x-2.5">
        {visible.map((peer) => (
          <li key={peer.clientId} role="listitem">
            <button
              type="button"
              onClick={onExpand}
              aria-label={`Collaborator ${peer.name} connected`}
              title={peer.name}
              className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--aethel-border-secondary)_76%,transparent)] text-[11px] font-semibold shadow-[0_8px_18px_-14px_rgba(15,23,42,0.9)] ring-2 ring-[var(--aethel-surface-primary)] transition-transform hover:z-10 hover:scale-[1.04] focus:outline-none focus-visible:z-10 focus-visible:ring-[var(--aethel-border-focus)]"
              style={{ background: peer.color, color: 'rgb(255 255 255)' }}
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
              title={overflowNames || undefined}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] text-[11px] font-semibold text-[var(--aethel-text-primary)] ring-2 ring-[var(--aethel-surface-primary)] transition-colors hover:bg-[var(--aethel-surface-quaternary)] focus:outline-none focus-visible:ring-[var(--aethel-border-focus)]"
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
