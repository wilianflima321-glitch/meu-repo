/**
 * useCollaborationAwareness
 *
 * Thin React hook around a Yjs `Awareness` instance to expose the list of
 * remote collaborators (cursor + selection + user metadata) to UI surfaces.
 *
 * Design goals:
 *   - Zero flicker: updates are batched by the browser event loop.
 *   - Zero network: this hook does *not* open a socket; callers pass in the
 *     `Awareness` produced by `YjsCollaborationClient` (lib/yjs-collaboration).
 *   - SSR-safe: guarded access to `window` and lazy state initialisation.
 *   - Deterministic color assignment: falls back to `getUserColor` when the
 *     awareness payload does not include a color yet.
 */

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import type { Awareness } from 'y-protocols/awareness'

export interface RemoteCursor {
  x: number
  y: number
  z?: number
}

export interface RemoteSelection {
  start: { index: number; length: number }
  end: { index: number; length: number }
}

export interface RemotePeer {
  clientId: number
  id: string
  name: string
  color: string
  avatar?: string
  cursor?: RemoteCursor
  selection?: RemoteSelection
  lastActivity: number
}

interface AwarenessStatePayload {
  user?: { id?: string; name?: string; color?: string; avatar?: string }
  cursor?: RemoteCursor
  selection?: RemoteSelection
}

interface UseCollaborationAwarenessOptions {
  /** Filter out the local client (typical for UI). Default: true. */
  excludeSelf?: boolean
  /** Fallback color when the peer has not broadcast one yet. */
  fallbackColor?: string
}

function fallbackColorForClient(clientId: number): string {
  // Deterministic hue from clientId, avoiding collisions with the background.
  const hue = Math.abs(clientId * 2654435761) % 360
  return `hsl(${hue}, 70%, 55%)`
}

function normalisePeer(clientId: number, raw: AwarenessStatePayload, fallback?: string): RemotePeer {
  const user = raw.user ?? {}
  return {
    clientId,
    id: String(user.id ?? clientId),
    name: String(user.name ?? 'Guest'),
    color: String(user.color ?? fallback ?? fallbackColorForClient(clientId)),
    avatar: user.avatar,
    cursor: raw.cursor,
    selection: raw.selection,
    lastActivity: Date.now(),
  }
}

export function useCollaborationAwareness(
  awareness: Awareness | null | undefined,
  options: UseCollaborationAwarenessOptions = {},
): { peers: RemotePeer[]; self: RemotePeer | null; peerCount: number } {
  const { excludeSelf = true, fallbackColor } = options
  const [snapshot, setSnapshot] = useState<Map<number, RemotePeer>>(() => new Map())

  const collect = useCallback(() => {
    if (!awareness) return
    const next = new Map<number, RemotePeer>()
    awareness.getStates().forEach((raw, clientId) => {
      next.set(clientId, normalisePeer(clientId, raw as AwarenessStatePayload, fallbackColor))
    })
    setSnapshot(next)
  }, [awareness, fallbackColor])

  useEffect(() => {
    if (!awareness) return
    collect()
    const handler = () => collect()
    awareness.on('change', handler)
    awareness.on('update', handler)
    return () => {
      awareness.off('change', handler)
      awareness.off('update', handler)
    }
  }, [awareness, collect])

  return useMemo(() => {
    const selfId = awareness?.clientID ?? -1
    const self = snapshot.get(selfId) ?? null
    const peers = Array.from(snapshot.values())
      .filter((p) => (excludeSelf ? p.clientId !== selfId : true))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { peers, self, peerCount: peers.length }
  }, [snapshot, awareness, excludeSelf])
}

export default useCollaborationAwareness
