'use client'

import { FunctionSquare, Trash2 } from 'lucide-react'
import type { Breakpoint, StackFrame } from './DebugPanel.parts'

// ============= Breakpoint List Component =============

interface BreakpointListProps {
  breakpoints: Breakpoint[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string) => void
  onNavigate: (breakpoint: Breakpoint) => void
}

export function BreakpointList({ breakpoints, onToggle, onRemove, onEdit, onNavigate }: BreakpointListProps) {
  return (
    <div className="text-xs">
      {breakpoints.length === 0 ? (
        <div className="px-3 py-2 text-[var(--aethel-text-tertiary)] text-center">
          No breakpoint
        </div>
      ) : (
        breakpoints.map(bp => (
          <div
            key={bp.id}
            className="flex items-center gap-2 px-3 py-1 hover:bg-[var(--aethel-surface-quaternary)]/50 group"
          >
            <button type="button" aria-label={bp.enabled ? `Disable breakpoint at ${bp.filePath}:${bp.line}` : `Enable breakpoint at ${bp.filePath}:${bp.line}`}
              onClick={() => onToggle(bp.id)}
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                bp.enabled
                  ? bp.verified
                    ? 'bg-[var(--aethel-success)] border-[var(--aethel-success)]'
                    : 'bg-[var(--aethel-text-tertiary)] border-[var(--aethel-border-secondary)]'
                  : 'border-[var(--aethel-border-secondary)]'
              }`}
            />

            <button type="button" aria-label={`Open breakpoint ${bp.filePath}:${bp.line}`}
              onClick={() => onNavigate(bp)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="text-[var(--aethel-text-primary)] truncate">
                {bp.filePath.split('/').pop()}:{bp.line}
              </div>
              {bp.condition && (
                <div className="text-[var(--aethel-text-tertiary)] truncate">
                  when: {bp.condition}
                </div>
              )}
            </button>

            {bp.hitCount !== undefined && bp.hitCount > 0 && (
              <span className="text-[var(--aethel-text-tertiary)]">{bp.hitCount}x</span>
            )}

            <button type="button" aria-label={`Remove breakpoint ${bp.filePath}:${bp.line}`}
              onClick={() => onRemove(bp.id)}
              className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error)] opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ============= Call Stack Component =============

interface CallStackProps {
  frames: StackFrame[]
  selectedFrameId: string | null
  onSelectFrame: (frame: StackFrame) => void
}

export function CallStack({ frames, selectedFrameId, onSelectFrame }: CallStackProps) {
  return (
    <div className="text-xs">
      {frames.length === 0 ? (
        <div className="px-3 py-2 text-[var(--aethel-text-tertiary)] text-center">
          Not paused
        </div>
      ) : (
        frames.map((frame, idx) => (
          <button type="button" aria-label={`Select stack frame ${frame.name}`}
            key={frame.id}
            onClick={() => onSelectFrame(frame)}
            className={`flex items-center gap-2 w-full px-3 py-1 text-left ${
              frame.id === selectedFrameId
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)]'
                : 'hover:bg-[var(--aethel-surface-quaternary)]/50'
            }`}
          >
            <FunctionSquare className="w-3 h-3 text-[var(--aethel-warning-light)] flex-shrink-0" />
            <span className="text-[var(--aethel-text-primary)] truncate">{frame.name}</span>
            <span className="ml-auto text-[var(--aethel-text-tertiary)] text-[10px]">
              {frame.filePath.split('/').pop()}:{frame.line}
            </span>
          </button>
        ))
      )}
    </div>
  )
}
