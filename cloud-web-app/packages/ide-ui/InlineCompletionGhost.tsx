'use client'

import { Sparkles } from 'lucide-react'

// ============= Ghost Text Overlay Component =============

export interface GhostTextOverlayProps {
  text: string
  position: { top: number; left: number }
  onAccept: () => void
  onReject: () => void
  visible: boolean
}

export function GhostTextOverlay({ text, position, onAccept, onReject, visible }: GhostTextOverlayProps) {
  if (!visible || !text) return null

  // Split into lines for multi-line display
  const lines = text.split('\n')

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Ghost text */}
      <div className="font-mono text-sm">
        {lines.map((line, i) => (
          <div
            key={i}
            className="text-[var(--aethel-text-tertiary)] opacity-60"
            style={{
              whiteSpace: 'pre',
              fontStyle: 'italic',
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Hint tooltip */}
      <div
        className="absolute -top-6 left-0 flex items-center gap-1 px-2 py-0.5 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-xs text-[var(--aethel-text-tertiary)] pointer-events-auto whitespace-nowrap"
      >
        <kbd className="px-1 py-0.5 bg-[var(--aethel-surface-quaternary)] rounded text-[10px]">Tab</kbd>
        <span>Accept</span>
        <span className="mx-1 text-[var(--aethel-text-quaternary)]">|</span>
        <kbd className="px-1 py-0.5 bg-[var(--aethel-surface-quaternary)] rounded text-[10px]">Esc</kbd>
        <span>Dismiss</span>
      </div>
    </div>
  )
}

// ============= Loading Indicator =============

export function CompletionLoading({ position }: { position: { top: number; left: number } }) {
  return (
    <div
      className="absolute z-50 flex items-center gap-1"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Sparkles className="w-3 h-3 text-[var(--aethel-info)] animate-pulse" />
      <span className="text-xs text-[var(--aethel-text-tertiary)]">Analyzing...</span>
    </div>
  )
}
