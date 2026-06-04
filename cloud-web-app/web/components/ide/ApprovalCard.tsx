'use client'

import { useState } from 'react'
import { Check, X, Eye, GitMerge, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

interface Change {
  filePath: string
  oldContent: string
  newContent: string
  lineChanges: number
}

interface ApprovalCardProps {
  changes: Change[]
  onApprove: (changes: Change[]) => void
  onReject: (changes: Change[]) => void
  onApprovePartial?: (change: Change) => void
  onRejectPartial?: (change: Change) => void
  estimatedCost?: number
  estimatedDuration?: number
}

export function ApprovalCard({
  changes,
  onApprove,
  onReject,
  onApprovePartial = () => undefined,
  onRejectPartial = () => undefined,
  estimatedCost = 0,
  estimatedDuration = 0,
}: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [viewingChange, setViewingChange] = useState<string | null>(null)

  const hasChanges = changes.length > 0
  const totalChanges = changes.length
  const totalLines = changes.reduce((acc, c) => acc + c.lineChanges, 0)

  const toggleChangeSelection = (changeId: string) => {
    setSelectedChanges(prev => {
      const next = new Set(prev)
      if (next.has(changeId)) {
        next.delete(changeId)
      } else {
        next.add(changeId)
      }
      return next
    })
  }

  const handleApproveSelected = () => {
    const selected = changes.filter(c => selectedChanges.has(c.filePath))
    if (selected.length > 0) {
      onApprove(selected)
      setSelectedChanges(new Set())
    }
  }

  const handleRejectSelected = () => {
    const selected = changes.filter(c => selectedChanges.has(c.filePath))
    if (selected.length > 0) {
      onReject(selected)
      setSelectedChanges(new Set())
    }
  }

  const handleApproveAll = () => {
    if (!hasChanges) return
    onApprove(changes)
    setSelectedChanges(new Set())
  }

  const handleRejectAll = () => {
    if (!hasChanges) return
    onReject(changes)
    setSelectedChanges(new Set())
  }

  return (
    <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[var(--aethel-info-light)]" />
            <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Approval required</span>
          </div>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{totalChanges} file(s) • {totalLines} line(s)</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Cost & Duration */}
          {(estimatedCost > 0 || estimatedDuration > 0) && (
            <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-2">
              <div className="flex items-center gap-4 text-xs">
                {estimatedCost > 0 && (
                  <div className="flex items-center gap-1 text-[var(--aethel-text-secondary)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--aethel-warning-light)]" />
                   <span>Estimated cost: ${estimatedCost.toFixed(4)}</span>
                  </div>
                )}
                {estimatedDuration > 0 && (
                  <div className="flex items-center gap-1 text-[var(--aethel-text-secondary)]">
                    <Clock className="w-3.5 h-3.5 text-[var(--aethel-info-light)]" />
                   <span>Estimated duration: {estimatedDuration}s</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Changes List */}
          <div className="p-4 space-y-2 max-h-80 overflow-auto">
            {!hasChanges && (
              <div className="flex items-center justify-center rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4 text-xs text-[var(--aethel-text-tertiary)]">
                No pending changes to approve.
              </div>
            )}
            {changes.map((change) => {
              const isSelected = selectedChanges.has(change.filePath)
              return (
                <div
                  key={change.filePath}
                  className={`rounded-lg border p-3 transition-colors ${
                    isSelected ?
                       'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)]'
                      : 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleChangeSelection(change.filePath)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[var(--aethel-text-primary)]">{change.filePath}</span>
                          <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{change.lineChanges} line(s)</span>
                        </div>
                        <div className="text-[10px] text-[var(--aethel-text-tertiary)]">
                          {change.newContent.length > change.oldContent.length ? '+' : ''}
                          {change.newContent.length - change.oldContent.length} characters
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                      onClick={() => setViewingChange(viewingChange === change.filePath ? null : change.filePath)}
                        className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
                        title="View diff"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      {onApprovePartial && (
                        <button
                          type="button"
                          onClick={() => onApprovePartial(change)}
                          className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-success-light)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] transition-colors"
                          title="Approve this file"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      {onRejectPartial && (
                        <button
                          type="button"
                          onClick={() => onRejectPartial(change)}
                          className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] transition-colors"
                          title="Reject this file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Diff Preview */}
                  {viewingChange === change.filePath && (
                    <div className="mt-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] p-2 font-mono text-[10px]">
                      <div className="text-[var(--aethel-error-light)]">- {change.oldContent}</div>
                      <div className="text-[var(--aethel-success-light)]">+ {change.newContent}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRejectAll}
                disabled={!hasChanges}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] hover:text-[var(--aethel-error-light)]"
              >
                <X className="w-3.5 h-3.5" />
                Reject all
              </button>
              <button
                type="button"
                onClick={handleApproveAll}
                disabled={!hasChanges}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110"
              >
                <Check className="w-3.5 h-3.5" />
                Apply all
              </button>
            </div>
            {selectedChanges.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{selectedChanges.size} selected</span>
                <button
                  type="button"
                  onClick={handleRejectSelected}
                  className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] transition-colors"
                  title="Reject selected"
                >
                  <X className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleApproveSelected}
                  className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-success-light)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] transition-colors"
                  title="Approve selected"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
