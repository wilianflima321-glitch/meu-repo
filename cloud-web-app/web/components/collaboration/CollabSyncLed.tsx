'use client'

/**
 * Block 2A.3 — Sync LED chrome (Critique #10).
 */

import type { CollabSyncLedSnapshot } from '@/lib/collaboration/collab-sync-state'

interface CollabSyncLedProps {
  snapshot: CollabSyncLedSnapshot
  peerCount?: number
  className?: string
}

export function CollabSyncLed({ snapshot, peerCount = 0, className }: CollabSyncLedProps) {
  const color =
    snapshot.tone === 'success'
      ? 'var(--aethel-success-light)'
      : snapshot.tone === 'warning'
        ? 'var(--aethel-warning-light)'
        : snapshot.tone === 'danger'
          ? 'var(--aethel-error-light)'
          : 'var(--aethel-text-tertiary)'

  const label =
    snapshot.state === 'synced' && peerCount > 0
      ? `${snapshot.label} · ${peerCount} peer${peerCount === 1 ? '' : 's'}`
      : snapshot.label

  return (
    <span
      className={className}
      title={snapshot.detail}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: 'var(--aethel-text-secondary)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow:
            snapshot.glyph === 'pulse'
              ? `0 0 0 3px color-mix(in srgb, ${color} 35%, transparent)`
              : undefined,
          opacity: snapshot.glyph === 'offline' ? 0.45 : 1,
        }}
      />
      <span>{label}</span>
    </span>
  )
}
