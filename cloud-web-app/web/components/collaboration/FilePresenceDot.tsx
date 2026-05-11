'use client'

import type { RemotePeer } from '@/hooks/useCollaborationAwareness'

type FilePresenceDotProps = {
  peers: RemotePeer[]
  maxVisible?: number
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?'
}

export function FilePresenceDot({
  peers,
  maxVisible = 2,
  className = '',
}: FilePresenceDotProps) {
  if (peers.length === 0) return null

  const visiblePeers = peers.slice(0, maxVisible)
  const overflow = Math.max(0, peers.length - maxVisible)
  const tooltip = peers.map((peer) => peer.name).join(', ')

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-end -space-x-1.5 ${className}`}
      title={tooltip}
    >
      {visiblePeers.map((peer) => (
        <span
          key={peer.clientId}
          className="inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border border-[var(--aethel-surface-primary)] text-[8px] font-semibold uppercase tracking-[0.08em] text-[var(--aethel-text-primary)] shadow-[0_4px_10px_-8px_rgba(15,23,42,0.9)]"
          style={{ background: peer.color }}
        >
          {peer.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={peer.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{initials(peer.name)}</span>
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--aethel-surface-primary)] bg-[var(--aethel-surface-tertiary)] px-1 text-[8px] font-semibold text-[var(--aethel-text-secondary)] shadow-[0_4px_10px_-8px_rgba(15,23,42,0.9)]">
          +{overflow}
        </span>
      )}
    </span>
  )
}

export default FilePresenceDot
