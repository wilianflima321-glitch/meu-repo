/**
 * RemoteCursorLayer
 *
 * Absolute-positioned overlay that renders remote collaborator cursors on top
 * of any pointer surface (scene viewport, 2D canvas, timeline, etc.). Each
 * cursor is a small coloured triangle with the collaborator's name in a
 * rounded pill, matching Figma / VS Code Live Share style.
 *
 * The layer is purely presentational. Callers must:
 *   1. Pass a `peers` array whose `cursor` is expressed in the SAME coordinate
 *      space used for positioning (defaults to pixels relative to the
 *      container's top-left corner).
 *   2. Wrap the layer in a `position: relative` parent.
 *
 * Performance: cursors are rendered with CSS transforms (GPU friendly) and
 * React `key={clientId}` keeps reconciliation O(n).
 */

'use client'

import React from 'react'
import type { RemotePeer } from '@/hooks/useCollaborationAwareness'

interface RemoteCursorLayerProps {
  peers: RemotePeer[]
  /** When true, hide cursors that haven't moved in `idleMs` milliseconds. */
  fadeIdle?: boolean
  idleMs?: number
  className?: string
}

export function RemoteCursorLayer({
  peers,
  fadeIdle = true,
  idleMs = 8000,
  className = '',
}: RemoteCursorLayerProps) {
  const now = Date.now()

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      data-testid="remote-cursor-layer"
    >
      {peers.map((peer) => {
        if (!peer.cursor) return null
        const idleFor = now - peer.lastActivity
        const opacity = fadeIdle && idleFor > idleMs ? 0 : 1

        return (
          <div
            key={peer.clientId}
            className="absolute transition-transform duration-75 ease-out will-change-transform"
            style={{
              transform: `translate3d(${peer.cursor.x}px, ${peer.cursor.y}px, 0)`,
              opacity,
            }}
          >
            {/* Cursor arrow (inline SVG, no external request) */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}
            >
              <path
                d="M2 2 L2 14 L6 10 L9 16 L11 15 L8 9 L14 8 Z"
                fill={peer.color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium shadow-sm ml-3 -mt-1"
              style={{ background: peer.color, color: '#ffffff' }}
            >
              {peer.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default RemoteCursorLayer
