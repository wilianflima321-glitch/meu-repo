'use client'

import { useState } from 'react'
import { ArrowUp, Bot, CheckCircle, Eye, EyeOff, FileCode, Flag, Image, SkipForward, UserX, XCircle } from 'lucide-react'

import { TARGET_LABELS, TYPE_LABELS } from './moderation-copy'
import type { ModerationAction, ModerationItem } from './moderation-types'

type ModerationItemCardProps = {
  item: ModerationItem
  isSelected: boolean
  onClick: () => void
  onAction: (action: ModerationAction) => void
}

const priorityColors: Record<ModerationItem['priority'], string> = {
  low: 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]',
  normal: 'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[var(--aethel-primary)]/5',
  high: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-warning)]/5',
  urgent: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[var(--aethel-error)]/10',
}

const typeIcons = {
  user_report: Flag,
  ai_output: Bot,
  project_content: FileCode,
  asset: Image,
} satisfies Record<ModerationItem['type'], typeof Flag>

function ModerationActionButton({
  action,
  label,
  shortcut,
  icon: Icon,
  toneClass,
  onAction,
}: {
  action: ModerationAction
  label: string
  shortcut: string
  icon: typeof CheckCircle
  toneClass: string
  onAction: (action: ModerationAction) => void
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onAction(action)
      }}
      className={`flex items-center gap-1 rounded px-3 py-1.5 text-sm text-[var(--aethel-text-primary)] ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
      {label} ({shortcut})
    </button>
  )
}

export function ModerationItemCard({ item, isSelected, onClick, onAction }: ModerationItemCardProps) {
  const [showContent, setShowContent] = useState(false)
  const TypeIcon = typeIcons[item.type]

  return (
    <div
      className={`cursor-pointer rounded-lg border p-4 transition-all ${priorityColors[item.priority]} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
          <span className="text-sm capitalize text-[var(--aethel-text-secondary)]">{TYPE_LABELS[item.type]}</span>
          {item.priority === 'urgent' ? (
            <span className="rounded bg-[var(--aethel-error)] px-2 py-0.5 text-xs text-[var(--aethel-text-primary)]">URGENT</span>
          ) : null}
          {item.autoScore && item.autoScore > 0.7 ? (
            <span className="rounded bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] px-2 py-0.5 text-xs text-[var(--aethel-warning)]">
              AI flagged: {Math.round(item.autoScore * 100)}%
            </span>
          ) : null}
        </div>
        <span className="text-xs text-[var(--aethel-text-tertiary)]">{new Date(item.createdAt).toLocaleString()}</span>
      </div>

      <div className="mb-3">
        <p className="text-sm text-[var(--aethel-text-primary)]">
          <span className="text-[var(--aethel-text-tertiary)]">Target:</span>{' '}
          <span className="capitalize">{TARGET_LABELS[item.targetType]}</span> ({item.targetId.slice(0, 8)}...)
        </p>
        {item.targetOwnerEmail ? <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">Owner: {item.targetOwnerEmail}</p> : null}
      </div>

      {item.reason ? (
        <div className="mb-3 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] p-2 text-sm">
          <span className="text-[var(--aethel-text-tertiary)]">Reason:</span>{' '}
          <span className="text-[var(--aethel-text-secondary)]">{item.reason}</span>
          {item.category ? <span className="ml-2 rounded bg-[var(--aethel-surface-quaternary)] px-2 py-0.5 text-xs capitalize">{item.category}</span> : null}
        </div>
      ) : null}

      {item.contentSnapshot ? (
        <div className="mb-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setShowContent(!showContent)
            }}
            aria-label={showContent ? 'Hide moderated content' : 'Show moderated content'}
            aria-expanded={showContent}
            className="flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            {showContent ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showContent ? 'Hide content' : 'View content'}
          </button>
          {showContent ? (
            <div className="mt-2 max-h-48 overflow-x-auto overflow-y-auto rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] p-3 font-mono text-sm">
              <pre className="whitespace-pre-wrap text-[var(--aethel-text-secondary)]">{item.contentSnapshot.preview}</pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {item.autoFlags && item.autoFlags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1">
          {item.autoFlags.map((flag) => (
            <span key={flag} className="rounded bg-[var(--aethel-error)]/20 px-2 py-0.5 text-xs text-[var(--aethel-error)]">
              {flag}
            </span>
          ))}
        </div>
      ) : null}

      {isSelected ? (
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--aethel-border-secondary)] pt-4">
          <ModerationActionButton action="approve" label="Approve" shortcut="A" icon={CheckCircle} toneClass="bg-[var(--aethel-success)] hover:bg-[var(--aethel-success-dark)]" onAction={onAction} />
          <ModerationActionButton action="reject" label="Reject" shortcut="R" icon={XCircle} toneClass="bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error-dark)]" onAction={onAction} />
          <ModerationActionButton action="escalate" label="Escalate" shortcut="E" icon={ArrowUp} toneClass="bg-[var(--aethel-warning-dark)] hover:bg-[var(--aethel-warning-dark)]" onAction={onAction} />
          <ModerationActionButton action="shadowban" label="Shadow-ban" shortcut="B" icon={UserX} toneClass="bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)]" onAction={onAction} />
          <div className="ml-auto">
            <ModerationActionButton action="skip" label="Skip" shortcut="S" icon={SkipForward} toneClass="bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)]" onAction={onAction} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
