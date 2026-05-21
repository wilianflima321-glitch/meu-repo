'use client'

import type { ReactNode } from 'react'
import { AlertTriangle, Bot, CheckCircle2, Lock, Pause } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { AgentFleetMemberSnapshot, AgentFleetMemberStatus } from './types'

const statusTone: Record<AgentFleetMemberStatus, string> = {
  ready: 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] text-[var(--aethel-success-light)]',
  attention: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_9%,transparent)] text-[var(--aethel-warning-light)]',
  blocked: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_9%,transparent)] text-[var(--aethel-error-light)]',
  paused: 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] text-[var(--aethel-text-tertiary)]',
}

const statusIcon: Record<AgentFleetMemberStatus, ReactNode> = {
  ready: <CheckCircle2 className="h-3.5 w-3.5" />,
  attention: <AlertTriangle className="h-3.5 w-3.5" />,
  blocked: <AlertTriangle className="h-3.5 w-3.5" />,
  paused: <Pause className="h-3.5 w-3.5" />,
}

type AgentCardProps = {
  member: AgentFleetMemberSnapshot
}

export function AgentCard({ member }: AgentCardProps) {
  return (
    <article className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_26%,transparent)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[var(--aethel-primary-light)]" />
            <h4 className="truncate text-sm font-semibold text-[var(--aethel-text-primary)]">{member.agent}</h4>
          </div>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{member.lane}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]', statusTone[member.status])}>
          {statusIcon[member.status]}
          {member.status}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-[var(--aethel-text-secondary)]">{member.nextAction}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
        <span className="rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
          {member.ownedSurfaceCount} surfaces
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--aethel-border-primary)] px-2 py-1">
          <Lock className="h-3 w-3" />
          {member.activeLockCount} locks
        </span>
        {member.staleSurfaceCount > 0 ? (
          <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] px-2 py-1 text-[var(--aethel-warning-light)]">
            {member.staleSurfaceCount} stale
          </span>
        ) : null}
      </div>
    </article>
  )
}