'use client'

/**
 * InlineDiffWidget — Frosted glass pill that floats above changed lines.
 *
 * Designed to be mounted as a Monaco ContentWidget/ZoneWidget overlay.
 * It receives hunk metadata and calls accept/reject handlers.
 */

import { Check, X, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InlineDiffWidgetProps {
  /** Label of the agent that produced the diff (e.g. "QA", "SYS") */
  agentLabel?: string
  /** Number of lines added in this hunk */
  linesAdded?: number
  /** Number of lines removed in this hunk */
  linesRemoved?: number
  /** Called when user clicks Accept */
  onAccept: () => void
  /** Called when user clicks Reject */
  onReject: () => void
  /** Whether an action is in progress (shows spinner) */
  isPending?: boolean
  className?: string
}

export function InlineDiffWidget({
  agentLabel = 'AI',
  linesAdded = 0,
  linesRemoved = 0,
  onAccept,
  onReject,
  isPending = false,
  className,
}: InlineDiffWidgetProps) {
  return (
    <div
      className={cn(
        // Frosted glass pill
        'inline-flex items-center gap-px overflow-hidden rounded-full',
        'border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_30%,transparent)]',
        'bg-[var(--aethel-editor-diff-pill-bg)]',
        'shadow-[0_0_20px_rgba(var(--aethel-neon-cyan-rgb),0.12),0_4px_24px_rgba(var(--aethel-brand-pure-black-rgb),0.56)]',
        '[backdrop-filter:blur(12px)]',
        'select-none',
        className,
      )}
      role="group"
      aria-label="Diff hunk actions"
      // Stop Monaco key events from propagating
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Agent badge */}
      <div
        className="flex items-center gap-1 border-r border-[color-mix(in_srgb,var(--aethel-accent)_20%,transparent)] px-2.5 py-1"
        aria-label={`Agent: ${agentLabel}`}
      >
        <Bot className="h-3 w-3 text-[var(--aethel-accent-light)]" strokeWidth={1.5} />
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-accent-light)]">{agentLabel}</span>
      </div>

      {/* Diff stats */}
      {(linesAdded > 0 || linesRemoved > 0) && (
        <div className="flex items-center gap-1 border-r border-[color-mix(in_srgb,var(--aethel-neon-cyan)_12%,transparent)] px-2 py-1">
          {linesAdded > 0 && (
            <span className="text-[9px] font-semibold text-[var(--aethel-success)]">+{linesAdded}</span>
          )}
          {linesRemoved > 0 && (
            <span className="text-[9px] font-semibold text-[var(--aethel-error)]">-{linesRemoved}</span>
          )}
        </div>
      )}

      {/* Accept button */}
      <button
        type="button"
        onClick={onAccept}
        disabled={isPending}
        aria-label="Accept hunk"
        title="Accept hunk (Alt+A)"
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors',
          'text-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_14%,transparent)]',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <Check className="h-3 w-3" strokeWidth={2.5} />
        <span>Accept</span>
      </button>

      {/* Divider */}
      <span className="h-4 w-px bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_12%,transparent)]" aria-hidden />

      {/* Reject button */}
      <button
        type="button"
        onClick={onReject}
        disabled={isPending}
        aria-label="Reject hunk"
        title="Reject hunk (Alt+R)"
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors',
          'text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_14%,transparent)]',
          'disabled:pointer-events-none disabled:opacity-40',
        )}
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
        <span>Reject</span>
      </button>
    </div>
  )
}

export default InlineDiffWidget
